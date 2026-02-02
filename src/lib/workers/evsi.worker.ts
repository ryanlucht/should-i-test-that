/**
 * EVSI Web Worker
 *
 * Offloads Monte Carlo EVSI and Net Value computation to background thread.
 * Uses Comlink for type-safe RPC communication.
 *
 * Per 05-RESEARCH.md:
 * - Normal priors use fast path (closed-form, no Monte Carlo)
 * - Student-t and Uniform use Monte Carlo (~5000 samples)
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
import type { EVSIInputs, EVSIResults, NetValueInputs, NetValueResults } from '../calculations/types';

/**
 * Compute EVSI - exposed via Comlink
 *
 * Selects fast path for Normal priors, Monte Carlo otherwise.
 *
 * Mathematical note:
 * - Normal prior: O(1) closed-form using conjugate Normal-Normal update
 * - Student-t/Uniform: O(n) Monte Carlo with rejection sampling for feasibility
 *
 * @param inputs - EVSI calculation inputs (K, CR0, threshold_L, prior, sample sizes)
 * @param numSamples - Monte Carlo samples for non-Normal priors (default 5000)
 * @returns EVSI results including evsiDollars, defaultDecision, probabilities
 */
function computeEVSI(
  inputs: EVSIInputs,
  numSamples: number = 5000
): EVSIResults {
  if (inputs.prior.type === 'normal') {
    // Fast path: closed-form for Normal prior (O(1))
    // Per SPEC.md A5.2: Uses pre-posterior analysis with conjugate update
    return calculateEVSINormalFastPath(inputs);
  }

  // Monte Carlo for Student-t and Uniform priors
  // Per SPEC.md A5.1: Sample from prior, simulate test, average improvement
  return calculateEVSIMonteCarlo(inputs, numSamples);
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
  numSamples: number = 5000
): NetValueResults {
  return calculateNetValueMonteCarlo(inputs, numSamples);
}

// Expose the API via Comlink
// computeEVSI: backwards compatible for EVSI-only computation
// computeNetValue: integrated timing-aware net value calculation
Comlink.expose({ computeEVSI, computeNetValue });
