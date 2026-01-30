/**
 * Chart Data Generation Utilities
 *
 * Generates density curve data points for visualizing the prior distribution.
 * Uses the Normal distribution PDF to create smooth curve data for Recharts.
 *
 * Mathematical background:
 * For a Normal(mu, sigma) distribution, the PDF is:
 *   f(x) = phi((x - mu) / sigma) / sigma
 *
 * where phi(z) is the standard normal PDF.
 * We generate points across +/- 4 standard deviations (covers 99.99% of distribution).
 */

import { standardNormalPDF } from './statistics';

/**
 * Data point for chart rendering
 *
 * @property liftPercent - Lift value as percentage (e.g., -10 for -10%)
 * @property density - Probability density at this lift (scaled by 1/sigma)
 */
export interface ChartDataPoint {
  liftPercent: number;
  density: number;
}

/**
 * Generate data points for a normal distribution density curve
 *
 * Mathematical approach:
 * - For Normal(mu_L, sigma_L), PDF at x is: f(x) = phi((x - mu_L) / sigma_L) / sigma_L
 * - Generate points from mu_L - 4*sigma_L to mu_L + 4*sigma_L (covers 99.99%)
 * - 100 points provides smooth visual curve without performance impact
 *
 * @param mu_L - Prior mean lift (decimal, e.g., 0.05 for 5%)
 * @param sigma_L - Prior standard deviation (decimal, e.g., 0.05 for 5%)
 * @param numPoints - Number of points to generate (default 100 for smooth curve)
 * @returns Array of chart data points with liftPercent in percentage form
 */
export function generateDensityCurveData(
  mu_L: number,
  sigma_L: number,
  numPoints: number = 100
): ChartDataPoint[] {
  // Handle edge case: very small sigma (essentially a point mass at mean)
  // This prevents division by near-zero and produces a visual "spike"
  if (sigma_L < 0.0001) {
    const meanPercent = mu_L * 100;
    return [
      { liftPercent: meanPercent - 0.1, density: 0 },
      { liftPercent: meanPercent, density: 1 },
      { liftPercent: meanPercent + 0.1, density: 0 },
    ];
  }

  const points: ChartDataPoint[] = [];

  // Range: mu +/- 4 standard deviations covers 99.99% of distribution
  // This ensures the tails taper to near-zero at the edges
  const minLift = mu_L - 4 * sigma_L;
  const maxLift = mu_L + 4 * sigma_L;
  const step = (maxLift - minLift) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const lift = minLift + i * step;

    // Convert lift to z-score: z = (x - mu) / sigma
    const z = (lift - mu_L) / sigma_L;

    // PDF of Normal(mu, sigma) at x is phi(z) / sigma
    // phi(z) is the standard normal PDF
    const density = standardNormalPDF(z) / sigma_L;

    points.push({
      // Convert decimal lift to percentage for display (0.05 -> 5)
      liftPercent: lift * 100,
      density,
    });
  }

  return points;
}

/**
 * Get probability density at a specific lift value
 *
 * Used for positioning markers (e.g., mean indicator dot) on the curve.
 *
 * Mathematical formula:
 *   f(lift) = phi((lift - mu_L) / sigma_L) / sigma_L
 *
 * @param lift_L - Lift value (decimal, e.g., 0.05 for 5%)
 * @param mu_L - Prior mean lift (decimal)
 * @param sigma_L - Prior standard deviation (decimal)
 * @returns Probability density at the specified lift
 */
export function getDensityAtLift(
  lift_L: number,
  mu_L: number,
  sigma_L: number
): number {
  // Handle edge case: very small sigma
  if (sigma_L < 0.0001) {
    // Return 1 at mean, 0 elsewhere (spike approximation)
    return Math.abs(lift_L - mu_L) < 0.0001 ? 1 : 0;
  }

  const z = (lift_L - mu_L) / sigma_L;
  return standardNormalPDF(z) / sigma_L;
}
