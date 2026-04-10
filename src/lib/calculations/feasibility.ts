/**
 * Shared feasibility module.
 *
 * Owns all truncation-related logic to ensure EVSI, net value, and fast-path
 * routing all operate in the same feasible statistical world.
 *
 * Extracted here to avoid cross-module coupling between evsi.ts and net-value.ts
 * (Codex review finding: HIGH severity).
 */

import { cdf } from './distributions';
import { liftFeasibilityBounds } from './abtest-math';
import type { PriorDistribution } from './distributions';
import type { CalculationWarning } from './types';

/**
 * Threshold for "material" truncation. When infeasible tail mass exceeds this,
 * we switch from untruncated to truncated handling.
 *
 * Rationale: 0.1% is small enough that ignoring it introduces negligible error
 * in the untruncated path, but large enough to detect meaningful truncation
 * for high-CR0 cases (e.g., CR0=0.90 with Normal(0, 0.10) has ~13% infeasible mass).
 *
 * This value is used in evsi.ts, net-value.ts, and useEVSICalculations.ts.
 */
export const TRUNCATION_THRESHOLD = 0.001;

/**
 * Compute fraction of prior mass outside feasible lift bounds [L_min, L_max].
 * Used to detect when truncation is material and the Normal fast path should be bypassed.
 *
 * Mathematical basis:
 * - L_min = -1 (lift cannot make conversion rate negative)
 * - L_max = 1/CR0 - 1 (lift cannot make conversion rate exceed 1)
 * - Infeasible mass = P(L < L_min) + P(L > L_max)
 *
 * @param prior - Prior distribution
 * @param CR0 - Baseline conversion rate (determines L_max = 1/CR0 - 1)
 * @returns Fraction of prior mass outside [L_min, L_max], range [0, 1]
 */
export function computeInfeasibleTailMass(
  prior: PriorDistribution,
  CR0: number
): number {
  const { L_min, L_max } = liftFeasibilityBounds(CR0);
  // Mass below L_min (-1) + mass above L_max (1/CR0 - 1)
  const massBelow = cdf(L_min, prior);          // P(L < -1)
  const massAbove = 1 - cdf(L_max, prior);      // P(L > 1/CR0 - 1)
  return massBelow + massAbove;
}

/**
 * Check if Normal approximation for lift may be unreliable due to low expected conversions.
 * Threshold: min(n_control * CR0, n_variant * CR0) < 20
 * Per Accuracy-08.
 *
 * @param n_control - Control group sample size
 * @param n_variant - Variant group sample size
 * @param CR0 - Baseline conversion rate
 * @returns CalculationWarning if expected conversions are low, null otherwise
 */
export function checkRareEventsWarning(
  n_control: number, n_variant: number, CR0: number
): CalculationWarning | null {
  // minExpected = smallest expected conversion count across arms
  const minExpected = Math.min(n_control * CR0, n_variant * CR0);
  if (minExpected < 20) {
    return {
      code: 'rare_events',
      message: 'Expected conversions per group are low (<20). The normal approximation for lift may be less accurate. Consider increasing test duration or traffic.',
    };
  }
  return null;
}

/**
 * Check if too few MC samples were accepted after feasibility filtering.
 * Threshold: validSamples < numSamples * 0.5
 * Per ENG-12.
 *
 * @param validSamples - Number of samples accepted after feasibility filtering
 * @param numSamples - Number of samples originally requested
 * @returns CalculationWarning if acceptance rate is low, null otherwise
 */
export function checkLowAcceptanceWarning(
  validSamples: number, numSamples: number
): CalculationWarning | null {
  if (validSamples < numSamples * 0.5) {
    return {
      code: 'low_acceptance',
      message: `Only ${validSamples} of ${numSamples} requested samples were accepted after feasibility filtering. Results may be less precise. Consider narrowing the prior interval or verifying the baseline conversion rate.`,
    };
  }
  return null;
}

/**
 * Checks if effective-prior metrics indicate an infeasible prior
 * (zero feasible mass within conversion-rate bounds).
 * Returns a typed CalculationWarning if infeasible, null otherwise.
 *
 * This is the ONLY place NaN from infeasible priors is converted to
 * a user-facing warning. MC functions that call this return evsiDollars=0
 * and netValueDollars=0 with this warning -- NaN never reaches dollar outputs.
 */
export function checkInfeasiblePriorWarning(
  effectivePriorMean: number,
  effectiveProbClears: number
): CalculationWarning | null {
  if (isNaN(effectivePriorMean) || isNaN(effectiveProbClears)) {
    return {
      code: 'infeasible_prior_support',
      message: 'The prior distribution has no feasible mass within conversion rate bounds. Check that your prior interval is compatible with the baseline conversion rate.',
    };
  }
  return null;
}

/**
 * Check if rejection rate exceeds 10% of total attempted samples.
 * Per Edge Case 6.
 *
 * @param validSamples - Number of samples accepted
 * @param rejectedSamples - Number of samples rejected
 * @returns CalculationWarning if rejection rate is high, null otherwise
 */
export function checkHighRejectionWarning(
  validSamples: number, rejectedSamples: number
): CalculationWarning | null {
  const totalAttempted = validSamples + rejectedSamples;
  if (totalAttempted > 0) {
    const rejectionRate = rejectedSamples / totalAttempted;
    if (rejectionRate > 0.10) {
      return {
        code: 'high_rejection',
        message: `High rejection rate (${Math.round(rejectionRate * 100)}%) due to prior mass outside feasible conversion bounds. Consider narrowing the prior interval or verifying the baseline conversion rate.`,
      };
    }
  }
  return null;
}
