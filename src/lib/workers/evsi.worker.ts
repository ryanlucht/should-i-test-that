/**
 * EVSI Web Worker
 *
 * Offloads Monte Carlo EVSI computation to background thread.
 * Uses Comlink for type-safe RPC communication.
 *
 * Per 05-RESEARCH.md:
 * - Normal priors use fast path (closed-form, no Monte Carlo)
 * - Student-t and Uniform use Monte Carlo (~5000 samples)
 * - Target performance: 500ms-2s
 */

import * as Comlink from 'comlink';
import {
  calculateEVSIMonteCarlo,
  calculateEVSINormalFastPath,
} from '../calculations/evsi';
import type { EVSIInputs, EVSIResults } from '../calculations/types';

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

// Expose the API via Comlink
Comlink.expose({ computeEVSI });
