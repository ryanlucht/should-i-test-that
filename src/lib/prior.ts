/**
 * Prior Distribution Utilities
 *
 * Functions for computing prior parameters from user inputs.
 * The prior represents uncertainty about relative lift L.
 *
 * Key formulas (from SPEC.md Section 6.2):
 *   Normal:    sigma_L = (L_high - L_low) / (2 * z_0.95)
 *   Student-t: sigma_L = (L_high - L_low) / (2 * t_inv(0.95, df))
 *   Uniform:   low_L = L_low / 100, high_L = L_high / 100
 *
 * Where z_0.95 = 1.6448536, t_inv uses jStat.studentt.inv
 *
 * SINGLE SOURCE OF TRUTH: buildPriorFromInputs() is the only function
 * that constructs PriorDistribution objects from user inputs. All call
 * sites (hook, form preview, results export) must use this helper.
 */

import jStat from 'jstat';
import type { PriorDistribution } from './calculations/types';

/**
 * z-score for 95th percentile of standard normal distribution
 * Used to convert 90% credible interval to standard deviation
 *
 * Value: qnorm(0.95) = 1.6448536...
 * This is the critical value such that P(Z < 1.6448536) = 0.95 for Z ~ N(0,1)
 */
const Z_95 = 1.6448536;

/**
 * Divisor for converting interval width to standard deviation
 * For a 90% central interval: width = 2 * z_0.95 * sigma
 * Therefore: sigma = width / (2 * z_0.95)
 */
const SIGMA_DIVISOR = 2 * Z_95; // ≈ 3.289707

/**
 * Parameters for a Normal prior distribution over relative lift L
 */
export interface PriorParameters {
  /** Mean of prior distribution (decimal, e.g., 0.05 for 5% expected lift) */
  mu_L: number;
  /** Standard deviation of prior (decimal) */
  sigma_L: number;
}

/**
 * Compute Normal prior parameters from a 90% credible interval
 *
 * Given L_low and L_high as the 5th and 95th percentiles,
 * compute mu_L (mean) and sigma_L (standard deviation).
 *
 * Formula derivation (SPEC.md Section 6.2):
 *   - For Normal(mu, sigma), the 90% central interval is [mu - 1.6449*sigma, mu + 1.6449*sigma]
 *   - Given L_low = mu - 1.6449*sigma and L_high = mu + 1.6449*sigma
 *   - mu = (L_low + L_high) / 2
 *   - sigma = (L_high - L_low) / (2 * 1.6449)
 *
 * @param intervalLowPercent - Lower bound of 90% interval (percentage, e.g., -5 for -5%)
 * @param intervalHighPercent - Upper bound of 90% interval (percentage, e.g., 10 for 10%)
 * @returns Prior parameters { mu_L, sigma_L } as decimals
 *
 * @example
 * // Default prior equivalent
 * computePriorFromInterval(-8.22, 8.22)
 * // => { mu_L: 0, sigma_L: ~0.05 }
 *
 * @example
 * // Asymmetric interval (expecting positive lift)
 * computePriorFromInterval(-5, 15)
 * // => { mu_L: 0.05, sigma_L: ~0.0608 }
 */
export function computePriorFromInterval(
  intervalLowPercent: number,
  intervalHighPercent: number
): PriorParameters {
  // Convert from percentage to decimal
  // e.g., -5% becomes -0.05, 10% becomes 0.10
  const L_low = intervalLowPercent / 100;
  const L_high = intervalHighPercent / 100;

  // Mean is the midpoint of the interval
  const mu_L = (L_low + L_high) / 2;

  // Standard deviation from interval width
  // sigma = (L_high - L_low) / (2 * z_0.95)
  const sigma_L = (L_high - L_low) / SIGMA_DIVISOR;

  return { mu_L, sigma_L };
}

/**
 * Default prior values per SPEC.md Section 6.2
 *
 * Normal distribution centered at 0 with SD 0.05:
 *   L ~ Normal(0, 0.05)
 *
 * This implies:
 *   - 50% chance the true lift is positive
 *   - 90% confidence the lift is between -8.2% and +8.2%
 *   - Prior expectation of 0% lift (no bias toward positive or negative)
 *
 * Note: This matches Eppo's documented default prior for Bayesian A/B analysis.
 */
export const DEFAULT_PRIOR: PriorParameters = {
  mu_L: 0,
  sigma_L: 0.05,
};

/**
 * Default interval values that produce the default prior
 *
 * Derivation:
 *   Given sigma_L = 0.05 and mu_L = 0
 *   Interval width = 2 * z_0.95 * sigma_L = 2 * 1.6449 * 0.05 = 0.16449 (as decimal)
 *   In percentage: width = 16.449%
 *   Centered at 0: L_low = -8.22%, L_high = +8.22%
 *
 * These values are pre-populated in the custom interval inputs when
 * the user selects "Use Recommended Default".
 */
