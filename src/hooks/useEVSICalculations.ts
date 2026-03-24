/**
 * EVSI Calculations Hook
 *
 * React hook that computes EVSI results from the current wizard store state.
 * Computes the value of running a specific A/B test the user can run.
 *
 * Key behaviors:
 * - Returns null if inputs are incomplete
 * - Returns loading=true while Worker is computing (async)
 * - Uses fast path for Normal priors (synchronous, no Worker needed)
 * - Uses Web Worker for Student-t and Uniform (Monte Carlo, non-blocking)
 * - Calculates Cost of Delay from experiment parameters
 *
 * Per audit recommendations (COD-01, COD-02, COD-03):
 * - netValueDollars computed via integrated calculation (calculateNetValueMonteCarlo)
 * - NOT computed as evsiDollars - codDollars (which has timing inconsistency)
 * - EVSI and CoD still exposed separately for UI display breakdown
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useWizardStore } from '@/stores/wizardStore';
import {
  deriveK,
  normalizeThresholdToLift,
  calculateEVSINormalFastPath,
  calculateEVSIMonteCarlo,
  deriveSampleSizes,
} from '@/lib/calculations';
import { calculateNetValueMonteCarlo } from '@/lib/calculations/net-value';
import { computeInfeasibleTailMass, TRUNCATION_THRESHOLD } from '@/lib/calculations/feasibility';
import { computePriorFromInterval, computeStudentTPriorScale, DEFAULT_PRIOR, DEFAULT_INTERVAL } from '@/lib/prior';
import type { EVSIInputs, EVSIResults, PriorDistribution, NetValueInputs, NetValueResults } from '@/lib/calculations/types';

/**
 * Results from Cost of Delay calculation
 * (Inlined here after standalone cost-of-delay.ts was removed in DEPR-02)
 */
export interface CoDResults {
  /** Total Cost of Delay in dollars */
  codDollars: number;
  /** Daily opportunity cost (EV_ship_day) in dollars */
  dailyOpportunityCost: number;
  /** Whether CoD applies (true if default decision is Ship) */
  codApplies: boolean;
}

/**
 * Calculate Cost of Delay for an A/B test
 *
 * Per SPEC.md Section A6:
 *   EV_ship_annual = K * (mu_L - T_L)
 *   EV_ship_day = EV_ship_annual / 365
 *   If default is Ship (mu_L >= T_L):
 *     CoD = (1 - f_var) * EV_ship_day * D_test + EV_ship_day * D_latency
 *   If default is Don't Ship: CoD = 0
 *
 * (Inlined here after standalone cost-of-delay.ts was removed in DEPR-02)
 */
function calculateCostOfDelay(inputs: {
  K: number;
  mu_L: number;
  threshold_L: number;
  testDurationDays: number;
  variantFraction: number;
  decisionLatencyDays: number;
}): CoDResults {
  const { K, mu_L, threshold_L, testDurationDays, variantFraction, decisionLatencyDays } = inputs;

  // EV_ship_annual = K * (mu_L - T_L)
  const EV_ship_annual = K * (mu_L - threshold_L);

  // CoD only applies when default decision is Ship (EV_ship_annual > 0)
  const codApplies = EV_ship_annual > 0;

  if (!codApplies) {
    return { codDollars: 0, dailyOpportunityCost: 0, codApplies: false };
  }

  // EV_ship_day = EV_ship_annual / 365
  const EV_ship_day = EV_ship_annual / 365;

  // CoD = (1 - f_var) * EV_ship_day * D_test + EV_ship_day * D_latency
  const controlFraction = 1 - variantFraction;
  const codDollars = controlFraction * EV_ship_day * testDurationDays + EV_ship_day * decisionLatencyDays;

  return { codDollars, dailyOpportunityCost: EV_ship_day, codApplies: true };
}

/**
 * Combined results from EVSI and Cost of Delay calculations
 */
