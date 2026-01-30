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
    const meanPoint = data.find((p) => Math.abs(p.liftPercent - 5) < 0.5);
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
    const meanPoint = data.find((p) => Math.abs(p.liftPercent - -5) < 0.5);
    expect(meanPoint).toBeDefined();

    // Density at mean should be within 1% of the maximum
    // (due to discretization, the sampled point near mean may not hit exact peak)
    const maxDensity = Math.max(...data.map((p) => p.density));
    const relativeError =
      Math.abs(meanPoint!.density - maxDensity) / maxDensity;
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
    const densityAtTwoSigma = getDensityAtLift(
      mu_L + 2 * sigma_L,
      mu_L,
      sigma_L
    );

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

/**
 * Tests for generateDistributionData with all prior shapes
 */
describe('generateDistributionData', () => {
  describe('Normal distribution', () => {
    it('generates data matching generateDensityCurveData wrapper', () => {
      const prior: PriorDistribution = {
        type: 'normal',
        mu_L: 0.02,
        sigma_L: 0.05,
      };

      const newData = generateDistributionData(prior);
      const legacyData = generateDensityCurveData(0.02, 0.05);

      // Should produce identical results
      expect(newData).toHaveLength(legacyData.length);
      for (let i = 0; i < newData.length; i++) {
        expect(newData[i].liftPercent).toBeCloseTo(
          legacyData[i].liftPercent,
          10
        );
        expect(newData[i].density).toBeCloseTo(legacyData[i].density, 10);
      }
    });
  });

  describe('Student-t distribution', () => {
    it('generates data with heavier tails than Normal', () => {
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0,
        sigma_L: 0.05,
      };
      const studentTPrior: PriorDistribution = {
        type: 'student-t',
        mu_L: 0,
        sigma_L: 0.05,
        df: 3, // Heavy tails
      };

      const normalData = generateDistributionData(normalPrior);
      const studentTData = generateDistributionData(studentTPrior);

      // Same number of points
      expect(studentTData).toHaveLength(100);

      // Find tail points (at 3 sigma from mean)
      const tailPoint = normalData.find(
        (p) => Math.abs(p.liftPercent - 15) < 1 // ~3 sigma (15%)
      );
      const studentTTailPoint = studentTData.find(
        (p) => Math.abs(p.liftPercent - 15) < 1
      );

      // Student-t should have higher density in tails
      expect(studentTTailPoint!.density).toBeGreaterThan(tailPoint!.density);
    });

    it('peak density is lower than Normal with same sigma', () => {
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0,
        sigma_L: 0.05,
      };
      const studentTPrior: PriorDistribution = {
        type: 'student-t',
        mu_L: 0,
        sigma_L: 0.05,
        df: 3,
      };

      const normalData = generateDistributionData(normalPrior);
      const studentTData = generateDistributionData(studentTPrior);

      const normalPeak = Math.max(...normalData.map((p) => p.density));
      const studentTPeak = Math.max(...studentTData.map((p) => p.density));

      // Student-t has lower peak (mass spread to tails)
      expect(studentTPeak).toBeLessThan(normalPeak);
    });
  });

  describe('Uniform distribution', () => {
    it('generates constant density within bounds', () => {
      const prior: PriorDistribution = {
        type: 'uniform',
        low_L: -0.05,
        high_L: 0.1,
      };

      const data = generateDistributionData(prior);

      // Find interior points (between bounds, excluding padding)
      const interiorPoints = data.filter(
        (p) => p.liftPercent >= -5 && p.liftPercent <= 10
      );

      // All interior points should have the same density
      const firstDensity = interiorPoints[0].density;
      interiorPoints.forEach((p) => {
        expect(p.density).toBeCloseTo(firstDensity, 10);
      });

      // Expected density: 1 / (0.10 - (-0.05)) = 1/0.15 = 6.667
      expect(firstDensity).toBeCloseTo(1 / 0.15, 5);
    });

    it('has zero density outside bounds', () => {
      const prior: PriorDistribution = {
        type: 'uniform',
        low_L: -0.05,
        high_L: 0.1,
      };

      const data = generateDistributionData(prior);

      // First point should be before low bound with zero density
      expect(data[0].liftPercent).toBeLessThan(-5);
      expect(data[0].density).toBe(0);

      // Last point should be after high bound with zero density
      expect(data[data.length - 1].liftPercent).toBeGreaterThan(10);
      expect(data[data.length - 1].density).toBe(0);
    });

    it('covers exact bounds with padding', () => {
      const prior: PriorDistribution = {
        type: 'uniform',
        low_L: -0.1,
        high_L: 0.2,
      };

      const data = generateDistributionData(prior);

      // Should include points at exact bounds
      const atLowBound = data.find(
        (p) => Math.abs(p.liftPercent - -10) < 0.1
      );
      const atHighBound = data.find((p) => Math.abs(p.liftPercent - 20) < 0.1);

      expect(atLowBound).toBeDefined();
      expect(atHighBound).toBeDefined();
    });
  });
});

describe('getDensityAtLiftForPrior', () => {
  it('returns correct density for Normal prior', () => {
    const prior: PriorDistribution = {
      type: 'normal',
      mu_L: 0.02,
      sigma_L: 0.05,
    };

    const density = getDensityAtLiftForPrior(0.02, prior);
    const expected = standardNormalPDF(0) / 0.05;

    expect(density).toBeCloseTo(expected, 10);
  });

  it('returns correct density for Uniform prior', () => {
    const prior: PriorDistribution = {
      type: 'uniform',
      low_L: -0.05,
      high_L: 0.1,
    };

    // Inside bounds
    const densityInside = getDensityAtLiftForPrior(0, prior);
    expect(densityInside).toBeCloseTo(1 / 0.15, 10);

    // Outside bounds
    const densityOutside = getDensityAtLiftForPrior(-0.1, prior);
    expect(densityOutside).toBe(0);
  });

  it('handles very small sigma spike for Normal', () => {
    const prior: PriorDistribution = {
      type: 'normal',
      mu_L: 0.03,
      sigma_L: 0.00001,
    };

    expect(getDensityAtLiftForPrior(0.03, prior)).toBe(1);
    expect(getDensityAtLiftForPrior(0.05, prior)).toBe(0);
  });
});
