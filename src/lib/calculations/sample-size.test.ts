/**
 * Sample Size Derivation Tests
 *
 * Tests for deriving sample sizes from experiment design parameters.
 * Per SPEC.md Section A3.3:
 *   - n_total = dailyTraffic * testDurationDays * eligibilityFraction
 *   - n_variant = n_total * variantFraction
 *   - n_control = n_total - n_variant
 */

import { describe, it, expect } from 'vitest';
import { deriveSampleSizes } from './sample-size';

describe('deriveSampleSizes', () => {
  // ===========================================
  // 1. Standard cases
  // ===========================================

  describe('standard cases', () => {
    it('calculates correct sample sizes for 50/50 split with full eligibility', () => {
      // 1000 daily, 14 days, 100% eligible, 50% variant
      const result = deriveSampleSizes({
        dailyTraffic: 1000,
        testDurationDays: 14,
        eligibilityFraction: 1.0,
        variantFraction: 0.5,
      });

      // n_total = 1000 * 14 * 1.0 = 14000
      expect(result.n_total).toBe(14000);
      // n_variant = 14000 * 0.5 = 7000
      expect(result.n_variant).toBe(7000);
      // n_control = 14000 - 7000 = 7000
      expect(result.n_control).toBe(7000);
    });

    it('calculates correct sample sizes for partial eligibility', () => {
      // 1000 daily, 14 days, 50% eligible, 50% variant
      const result = deriveSampleSizes({
        dailyTraffic: 1000,
        testDurationDays: 14,
        eligibilityFraction: 0.5,
        variantFraction: 0.5,
      });

      // n_total = 1000 * 14 * 0.5 = 7000
      expect(result.n_total).toBe(7000);
      // n_variant = 7000 * 0.5 = 3500
      expect(result.n_variant).toBe(3500);
      // n_control = 7000 - 3500 = 3500
      expect(result.n_control).toBe(3500);
    });

    it('calculates correct sample sizes for non-50/50 split', () => {
      // 1000 daily, 14 days, 100% eligible, 30% variant
      const result = deriveSampleSizes({
        dailyTraffic: 1000,
        testDurationDays: 14,
        eligibilityFraction: 1.0,
        variantFraction: 0.3,
      });

      // n_total = 1000 * 14 * 1.0 = 14000
      expect(result.n_total).toBe(14000);
      // n_variant = 14000 * 0.3 = 4200
      expect(result.n_variant).toBe(4200);
      // n_control = 14000 - 4200 = 9800
      expect(result.n_control).toBe(9800);
    });
  });

  // ===========================================
  // 2. Edge cases
  // ===========================================

  describe('edge cases', () => {
    it('preserves real-valued (non-integer) results for smooth calculations', () => {
      // 100 daily, 7 days, 100% eligible, 33.3% variant (produces fractions)
      // Per Audit-7: sample sizes are real-valued in calculation layer
      const result = deriveSampleSizes({
        dailyTraffic: 100,
        testDurationDays: 7,
        eligibilityFraction: 1.0,
        variantFraction: 0.333,
      });

      // n_total = 100 * 7 * 1.0 = 700 (integer by coincidence)
      expect(result.n_total).toBe(700);
      // n_variant = 700 * 0.333 = 233.1 (real-valued, NOT floored)
      expect(result.n_variant).toBeCloseTo(233.1, 10);
      // n_control = 700 - 233.1 = 466.9
      expect(result.n_control).toBeCloseTo(466.9, 10);
    });

    it('handles very small traffic numbers (real-valued)', () => {
      // Edge case: small sample experiment
      const result = deriveSampleSizes({
        dailyTraffic: 10,
        testDurationDays: 3,
        eligibilityFraction: 0.5,
        variantFraction: 0.5,
      });

      // n_total = 10 * 3 * 0.5 = 15
      expect(result.n_total).toBe(15);
      // n_variant = 15 * 0.5 = 7.5 (real-valued, NOT floored)
      expect(result.n_variant).toBe(7.5);
      // n_control = 15 - 7.5 = 7.5
      expect(result.n_control).toBe(7.5);
    });

    it('handles zero traffic', () => {
      const result = deriveSampleSizes({
        dailyTraffic: 0,
        testDurationDays: 14,
        eligibilityFraction: 1.0,
        variantFraction: 0.5,
      });

      expect(result.n_total).toBe(0);
      expect(result.n_variant).toBe(0);
      expect(result.n_control).toBe(0);
    });

    it('handles zero duration', () => {
      const result = deriveSampleSizes({
        dailyTraffic: 1000,
        testDurationDays: 0,
        eligibilityFraction: 1.0,
        variantFraction: 0.5,
      });

      expect(result.n_total).toBe(0);
      expect(result.n_variant).toBe(0);
      expect(result.n_control).toBe(0);
    });
  });

  // ===========================================
  // 3. Output structure
  // ===========================================

  describe('real-valued sample sizes (Phase 25.2-01)', () => {
    it('returns real-valued (non-integer) n_total, n_variant, n_control for non-even inputs', () => {
      // 100 daily, 7 days, 33% eligible, 50% variant
      // n_total = 100 * 7 * 0.33 = 231.0 (exact)
      // n_variant = 231 * 0.5 = 115.5 (non-integer)
      // n_control = 231 - 115.5 = 115.5
      const result = deriveSampleSizes({
        dailyTraffic: 100,
        testDurationDays: 7,
        eligibilityFraction: 0.33,
        variantFraction: 0.5,
      });

      expect(result.n_total).toBe(231);
      expect(result.n_variant).toBe(115.5);
      expect(result.n_control).toBe(115.5);
    });

    it('returns exact real-valued results for 1000*14*0.33 inputs', () => {
      // n_total = 1000 * 14 * 0.33 = 4620 (exact integer)
      // n_variant = 4620 * 0.5 = 2310
      // n_control = 4620 - 2310 = 2310
      const result = deriveSampleSizes({
        dailyTraffic: 1000,
        testDurationDays: 14,
        eligibilityFraction: 0.33,
        variantFraction: 0.5,
      });

      expect(result.n_total).toBe(4620);
      expect(result.n_variant).toBe(2310);
      expect(result.n_control).toBe(2310);
    });
  });

  describe('output structure', () => {
    it('returns all required fields', () => {
      const result = deriveSampleSizes({
        dailyTraffic: 1000,
        testDurationDays: 14,
        eligibilityFraction: 1.0,
        variantFraction: 0.5,
      });

      expect(result).toHaveProperty('n_total');
      expect(result).toHaveProperty('n_variant');
      expect(result).toHaveProperty('n_control');
    });

    it('n_control + n_variant equals n_total', () => {
      const result = deriveSampleSizes({
        dailyTraffic: 1234,
        testDurationDays: 21,
        eligibilityFraction: 0.73,
        variantFraction: 0.42,
      });

      expect(result.n_control + result.n_variant).toBe(result.n_total);
    });
  });
});
