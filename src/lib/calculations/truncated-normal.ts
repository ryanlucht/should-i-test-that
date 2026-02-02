/**
 * Truncated Normal Distribution Functions
 *
 * Mathematical primitives for computing metrics of a Normal distribution
 * N(mu, sigma^2) truncated to L >= lower.
 *
 * Reference: Wikipedia "Truncated normal distribution"
 * https://en.wikipedia.org/wiki/Truncated_normal_distribution
 *
 * Key definitions:
 * - alpha = (lower - mu) / sigma (standardized lower bound)
 * - Z = 1 - Phi(alpha) (survival probability = normalization constant)
 * - lambda = phi(alpha) / Z (inverse Mills ratio)
 *
 * These functions are used by TRUNC-01/02/03 requirements to ensure
 * prior metrics (mean, variance) are computed on the truncated distribution,
 * maintaining consistency with EVSI Monte Carlo rejection sampling.
 */

import { standardNormalPDF, standardNormalCDF } from './statistics';

/**
 * Minimum survival probability Z to avoid numerical instability.
 *
 * When Z < MIN_Z, almost all probability mass is below the truncation bound.
 * In this case, the distribution degenerates to a point mass at the bound.
 */
const MIN_Z = 1e-10;

/**
 * Truncated normal mean: E[L | L >= lower]
 *
 * Mathematical formula:
 *   E[L | L >= lower] = mu + sigma * lambda
 *   where lambda = phi(alpha) / Z (inverse Mills ratio)
 *         alpha = (lower - mu) / sigma
 *         Z = 1 - Phi(alpha) (survival probability)
 *
 * Intuition: Truncating the lower tail removes low values, shifting the mean upward.
 *            The shift is proportional to the inverse Mills ratio.
 *
 * @param mu - Mean of the untruncated normal distribution
 * @param sigma - Standard deviation of the untruncated normal distribution (must be > 0)
 * @param lower - Lower truncation bound (L >= lower)
 * @returns Conditional expectation E[L | L >= lower]
 */
export function truncatedNormalMean(
  mu: number,
  sigma: number,
  lower: number
): number {
  // alpha = (lower - mu) / sigma: standardized lower bound
  // This tells us how many standard deviations the bound is from the mean
  const alpha = (lower - mu) / sigma;

  // Z = 1 - Phi(alpha): survival probability = P(L >= lower)
  // This is the fraction of the original distribution above the bound
  const Z = 1 - standardNormalCDF(alpha);

  // Handle degenerate case: almost all mass is below the truncation bound
  // The distribution collapses to a point mass at the bound
  if (Z < MIN_Z) {
    return lower;
  }

  // lambda = phi(alpha) / Z: inverse Mills ratio
  // This ratio appears in all truncated normal formulas
  const lambda = standardNormalPDF(alpha) / Z;

  // E[L | L >= lower] = mu + sigma * lambda
  // The mean shifts upward by sigma * lambda due to truncation
  return mu + sigma * lambda;
}

/**
 * Truncated normal variance: Var[L | L >= lower]
 *
 * Mathematical formula:
 *   Var[L | L >= lower] = sigma^2 * [1 + alpha*lambda - lambda^2]
 *   where lambda = phi(alpha) / Z
 *         alpha = (lower - mu) / sigma
 *         Z = 1 - Phi(alpha)
 *
 * Intuition: Truncation removes values from one tail, reducing the spread.
 *            The variance is always less than the original sigma^2.
 *
 * Note: The term [1 + alpha*lambda - lambda^2] is always in (0, 1] for lower truncation,
 * ensuring the truncated variance is always positive and less than original.
 *
 * @param mu - Mean of the untruncated normal distribution
 * @param sigma - Standard deviation of the untruncated normal distribution (must be > 0)
 * @param lower - Lower truncation bound (L >= lower)
 * @returns Conditional variance Var[L | L >= lower]
 */
export function truncatedNormalVariance(
  mu: number,
  sigma: number,
  lower: number
): number {
  // alpha = (lower - mu) / sigma: standardized lower bound
  const alpha = (lower - mu) / sigma;

  // Z = 1 - Phi(alpha): survival probability
  const Z = 1 - standardNormalCDF(alpha);

  // Handle degenerate case: distribution is essentially a point mass
  // Variance of a point mass is 0
  if (Z < MIN_Z) {
    return 0;
  }

  // lambda = phi(alpha) / Z: inverse Mills ratio
  const lambda = standardNormalPDF(alpha) / Z;

  // Variance multiplier: [1 + alpha*lambda - lambda^2]
  // This factor accounts for:
  // - alpha*lambda: how the cutoff point affects spread
  // - -lambda^2: reduction in variance due to mean shift
  const varianceMultiplier = 1 + alpha * lambda - lambda * lambda;

  // Var[L | L >= lower] = sigma^2 * varianceMultiplier
  // Ensure non-negative (numerical precision)
  return Math.max(0, sigma * sigma * varianceMultiplier);
}

