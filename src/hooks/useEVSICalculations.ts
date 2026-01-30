/**
 * EVSI Calculations Hook
 *
 * React hook that computes EVSI results from the current wizard store state.
 * Used in Advanced mode to value the specific A/B test the user can run.
 *
 * Key behaviors:
 * - Returns null if mode is 'basic' or inputs are incomplete
 * - Returns loading=true while Worker is computing (async)
 * - Uses fast path for Normal priors (synchronous, no Worker needed)
 * - Uses Web Worker for Student-t and Uniform (Monte Carlo, non-blocking)
 * - Calculates Cost of Delay from experiment parameters
 *
 * Per 05-CONTEXT.md: EVSI is the relevant value in Advanced mode (not EVPI).
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useWizardStore } from '@/stores/wizardStore';
import {
  deriveK,
  normalizeThresholdToLift,
  calculateEVSINormalFastPath,
  calculateCostOfDelay,
  deriveSampleSizes,
} from '@/lib/calculations';
import { computePriorFromInterval, DEFAULT_PRIOR, DEFAULT_INTERVAL } from '@/lib/prior';
import type { EVSIInputs, EVSIResults, PriorDistribution } from '@/lib/calculations/types';
import type { CoDResults } from '@/lib/calculations/cost-of-delay';

/**
 * Combined results from EVSI and Cost of Delay calculations
 */
export interface EVSICalculationResults {
  /** EVSI results including evsiDollars, defaultDecision, probabilities */
  evsi: EVSIResults;
  /** Cost of Delay results including codDollars, dailyOpportunityCost */
  cod: CoDResults;
  /** Net value: EVSI - CoD (the headline number in Advanced mode) */
  netValueDollars: number;
  /** Sample sizes derived from experiment design */
  sampleSizes: {
    n_total: number;
    n_control: number;
    n_variant: number;
  };
}

/**
 * Hook return type includes loading state for async Worker computation
 */
export interface UseEVSICalculationsResult {
  /** True while Worker is computing */
  loading: boolean;
  /** Calculation results, or null if inputs incomplete */
  results: EVSICalculationResults | null;
}

/**
 * Hook that computes EVSI and CoD results from current wizard store state.
 *
 * @returns Object with loading state and calculation results
 *
 * @example
 * const { loading, results } = useEVSICalculations();
 * if (loading) return <Spinner />;
 * if (results) {
 *   console.log(`EVSI: $${results.evsi.evsiDollars}`);
 *   console.log(`CoD: $${results.cod.codDollars}`);
 *   console.log(`Net: $${results.netValueDollars}`);
 * }
 */
