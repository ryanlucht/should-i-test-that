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
 *
 * Per audit recommendations (COD-01, COD-02, COD-03):
 * - netValueDollars computed via integrated calculation (calculateNetValueMonteCarlo)
 * - NOT computed as evsiDollars - codDollars (which has timing inconsistency)
 * - Legacy CoD computation removed per audit Priority 7
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
import { computeEffectivePriorMetrics } from '@/lib/calculations/evsi';
import { calculateNetValueMonteCarlo } from '@/lib/calculations/net-value';
import { computeInfeasibleTailMass, TRUNCATION_THRESHOLD } from '@/lib/calculations/feasibility';
import { buildPriorFromInputs } from '@/lib/prior';
import { getPriorMean } from '@/lib/calculations/distributions';
import type { EVSIInputs, EVSIResults, NetValueInputs, NetValueResults, CalculationWarning } from '@/lib/calculations/types';

/**
 * Combined results from EVSI calculation
 * (Legacy CoDResults and calculateCostOfDelay removed per audit Priority 7:
 *  the separate CoD object used raw prior mean rather than the integrated
 *  simulation, creating an inconsistency. Net value is now the sole headline.)
 */
export interface EVSICalculationResults {
  /** EVSI results including evsiDollars, defaultDecision, probabilities */
  evsi: EVSIResults;
  /** Net value of testing (the headline number, from integrated simulation) */
  netValueDollars: number;
  /** Sample sizes derived from experiment design */
  sampleSizes: {
    n_total: number;
    n_control: number;
    n_variant: number;
  };
  /** Merged warnings from EVSI and net-value calculations (audit P8b) */
  warnings: CalculationWarning[];
  /** Effective prior mean under feasibility truncation (for UI consumption) */
  effectivePriorMean: number;
  /** Effective probability of clearing threshold (for UI consumption -- SA-10c) */
  effectiveProbClears: number;
  /** True when prior has zero feasible mass -- signals UI to suppress interpretive cards (SA-3).
   * Type lives here (hook level) because the hook is where effective metrics are computed.
   * Engine (EVSIResults) returns NaN metrics + warning for this case. */
  isInfeasiblePrior: boolean;
  /** Normalized threshold in decimal lift units (for consistent tie detection / waterfall -- SA-5) */
  threshold_L: number;
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
 * Hook that computes EVSI results from current wizard store state.
 *
 * @returns Object with loading state and calculation results
 *
 * @example
 * const { loading, results } = useEVSICalculations();
 * if (loading) return <Spinner />;
 * if (results) {
 *   console.log(`EVSI: $${results.evsi.evsiDollars}`);
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

  // Cache effective prior metrics computed in useEffect for reuse in finalResults useMemo.
  // Avoids redundant recomputation of computeEffectivePriorMetrics (deterministic but unnecessary).
  const effectiveMetricsRef = useRef<{ effectivePriorMean: number; effectiveProbClears: number } | null>(null);

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
    // Uses centralized buildPriorFromInputs to ensure consistent calibration
    // across all call sites (hook, form preview, results export).
    // Student-t uses t-quantile calibration, not Normal z_0.95.
    const prior = buildPriorFromInputs({
      priorShape: inputs.priorShape,
      studentTDf: inputs.studentTDf ?? undefined,
      intervalLowPercent: inputs.priorIntervalLow,
      intervalHighPercent: inputs.priorIntervalHigh,
    });

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
    // Step 6: Build NetValue inputs (integrated calculation)
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

    // ===========================================
    // Compute effective prior metrics ONCE (Audit-1 fix)
    // ===========================================
    // Deterministic computation: no MC noise. The same effectivePriorMetrics
    // object is passed to both calculateEVSIMonteCarlo and calculateNetValueMonteCarlo
    // ensuring they operate on identical effective-prior data.
    const effectiveMetrics = computeEffectivePriorMetrics(
      prior,
      evsiInputs.threshold_L,
      evsiInputs.baselineConversionRate
    );
    // Cache for reuse in finalResults useMemo (avoids redundant recomputation)
    effectiveMetricsRef.current = effectiveMetrics;

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
        const netResults = calculateNetValueMonteCarlo(netValueInputs, 5000, effectiveMetrics);
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
        // effectivePriorMetrics computed deterministically on main thread, passed to worker
        const api = Comlink.wrap<{
          computeEVSI: (inputs: typeof evsiInputs, numSamples: number, effectivePriorMetrics: typeof effectiveMetrics) => EVSIResults;
          computeNetValue: (inputs: NetValueInputs, numSamples: number, effectivePriorMetrics: typeof effectiveMetrics) => NetValueResults;
        }>(newWorker);

        // Compute both in parallel for efficiency
        // Pass effectiveMetrics (computed once on main thread) to both
        const [evsiResults, netResults] = await Promise.all([
          api.computeEVSI(evsiInputs, 5000, effectiveMetrics),
          api.computeNetValue(netValueInputs, 5000, effectiveMetrics),
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
            const evsiResults = calculateEVSIMonteCarlo(evsiInputs, 5000, effectiveMetrics);
            const netResults = calculateNetValueMonteCarlo(netValueInputs, 5000, effectiveMetrics);
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
    // Read workerRef.current directly (not a captured snapshot) because the
    // Worker is created asynchronously inside runWorker(). A captured value
    // would be null/stale, leaking the actual Worker on rapid re-renders.
    // The ref object identity is stable across renders, so this is safe.
    return () => {
      requestIdRef.current++; // eslint-disable-line react-hooks/exhaustive-deps -- intentional: invalidate stale requests on cleanup
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
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

    const { sampleSizes, evsiInputs } = validatedInputs;
    const netValueDollars = netValueResults.netValueDollars;

    // Read cached effective prior metrics computed in the useEffect (deterministic,
    // so the ref always holds the correct value for the current validatedInputs).
    // Falls back to recomputation only if the ref is unexpectedly null.
    const cachedMetrics = effectiveMetricsRef.current;
    const fallbackMetrics = cachedMetrics
      ?? computeEffectivePriorMetrics(evsiInputs.prior, evsiInputs.threshold_L, evsiInputs.baselineConversionRate);
    const rawEffectiveMean = fallbackMetrics.effectivePriorMean;
    const rawEffectiveProbClears = fallbackMetrics.effectiveProbClears;

    // SA-3: Detect infeasible prior from NaN effective metrics.
    // When the entire prior interval falls outside the feasible conversion range,
    // computeEffectivePriorMetrics returns NaN for both mean and probClears.
    const isInfeasiblePrior = !Number.isFinite(rawEffectiveMean);

    // When infeasible, fall back to raw prior mean for display purposes,
    // but the isInfeasiblePrior flag tells the UI to suppress interpretive copy.
    // This preserves backward compat without fabricating a meaningful decision.
    const effectivePriorMean = isInfeasiblePrior
      ? getPriorMean(evsiInputs.prior)
      : rawEffectiveMean;

    // SA-10c: Expose effective probability of clearing threshold for UI consumption.
    // Zero when infeasible (no feasible mass can clear any threshold).
    const effectiveProbClears = isInfeasiblePrior ? 0 : rawEffectiveProbClears;

    // Merge warnings from EVSI and net-value calculations (audit Priority 8b)
    // Use warning code as dedup key to avoid showing duplicate messages
    // The code field is already a unique identifier per warning type (e.g., 'NEGATIVE_NET_VALUE', 'HIGH_TRUNCATION')
    const evsiWarnings = workerResults.warnings ?? [];
    const netValueWarnings = netValueResults.warnings ?? [];
    const seen = new Set<string>();
    const mergedWarnings: CalculationWarning[] = [];
    for (const w of [...evsiWarnings, ...netValueWarnings]) {
      if (!seen.has(w.code)) {
        seen.add(w.code);
        mergedWarnings.push(w);
      }
    }

    return {
      evsi: workerResults,
      netValueDollars,
      sampleSizes,
      warnings: mergedWarnings,
      effectivePriorMean,
      effectiveProbClears,
      isInfeasiblePrior,
      threshold_L: evsiInputs.threshold_L,
    };
  }, [validatedInputs, workerResults, netValueResults]);

  return {
    loading,
    results: finalResults,
  };
}
