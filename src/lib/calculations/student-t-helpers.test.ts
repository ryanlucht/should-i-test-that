/**
 * Student-t Quantile Helper Tests
 *
 * Tests for shared Student-t quantile functions that centralize
 * all t-distribution quantile computation (per ENG-01, Codex review).
 *
 * Mathematical basis:
 * - Location-scale Student-t: X = mu + scale * T, where T ~ t(df)
 * - Quantile bounds use jStat.studentt.inv(p, df) for the standard t-quantile
 * - 90% interval: [mu + scale * t_inv(0.05, df), mu + scale * t_inv(0.95, df)]
 */

import { describe, it, expect } from 'vitest';
import jStat from 'jstat';
import {
  studentTQuantileBounds,
  studentTInterval,
} from './student-t-helpers';

describe('studentTInterval', () => {
  it('returns bounds matching mu +/- scale * t_inv(0.95, df) for df=3', () => {
    const mu = 0;
    const scale = 0.035;
    const df = 3;

    const result = studentTInterval(mu, scale, df);

    // Expected: mu +/- scale * jStat.studentt.inv(0.95, 3)
    const t95 = jStat.studentt.inv(0.95, df);
    expect(result.low).toBeCloseTo(mu - scale * t95, 8);
    expect(result.high).toBeCloseTo(mu + scale * t95, 8);
  });

  it('returns correct 90% interval for non-zero mu', () => {
    const mu = 0.05;
    const scale = 0.03;
    const df = 5;

    const result = studentTInterval(mu, scale, df);

    const t95 = jStat.studentt.inv(0.95, df);
    expect(result.low).toBeCloseTo(mu + scale * jStat.studentt.inv(0.05, df), 8);
    expect(result.high).toBeCloseTo(mu + scale * t95, 8);
  });
});

describe('studentTQuantileBounds', () => {
  it('returns wider bounds for (0.005, 0.995) than (0.05, 0.95)', () => {
    const mu = 0;
    const scale = 0.035;
    const df = 3;

    const narrow = studentTQuantileBounds(mu, scale, df, 0.05, 0.95);
    const wide = studentTQuantileBounds(mu, scale, df, 0.005, 0.995);

    expect(wide.low).toBeLessThan(narrow.low);
    expect(wide.high).toBeGreaterThan(narrow.high);
  });

  it('falls back to 4-sigma bounds when df <= 0', () => {
    const mu = 0;
    const scale = 0.035;

    const result = studentTQuantileBounds(mu, scale, 0, 0.005, 0.995);
    expect(result.low).toBeCloseTo(mu - 4 * scale, 8);
    expect(result.high).toBeCloseTo(mu + 4 * scale, 8);
  });

  it('falls back to 4-sigma bounds when df is NaN', () => {
    const mu = 0;
    const scale = 0.035;

    const result = studentTQuantileBounds(mu, scale, NaN, 0.005, 0.995);
    expect(result.low).toBeCloseTo(mu - 4 * scale, 8);
    expect(result.high).toBeCloseTo(mu + 4 * scale, 8);
  });

  it('falls back to 4-sigma bounds when df is negative', () => {
    const mu = 0;
    const scale = 0.035;

    const result = studentTQuantileBounds(mu, scale, -5, 0.005, 0.995);
    expect(result.low).toBeCloseTo(mu - 4 * scale, 8);
    expect(result.high).toBeCloseTo(mu + 4 * scale, 8);
  });
});
