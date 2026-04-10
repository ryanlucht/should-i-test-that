/**
 * EVSI Web Worker
 *
 * Offloads Monte Carlo EVSI and Net Value computation to background thread.
 * Uses Comlink for type-safe RPC communication.
 *
 * Per 05-RESEARCH.md + audit Priority 2:
 * - Normal priors use fast path ONLY when truncation is negligible
 * - Normal priors with material truncation fall through to Monte Carlo
 * - Student-t and Uniform always use Monte Carlo (~5000 samples)
 * - Target performance: 500ms-2s
 *
 * Per audit recommendations (COD-01, COD-02, COD-03):
 * - computeNetValue provides integrated timing-aware calculation
 * - Net value computed in one coherent simulation (not EVSI - CoD)
 */

import * as Comlink from 'comlink';
import {
  calculateEVSIMonteCarlo,
  calculateEVSINormalFastPath,
} from '../calculations/evsi';
import { calculateNetValueMonteCarlo } from '../calculations/net-value';
import { computeInfeasibleTailMass, TRUNCATION_THRESHOLD } from '../calculations/feasibility';
import type { EVSIInputs, EVSIResults, NetValueInputs, NetValueResults } from '../calculations/types';

/**
 * Compute EVSI - exposed via Comlink
 *
 * Selects calculation path based on prior type and truncation sensitivity:
 * - Normal prior with negligible truncation: O(1) closed-form fast path
 * - Normal prior with material truncation: Monte Carlo (truncation-sensitive)
 * - Student-t/Uniform: Monte Carlo with rejection sampling
 *
 * Per audit Priority 2: Worker must respect the same truncation gate as the hook
 * (useEVSICalculations.ts). When infeasible tail mass exceeds TRUNCATION_THRESHOLD,
 * the closed-form Normal fast path produces biased results because it assumes an
 * untruncated prior.
 *
 * @param inputs - EVSI calculation inputs (K, CR0, threshold_L, prior, sample sizes)
 * @param numSamples - Monte Carlo samples for non-Normal priors (default 5000)
 * @returns EVSI results including evsiDollars, defaultDecision, probabilities
 */
function computeEVSI(
  inputs: EVSIInputs,
  numSamples: number = 5000,
  effectivePriorMetrics?: { effectivePriorMean: number; effectiveProbClears: number }
): EVSIResults {
  if (inputs.prior.type === 'normal') {
    // Per audit Priority 2: Worker must respect the same truncation gate as the hook.
    // When infeasible tail mass is material, the closed-form Normal fast path produces
    // biased results because it assumes an untruncated prior.
    // IMPORTANT: Uses <= (not <) to match hook behavior exactly.
    // Boundary case: infeasibleMass === TRUNCATION_THRESHOLD takes the fast path.
    const infeasibleMass = computeInfeasibleTailMass(
      inputs.prior,
      inputs.baselineConversionRate
    );
    if (infeasibleMass <= TRUNCATION_THRESHOLD) {
      // Safe to use fast path -- truncation is negligible
      return calculateEVSINormalFastPath(inputs);
    }
    // Truncation material -- fall through to Monte Carlo
  }

  // Monte Carlo for Student-t, Uniform, and truncation-sensitive Normal priors
  // Per SPEC.md A5.1: Sample from prior, simulate test, average improvement
  // effectivePriorMetrics computed on main thread (deterministic), passed through
  return calculateEVSIMonteCarlo(inputs, numSamples, effectivePriorMetrics);
}

/**
 * Compute integrated net value of testing - exposed via Comlink
 *
 * Uses single Monte Carlo simulation that computes:
 * - Value during test (variant fraction gets treatment)
 * - Value during latency (conservative: no treatment)
 * - Value after decision (based on posterior mean)
 * - Baseline value (default decision for full year)
 *
 * Net value = avgValueWithTest - avgValueWithoutTest
 * This is the coherent "EVSI - CoD" in one simulation (COD-03).
 *
 * @param inputs - Net value calculation inputs (K, CR0, threshold_L, prior, timing params)
 * @param numSamples - Monte Carlo samples (default 5000)
 * @returns NetValueResults including netValueDollars, defaultDecision, probabilities
 */
function computeNetValue(
  inputs: NetValueInputs,
  numSamples: number = 5000,
  effectivePriorMetrics?: { effectivePriorMean: number; effectiveProbClears: number }
): NetValueResults {
  return calculateNetValueMonteCarlo(inputs, numSamples, effectivePriorMetrics);
}

// Expose the API via Comlink
// computeEVSI: backwards compatible for EVSI-only computation
// computeNetValue: integrated timing-aware net value calculation
Comlink.expose({ computeEVSI, computeNetValue });
