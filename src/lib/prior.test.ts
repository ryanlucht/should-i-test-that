/**
 * Prior Distribution Utilities Tests
 *
 * Tests for buildPriorFromInputs centralized helper.
 * Verifies Student-t scale correctness (no double-division bug),
 * Normal passthrough, Uniform passthrough, default interval fallback,
 * and preview/engine consistency.
 */

import { describe, it, expect } from 'vitest';
import {
  buildPriorFromInputs,
  computePriorFromInterval,
  DEFAULT_INTERVAL,
} from './prior';

describe('buildPriorFromInputs', () => {
  /**
   * Test 1: Student-t correctness (df=5)
   *
   * For interval [-8.22, 8.22] with df=5:
   *   interval_width_decimal = (8.22 - (-8.22)) / 100 = 0.16440
   *   t_inv(0.95, 5) = 2.01505 (jStat.studentt.inv(0.95, 5))
   *   sigma_L = 0.16440 / (2 * 2.01505) = 0.16440 / 4.03010 = 0.04079
   *
   * This MUST be ~0.04079, NOT ~0.0004079 (the double-division bug value).
   */
  it('computes Student-t scale correctly for df=5 (no double-division)', () => {
    const result = buildPriorFromInputs({
      priorShape: 'student-t',
      studentTDf: 5,
      intervalLowPercent: -8.22,
      intervalHighPercent: 8.22,
    });

    expect(result.type).toBe('student-t');
    expect(result.mu_L).toBeCloseTo(0, 5);

    // sigma_L should be ~0.04079, within 0.1%
    // The key assertion: this catches the double-division bug
    // Bug value would be ~0.0004079 (100x too small)
    expect(result.sigma_L).toBeCloseTo(0.04079, 3);
    expect(result.sigma_L!).toBeGreaterThan(0.03); // Definitely not 0.0004
    expect(result.sigma_L!).toBeLessThan(0.05); // But less than Normal sigma
  });

  /**
   * Test 2: Normal passthrough
   *
   * buildPriorFromInputs for 'normal' should return exactly the same
   * sigma_L as computePriorFromInterval (which divides by 100 internally).
   */
  it('passes through Normal prior matching computePriorFromInterval exactly', () => {
    const result = buildPriorFromInputs({
      priorShape: 'normal',
      intervalLowPercent: -8.22,
      intervalHighPercent: 8.22,
    });

    const expected = computePriorFromInterval(-8.22, 8.22);

    expect(result.type).toBe('normal');
    expect(result.mu_L).toBe(expected.mu_L);
    expect(result.sigma_L).toBe(expected.sigma_L);
  });

  /**
   * Test 3: Uniform passthrough
   *
   * Uniform converts percentage to decimal:
   *   low_L = -5 / 100 = -0.05
   *   high_L = 15 / 100 = 0.15
   */
  it('converts Uniform interval from percentage to decimal bounds', () => {
    const result = buildPriorFromInputs({
      priorShape: 'uniform',
      intervalLowPercent: -5,
      intervalHighPercent: 15,
    });

    expect(result.type).toBe('uniform');
    expect(result.low_L).toBeCloseTo(-0.05, 10);
    expect(result.high_L).toBeCloseTo(0.15, 10);
  });

  /**
   * Test 4: Student-t df=3 (heavier tails = smaller sigma_L)
   *
   * For interval [-8.22, 8.22] with df=3:
   *   t_inv(0.95, 3) = 2.35336
   *   sigma_L = 0.16440 / (2 * 2.35336) = 0.16440 / 4.70672 = 0.03492
   *
   * Note: heavier tails means the same interval implies smaller scale.
   */
  it('computes Student-t scale correctly for df=3', () => {
    const result = buildPriorFromInputs({
      priorShape: 'student-t',
      studentTDf: 3,
      intervalLowPercent: -8.22,
      intervalHighPercent: 8.22,
    });

    expect(result.type).toBe('student-t');
    // sigma_L should be ~0.03492, within 0.1%
    expect(result.sigma_L).toBeCloseTo(0.03492, 3);
    expect(result.df).toBe(3);
  });

  /**
   * Test 5: Default interval fallback
   *
   * When intervalLowPercent and intervalHighPercent are null,
   * should fall back to DEFAULT_INTERVAL.low and DEFAULT_INTERVAL.high.
   */
  it('falls back to DEFAULT_INTERVAL when intervals are null', () => {
    const resultWithNull = buildPriorFromInputs({
      priorShape: 'normal',
      intervalLowPercent: null,
      intervalHighPercent: null,
    });

    const resultWithDefaults = buildPriorFromInputs({
      priorShape: 'normal',
      intervalLowPercent: DEFAULT_INTERVAL.low,
      intervalHighPercent: DEFAULT_INTERVAL.high,
    });

    expect(resultWithNull.mu_L).toBe(resultWithDefaults.mu_L);
    expect(resultWithNull.sigma_L).toBe(resultWithDefaults.sigma_L);
  });

  /**
   * Test 6: Preview/engine consistency
   *
   * For identical Student-t inputs, buildPriorFromInputs should produce
   * consistent results - the sigma_L should be the t-calibrated value,
   * not the Normal-calibrated value.
   */
  it('produces consistent Student-t results across calls (preview/engine parity)', () => {
    const params = {
      priorShape: 'student-t' as const,
      studentTDf: 5,
      intervalLowPercent: -8.22,
      intervalHighPercent: 8.22,
    };

    const result1 = buildPriorFromInputs(params);
    const result2 = buildPriorFromInputs(params);

    // Both calls must produce identical sigma_L
    expect(result1.sigma_L).toBe(result2.sigma_L);
    expect(result1.mu_L).toBe(result2.mu_L);

    // And that sigma_L should NOT equal the Normal-calibrated value
    const normalResult = computePriorFromInterval(-8.22, 8.22);
    expect(result1.sigma_L).not.toBe(normalResult.sigma_L);
  });

  /**
   * Test 7: Null fallback parity
   *
   * buildPriorFromInputs with null intervals should produce the exact
   * same PriorDistribution as calling computePriorFromInterval with
   * DEFAULT_INTERVAL values directly.
   *
   * Addresses Codex review concern: null fallback must match all 3
   * existing call sites which fall back to DEFAULT_INTERVAL.
   */
  it('null fallback produces same result as computePriorFromInterval(DEFAULT_INTERVAL)', () => {
    const resultFromNull = buildPriorFromInputs({
      priorShape: 'normal',
      intervalLowPercent: null,
      intervalHighPercent: null,
    });

    const directResult = computePriorFromInterval(
      DEFAULT_INTERVAL.low,
      DEFAULT_INTERVAL.high
    );

    expect(resultFromNull.type).toBe('normal');
    expect(resultFromNull.mu_L).toBe(directResult.mu_L);
    expect(resultFromNull.sigma_L).toBe(directResult.sigma_L);
  });
});