/**
 * Truncated normal CDF: P(L <= x | L >= lower)
 *
 * Mathematical formula:
 *   For x >= lower: P(L <= x | L >= lower) = [Phi((x-mu)/sigma) - Phi(alpha)] / Z
 *   For x < lower: P(L <= x | L >= lower) = 0
 *
 * Derivation:
 *   P(L <= x | L >= lower) = P(lower <= L <= x) / P(L >= lower)
 *                          = [Phi((x-mu)/sigma) - Phi((lower-mu)/sigma)] / Z
 *                          = [Phi(beta) - Phi(alpha)] / Z
 *   where beta = (x - mu) / sigma
 *
 * @param x - Point at which to evaluate the CDF
 * @param mu - Mean of the untruncated normal distribution
 * @param sigma - Standard deviation of the untruncated normal distribution (must be > 0)
 * @param lower - Lower truncation bound (L >= lower)
 * @returns Conditional probability P(L <= x | L >= lower)
 */
export function truncatedNormalCDF(
  x: number,
  mu: number,
  sigma: number,
  lower: number
): number {
  // Below the truncation bound: no probability mass exists
  if (x < lower) {
    return 0;
  }

  // At the truncation bound: CDF is 0 (no mass at or below the bound in the truncated distribution)
  // Note: The truncated distribution has support [lower, infinity), with P(L = lower) = 0 for continuous dist
  if (x === lower) {
    return 0;
  }

  // alpha = (lower - mu) / sigma: standardized lower bound
  const alpha = (lower - mu) / sigma;

  // beta = (x - mu) / sigma: standardized query point
  const beta = (x - mu) / sigma;

  // Z = 1 - Phi(alpha): survival probability (normalization constant)
  const Z = 1 - standardNormalCDF(alpha);

  // Handle degenerate case: point mass at lower bound
  // CDF is 0 for x < lower, 1 for x >= lower
  if (Z < MIN_Z) {
    return 1;
  }

  // P(L <= x | L >= lower) = [Phi(beta) - Phi(alpha)] / Z
  const cdf = (standardNormalCDF(beta) - standardNormalCDF(alpha)) / Z;

  // Clamp to [0, 1] for numerical stability
  return Math.max(0, Math.min(1, cdf));
}

/**
 * Truncated normal PDF: f(x | L >= lower)
 *
 * Mathematical formula:
 *   For x >= lower: f(x | L >= lower) = phi((x-mu)/sigma) / (sigma * Z)
 *   For x < lower: f(x | L >= lower) = 0
 *
 * Derivation:
 *   The PDF is the derivative of the CDF. Since we divide by Z, the PDF is
 *   rescaled (stretched vertically) by 1/Z to integrate to 1 over [lower, infinity).
 *
 * Note: The PDF at x = lower is positive (unlike CDF which is 0), representing
 * the density at the truncation boundary.
 *
 * @param x - Point at which to evaluate the PDF
 * @param mu - Mean of the untruncated normal distribution
 * @param sigma - Standard deviation of the untruncated normal distribution (must be > 0)
 * @param lower - Lower truncation bound (L >= lower)
 * @returns Probability density f(x | L >= lower)
 */
export function truncatedNormalPDF(
  x: number,
  mu: number,
  sigma: number,
  lower: number
): number {
  // Below the truncation bound: no probability density
  if (x < lower) {
    return 0;
  }

  // alpha = (lower - mu) / sigma: standardized lower bound
  const alpha = (lower - mu) / sigma;

  // beta = (x - mu) / sigma: standardized query point
  const beta = (x - mu) / sigma;

  // Z = 1 - Phi(alpha): survival probability (normalization constant)
  const Z = 1 - standardNormalCDF(alpha);

  // Handle degenerate case: point mass at lower bound
  // For continuous approximation, return 0 for x != lower
  // This is a limiting behavior; in practice, use truncatedNormalMean/Variance for degenerate cases
  if (Z < MIN_Z) {
    // Return a very large value at exactly lower, 0 elsewhere
    // This approximates a Dirac delta at lower
    return x === lower ? 1 / MIN_Z : 0;
  }

  // f(x | L >= lower) = phi(beta) / (sigma * Z)
  // phi(beta) is the standard normal PDF at the standardized point
  // We divide by sigma to convert from standard to general normal
  // We divide by Z to renormalize the truncated distribution
  return standardNormalPDF(beta) / (sigma * Z);
}
