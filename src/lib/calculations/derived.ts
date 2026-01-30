/**
 * Derived Value Functions for EVPI Calculation
 *
 * These functions convert user inputs into the canonical forms
 * needed for EVPI calculation. All functions are pure with no side effects.
 *
 * Per SPEC.md Section 4 (Notation) and Section 8 (Calculations).
 */

import { standardNormalCDF } from './statistics';
import type { EdgeCaseFlags } from './types';

/**
 * Derive K (annual dollars per unit lift)
 *
 * K is the scaling constant that converts lift (decimal) to dollars.
 *
 * Mathematical formula:
 *   K = N_year * CR0 * V
 *
 * Where:
 *   N_year = Annual visitors
 *   CR0 = Baseline conversion rate (decimal, e.g., 0.032 for 3.2%)
 *   V = Value per conversion (dollars)
 *
 * Per SPEC.md Section 4.2: "dollar scaling constant"
 *
 * @param annualVisitors - N_year: Annual number of visitors
 * @param baselineConversionRate - CR0: Baseline conversion rate as decimal
 * @param valuePerConversion - V: Dollar value per conversion
 * @returns K: Annual dollars per unit lift
 */
export function deriveK(
  annualVisitors: number,
  baselineConversionRate: number,
  valuePerConversion: number
): number {
  return annualVisitors * baselineConversionRate * valuePerConversion;
}

/**
 * Convert threshold to lift units (decimal)
 *
 * The user can specify their threshold in either dollars or lift percentage.
 * This function normalizes to T_L (lift as decimal) for the EVPI calculation.
 *
 * Mathematical formula:
 *   If threshold is in dollars: T_L = T_$ / K
 *   If threshold is in lift: T_L = percentage / 100
 *
 * Per SPEC.md Section 7.2: "T_L = T_$ / K"
 *
 * @param thresholdValue - The threshold value in the stored unit
 * @param thresholdUnit - 'dollars' or 'lift' indicating the unit
 * @param K - Annual dollars per unit lift (only used for dollar conversion)
 * @returns T_L: Threshold as decimal (e.g., 0.05 for 5% lift)
 */
export function normalizeThresholdToLift(
  thresholdValue: number,
  thresholdUnit: 'dollars' | 'lift',
  K: number
): number {
  if (thresholdUnit === 'dollars') {
    // T_L = T_$ / K
    // Defensive: return 0 if K is 0 to avoid division by zero
    return K > 0 ? thresholdValue / K : 0;
  }

  // Lift is stored as percentage (e.g., 5 for 5%)
  // Convert to decimal (e.g., 0.05)
  return thresholdValue / 100;
}

/**
 * Determine default decision based on prior mean vs threshold
 *
 * The "default decision" is what you would decide without running a test,
 * based solely on your prior beliefs about the treatment effect.
 *
 * Decision rule:
 *   If mu_L >= T_L: Ship (expected lift meets or exceeds threshold)
 *   If mu_L < T_L: Don't ship (expected lift below threshold)
 *
 * Per SPEC.md Section 8.1: "if mu_L >= T_L: Ship, else Don't ship"
 *
 * @param mu_L - Prior mean of relative lift (decimal)
 * @param T_L - Threshold in lift units (decimal)
 * @returns 'ship' or 'dont-ship'
 */
export function determineDefaultDecision(
  mu_L: number,
  T_L: number
): 'ship' | 'dont-ship' {
  // Tie goes to ship (>= not >)
  return mu_L >= T_L ? 'ship' : 'dont-ship';
}

/**
 * Detect edge cases that require special UI messaging
 *
 * Edge cases are situations where the EVPI calculation may be:
 * 1. Near-zero: Very small sigma means user is essentially certain
 * 2. One-sided: All prior mass is on one side of threshold
 * 3. Truncated: Prior has significant mass below L = -1 (100% loss)
 *
 * Per 03-CONTEXT.md: "Show educational notes for edge cases"
 *
 * @param sigma_L - Prior standard deviation of lift (decimal)
 * @param mu_L - Prior mean of lift (decimal)
 * @param Phi_z - Standard normal CDF at z = (T_L - mu_L) / sigma_L
 * @returns EdgeCaseFlags indicating which edge cases apply
 */
export function detectEdgeCases(
  sigma_L: number,
  mu_L: number,
  Phi_z: number
): EdgeCaseFlags {
  // Near-zero sigma: user is essentially certain
  // Threshold: sigma_L < 0.1% (0.001)
  const nearZeroSigma = sigma_L < 0.001;

  // Prior one-sided: essentially all mass on one side of threshold
  // Threshold: Phi(z) > 0.9999 or Phi(z) < 0.0001
  const priorOneSided = Phi_z > 0.9999 || Phi_z < 0.0001;

  // Truncation: check if untruncated prior has significant mass below L = -1
  // This matters because lift cannot be less than -100% (complete loss of conversions)
  //
  // Calculate: z_{-1} = (-1 - mu_L) / sigma_L
  // Then: P(L < -1) = Phi(z_{-1})
  // If P(L < -1) > 0.1% (0.001), truncation is significant
  const z_minus1 = (-1 - mu_L) / sigma_L;
  const probBelowMinus1 = standardNormalCDF(z_minus1);
  const truncationApplied = probBelowMinus1 > 0.001;

  return { nearZeroSigma, priorOneSided, truncationApplied };
}
