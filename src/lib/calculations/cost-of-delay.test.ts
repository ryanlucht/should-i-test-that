/**
 * Cost of Delay (CoD) Calculation Tests
 *
 * Tests for calculating the opportunity cost of running an A/B test.
 * Per SPEC.md Section A6:
 *   - EV_ship_annual = K * (mu_L - T_L)
 *   - EV_ship_day = EV_ship_annual / 365
 *   - If default is Ship (EV_ship_annual > 0):
 *     CoD = (1 - f_var) * EV_ship_day * D_test + EV_ship_day * D_latency
 *   - If default is Don't Ship: CoD = 0
 */

import { describe, it, expect } from 'vitest';
import { calculateCostOfDelay } from './cost-of-delay';

describe('calculateCostOfDelay', () => {
  // ===========================================
  // 1. Ship decision with positive CoD
  // ===========================================

  describe('ship decision (CoD applies)', () => {
    it('calculates positive CoD when default is Ship', () => {
      /**
       * Hand-calculated verification:
       *
       * Inputs:
       *   - K = 1,000,000 (annual dollars per unit lift)
       *   - mu_L = 0.05 (5% expected lift)
       *   - threshold_L = 0 (0% threshold)
       *   - testDurationDays = 14
       *   - variantFraction = 0.5
       *   - decisionLatencyDays = 2
       *
       * Derivations:
       *   - EV_ship_annual = K * (mu_L - T_L) = 1,000,000 * (0.05 - 0) = 50,000
       *   - EV_ship_day = 50,000 / 365 = 136.99 per day
       *   - Default: Ship (mu_L > T_L)
       *
       * CoD calculation:
       *   - During test: (1 - 0.5) * 136.99 * 14 = 958.90
       *   - Decision latency: 136.99 * 2 = 273.97
       *   - Total CoD = 958.90 + 273.97 = 1232.88
       */
      const result = calculateCostOfDelay({
        K: 1000000,
        mu_L: 0.05,
        threshold_L: 0,
        testDurationDays: 14,
        variantFraction: 0.5,
        decisionLatencyDays: 2,
      });

      expect(result.codApplies).toBe(true);
      expect(result.codDollars).toBeCloseTo(1232.88, 0); // Within $1
      expect(result.dailyOpportunityCost).toBeCloseTo(136.99, 0);
    });

    it('calculates CoD correctly when mu_L equals threshold', () => {
      // When mu_L = T_L exactly, EV_ship = 0 (boundary case)
      // Default is Ship (tie goes to ship), but no opportunity cost
      const result = calculateCostOfDelay({
        K: 1000000,
        mu_L: 0.05,
        threshold_L: 0.05, // equals mean
        testDurationDays: 14,
        variantFraction: 0.5,
        decisionLatencyDays: 2,
      });

      // EV_ship_annual = K * (0.05 - 0.05) = 0
      expect(result.codApplies).toBe(false);
      expect(result.codDollars).toBe(0);
    });

    it('handles 100% variant split (only latency contributes)', () => {
      /**
       * When variantFraction = 1.0, all traffic sees the variant during test
       * So the only delay cost is the decision latency period
       *
       * CoD = (1 - 1.0) * EV_day * D_test + EV_day * D_latency
       *     = 0 + EV_day * D_latency
       */
      const result = calculateCostOfDelay({
        K: 1000000,
        mu_L: 0.0365, // 3.65% lift -> 100 per day EV
        threshold_L: 0,
        testDurationDays: 14,
        variantFraction: 1.0, // 100% variant
        decisionLatencyDays: 5,
      });

      // EV_ship_annual = 1,000,000 * 0.0365 = 36,500
      // EV_ship_day = 36,500 / 365 = 100
      // CoD = (1-1) * 100 * 14 + 100 * 5 = 0 + 500 = 500
      expect(result.codApplies).toBe(true);
      expect(result.codDollars).toBeCloseTo(500, 0);
    });
  });

  // ===========================================
  // 2. Don't Ship decision (CoD = 0)
  // ===========================================

  describe("don't ship decision (CoD = 0)", () => {
    it('returns CoD = 0 when default is Dont Ship', () => {
      /**
       * When mu_L < T_L, default decision is Don't Ship
       * Per SPEC.md A6: "If default decision is Don't ship: CoD_delay = 0"
       */
      const result = calculateCostOfDelay({
        K: 1000000,
        mu_L: -0.02, // negative expected lift
        threshold_L: 0, // threshold = 0
        testDurationDays: 14,
        variantFraction: 0.5,
        decisionLatencyDays: 2,
      });

      expect(result.codApplies).toBe(false);
      expect(result.codDollars).toBe(0);
      expect(result.dailyOpportunityCost).toBe(0);
    });

    it('returns CoD = 0 when expected lift is below threshold', () => {
      const result = calculateCostOfDelay({
        K: 1000000,
        mu_L: 0.02, // 2% expected lift
        threshold_L: 0.05, // 5% threshold (above mean)
        testDurationDays: 14,
        variantFraction: 0.5,
        decisionLatencyDays: 2,
      });

      expect(result.codApplies).toBe(false);
      expect(result.codDollars).toBe(0);
    });
  });

  // ===========================================
  // 3. Zero duration edge cases
  // ===========================================

  describe('zero duration edge cases', () => {
    it('returns CoD = 0 when test duration is 0', () => {
      const result = calculateCostOfDelay({
        K: 1000000,
        mu_L: 0.05,
        threshold_L: 0,
        testDurationDays: 0, // zero duration
        variantFraction: 0.5,
        decisionLatencyDays: 0, // also zero latency
      });

      // No delay = no cost of delay
      expect(result.codDollars).toBe(0);
    });

    it('includes only latency cost when test duration is 0 but latency > 0', () => {
      const result = calculateCostOfDelay({
        K: 1000000,
        mu_L: 0.0365, // 100/day
        threshold_L: 0,
        testDurationDays: 0,
        variantFraction: 0.5,
        decisionLatencyDays: 3,
      });

      // CoD = 0 (test) + 100 * 3 (latency) = 300
      expect(result.codDollars).toBeCloseTo(300, 0);
    });
  });

  // ===========================================
  // 4. Output structure
  // ===========================================

  describe('output structure', () => {
    it('returns all required fields', () => {
      const result = calculateCostOfDelay({
        K: 1000000,
        mu_L: 0.05,
        threshold_L: 0,
        testDurationDays: 14,
        variantFraction: 0.5,
        decisionLatencyDays: 2,
      });

      expect(result).toHaveProperty('codDollars');
      expect(result).toHaveProperty('dailyOpportunityCost');
      expect(result).toHaveProperty('codApplies');
      expect(typeof result.codDollars).toBe('number');
      expect(typeof result.dailyOpportunityCost).toBe('number');
      expect(typeof result.codApplies).toBe('boolean');
    });
  });

  // ===========================================
  // 5. Formula verification
  // ===========================================

  describe('formula verification', () => {
    it('matches SPEC.md A6 formula exactly', () => {
      /**
       * Verify against SPEC.md A6:
       *   EV_ship_annual = K * (mu_L - T_L)
       *   EV_ship_day = EV_ship_annual / 365
       *   CoD = (1 - f_var) * EV_ship_day * D_test + EV_ship_day * D_latency
       */
      const K = 5000000;
      const mu_L = 0.08;
      const threshold_L = 0.02;
      const testDurationDays = 21;
      const variantFraction = 0.4;
      const decisionLatencyDays = 3;

      // Manual calculation
      const EV_ship_annual = K * (mu_L - threshold_L); // 5M * 0.06 = 300,000
      const EV_ship_day = EV_ship_annual / 365; // 821.92
      const expectedCoD =
        (1 - variantFraction) * EV_ship_day * testDurationDays +
        EV_ship_day * decisionLatencyDays;
      // = 0.6 * 821.92 * 21 + 821.92 * 3
      // = 10,356.19 + 2,465.75 = 12,821.95

      const result = calculateCostOfDelay({
        K,
        mu_L,
        threshold_L,
        testDurationDays,
        variantFraction,
        decisionLatencyDays,
      });

      expect(result.codDollars).toBeCloseTo(expectedCoD, 0);
      expect(result.dailyOpportunityCost).toBeCloseTo(EV_ship_day, 0);
    });

    it('handles negative threshold (accept small loss scenario)', () => {
      // T_L = -0.02 means willing to ship even with 2% loss
      // mu_L = 0.01 (1% expected lift)
      // mu_L > T_L, so default is Ship
      const result = calculateCostOfDelay({
        K: 1000000,
        mu_L: 0.01, // 1% lift
        threshold_L: -0.02, // willing to accept 2% loss
        testDurationDays: 14,
        variantFraction: 0.5,
        decisionLatencyDays: 2,
      });

      // EV_ship_annual = 1M * (0.01 - (-0.02)) = 1M * 0.03 = 30,000
      // EV_ship_day = 30,000 / 365 = 82.19
      // CoD = 0.5 * 82.19 * 14 + 82.19 * 2 = 575.34 + 164.38 = 739.73
      expect(result.codApplies).toBe(true);
      expect(result.codDollars).toBeCloseTo(739.73, 0);
    });
  });
});
