/**
 * Tests for standard normal distribution functions
 *
 * Reference values from statistical tables:
 * - phi(0) = 1/sqrt(2*pi) = 0.3989422804
 * - phi(1) = phi(-1) = 0.2419707245
 * - Phi(0) = 0.5
 * - Phi(1.6448536) = 0.95 (95th percentile)
 * - Phi(-1.6448536) = 0.05
 * - Phi(1.96) = 0.975
 * - Phi(-1.96) = 0.025
 */

import { describe, it, expect } from 'vitest';
import { standardNormalPDF, standardNormalCDF, SQRT_2_PI } from './statistics';

describe('SQRT_2_PI constant', () => {
  it('should equal sqrt(2 * PI)', () => {
    const expected = Math.sqrt(2 * Math.PI);
    expect(SQRT_2_PI).toBeCloseTo(expected, 10);
    expect(SQRT_2_PI).toBeCloseTo(2.5066282746, 6);
  });
});

describe('standardNormalPDF', () => {
  it('should return approximately 0.3989 for z = 0', () => {
    // phi(0) = 1 / sqrt(2*pi) = 0.3989422804...
    const result = standardNormalPDF(0);
    expect(result).toBeCloseTo(0.3989422804, 6);
  });

  it('should return approximately 0.2420 for z = 1', () => {
    // phi(1) = exp(-0.5) / sqrt(2*pi) = 0.2419707245...
    const result = standardNormalPDF(1);
    expect(result).toBeCloseTo(0.2419707245, 6);
  });

  it('should return approximately 0.2420 for z = -1', () => {
    // phi(-1) = phi(1) by symmetry
    const result = standardNormalPDF(-1);
    expect(result).toBeCloseTo(0.2419707245, 6);
  });

  it('should be symmetric: phi(-z) = phi(z)', () => {
    const testValues = [0.5, 1, 1.5, 2, 2.5, 3];
    for (const z of testValues) {
      expect(standardNormalPDF(-z)).toBeCloseTo(standardNormalPDF(z), 10);
    }
  });

  it('should return approximately 0.0540 for z = 2', () => {
    // phi(2) = exp(-2) / sqrt(2*pi) = 0.0539909665...
    const result = standardNormalPDF(2);
    expect(result).toBeCloseTo(0.0539909665, 6);
  });

  it('should return approximately 0.0044 for z = 3', () => {
    // phi(3) = exp(-4.5) / sqrt(2*pi) = 0.0044318484...
    const result = standardNormalPDF(3);
    expect(result).toBeCloseTo(0.0044318484, 6);
  });

  it('should approach 0 for very large |z|', () => {
    expect(standardNormalPDF(10)).toBeLessThan(1e-20);
    expect(standardNormalPDF(-10)).toBeLessThan(1e-20);
  });
});

describe('standardNormalCDF', () => {
  it('should return 0.5 for z = 0', () => {
    const result = standardNormalCDF(0);
    expect(result).toBeCloseTo(0.5, 6);
  });

  it('should return 0 for z = -Infinity', () => {
    const result = standardNormalCDF(-Infinity);
    expect(result).toBe(0);
  });

  it('should return 1 for z = Infinity', () => {
    const result = standardNormalCDF(Infinity);
    expect(result).toBe(1);
  });

  it('should return approximately 0.95 for z = 1.6448536 (z_0.95)', () => {
    // This is the 95th percentile z-score
    const result = standardNormalCDF(1.6448536);
    expect(result).toBeCloseTo(0.95, 5);
  });

  it('should return approximately 0.05 for z = -1.6448536', () => {
    // Symmetric: Phi(-z) = 1 - Phi(z)
    const result = standardNormalCDF(-1.6448536);
    expect(result).toBeCloseTo(0.05, 5);
  });

  it('should return approximately 0.975 for z = 1.96', () => {
    // 97.5th percentile (used in 95% two-sided CI)
    const result = standardNormalCDF(1.96);
    expect(result).toBeCloseTo(0.975, 3);
  });

  it('should return approximately 0.025 for z = -1.96', () => {
    const result = standardNormalCDF(-1.96);
    expect(result).toBeCloseTo(0.025, 3);
  });

  it('should return approximately 0.8413 for z = 1', () => {
    // Standard table value
    const result = standardNormalCDF(1);
    expect(result).toBeCloseTo(0.8413447460, 5);
  });

  it('should return approximately 0.1587 for z = -1', () => {
    const result = standardNormalCDF(-1);
    expect(result).toBeCloseTo(0.1586552540, 5);
  });

  it('should return approximately 0.9772 for z = 2', () => {
    const result = standardNormalCDF(2);
    expect(result).toBeCloseTo(0.9772498680, 5);
  });

  it('should return approximately 0.0228 for z = -2', () => {
    const result = standardNormalCDF(-2);
    expect(result).toBeCloseTo(0.0227501319, 5);
  });

  it('should satisfy symmetry: Phi(-z) = 1 - Phi(z)', () => {
    const testValues = [0.5, 1, 1.5, 2, 2.5, 3];
    for (const z of testValues) {
      const PhiZ = standardNormalCDF(z);
      const PhiNegZ = standardNormalCDF(-z);
      expect(PhiNegZ).toBeCloseTo(1 - PhiZ, 10);
    }
  });

  it('should return values in [0, 1] for all z', () => {
    const testValues = [-100, -10, -5, -2, -1, 0, 1, 2, 5, 10, 100];
    for (const z of testValues) {
      const result = standardNormalCDF(z);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it('should be monotonically increasing', () => {
    const testValues = [-3, -2, -1, 0, 1, 2, 3];
    for (let i = 0; i < testValues.length - 1; i++) {
      const current = standardNormalCDF(testValues[i]);
      const next = standardNormalCDF(testValues[i + 1]);
      expect(next).toBeGreaterThan(current);
    }
  });

  it('should return NaN for NaN input', () => {
    const result = standardNormalCDF(NaN);
    expect(result).toBeNaN();
  });
});