export function useEVSICalculations(): UseEVSICalculationsResult {
  // Select all inputs we need
  const mode = useWizardStore((state) => state.mode);
  const sharedInputs = useWizardStore((state) => state.inputs.shared);
  const advancedInputs = useWizardStore((state) => state.inputs.advanced);

  // Track loading state for async Worker computation
  const [loading, setLoading] = useState(false);
  const [workerResults, setWorkerResults] = useState<EVSIResults | null>(null);

  // Track the current request to avoid stale updates
  const requestIdRef = useRef(0);

  // ===========================================
  // Step 1: Validate inputs and derive parameters
  // ===========================================
  const validatedInputs = useMemo(() => {
    // Only compute in Advanced mode
    if (mode !== 'advanced') {
      return null;
    }

    // Validate shared inputs
    if (
      sharedInputs.baselineConversionRate === null ||
      sharedInputs.annualVisitors === null ||
      sharedInputs.valuePerConversion === null ||
      sharedInputs.thresholdScenario === null
    ) {
      return null;
    }

    // Validate threshold value/unit for non-any-positive scenarios
    if (
      sharedInputs.thresholdScenario !== 'any-positive' &&
      (sharedInputs.thresholdValue === null || sharedInputs.thresholdUnit === null)
    ) {
      return null;
    }

    // Validate advanced inputs
    if (
      advancedInputs.priorShape === null ||
      advancedInputs.testDurationDays === null ||
      advancedInputs.dailyTraffic === null ||
      advancedInputs.trafficSplit === null ||
      advancedInputs.eligibilityFraction === null
    ) {
      return null;
    }

    // Validate studentTDf for Student-t prior
    if (advancedInputs.priorShape === 'student-t' && advancedInputs.studentTDf === null) {
      return null;
    }

    // ===========================================
    // Step 2: Build prior distribution
    // ===========================================
    let prior: PriorDistribution;

    // Determine prior parameters from interval
    const isDefaultPrior =
      sharedInputs.priorIntervalLow !== null &&
      sharedInputs.priorIntervalHigh !== null &&
      Math.abs(sharedInputs.priorIntervalLow - DEFAULT_INTERVAL.low) < 0.01 &&
      Math.abs(sharedInputs.priorIntervalHigh - DEFAULT_INTERVAL.high) < 0.01;

    // Get Normal parameters (used for Normal and Student-t)
    const normalParams =
      isDefaultPrior || sharedInputs.priorIntervalLow === null || sharedInputs.priorIntervalHigh === null
        ? DEFAULT_PRIOR
        : computePriorFromInterval(sharedInputs.priorIntervalLow, sharedInputs.priorIntervalHigh);

    switch (advancedInputs.priorShape) {
      case 'normal':
        prior = {
          type: 'normal',
          mu_L: normalParams.mu_L,
          sigma_L: normalParams.sigma_L,
        };
        break;

      case 'student-t':
        // Student-t uses same location-scale as Normal, plus df
        prior = {
          type: 'student-t',
          mu_L: normalParams.mu_L,
          sigma_L: normalParams.sigma_L,
          df: advancedInputs.studentTDf!,
        };
        break;

      case 'uniform':
        // Uniform uses the interval bounds directly
        // Convert from percentage to decimal
        const lowBound = sharedInputs.priorIntervalLow !== null
          ? sharedInputs.priorIntervalLow / 100
          : DEFAULT_INTERVAL.low / 100;
        const highBound = sharedInputs.priorIntervalHigh !== null
          ? sharedInputs.priorIntervalHigh / 100
          : DEFAULT_INTERVAL.high / 100;
        prior = {
          type: 'uniform',
          low_L: lowBound,
          high_L: highBound,
        };
        break;

      default:
        // Fallback to Normal if somehow an unknown shape is passed
        // This shouldn't happen if types are correct, but provides safety
        prior = {
          type: 'normal',
          mu_L: normalParams.mu_L,
          sigma_L: normalParams.sigma_L,
        };
    }

    // ===========================================
    // Step 3: Calculate K and threshold
    // ===========================================
    const K = deriveK(
      sharedInputs.annualVisitors,
      sharedInputs.baselineConversionRate,
      sharedInputs.valuePerConversion
    );

    let threshold_L: number;
    if (sharedInputs.thresholdScenario === 'any-positive') {
      threshold_L = 0;
    } else if (sharedInputs.thresholdUnit === null || sharedInputs.thresholdValue === null) {
      return null;
    } else {
      threshold_L = normalizeThresholdToLift(
        sharedInputs.thresholdValue,
        sharedInputs.thresholdUnit,
        K
      );
    }

    // ===========================================
    // Step 4: Calculate sample sizes
    // ===========================================
    const sampleSizes = deriveSampleSizes({
      dailyTraffic: advancedInputs.dailyTraffic,
      testDurationDays: advancedInputs.testDurationDays,
      eligibilityFraction: advancedInputs.eligibilityFraction,
      variantFraction: advancedInputs.trafficSplit,
    });

    // ===========================================
    // Step 5: Build EVSI inputs
    // ===========================================
    const evsiInputs: EVSIInputs = {
      K,
      baselineConversionRate: sharedInputs.baselineConversionRate,
      threshold_L,
      prior,
      n_control: sampleSizes.n_control,
      n_variant: sampleSizes.n_variant,
    };

    // ===========================================
    // Step 6: Build CoD inputs
    // ===========================================
    const priorMean = prior.type === 'uniform'
      ? (prior.low_L! + prior.high_L!) / 2
      : prior.mu_L!;

    const codInputs = {
      K,
      mu_L: priorMean,
      threshold_L,
      testDurationDays: advancedInputs.testDurationDays,
      variantFraction: advancedInputs.trafficSplit,
      decisionLatencyDays: advancedInputs.decisionLatencyDays ?? 0,
    };

    return {
      prior,
      evsiInputs,
      codInputs,
      sampleSizes,
    };
  }, [
    mode,
    sharedInputs.baselineConversionRate,
    sharedInputs.annualVisitors,
    sharedInputs.valuePerConversion,
    sharedInputs.priorIntervalLow,
    sharedInputs.priorIntervalHigh,
    sharedInputs.thresholdScenario,
    sharedInputs.thresholdUnit,
    sharedInputs.thresholdValue,
    advancedInputs.priorShape,
    advancedInputs.studentTDf,
    advancedInputs.testDurationDays,
    advancedInputs.dailyTraffic,
    advancedInputs.trafficSplit,
    advancedInputs.eligibilityFraction,
    advancedInputs.decisionLatencyDays,
  ]);

  // ===========================================
  // Step 7: Compute EVSI (sync for Normal, async for others)
  // ===========================================
  useEffect(() => {
    // Clear results if inputs become invalid
    if (!validatedInputs) {
      setWorkerResults(null);
      setLoading(false);
      return;
    }

    const { prior, evsiInputs } = validatedInputs;

    // For Normal priors, use fast path (synchronous, no Worker)
    if (prior.type === 'normal') {
      const results = calculateEVSINormalFastPath(evsiInputs);
      setWorkerResults(results);
      setLoading(false);
      return;
    }

    // For Student-t and Uniform, use Web Worker (async)
    setLoading(true);
    const currentRequestId = ++requestIdRef.current;

    // Use native Worker with Comlink for type-safe RPC
    const runWorker = async () => {
      try {
        // Import Comlink dynamically
        const Comlink = await import('comlink');

        // Create native Worker using Vite's ?worker import
        const worker = new Worker(
          new URL('../lib/workers/evsi.worker.ts', import.meta.url),
          { type: 'module' }
        );

        // Wrap with Comlink for type-safe RPC
        const api = Comlink.wrap<{ computeEVSI: (inputs: typeof evsiInputs, numSamples: number) => EVSIResults }>(worker);

        const results = await api.computeEVSI(evsiInputs, 5000);

        // Only update if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setWorkerResults(results);
          setLoading(false);
        }

        // Terminate Worker after use
        worker.terminate();
      } catch (error) {
        console.error('EVSI Worker error:', error);
        if (currentRequestId === requestIdRef.current) {
          setWorkerResults(null);
          setLoading(false);
        }
      }
    };

    runWorker();

    // Cleanup: increment requestId to invalidate stale requests
    return () => {
      requestIdRef.current++;
    };
  }, [validatedInputs]);

  // ===========================================
  // Step 8: Calculate CoD and combine results
  // ===========================================
  const finalResults = useMemo((): EVSICalculationResults | null => {
    if (!validatedInputs || !workerResults) {
      return null;
    }

    const { codInputs, sampleSizes } = validatedInputs;

    // Calculate Cost of Delay
    const cod = calculateCostOfDelay(codInputs);

    // Net value: EVSI - CoD
    // This is the headline number in Advanced mode verdict
    const netValueDollars = workerResults.evsiDollars - cod.codDollars;

    return {
      evsi: workerResults,
      cod,
      netValueDollars,
      sampleSizes,
    };
  }, [validatedInputs, workerResults]);

  return {
    loading,
    results: finalResults,
  };
}
