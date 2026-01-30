/**
 * Chart Data Generation Utilities
 *
 * Generates density curve data points for visualizing prior distributions.
 * Supports Normal, Student-t, and Uniform distributions for Recharts rendering.
 *
 * Mathematical background:
 * - Normal: f(x) = phi((x - mu) / sigma) / sigma, range: mu +/- 4*sigma
 * - Student-t: location-scale t-distribution, range: mu +/- 4*sigma
 * - Uniform: constant 1/(b-a) on [a,b], range: exact bounds
 *
 * Per 05-CONTEXT.md: Chart updates live when prior shape changes.
 */

import { standardNormalPDF } from './statistics';
import { pdf, type PriorDistribution } from './distributions';

/**
 * Data point for chart rendering
 *
 * @property liftPercent - Lift value as percentage (e.g., -10 for -10%)
 * @property density - Probability density at this lift
 */
export interface ChartDataPoint {
  liftPercent: number;
  density: number;
}

/**
 * Generate data points for any prior distribution density curve
 *
 * Supports Normal, Student-t, and Uniform distributions via the
 * unified pdf() function from distributions.ts.
 *
 * Range determination by type:
 * - Normal/Student-t: mu +/- 4*sigma (covers 99.99% of Normal, slightly less for t)
 * - Uniform: exact bounds [low, high] with padding for clean rendering
 *
 * @param prior - Prior distribution parameters (Normal, Student-t, or Uniform)
 * @param numPoints - Number of points to generate (default 100 for smooth curve)
 * @returns Array of chart data points with liftPercent in percentage form
 */
export function generateDistributionData(
  prior: PriorDistribution,
  numPoints: number = 100
): ChartDataPoint[] {
  // Handle Uniform distribution separately for clean rectangle rendering
  if (prior.type === 'uniform') {
    const minLift = prior.low_L!;
    const maxLift = prior.high_L!;
    const uniformDensity = pdf(minLift, prior);

    const points: ChartDataPoint[] = [];

    // Add slight padding outside bounds for visual clarity
    const padding = (maxLift - minLift) * 0.05;
    points.push({ liftPercent: (minLift - padding) * 100, density: 0 });
    points.push({ liftPercent: minLift * 100, density: uniformDensity });

    // Interior points (for consistent rendering)
    const interiorPoints = Math.max(numPoints - 4, 2);
    const step = (maxLift - minLift) / (interiorPoints + 1);
    for (let i = 1; i <= interiorPoints; i++) {
      const lift = minLift + i * step;
      points.push({ liftPercent: lift * 100, density: uniformDensity });
    }

    points.push({ liftPercent: maxLift * 100, density: uniformDensity });
    points.push({ liftPercent: (maxLift + padding) * 100, density: 0 });

    return points;
  }

  // Normal or Student-t: use mu +/- 4*sigma range
  const mu_L = prior.mu_L!;
  const sigma_L = prior.sigma_L!;

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

  const minLift = mu_L - 4 * sigma_L;
  const maxLift = mu_L + 4 * sigma_L;
  const step = (maxLift - minLift) / (numPoints - 1);

  const points: ChartDataPoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const lift = minLift + i * step;
    // Use unified pdf() function for all distribution types
    const density = pdf(lift, prior);

    points.push({
      // Convert decimal lift to percentage for display (0.05 -> 5)
      liftPercent: lift * 100,
      density,
    });
  }

  return points;
}

/**
 * Generate data points for a normal distribution density curve
 *
 * BACKWARD COMPATIBILITY WRAPPER: This function maintains the original
 * signature for existing callers. Internally converts to PriorDistribution.
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
  // Convert legacy signature to PriorDistribution and delegate
  const prior: PriorDistribution = {
    type: 'normal',
    mu_L,
    sigma_L,
  };
  return generateDistributionData(prior, numPoints);
}

/**
 * Get probability density at a specific lift value for any distribution
 *
 * Used for positioning markers (e.g., mean indicator dot) on the curve.
 * Supports Normal, Student-t, and Uniform distributions.
 *
 * @param lift_L - Lift value (decimal, e.g., 0.05 for 5%)
 * @param prior - Prior distribution parameters
 * @returns Probability density at the specified lift
 */
export function getDensityAtLiftForPrior(
  lift_L: number,
  prior: PriorDistribution
): number {
  // Handle edge case for Normal/Student-t: very small sigma
  if (
    (prior.type === 'normal' || prior.type === 'student-t') &&
    prior.sigma_L! < 0.0001
  ) {
    // Return 1 at mean, 0 elsewhere (spike approximation)
    return Math.abs(lift_L - prior.mu_L!) < 0.0001 ? 1 : 0;
  }

  return pdf(lift_L, prior);
}

/**
 * Get probability density at a specific lift value (Normal distribution)
 *
 * BACKWARD COMPATIBILITY WRAPPER: Maintains original signature for existing callers.
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
