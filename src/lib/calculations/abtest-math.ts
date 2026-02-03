/**
 * Shared A/B Test Math Utilities
 *
 * Centralized location for common A/B test calculations used across
 * EVSI, Net Value, and distribution sampling modules.
 *
 * Consolidates per Cleanup-01 audit recommendation:
 * - Standard error of relative lift
 * - Lift feasibility bounds
 * - Box-Muller standard normal sampling
 * - General normal PDF (for non-standard normal)
 */

import { standardNormalPDF } from './statistics';

/**
 * Feasibility bounds for lift values
 *
 * For A/B tests, the variant conversion rate CR1 = CR0 * (1 + L)
 * must be in [0, 1], which constrains L:
 *   - L_min = -1 (CR1 = 0)
 *   - L_max = 1/CR0 - 1 (CR1 = 1)
 *
 * @param CR0 - Baseline conversion rate (0 < CR0 < 1)
 * @returns Object with L_min and L_max bounds
 */
export function liftFeasibilityBounds(CR0: number): { L_min: number; L_max: number } {
  return { L_min: -1, L_max: 1 / CR0 - 1 };
}

/**
 * Sample from standard normal distribution using Box-Muller transform
 *
 * Mathematical basis:
 *   z = sqrt(-2 * ln(U1)) * cos(2 * pi * U2)
 *   where U1, U2 ~ Uniform(0,1)
 *
 * Guard: U1 is clamped to minimum 1e-16 to prevent Math.log(0) = -Infinity
 *
 * @returns Random sample from N(0,1)
 */
export function sampleStandardNormal(): number {
  const u1 = Math.max(Math.random(), 1e-16);
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Normal probability density function for arbitrary mean and standard deviation
 *
 * Mathematical formula:
 *   f(x; mu, sigma) = phi((x - mu) / sigma) / sigma
 *   where phi is the standard normal PDF
 *
 * This replaces jStat.normal.pdf calls with our existing standardNormalPDF.
 *
 * @param x - Value at which to evaluate the PDF
 * @param mean - Mean of the normal distribution
 * @param sd - Standard deviation of the normal distribution
 * @returns Probability density at x
 */
export function normalPdf(x: number, mean: number, sd: number): number {
  const z = (x - mean) / sd;
  return standardNormalPDF(z) / sd;
}

/**
 * Standard error of relative lift estimate from A/B test
 *
 * For relative lift L = (CR1 - CR0) / CR0:
 *   SE(L) = sqrt((1-CR0)/CR0 * (1/n_control + 1/n_variant))
 *
 * Derivation: Delta method applied to ratio of binomial proportions.
 * See SPEC.md Section A5 for full derivation.
 *
 * @param CR0 - Baseline conversion rate
 * @param n_control - Control group sample size
 * @param n_variant - Variant group sample size
 * @returns Standard error of the lift estimate
 */
export function seOfRelativeLift(CR0: number, n_control: number, n_variant: number): number {
  // Variance factor: (1 - CR0) / CR0
  // Sample factor: 1/n_control + 1/n_variant
  // SE = sqrt(varianceFactor * sampleFactor)
  const varianceFactor = (1 - CR0) / CR0;
  const sampleFactor = 1 / n_control + 1 / n_variant;
  return Math.sqrt(varianceFactor * sampleFactor);
}
