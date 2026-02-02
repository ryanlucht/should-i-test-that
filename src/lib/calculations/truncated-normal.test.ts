/**
 * Tests for truncated normal distribution functions
 *
 * Mathematical reference: Wikipedia "Truncated normal distribution"
 * https://en.wikipedia.org/wiki/Truncated_normal_distribution
 *
 * For a Normal N(mu, sigma^2) truncated to L >= lower:
 * - alpha = (lower - mu) / sigma (standardized bound)
 * - Z = 1 - Phi(alpha) (survival probability)
 * - lambda = phi(alpha) / Z (inverse Mills ratio)
 *
 * Hand-calculated reference values for N(-0.8, 0.2^2) truncated at L >= -1:
 * - alpha = (-1 - (-0.8)) / 0.2 = -1
 * - Phi(-1) = 0.1586552540
 * - Z = 1 - 0.1586552540 = 0.8413447460
 * - phi(-1) = 0.2419707245
 * - lambda = 0.2419707245 / 0.8413447460 = 0.287653
 * - truncatedMean = -0.8 + 0.2 * 0.287653 = -0.742469
 * - truncatedVar = 0.04 * (1 + (-1)*0.287653 - 0.287653^2) = 0.04 * 0.629597 = 0.025184
 */

import { describe, it, expect } from 'vitest';
import {
  truncatedNormalMean,
  truncatedNormalVariance,
  truncatedNormalCDF,
  truncatedNormalPDF,
} from './truncated-normal';

describe('truncatedNormalMean', () => {
  it('should return approximately -0.7425 for N(-0.8, 0.2) truncated at -1', () => {
    // Hand-calculated: mu + sigma * phi(alpha) / Z
    // = -0.8 + 0.2 * (0.2419707245 / 0.8413447460)
    // = -0.8 + 0.2 * 0.287653 = -0.742469
    const result = truncatedNormalMean(-0.8, 0.2, -1);
    expect(result).toBeCloseTo(-0.7425, 3);
  });

  it('should return greater than untruncated mean for lower truncation', () => {
    // Truncating the lower tail always increases the mean
    const mu = -0.5;
    const sigma = 0.3;
    const lower = -1;
    const truncatedMean = truncatedNormalMean(mu, sigma, lower);
    expect(truncatedMean).toBeGreaterThan(mu);
  });

  it('should approach untruncated mean when truncation has minimal effect', () => {
    // When prior is far above truncation point, truncated mean ~ untruncated mean
    // N(0.5, 0.1) with lower=-1: alpha = (-1 - 0.5) / 0.1 = -15
    // Z ~ 1, phi(-15) ~ 0, so truncated mean ~ mu
    const mu = 0.5;
    const sigma = 0.1;
    const lower = -1;
    const truncatedMean = truncatedNormalMean(mu, sigma, lower);
    // Should be very close to mu (within 0.001)
    expect(truncatedMean).toBeCloseTo(mu, 2);
  });

  it('should handle severe truncation (most mass below bound)', () => {
    // N(-2, 0.3) with lower=-1: most mass is below -1
    // alpha = (-1 - (-2)) / 0.3 = 3.33
    // Z = 1 - Phi(3.33) ~ 0.00043 (very small)
    // The mean should be near (or just above) -1
    const mu = -2;
    const sigma = 0.3;
    const lower = -1;
    const truncatedMean = truncatedNormalMean(mu, sigma, lower);
    // Mean should be close to lower bound when severely truncated
    expect(truncatedMean).toBeGreaterThanOrEqual(-1);
    expect(truncatedMean).toBeLessThan(0);
  });

  it('should handle alpha = 0 (bound at mean)', () => {
    // N(0, 1) truncated at 0: alpha = 0
    // Z = 0.5, phi(0) = 0.3989, lambda = 0.7979
    // truncatedMean = 0 + 1 * 0.7979 = 0.7979
    const result = truncatedNormalMean(0, 1, 0);
    expect(result).toBeCloseTo(0.7979, 3);
  });

  it('should not return NaN for extreme negative alpha', () => {
    // Very negative alpha (prior far above bound)
    const result = truncatedNormalMean(10, 0.5, -1);
    expect(Number.isNaN(result)).toBe(false);
    expect(Number.isFinite(result)).toBe(true);
  });
});