export const DEFAULT_INTERVAL = {
  /** Lower bound in percentage (5th percentile) */
  low: -8.22,
  /** Upper bound in percentage (95th percentile) */
  high: 8.22,
};

/**
 * Compute Student-t prior scale from a 90% credible interval
 *
 * For a Student-t(mu, sigma, df) distribution, the 90% central interval is:
 *   [mu - t_inv(0.95, df) * sigma, mu + t_inv(0.95, df) * sigma]
 *
 * Therefore: sigma = (L_high - L_low) / (2 * t_inv(0.95, df))
 *
 * CRITICAL: This uses the Student-t quantile (t_inv), NOT the Normal quantile (z_0.95).
 * Using z_0.95 instead would produce incorrect (too large) sigma_L values because
 * the t-distribution has heavier tails, so t_inv(0.95, df) > z_0.95.
 *
 * @param intervalLowPercent - Lower bound of 90% interval (percentage, e.g., -8.22)
 * @param intervalHighPercent - Upper bound of 90% interval (percentage, e.g., 8.22)
 * @param df - Degrees of freedom for the Student-t distribution
 * @returns Prior parameters { mu_L, sigma_L } as decimals
 */
export function computeStudentTPriorScale(
  intervalLowPercent: number,
  intervalHighPercent: number,
  df: number
): PriorParameters {
  // Convert from percentage to decimal (same convention as computePriorFromInterval)
  // e.g., -8.22% becomes -0.0822, 8.22% becomes 0.0822
  const L_low = intervalLowPercent / 100;
  const L_high = intervalHighPercent / 100;

  // Mean is the midpoint of the interval (same as Normal case)
  const mu_L = (L_low + L_high) / 2;

  // Student-t quantile at 95th percentile for the given df
  // t_inv(0.95, df) > z_0.95 for all finite df (heavier tails)
  // As df -> infinity, t_inv(0.95, df) -> z_0.95
  const t_95 = jStat.studentt.inv(0.95, df);

  // Scale parameter: sigma = interval_width / (2 * t_quantile)
  // This is the t-calibrated version of the Normal formula
  const sigma_L = (L_high - L_low) / (2 * t_95);

  return { mu_L, sigma_L };
}

/**
 * Build a PriorDistribution from user inputs.
 *
 * SINGLE SOURCE OF TRUTH for prior construction.
 * All call sites (useEVSICalculations hook, UncertaintyPriorForm preview,
 * AdvancedResultsSection export) MUST use this function to avoid
 * duplicated logic and calibration bugs (e.g., the Student-t double-division bug).
 *
 * INPUT CONVENTION: intervalLowPercent and intervalHighPercent are PERCENTAGE values
 * as entered by the user (e.g., -8.22 for -8.22%). This function handles the
 * conversion to decimal internally. Do NOT pre-divide by 100.
 *
 * @param params.priorShape - Selected distribution shape
 * @param params.studentTDf - Degrees of freedom (required for 'student-t')
 * @param params.intervalLowPercent - Lower bound of 90% interval in percentage (null -> DEFAULT_INTERVAL.low)
 * @param params.intervalHighPercent - Upper bound of 90% interval in percentage (null -> DEFAULT_INTERVAL.high)
 * @returns PriorDistribution ready for use in EVSI calculations
 */
export function buildPriorFromInputs(params: {
  priorShape: 'normal' | 'student-t' | 'uniform';
  studentTDf?: number;
  intervalLowPercent: number | null;
  intervalHighPercent: number | null;
}): PriorDistribution {
  // Apply default interval fallback for null inputs
  // This matches the existing behavior in all 3 call sites
  const low = params.intervalLowPercent ?? DEFAULT_INTERVAL.low;
  const high = params.intervalHighPercent ?? DEFAULT_INTERVAL.high;

  switch (params.priorShape) {
    case 'normal': {
      // Normal prior: use z_0.95 calibration via computePriorFromInterval
      // computePriorFromInterval accepts PERCENTAGE values and divides by 100 internally
      const { mu_L, sigma_L } = computePriorFromInterval(low, high);
      return { type: 'normal', mu_L, sigma_L };
    }

    case 'student-t': {
      // Student-t prior: use t_inv(0.95, df) calibration via computeStudentTPriorScale
      // CRITICAL: This is the fix for the double-division bug (Priority 1).
      // Previously, all 3 call sites used normalParams.sigma_L (z_0.95 calibration)
      // instead of t-calibrated scale, producing incorrect sigma_L values.
      const df = params.studentTDf ?? 5;
      const { mu_L, sigma_L } = computeStudentTPriorScale(low, high, df);
      return { type: 'student-t', mu_L, sigma_L, df };
    }

    case 'uniform': {
      // Uniform prior: convert percentage bounds to decimal directly
      // No calibration needed -- the interval IS the distribution
      const low_L = low / 100;
      const high_L = high / 100;
      return { type: 'uniform', low_L, high_L };
    }
  }
}