export interface EVSICalculationResults {
  /** EVSI results including evsiDollars, defaultDecision, probabilities */
  evsi: EVSIResults;
  /** Cost of Delay results including codDollars, dailyOpportunityCost */
  cod: CoDResults;
  /** Net value: EVSI - CoD (the headline number) */
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
  // Select all inputs from flat store structure
  const inputs = useWizardStore((state) => state.inputs);

  // Track loading state for async Worker computation
  const [loading, setLoading] = useState(false);
  // EVSI results for UI display (decomposition)
  const [workerResults, setWorkerResults] = useState<EVSIResults | null>(null);
  // Integrated net value results (headline number - COD-03)
  const [netValueResults, setNetValueResults] = useState<NetValueResults | null>(null);

  // Track the current request to avoid stale updates
  const requestIdRef = useRef(0);

  // Track worker for immediate cleanup on unmount
  const workerRef = useRef<Worker | null>(null);

  // ===========================================
  // Step 1: Validate inputs and derive parameters
  // ===========================================
  const validatedInputs = useMemo(() => {
    // Validate baseline inputs
    if (
      inputs.baselineConversionRate === null ||
      inputs.annualVisitors === null ||
      inputs.valuePerConversion === null ||
      inputs.thresholdScenario === null
    ) {
      return null;
    }

    // Validate threshold value/unit for non-any-positive scenarios
    if (
      inputs.thresholdScenario !== 'any-positive' &&
      (inputs.thresholdValue === null || inputs.thresholdUnit === null)
    ) {
      return null;
    }

    // Validate experiment design inputs
    if (
      inputs.priorShape === null ||
      inputs.testDurationDays === null ||
      inputs.dailyTraffic === null ||
      inputs.trafficSplit === null ||
      inputs.eligibilityFraction === null
    ) {
      return null;
    }

    // Validate studentTDf for Student-t prior
    if (inputs.priorShape === 'student-t' && inputs.studentTDf === null) {
      return null;
    }

    // ===========================================
    // Step 2: Build prior distribution
    // ===========================================
    let prior: PriorDistribution;

    // Determine prior parameters from interval
    const isDefaultPrior =
      inputs.priorIntervalLow !== null &&
      inputs.priorIntervalHigh !== null &&
      Math.abs(inputs.priorIntervalLow - DEFAULT_INTERVAL.low) < 0.01 &&
      Math.abs(inputs.priorIntervalHigh - DEFAULT_INTERVAL.high) < 0.01;

    // Get Normal parameters (used for Normal and Student-t)
    const normalParams =
      isDefaultPrior || inputs.priorIntervalLow === null || inputs.priorIntervalHigh === null
        ? DEFAULT_PRIOR
        : computePriorFromInterval(inputs.priorIntervalLow, inputs.priorIntervalHigh);

    switch (inputs.priorShape) {
      case 'normal':
        prior = {
          type: 'normal',
          mu_L: normalParams.mu_L,
          sigma_L: normalParams.sigma_L,
        };
        break;

      case 'student-t': {
        // Student-t uses t-quantile calibrated scale to preserve user's 90% interval (ENG-01)
        const df = inputs.studentTDf!;
        const tParams = computeStudentTPriorScale(
          inputs.priorIntervalLow !== null ? inputs.priorIntervalLow / 100 : DEFAULT_INTERVAL.low / 100,
          inputs.priorIntervalHigh !== null ? inputs.priorIntervalHigh / 100 : DEFAULT_INTERVAL.high / 100,
          df
        );
        prior = {
          type: 'student-t',
          mu_L: tParams.mu_L,
          sigma_L: tParams.sigma_L,
          df,
        };
        break;
      }

      case 'uniform': {
        // Uniform uses the interval bounds directly
        // Convert from percentage to decimal
        const lowBound = inputs.priorIntervalLow !== null
          ? inputs.priorIntervalLow / 100
          : DEFAULT_INTERVAL.low / 100;
        const highBound = inputs.priorIntervalHigh !== null
          ? inputs.priorIntervalHigh / 100
          : DEFAULT_INTERVAL.high / 100;
        prior = {
          type: 'uniform',
          low_L: lowBound,
          high_L: highBound,
        };
        break;
      }

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
      inputs.annualVisitors,
      inputs.baselineConversionRate,
      inputs.valuePerConversion
    );

    let threshold_L: number;
    if (inputs.thresholdScenario === 'any-positive') {
      threshold_L = 0;
    } else if (inputs.thresholdUnit === null || inputs.thresholdValue === null) {
      return null;
    } else {
      threshold_L = normalizeThresholdToLift(
        inputs.thresholdValue,
        inputs.thresholdUnit,
        K
      );
    }

    // ===========================================
    // Step 4: Calculate sample sizes
    // ===========================================
    const sampleSizes = deriveSampleSizes({
      dailyTraffic: inputs.dailyTraffic,
      testDurationDays: inputs.testDurationDays,
      eligibilityFraction: inputs.eligibilityFraction,
      variantFraction: inputs.trafficSplit,
    });

    // ===========================================
    // Step 5: Build EVSI inputs
    // ===========================================
    const evsiInputs: EVSIInputs = {
      K,
      baselineConversionRate: inputs.baselineConversionRate,
      threshold_L,
      prior,
      n_control: sampleSizes.n_control,
      n_variant: sampleSizes.n_variant,
    };

    // ===========================================
    // Step 6: Build CoD inputs (for UI display)
    // ===========================================
    const priorMean = prior.type === 'uniform'
      ? (prior.low_L! + prior.high_L!) / 2
      : prior.mu_L!;

    const codInputs = {
      K,
      mu_L: priorMean,
      threshold_L,
      testDurationDays: inputs.testDurationDays,
      variantFraction: inputs.trafficSplit,
      decisionLatencyDays: inputs.decisionLatencyDays ?? 0,
    };

    // ===========================================
    // Step 7: Build NetValue inputs (integrated calculation)
    // ===========================================
    // Per COD-03: Net value computed in single coherent simulation
    // This is the primary calculation; EVSI and CoD are for UI decomposition only
    const netValueInputs: NetValueInputs = {
      K,
      baselineConversionRate: inputs.baselineConversionRate,
      threshold_L,
      prior,
      n_control: sampleSizes.n_control,
      n_variant: sampleSizes.n_variant,
      testDurationDays: inputs.testDurationDays,
      variantFraction: inputs.trafficSplit,
      decisionLatencyDays: inputs.decisionLatencyDays ?? 0,
    };

    return {
      prior,
      evsiInputs,
      codInputs,
      netValueInputs,
      sampleSizes,
    };
  }, [
    inputs.baselineConversionRate,
    inputs.annualVisitors,
    inputs.valuePerConversion,
    inputs.priorIntervalLow,
    inputs.priorIntervalHigh,
    inputs.thresholdScenario,
    inputs.thresholdUnit,
    inputs.thresholdValue,
    inputs.priorShape,
    inputs.studentTDf,
    inputs.testDurationDays,
    inputs.dailyTraffic,
    inputs.trafficSplit,
    inputs.eligibilityFraction,
    inputs.decisionLatencyDays,
  ]);