describe('truncatedNormalVariance', () => {
  it('should return approximately 0.0252 for N(-0.8, 0.2) truncated at -1', () => {
    // Hand-calculated: sigma^2 * (1 + alpha*lambda - lambda^2)
    // lambda = 0.287653, alpha = -1
    // = 0.04 * (1 + (-1)*0.287653 - 0.287653^2)
    // = 0.04 * (1 - 0.287653 - 0.082744)
    // = 0.04 * 0.629603 = 0.025184
    const result = truncatedNormalVariance(-0.8, 0.2, -1);
    expect(result).toBeCloseTo(0.0252, 3);
  });

  it('should return less than untruncated variance for lower truncation', () => {
    // Truncation always reduces variance
    const mu = -0.5;
    const sigma = 0.3;
    const lower = -1;
    const originalVariance = sigma * sigma;
    const truncatedVar = truncatedNormalVariance(mu, sigma, lower);
    expect(truncatedVar).toBeLessThan(originalVariance);
    expect(truncatedVar).toBeGreaterThan(0);
  });

  it('should approach untruncated variance when truncation has minimal effect', () => {
    // When prior is far above truncation point, truncated variance ~ untruncated variance
    const mu = 0.5;
    const sigma = 0.1;
    const lower = -1;
    const originalVariance = sigma * sigma;
    const truncatedVar = truncatedNormalVariance(mu, sigma, lower);
    // Should be very close to original variance
    expect(truncatedVar).toBeCloseTo(originalVariance, 3);
  });

  it('should approach 0 for severe truncation', () => {
    // When most mass is truncated, the variance becomes very small
    // The distribution concentrates near the bound
    const mu = -2;
    const sigma = 0.3;
    const lower = -1;
    const truncatedVar = truncatedNormalVariance(mu, sigma, lower);
    expect(truncatedVar).toBeGreaterThanOrEqual(0);
    expect(truncatedVar).toBeLessThan(0.01); // Much smaller than original 0.09
  });

  it('should handle alpha = 0 (bound at mean)', () => {
    // N(0, 1) truncated at 0
    // lambda = 0.7979, alpha = 0
    // Var = 1 * (1 + 0*0.7979 - 0.7979^2) = 1 - 0.6366 = 0.3634
    const result = truncatedNormalVariance(0, 1, 0);
    expect(result).toBeCloseTo(0.3634, 3);
  });

  it('should not return NaN or negative for extreme parameters', () => {
    const result = truncatedNormalVariance(10, 0.5, -1);
    expect(Number.isNaN(result)).toBe(false);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('truncatedNormalCDF', () => {
  it('should return 0 for x < lower', () => {
    const result = truncatedNormalCDF(-1.5, -0.8, 0.2, -1);
    expect(result).toBe(0);
  });

  it('should return 0 at x = lower', () => {
    // P(L <= lower | L >= lower) = 0
    const result = truncatedNormalCDF(-1, -0.8, 0.2, -1);
    expect(result).toBe(0);
  });

  it('should return approximately 0.5 at truncated median', () => {
    // For N(0, 1) truncated at 0:
    // CDF = 0.5 when Phi((x-0)/1) - Phi(0) = 0.5 * Z = 0.5 * 0.5 = 0.25
    // So Phi(x) = 0.5 + 0.25 = 0.75
    // x = Phi^-1(0.75) = 0.6745
    const result = truncatedNormalCDF(0.6745, 0, 1, 0);
    expect(result).toBeCloseTo(0.5, 2);
  });

  it('should approach 1 for large x', () => {
    // CDF should approach 1 as x -> infinity
    const result = truncatedNormalCDF(10, -0.8, 0.2, -1);
    expect(result).toBeCloseTo(1, 5);
  });

  it('should return correct value for N(-0.8, 0.2) truncated at -1, x=0', () => {
    // CDF(0) = (Phi((0-(-0.8))/0.2) - Phi(-1)) / Z
    //        = (Phi(4) - 0.1587) / 0.8413
    //        = (0.99997 - 0.1587) / 0.8413
    //        ~ 1.0 (essentially all mass below 0)
    const result = truncatedNormalCDF(0, -0.8, 0.2, -1);
    expect(result).toBeGreaterThan(0.99);
  });

  it('should be monotonically increasing for x >= lower', () => {
    const lower = -1;
    const mu = -0.8;
    const sigma = 0.2;
    const xValues = [-1, -0.9, -0.8, -0.7, -0.6, -0.5];
    for (let i = 0; i < xValues.length - 1; i++) {
      const current = truncatedNormalCDF(xValues[i], mu, sigma, lower);
      const next = truncatedNormalCDF(xValues[i + 1], mu, sigma, lower);
      expect(next).toBeGreaterThanOrEqual(current);
    }
  });

  it('should not return NaN for extreme parameters', () => {
    const result = truncatedNormalCDF(0, 10, 0.5, -1);
    expect(Number.isNaN(result)).toBe(false);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe('truncatedNormalPDF', () => {
  it('should return 0 for x < lower', () => {
    const result = truncatedNormalPDF(-1.5, -0.8, 0.2, -1);
    expect(result).toBe(0);
  });

  it('should return 0 just below lower bound', () => {
    const result = truncatedNormalPDF(-1.001, -0.8, 0.2, -1);
    expect(result).toBe(0);
  });

  it('should return positive value at lower bound', () => {
    // At x = lower, PDF = phi(alpha) / (sigma * Z)
    // For N(-0.8, 0.2) at -1: phi(-1) / (0.2 * 0.8413) = 0.2420 / 0.1683 = 1.438
    const result = truncatedNormalPDF(-1, -0.8, 0.2, -1);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(1.438, 2);
  });

  it('should be higher than untruncated PDF above the truncation point', () => {
    // The truncated PDF is rescaled by 1/Z > 1
    const mu = -0.8;
    const sigma = 0.2;
    const lower = -1;
    const x = -0.7;
    const truncatedPdf = truncatedNormalPDF(x, mu, sigma, lower);
    // Untruncated PDF at x=-0.7: phi((x-mu)/sigma) / sigma
    const z = (x - mu) / sigma;
    const untrunPdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI) / sigma;
    expect(truncatedPdf).toBeGreaterThan(untrunPdf);
  });

  it('should integrate to 1 over [lower, infinity)', () => {
    // Numerical integration test (approximate)
    const mu = -0.8;
    const sigma = 0.2;
    const lower = -1;
    const dx = 0.001;
    let integral = 0;
    // Integrate from lower to lower + 10*sigma (captures virtually all mass)
    for (let x = lower; x < lower + 10 * sigma; x += dx) {
      integral += truncatedNormalPDF(x, mu, sigma, lower) * dx;
    }
    expect(integral).toBeCloseTo(1, 2);
  });

  it('should not return NaN for extreme parameters', () => {
    const result = truncatedNormalPDF(0, 10, 0.5, -1);
    expect(Number.isNaN(result)).toBe(false);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should handle severe truncation gracefully', () => {
    // Most mass below bound
    const result = truncatedNormalPDF(-0.99, -2, 0.3, -1);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('edge cases and numerical stability', () => {
  it('should handle Z very close to 0 (almost all mass truncated)', () => {
    // N(-3, 0.1) truncated at -1: alpha = (-1 - (-3)) / 0.1 = 20
    // Z = 1 - Phi(20) ~ 0 (essentially no mass above -1)
    // Should return boundary values without NaN
    const mean = truncatedNormalMean(-3, 0.1, -1);
    const variance = truncatedNormalVariance(-3, 0.1, -1);

    expect(Number.isFinite(mean)).toBe(true);
    expect(Number.isFinite(variance)).toBe(true);
    // Mean should be at or near the lower bound
    expect(mean).toBeGreaterThanOrEqual(-1);
    // Variance should be very small or 0
    expect(variance).toBeGreaterThanOrEqual(0);
  });

  it('should handle Z approaching 1 (minimal truncation)', () => {
    // N(5, 1) truncated at -1: alpha = (-1 - 5) / 1 = -6
    // Z = 1 - Phi(-6) ~ 1
    const mean = truncatedNormalMean(5, 1, -1);
    const variance = truncatedNormalVariance(5, 1, -1);

    // Should be very close to untruncated values
    expect(mean).toBeCloseTo(5, 2);
    expect(variance).toBeCloseTo(1, 2);
  });

  it('should handle sigma = 0.001 (very tight distribution)', () => {
    // Very tight distribution, truncation at bound
    const mean = truncatedNormalMean(-0.5, 0.001, -1);
    const variance = truncatedNormalVariance(-0.5, 0.001, -1);

    expect(Number.isFinite(mean)).toBe(true);
    expect(Number.isFinite(variance)).toBe(true);
    // Mean should be close to mu since bound is far below
    expect(mean).toBeCloseTo(-0.5, 2);
  });

  it('should handle large sigma', () => {
    // Wide distribution: N(0, 2) truncated at -1
    const mean = truncatedNormalMean(0, 2, -1);
    const variance = truncatedNormalVariance(0, 2, -1);

    expect(Number.isFinite(mean)).toBe(true);
    expect(Number.isFinite(variance)).toBe(true);
    expect(mean).toBeGreaterThan(0); // Truncation shifts mean up
    expect(variance).toBeLessThan(4); // Truncation reduces variance
  });
});
