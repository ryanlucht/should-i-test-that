import { describe, it, expect } from 'vitest';
import {
  liftFeasibilityBounds,
  sampleStandardNormal,
  normalPdf,
  seOfRelativeLift,
} from './abtest-math';
import { standardNormalPDF } from './statistics';

describe('liftFeasibilityBounds', () => {
  it('returns correct bounds for typical conversion rate', () => {
    const bounds = liftFeasibilityBounds(0.05);
    expect(bounds.L_min).toBe(-1);
    expect(bounds.L_max).toBeCloseTo(19, 5); // 1/0.05 - 1 = 19
  });

  it('returns tighter upper bound for high conversion rate', () => {
    const bounds = liftFeasibilityBounds(0.5);
    expect(bounds.L_min).toBe(-1);
    expect(bounds.L_max).toBeCloseTo(1, 5); // 1/0.5 - 1 = 1
  });

  it('returns very high upper bound for low conversion rate', () => {
    // CR0 = 1%, L_max = 1/0.01 - 1 = 99
    const bounds = liftFeasibilityBounds(0.01);
    expect(bounds.L_min).toBe(-1);
    expect(bounds.L_max).toBeCloseTo(99, 5);
  });
});

describe('sampleStandardNormal', () => {
  it('produces samples with mean near 0', () => {
    const samples = Array.from({ length: 10000 }, () => sampleStandardNormal());
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(mean).toBeCloseTo(0, 1); // Within 0.1 of 0
  });

  it('produces samples with variance near 1', () => {
    const samples = Array.from({ length: 10000 }, () => sampleStandardNormal());
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance =
      samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / samples.length;
    expect(variance).toBeCloseTo(1, 1); // Within 0.1 of 1
  });

  it('produces finite values (guard against log(0))', () => {
    // Run many times to ensure guard works
    for (let i = 0; i < 1000; i++) {
      const sample = sampleStandardNormal();
      expect(isFinite(sample)).toBe(true);
    }
  });
});

describe('normalPdf', () => {
  it('matches standard normal at mean', () => {
    const pdfAtMean = normalPdf(0, 0, 1);
    expect(pdfAtMean).toBeCloseTo(standardNormalPDF(0), 10);
  });

  it('correctly scales for non-unit standard deviation', () => {
    // For N(0, 2), PDF at 0 should be phi(0)/2
    const pdf = normalPdf(0, 0, 2);
    expect(pdf).toBeCloseTo(standardNormalPDF(0) / 2, 10);
  });

  it('correctly shifts for non-zero mean', () => {
    // For N(5, 1), PDF at 5 should equal PDF at 0 for N(0,1)
    const pdf = normalPdf(5, 5, 1);
    expect(pdf).toBeCloseTo(standardNormalPDF(0), 10);
  });

  it('matches expected value at 1 sigma from mean', () => {
    // For N(10, 3), PDF at 13 (1 sigma above) should be phi(1)/3
    const pdf = normalPdf(13, 10, 3);
    expect(pdf).toBeCloseTo(standardNormalPDF(1) / 3, 10);
  });

  it('handles 2 sigma from mean correctly', () => {
    // For N(0, 1), PDF at 2 should be phi(2)
    const pdf = normalPdf(2, 0, 1);
    expect(pdf).toBeCloseTo(standardNormalPDF(2), 10);
  });
});

describe('seOfRelativeLift', () => {
  it('computes correct SE for equal sample sizes', () => {
    // CR0 = 0.05, n_control = n_variant = 10000
    // SE = sqrt((0.95/0.05) * (1/10000 + 1/10000))
    //    = sqrt(19 * 0.0002) = sqrt(0.0038) approx 0.0616
    const se = seOfRelativeLift(0.05, 10000, 10000);
    expect(se).toBeCloseTo(0.0616, 3);
  });

  it('computes larger SE for smaller samples', () => {
    const seLarge = seOfRelativeLift(0.05, 10000, 10000);
    const seSmall = seOfRelativeLift(0.05, 1000, 1000);
    expect(seSmall).toBeGreaterThan(seLarge);
    // Ratio should be sqrt(10) since sample sizes are 10x different
    expect(seSmall / seLarge).toBeCloseTo(Math.sqrt(10), 1);
  });

  it('computes larger SE for lower conversion rates', () => {
    // Lower CR0 = higher variance factor
    const seHighCR = seOfRelativeLift(0.5, 5000, 5000);
    const seLowCR = seOfRelativeLift(0.05, 5000, 5000);
    expect(seLowCR).toBeGreaterThan(seHighCR);
  });

  it('handles unequal sample sizes', () => {
    // Asymmetric allocation: more in variant
    const se = seOfRelativeLift(0.05, 5000, 15000);
    // sampleFactor = 1/5000 + 1/15000 = 0.0002 + 0.0000667 = 0.000267
    // varianceFactor = 19
    // SE = sqrt(19 * 0.000267) approx 0.0712
    expect(se).toBeCloseTo(0.0712, 3);
  });

  it('produces larger SE when control is smaller than variant', () => {
    // When control is smaller, effective sample size is dominated by control
    const seBalanced = seOfRelativeLift(0.05, 10000, 10000);
    const seUnbalanced = seOfRelativeLift(0.05, 5000, 15000);
    expect(seUnbalanced).toBeGreaterThan(seBalanced);
  });
});
