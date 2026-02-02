/**
 * EVPI Calculation Tests
 *
 * Tests for the Expected Value of Perfect Information calculation
 * using the closed-form Normal formula from SPEC.md Section 8.4.
 */

import { describe, it, expect } from 'vitest';
import { calculateEVPI } from './evpi';

describe('calculateEVPI', () => {
  // ===========================================
  // 1. Basic functionality tests
  // ===========================================

  describe('basic functionality', () => {
    it('returns correct structure with all required fields', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: 0,
      });

      // Required output fields per EVPIResults interface
      expect(result).toHaveProperty('evpiDollars');
      expect(result).toHaveProperty('defaultDecision');
      expect(result).toHaveProperty('probabilityClearsThreshold');
      expect(result).toHaveProperty('chanceOfBeingWrong');
      expect(result).toHaveProperty('K');
      expect(result).toHaveProperty('threshold_dollars');
      expect(result).toHaveProperty('zScore');
      expect(result).toHaveProperty('phiZ');
      expect(result).toHaveProperty('PhiZ');
      expect(result).toHaveProperty('edgeCases');
    });

    it('returns numeric values for all metrics', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: 0,
      });

      expect(typeof result.evpiDollars).toBe('number');
      expect(typeof result.K).toBe('number');
      expect(typeof result.threshold_dollars).toBe('number');
      expect(typeof result.zScore).toBe('number');
      expect(typeof result.phiZ).toBe('number');
      expect(typeof result.PhiZ).toBe('number');
      expect(typeof result.probabilityClearsThreshold).toBe('number');
      expect(typeof result.chanceOfBeingWrong).toBe('number');
    });

    it('returns valid edgeCases flags object', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: 0,
      });

      expect(result.edgeCases).toHaveProperty('truncationApplied');
      expect(result.edgeCases).toHaveProperty('nearZeroSigma');
      expect(result.edgeCases).toHaveProperty('priorOneSided');
      expect(typeof result.edgeCases.truncationApplied).toBe('boolean');
      expect(typeof result.edgeCases.nearZeroSigma).toBe('boolean');
      expect(typeof result.edgeCases.priorOneSided).toBe('boolean');
    });
  });

  // ===========================================
  // 2. Default decision tests
  // ===========================================

  describe('default decision', () => {
    it('returns "ship" when mu_L >= T_L', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.05, sigma_L: 0.05 }, // mean = 5%
        threshold_L: 0, // threshold = 0%
      });
      expect(result.defaultDecision).toBe('ship');
    });

    it('returns "ship" when mu_L equals T_L exactly', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.05, sigma_L: 0.05 },
        threshold_L: 0.05, // threshold equals mean
      });
      expect(result.defaultDecision).toBe('ship');
    });

    it('returns "dont-ship" when mu_L < T_L', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 }, // mean = 0%
        threshold_L: 0.05, // threshold = 5%
      });
      expect(result.defaultDecision).toBe('dont-ship');
    });
  });

  // ===========================================
  // 3. EVPI formula verification tests
  // ===========================================

  describe('EVPI formula', () => {
    /**
     * Hand-calculated verification for default prior with zero threshold:
     *
     * Inputs:
     *   - N_year = 1,000,000 visitors
     *   - CR0 = 0.05 (5%)
     *   - V = $100
     *   - Prior: N(0, 0.05)
     *   - T_L = 0
     *
     * Derivations:
     *   - K = N_year * CR0 * V = 1,000,000 * 0.05 * 100 = 5,000,000
     *   - z = (T_L - mu_L) / sigma_L = (0 - 0) / 0.05 = 0
     *   - phi(0) = 1 / sqrt(2*pi) = 0.3989422804...
     *   - Phi(0) = 0.5
     *
     * Default decision: Ship (mu_L = 0 >= T_L = 0)
     *
     * EVPI formula (Ship case per SPEC.md Section 8.4):
     *   EVPI = K * [ (T_L - mu_L) * Phi(z) + sigma_L * phi(z) ]
     *        = 5,000,000 * [ (0 - 0) * 0.5 + 0.05 * 0.3989 ]
     *        = 5,000,000 * [ 0 + 0.019945 ]
     *        = 5,000,000 * 0.019945
     *        = 99,723 (approximately)
     */
    it('calculates correct EVPI for default prior with zero threshold', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: 0,
      });

      // K = 1,000,000 * 0.05 * 100 = 5,000,000
      expect(result.K).toBe(5000000);

      // z = (0 - 0) / 0.05 = 0
      expect(result.zScore).toBeCloseTo(0, 6);

      // phi(0) = 1/sqrt(2*pi) approx 0.3989422804
      expect(result.phiZ).toBeCloseTo(0.3989422804, 6);

      // Phi(0) = 0.5
      expect(result.PhiZ).toBeCloseTo(0.5, 6);

      // Default is Ship (mu_L >= T_L)
      expect(result.defaultDecision).toBe('ship');

      // EVPI = K * sigma_L * phi(0) = 5,000,000 * 0.05 * 0.3989 approx 99,735
      // Allow $100 tolerance (within -2 decimal places)
      expect(result.evpiDollars).toBeCloseTo(99735, -2);
    });

    it('calculates correct K from business inputs', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.032, // 3.2%
        annualVisitors: 500000,
        valuePerConversion: 50,
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: 0,
      });

      // K = 500,000 * 0.032 * 50 = 800,000
      expect(result.K).toBe(800000);
    });

    it('calculates correct z-score for non-zero threshold', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.02, sigma_L: 0.04 }, // mean = 2%, SD = 4%
        threshold_L: 0.06, // threshold = 6%
      });

      // z = (T_L - mu_L) / sigma_L = (0.06 - 0.02) / 0.04 = 1.0
      expect(result.zScore).toBeCloseTo(1.0, 6);
    });
  });

  // ===========================================
  // 4. Edge case tests
  // ===========================================

  describe('edge cases', () => {
    it('returns EVPI near zero when sigma_L is very small', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.05, sigma_L: 0.0001 }, // very narrow prior
        threshold_L: 0,
      });

      // When user is essentially certain, EVPI should be near zero
      expect(result.evpiDollars).toBeLessThan(100);
      expect(result.edgeCases.nearZeroSigma).toBe(true);
    });

    it('returns EVPI near zero when prior is far above threshold', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.2, sigma_L: 0.02 }, // prior centered at 20%
        threshold_L: 0, // threshold at 0%
      });

      // Prior is ~10 sigma above threshold, essentially no regret region
      expect(result.evpiDollars).toBeLessThan(100);
      expect(result.edgeCases.priorOneSided).toBe(true);
    });

    it('returns EVPI near zero when prior is far below threshold', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: -0.2, sigma_L: 0.02 }, // prior centered at -20%
        threshold_L: 0, // threshold at 0%
      });

      // Prior is ~10 sigma below threshold, essentially no regret region
      expect(result.evpiDollars).toBeLessThan(100);
      expect(result.edgeCases.priorOneSided).toBe(true);
    });

    it('sets truncationApplied when prior has significant mass below L=-1', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: -0.8, sigma_L: 0.2 }, // wide prior near -100%
        threshold_L: 0,
      });

      // Prior has significant mass below L = -1 (complete loss)
      expect(result.edgeCases.truncationApplied).toBe(true);
    });

    it('does not set truncationApplied for typical priors', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 }, // typical prior centered at 0
        threshold_L: 0,
      });

      // For N(0, 0.05), mass below L=-1 is negligible
      expect(result.edgeCases.truncationApplied).toBe(false);
    });
  });

  // ===========================================
  // 5. Probability calculations
  // ===========================================

  describe('probability calculations', () => {
    it('calculates probability of clearing threshold correctly at z=0', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: 0,
      });

      // P(L >= 0) = 1 - Phi(0) = 1 - 0.5 = 0.5
      expect(result.probabilityClearsThreshold).toBeCloseTo(0.5, 6);
    });

    it('calculates probability of clearing threshold for shifted prior', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.05, sigma_L: 0.05 }, // mean = 5%
        threshold_L: 0,
      });

      // z = (0 - 0.05) / 0.05 = -1
      // P(L >= 0) = 1 - Phi(-1) = 1 - 0.1587 = 0.8413
      expect(result.probabilityClearsThreshold).toBeCloseTo(0.8413, 3);
    });

    it('calculates chance of being wrong when default is Ship', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.05, sigma_L: 0.05 }, // mean above threshold
        threshold_L: 0,
      });

      // Default: Ship (mu_L=0.05 > T_L=0)
      // Chance of being wrong = P(L < T_L) = P(L < 0)
      // z = (0 - 0.05) / 0.05 = -1
      // P(L < 0) = Phi(-1) approx 0.1587
      expect(result.defaultDecision).toBe('ship');
      expect(result.chanceOfBeingWrong).toBeCloseTo(0.1587, 3);
    });

    it('calculates chance of being wrong when default is Dont ship', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: 0.05, // threshold above mean
      });

      // Default: Don't ship (mu_L=0 < T_L=0.05)
      // Chance of being wrong = P(L >= T_L) = P(L >= 0.05)
      // z = (0.05 - 0) / 0.05 = 1
      // P(L >= 0.05) = 1 - Phi(1) approx 0.1587
      expect(result.defaultDecision).toBe('dont-ship');
      expect(result.chanceOfBeingWrong).toBeCloseTo(0.1587, 3);
    });
  });

  // ===========================================
  // 6. Threshold dollar conversion
  // ===========================================

  describe('threshold dollar conversion', () => {
    it('calculates threshold_dollars from threshold_L and K', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: 0.05, // 5% lift
      });

      // K = 5,000,000
      // T_$ = K * T_L = 5,000,000 * 0.05 = 250,000
      expect(result.threshold_dollars).toBe(250000);
    });

    it('calculates threshold_dollars as zero when threshold_L is zero', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: 0,
      });

      // T_$ = K * 0 = 0
      expect(result.threshold_dollars).toBe(0);
    });

    it('handles negative threshold (accept small loss scenario)', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: -0.02, // willing to accept 2% loss
      });

      // K = 5,000,000
      // T_$ = K * (-0.02) = -100,000
      expect(result.threshold_dollars).toBe(-100000);
    });
  });

  // ===========================================
  // 7. Formula verification (hand calculations)
  // ===========================================

  describe('formula verification with hand calculations', () => {
    /**
     * Hand-calculated verification for Ship default scenario
     *
     * Scenario:
     *   - 1M annual visitors, 5% CR, $100 per conversion
     *   - K = 5,000,000
     *   - Prior: N(0.02, 0.03) - expecting 2% lift with SD 3%
     *   - Threshold: 1% lift
     *
     * Derivations:
     *   - z = (T_L - mu_L) / sigma_L = (0.01 - 0.02) / 0.03 = -1/3 = -0.3333...
     *   - phi(-1/3) = 0.377099... (standard normal PDF)
     *   - Phi(-1/3) = 0.369441... (standard normal CDF via Abramowitz-Stegun)
     *   - Default: Ship (mu_L=0.02 > T_L=0.01)
     *
     * EVPI (Ship case):
     *   EVPI = K * [ (T_L - mu_L) * Phi(z) + sigma_L * phi(z) ]
     *        = 5,000,000 * [ (0.01 - 0.02) * 0.369441 + 0.03 * 0.377099 ]
     *        = 5,000,000 * [ -0.00369441 + 0.01131297 ]
     *        = 5,000,000 * 0.00762708
     *        = 38,135 (approximately)
     */
    it('matches hand-calculated EVPI for Ship scenario', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.02, sigma_L: 0.03 },
        threshold_L: 0.01,
      });

      expect(result.K).toBe(5000000);
      expect(result.defaultDecision).toBe('ship');
      expect(result.zScore).toBeCloseTo(-0.333, 2);
      // Expected EVPI: ~$38,135 (allow $100 tolerance)
      expect(result.evpiDollars).toBeCloseTo(38135, -2);
    });

    /**
     * Hand-calculated verification for Dont Ship default scenario
     *
     * Scenario:
     *   - Same K = 5,000,000
     *   - Prior: N(-0.02, 0.03) - expecting -2% lift
     *   - Threshold: 1% lift
     *
     * Derivations:
     *   - Default: Don't ship (mu_L=-0.02 < T_L=0.01)
     *   - z = (T_L - mu_L) / sigma_L = (0.01 - (-0.02)) / 0.03 = 1.0
     *   - phi(1) approx 0.2420
     *   - Phi(1) approx 0.8413
     *
     * EVPI (Don't Ship case):
     *   EVPI = K * [ (mu_L - T_L) * (1 - Phi(z)) + sigma_L * phi(z) ]
     *        = 5,000,000 * [ (-0.02 - 0.01) * (1 - 0.8413) + 0.03 * 0.2420 ]
     *        = 5,000,000 * [ (-0.03) * 0.1587 + 0.00726 ]
     *        = 5,000,000 * [ -0.00476 + 0.00726 ]
     *        = 5,000,000 * 0.0025
     *        = 12,500 (approximately)
     */
    it('matches hand-calculated EVPI for Dont Ship scenario', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: -0.02, sigma_L: 0.03 },
        threshold_L: 0.01,
      });

      expect(result.defaultDecision).toBe('dont-ship');
      expect(result.zScore).toBeCloseTo(1.0, 2);
      // Allow $100 tolerance
      expect(result.evpiDollars).toBeCloseTo(12500, -2);
    });
  });

  // ===========================================
  // 8. Degenerate sigma (sigma_L = 0) tests
  // ===========================================

  describe('degenerate sigma (sigma_L = 0)', () => {
    it('returns EVPI = 0 when sigma_L = 0 (no uncertainty)', () => {
      // When sigma = 0, the prior is a point mass - no uncertainty means
      // no value of information (we already know the true value)
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.05, sigma_L: 0 }, // degenerate prior at 5%
        threshold_L: 0,
      });

      // EVPI should be exactly 0 - no uncertainty means no regret
      expect(result.evpiDollars).toBe(0);
    });

    it('returns EVPI = 0 when sigma_L = 0 and mu_L < threshold', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0, sigma_L: 0 }, // point mass at 0
        threshold_L: 0.05, // threshold above point mass
      });

      // Default is Don't Ship, and with certainty, no regret
      expect(result.defaultDecision).toBe('dont-ship');
      expect(result.evpiDollars).toBe(0);
    });

    it('returns EVPI = 0 when sigma_L = 0 and mu_L = threshold', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.05, sigma_L: 0 }, // point mass at 5%
        threshold_L: 0.05, // threshold equals point mass
      });

      // Default is Ship (mu >= threshold), and with certainty, no regret
      expect(result.defaultDecision).toBe('ship');
      expect(result.evpiDollars).toBe(0);
    });

    it('returns correct metrics when sigma_L = 0 and mu_L > threshold', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.05, sigma_L: 0 }, // Point mass at 5%
        threshold_L: 0.02, // Threshold at 2%
      });

      expect(result.evpiDollars).toBe(0);
      expect(result.defaultDecision).toBe('ship');
      expect(result.probabilityClearsThreshold).toBe(1); // Point mass is above threshold
      expect(result.chanceOfBeingWrong).toBe(0); // No uncertainty
    });

    it('returns correct metrics when sigma_L = 0 and mu_L < threshold', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.01, sigma_L: 0 }, // Point mass at 1%
        threshold_L: 0.02, // Threshold at 2%
      });

      expect(result.evpiDollars).toBe(0);
      expect(result.defaultDecision).toBe('dont-ship');
      expect(result.probabilityClearsThreshold).toBe(0); // Point mass is below threshold
      expect(result.chanceOfBeingWrong).toBe(0); // No uncertainty
    });

    it('returns correct metrics when sigma_L = 0 and mu_L = threshold exactly', () => {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: 0.02, sigma_L: 0 }, // Point mass exactly at threshold
        threshold_L: 0.02,
      });

      expect(result.evpiDollars).toBe(0);
      expect(result.defaultDecision).toBe('ship'); // mu_L >= threshold_L
      expect(result.probabilityClearsThreshold).toBe(1); // Point mass is at threshold (>= counts)
      expect(result.chanceOfBeingWrong).toBe(0); // No uncertainty
    });
  });

  // ===========================================
  // 9. Non-negativity constraint
  // ===========================================

  describe('non-negativity', () => {
    it('never returns negative EVPI', () => {
      // EVPI is mathematically always >= 0
      // Test with various inputs to verify
      const testCases = [
        { mu_L: 0, sigma_L: 0.05, threshold_L: 0 },
        { mu_L: 0.1, sigma_L: 0.01, threshold_L: 0 },
        { mu_L: -0.1, sigma_L: 0.01, threshold_L: 0 },
        { mu_L: 0, sigma_L: 0.001, threshold_L: 0.05 },
        { mu_L: 0.5, sigma_L: 0.1, threshold_L: 0.5 }, // extreme case
        { mu_L: -0.5, sigma_L: 0.1, threshold_L: -0.5 }, // extreme negative
      ];

      for (const tc of testCases) {
        const result = calculateEVPI({
          baselineConversionRate: 0.05,
          annualVisitors: 1000000,
          valuePerConversion: 100,
          prior: { mu_L: tc.mu_L, sigma_L: tc.sigma_L },
          threshold_L: tc.threshold_L,
        });
        expect(result.evpiDollars).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
