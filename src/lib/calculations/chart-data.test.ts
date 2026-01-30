/**
 * Chart Data Generation Tests
 *
 * Tests for density curve data generation functions.
 * Verifies mathematical correctness and edge case handling.
 */

import { describe, it, expect } from 'vitest';
import {
  generateDensityCurveData,
  generateDistributionData,
  getDensityAtLift,
  getDensityAtLiftForPrior,
} from './chart-data';
import { standardNormalPDF, SQRT_2_PI } from './statistics';
import type { PriorDistribution } from './distributions';

describe('generateDensityCurveData', () => {
  it('returns 100 points by default', () => {
    const data = generateDensityCurveData(0, 0.05);
    expect(data).toHaveLength(100);
  });

  it('returns requested number of points', () => {
    const data = generateDensityCurveData(0, 0.05, 50);
    expect(data).toHaveLength(50);
  });

  it('covers correct range: mu +/- 4 sigma', () => {
    const mu_L = 0.03; // 3%
    const sigma_L = 0.05; // 5%
    const data = generateDensityCurveData(mu_L, sigma_L);

    // Expected range: 3% +/- 4 * 5% = -17% to +23%
    const minPercent = (mu_L - 4 * sigma_L) * 100; // -17
    const maxPercent = (mu_L + 4 * sigma_L) * 100; // 23

    // First and last points should be at boundaries
    expect(data[0].liftPercent).toBeCloseTo(minPercent, 5);
    expect(data[data.length - 1].liftPercent).toBeCloseTo(maxPercent, 5);
  });

  it('density is maximum at the mean', () => {
    const mu_L = 0.02; // 2%
    const sigma_L = 0.05; // 5%
    const data = generateDensityCurveData(mu_L, sigma_L);

    // Find the point closest to the mean
    const meanPercent = mu_L * 100;
    const closestToMean = data.reduce((closest, point) =>
      Math.abs(point.liftPercent - meanPercent) <
      Math.abs(closest.liftPercent - meanPercent)
        ? point
        : closest
    );

    // All other points should have lower or equal density
    const maxDensity = Math.max(...data.map((p) => p.density));
    expect(closestToMean.density).toBeCloseTo(maxDensity, 5);
  });

  it('liftPercent is in percentage form (not decimal)', () => {
    const mu_L = 0.05; // 5% as decimal
    const sigma_L = 0.03;
    const data = generateDensityCurveData(mu_L, sigma_L);

    // Mean should be at 5 (percent), not 0.05 (decimal)
    const meanPoint = data.find(
      (p) => Math.abs(p.liftPercent - 5) < 0.5
    );
    expect(meanPoint).toBeDefined();

    // All values should be in reasonable percentage range (not tiny decimals)
    const avgAbsValue =
      data.reduce((sum, p) => sum + Math.abs(p.liftPercent), 0) / data.length;
    expect(avgAbsValue).toBeGreaterThan(0.1); // Would be tiny if still decimal
  });

  it('density values match expected PDF formula', () => {
    const mu_L = 0;
    const sigma_L = 0.05;
    const data = generateDensityCurveData(mu_L, sigma_L);

    // Find point closest to mean
    const meanPoint = data.reduce((closest, point) =>
      Math.abs(point.liftPercent) < Math.abs(closest.liftPercent)
        ? point
        : closest
    );

    // Expected density at mean: phi(0) / sigma_L = (1/sqrt(2*pi)) / 0.05
    // Allow some tolerance since discrete points may not land exactly on mean
    const expectedDensityAtMean = standardNormalPDF(0) / sigma_L;
    // 1 decimal place (5e-2) allows for discretization error from sampling
    expect(meanPoint.density).toBeCloseTo(expectedDensityAtMean, 1);
  });

  it('handles very small sigma: returns spike at mean', () => {
    const mu_L = 0.03; // 3%
    const sigma_L = 0.00001; // Very small

    const data = generateDensityCurveData(mu_L, sigma_L);

    // Should return 3 points (spike representation)
    expect(data).toHaveLength(3);

    // Middle point should be at mean with high density
    expect(data[1].liftPercent).toBeCloseTo(mu_L * 100, 1);
    expect(data[1].density).toBe(1);

    // Adjacent points should have zero density
    expect(data[0].density).toBe(0);
    expect(data[2].density).toBe(0);
  });

  it('handles negative mean correctly', () => {
    const mu_L = -0.05; // -5%
    const sigma_L = 0.03;
    const data = generateDensityCurveData(mu_L, sigma_L);

    // Mean point should be at -5%
    const meanPoint = data.find(
      (p) => Math.abs(p.liftPercent - (-5)) < 0.5
    );
    expect(meanPoint).toBeDefined();

    // Density at mean should be within 1% of the maximum
    // (due to discretization, the sampled point near mean may not hit exact peak)
    const maxDensity = Math.max(...data.map((p) => p.density));
    const relativeError = Math.abs(meanPoint!.density - maxDensity) / maxDensity;
    expect(relativeError).toBeLessThan(0.01); // Within 1%
  });
});

describe('getDensityAtLift', () => {
  it('returns correct density at the mean', () => {
    const mu_L = 0.02; // 2%
    const sigma_L = 0.05;

    const density = getDensityAtLift(mu_L, mu_L, sigma_L);

    // At mean: z=0, so density = phi(0) / sigma = (1/sqrt(2*pi)) / sigma
    const expectedDensity = (1 / SQRT_2_PI) / sigma_L;
    expect(density).toBeCloseTo(expectedDensity, 10);
  });

  it('returns lower density at points away from mean', () => {
    const mu_L = 0;
    const sigma_L = 0.05;

    const densityAtMean = getDensityAtLift(mu_L, mu_L, sigma_L);
    const densityAtOneSigma = getDensityAtLift(mu_L + sigma_L, mu_L, sigma_L);
    const densityAtTwoSigma = getDensityAtLift(mu_L + 2 * sigma_L, mu_L, sigma_L);

    // Density decreases as we move away from mean
    expect(densityAtOneSigma).toBeLessThan(densityAtMean);
    expect(densityAtTwoSigma).toBeLessThan(densityAtOneSigma);
  });

  it('is symmetric around the mean', () => {
    const mu_L = 0.03;
    const sigma_L = 0.04;
    const offset = 0.02;

    const densityAbove = getDensityAtLift(mu_L + offset, mu_L, sigma_L);
    const densityBelow = getDensityAtLift(mu_L - offset, mu_L, sigma_L);

    expect(densityAbove).toBeCloseTo(densityBelow, 10);
  });

  it('handles very small sigma: returns spike behavior', () => {
    const mu_L = 0.05;
    const sigma_L = 0.00001;

    // At mean, should return 1 (spike)
    expect(getDensityAtLift(mu_L, mu_L, sigma_L)).toBe(1);

    // Away from mean, should return 0
    expect(getDensityAtLift(mu_L + 0.01, mu_L, sigma_L)).toBe(0);
  });
});
