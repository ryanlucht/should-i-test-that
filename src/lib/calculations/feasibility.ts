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
