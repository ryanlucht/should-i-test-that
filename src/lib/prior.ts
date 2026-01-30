/**
 * Prior Distribution Utilities
 *
 * Functions for computing Normal prior parameters from user inputs.
 * The prior represents uncertainty about relative lift L.
 *
 * Key formulas (from SPEC.md Section 6.2):
 *   mu_L = (L_low + L_high) / 2
 *   sigma_L = (L_high - L_low) / (2 * z_0.95)
 *
 * Where z_0.95 = 1.6448536 (95th percentile of standard normal)
 */

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
