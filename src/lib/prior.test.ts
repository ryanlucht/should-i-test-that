/**
 * Prior Distribution Utilities Tests
 *
 * Tests for Normal prior computation (existing) and Student-t scale
 * calibration (new, per ENG-01).
 *
 * Key property: For Student-t, computeStudentTPriorScale should produce
 * a scale parameter such that mu + scale * t_inv(0.95, df) equals the
 * user's upper bound (round-trip property).
 */

import { describe, it, expect } from 'vitest';
import jStat from 'jstat';
import {
  computePriorFromInterval,
  computeStudentTPriorScale,
  DEFAULT_PRIOR,
  DEFAULT_INTERVAL,
} from './prior';

describe('computePriorFromInterval (Normal - existing behavior)', () => {
  it('returns correct default prior for [-8.22, 8.22]', () => {
    const result = computePriorFromInterval(-8.22, 8.22);
    expect(result.mu_L).toBeCloseTo(0, 6);
    expect(result.sigma_L).toBeCloseTo(0.05, 2);
  });

  it('returns correct prior for asymmetric interval', () => {
    const result = computePriorFromInterval(-5, 15);
    expect(result.mu_L).toBeCloseTo(0.05, 6);
    // sigma = (15 - (-5)) / 100 / (2 * 1.6449) = 0.20 / 3.2897 ~= 0.0608
    expect(result.sigma_L).toBeCloseTo(0.0608, 3);
  });
});

describe('computeStudentTPriorScale', () => {
  it('returns correct scale for df=3: scale ~= 0.0822 / 2.3534 ~= 0.03493', () => {
    const result = computeStudentTPriorScale(-8.22, 8.22, 3);
    const t95_df3 = jStat.studentt.inv(0.95, 3);
    const expectedScale = 0.0822 / t95_df3;
    expect(result.sigma_L).toBeCloseTo(expectedScale, 5);
  });

  it('returns correct scale for df=5: scale ~= 0.0822 / 2.0150 ~= 0.04079', () => {
    const result = computeStudentTPriorScale(-8.22, 8.22, 5);
    const t95_df5 = jStat.studentt.inv(0.95, 5);
    const expectedScale = 0.0822 / t95_df5;
    expect(result.sigma_L).toBeCloseTo(expectedScale, 5);
  });

  it('returns correct scale for df=10: scale ~= 0.0822 / 1.8125 ~= 0.04536', () => {
    const result = computeStudentTPriorScale(-8.22, 8.22, 10);
    const t95_df10 = jStat.studentt.inv(0.95, 10);
    const expectedScale = 0.0822 / t95_df10;
    expect(result.sigma_L).toBeCloseTo(expectedScale, 5);
  });

  it('round-trip: mu + scale * t_inv(0.95, df) equals upper bound for df=3', () => {
    const result = computeStudentTPriorScale(-8.22, 8.22, 3);
    const t95 = jStat.studentt.inv(0.95, 3);
    const recoveredUpper = result.mu_L + result.sigma_L * t95;
    expect(recoveredUpper).toBeCloseTo(0.0822, 6);
  });

  it('round-trip: mu + scale * t_inv(0.95, df) equals upper bound for df=5', () => {
    const result = computeStudentTPriorScale(-8.22, 8.22, 5);
    const t95 = jStat.studentt.inv(0.95, 5);
    const recoveredUpper = result.mu_L + result.sigma_L * t95;
    expect(recoveredUpper).toBeCloseTo(0.0822, 6);
  });

  it('round-trip: mu + scale * t_inv(0.95, df) equals upper bound for df=10', () => {
    const result = computeStudentTPriorScale(-8.22, 8.22, 10);
    const t95 = jStat.studentt.inv(0.95, 10);
    const recoveredUpper = result.mu_L + result.sigma_L * t95;
    expect(recoveredUpper).toBeCloseTo(0.0822, 6);
  });

  it('returns correct mu_L (midpoint of interval)', () => {
    const result = computeStudentTPriorScale(-8.22, 8.22, 3);
    expect(result.mu_L).toBeCloseTo(0, 6);
  });

  it('falls back to Normal calibration when df <= 0', () => {
    const tResult = computeStudentTPriorScale(-8.22, 8.22, 0);
    const normalResult = computePriorFromInterval(-8.22, 8.22);
    expect(tResult.mu_L).toBeCloseTo(normalResult.mu_L, 10);
    expect(tResult.sigma_L).toBeCloseTo(normalResult.sigma_L, 10);
  });

  it('falls back to Normal calibration when df is NaN', () => {
    const tResult = computeStudentTPriorScale(-8.22, 8.22, NaN);
    const normalResult = computePriorFromInterval(-8.22, 8.22);
    expect(tResult.mu_L).toBeCloseTo(normalResult.mu_L, 10);
    expect(tResult.sigma_L).toBeCloseTo(normalResult.sigma_L, 10);
  });

  // Regression test: old Normal-calibrated scale should NOT match new t-calibrated scale
  it('regression: t-calibrated scale differs from Normal-calibrated scale for df=3', () => {
    const normalResult = computePriorFromInterval(-8.22, 8.22);
    const tResult = computeStudentTPriorScale(-8.22, 8.22, 3);

    // Normal scale ~= 0.05, Student-t scale ~= 0.0349
    // They must NOT be equal
    expect(Math.abs(tResult.sigma_L - normalResult.sigma_L)).toBeGreaterThan(0.01);
  });
});
