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
    it('floors fractional results to integers', () => {
      // 100 daily, 7 days, 100% eligible, 33.33% variant (produces fractions)
      const result = deriveSampleSizes({
        dailyTraffic: 100,
        testDurationDays: 7,
        eligibilityFraction: 1.0,
        variantFraction: 0.333,
      });

      // n_total = 100 * 7 * 1.0 = 700
      expect(result.n_total).toBe(700);
      // n_variant = floor(700 * 0.333) = floor(233.1) = 233
      expect(result.n_variant).toBe(233);
      // n_control = 700 - 233 = 467
      expect(result.n_control).toBe(467);

      // All values should be integers
      expect(Number.isInteger(result.n_total)).toBe(true);
      expect(Number.isInteger(result.n_variant)).toBe(true);
      expect(Number.isInteger(result.n_control)).toBe(true);
    });

    it('handles very small traffic numbers', () => {
      // Edge case: small sample experiment
      const result = deriveSampleSizes({
        dailyTraffic: 10,
        testDurationDays: 3,
        eligibilityFraction: 0.5,
        variantFraction: 0.5,
      });

      // n_total = 10 * 3 * 0.5 = 15
      expect(result.n_total).toBe(15);
      // n_variant = floor(15 * 0.5) = 7
      expect(result.n_variant).toBe(7);
      // n_control = 15 - 7 = 8
      expect(result.n_control).toBe(8);
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