  // ===========================================
  // Step 8: Compute EVSI and integrated Net Value
  // ===========================================
  // Per COD-03: Net value is computed via integrated simulation (calculateNetValueMonteCarlo)
  // EVSI is still computed separately for UI display
  useEffect(() => {
    // Clear results if inputs become invalid
    if (!validatedInputs) {
      setWorkerResults(null);
      setNetValueResults(null);
      setLoading(false);
      return;
    }

    const { prior, evsiInputs, netValueInputs } = validatedInputs;

    // For Normal priors, gate fast path by infeasible tail mass (per ENG-05)
    // When truncation is material, the untruncated closed-form EVSI diverges
    // from the truncated MC net value. Fall back to MC for consistency.
    if (prior.type === 'normal') {
      const infeasibleMass = computeInfeasibleTailMass(
        prior,
        evsiInputs.baselineConversionRate
      );

      if (infeasibleMass <= TRUNCATION_THRESHOLD) {
        // Safe to use fast path -- truncation is negligible
        const evsiResults = calculateEVSINormalFastPath(evsiInputs);
        setWorkerResults(evsiResults);

        // Integrated net value for headline (COD-03)
        // Must use Monte Carlo to integrate timing effects
        const netResults = calculateNetValueMonteCarlo(netValueInputs, 5000);
        setNetValueResults(netResults);

        setLoading(false);
        return;
      }
      // Truncation material for Normal prior -- fall through to MC path below
      // This ensures EVSI, net value, and default decision all operate
      // in the same truncated statistical world
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
        const newWorker = new Worker(
          new URL('../lib/workers/evsi.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = newWorker;

        // Wrap with Comlink for type-safe RPC
        // Worker exposes both computeEVSI (for display) and computeNetValue (for headline)
        const api = Comlink.wrap<{
          computeEVSI: (inputs: typeof evsiInputs, numSamples: number) => EVSIResults;
          computeNetValue: (inputs: NetValueInputs, numSamples: number) => NetValueResults;
        }>(newWorker);

        // Compute both in parallel for efficiency
        const [evsiResults, netResults] = await Promise.all([
          api.computeEVSI(evsiInputs, 5000),
          api.computeNetValue(netValueInputs, 5000),
        ]);

        // Only update if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setWorkerResults(evsiResults);
          setNetValueResults(netResults);
          setLoading(false);
        }
      } catch (error) {
        console.error('EVSI Worker error, falling back to sync:', error);
        if (currentRequestId === requestIdRef.current) {
          try {
            // Synchronous fallback: run Monte Carlo on main thread
            const evsiResults = calculateEVSIMonteCarlo(evsiInputs, 5000);
            const netResults = calculateNetValueMonteCarlo(netValueInputs, 5000);
            setWorkerResults(evsiResults);
            setNetValueResults(netResults);
          } catch (fallbackError) {
            console.error('Sync fallback also failed:', fallbackError);
            setWorkerResults(null);
            setNetValueResults(null);
          }
          setLoading(false);
        }
      } finally {
        // Always terminate the worker when done or on error
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
      }
    };

    runWorker();

    // Cleanup: terminate worker immediately on unmount, invalidate request
    // Capture ref values before cleanup to avoid stale ref reads (react-hooks/exhaustive-deps)
    const currentWorker = workerRef.current;
    return () => {
      requestIdRef.current++; // eslint-disable-line react-hooks/exhaustive-deps -- intentional: invalidate stale requests on cleanup
      if (currentWorker) {
        currentWorker.terminate();
      }
      workerRef.current = null;
    };
  }, [validatedInputs]);

  // ===========================================
  // Step 9: Combine results for UI
  // ===========================================
  const finalResults = useMemo((): EVSICalculationResults | null => {
    // Need both EVSI (for display) and net value (for headline)
    if (!validatedInputs || !workerResults || !netValueResults) {
      return null;
    }

    const { codInputs, sampleSizes } = validatedInputs;

    // Calculate Cost of Delay (for UI display)
    const cod = calculateCostOfDelay(codInputs);

    // Net value comes from INTEGRATED calculation (COD-03)
    // NOT from workerResults.evsiDollars - cod.codDollars
    // The integrated simulation computes timing-aware net value coherently
    const netValueDollars = netValueResults.netValueDollars;

    return {
      evsi: workerResults,
      cod,
      netValueDollars,
      sampleSizes,
    };
  }, [validatedInputs, workerResults, netValueResults]);

  return {
    loading,
    results: finalResults,
  };
}
