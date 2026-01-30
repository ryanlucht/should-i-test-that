/**
 * Tests for derived value functions
 *
 * These functions convert user inputs into the canonical forms
 * needed for EVPI calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveK,
  normalizeThresholdToLift,
  determineDefaultDecision,
  detectEdgeCases,
} from './derived';

describe('deriveK', () => {
  it('should compute K = N_year * CR0 * V', () => {
    // K = 1,000,000 visitors * 0.05 CR * $100 value = $5,000,000
    const result = deriveK(1_000_000, 0.05, 100);
    expect(result).toBe(5_000_000);
  });

  it('should handle another example correctly', () => {
    // K = 500,000 visitors * 0.03 CR * $50 value = $750,000
    const result = deriveK(500_000, 0.03, 50);
    expect(result).toBe(750_000);
  });

  it('should return 0 when annualVisitors is 0', () => {
    const result = deriveK(0, 0.05, 100);
    expect(result).toBe(0);
  });

  it('should return 0 when baselineConversionRate is 0', () => {
    const result = deriveK(1_000_000, 0, 100);
    expect(result).toBe(0);
  });

  it('should return 0 when valuePerConversion is 0', () => {
    const result = deriveK(1_000_000, 0.05, 0);
    expect(result).toBe(0);
  });

  it('should handle decimal conversion rates correctly', () => {
    // K = 2,000,000 * 0.032 * 75 = 4,800,000
    const result = deriveK(2_000_000, 0.032, 75);
    expect(result).toBe(4_800_000);
  });
});

describe('normalizeThresholdToLift', () => {
  describe('dollar threshold', () => {
    it('should convert dollar threshold to lift: T_L = T_$ / K', () => {
      // $50,000 with K=$1,000,000 -> T_L = 0.05
      const result = normalizeThresholdToLift(50_000, 'dollars', 1_000_000);
      expect(result).toBe(0.05);
    });

    it('should return 0 when K is 0 (defensive)', () => {
      const result = normalizeThresholdToLift(50_000, 'dollars', 0);
      expect(result).toBe(0);
    });

    it('should handle negative dollar thresholds (accept-loss scenario)', () => {
      // Per SPEC.md Section 7.3: T_$ = -Loss_$ for scenario 3
      // -$25,000 with K=$500,000 -> T_L = -0.05
      const result = normalizeThresholdToLift(-25_000, 'dollars', 500_000);
      expect(result).toBe(-0.05);
    });
  });

  describe('lift threshold', () => {
    it('should convert percentage lift to decimal: T_L = value / 100', () => {
      // 5 (meaning 5%) -> T_L = 0.05
      const result = normalizeThresholdToLift(5, 'lift', 1_000_000);
      expect(result).toBe(0.05);
    });

    it('should ignore K for lift thresholds', () => {
      // K doesn't matter for lift thresholds
      const result = normalizeThresholdToLift(10, 'lift', 0);
      expect(result).toBe(0.1);
    });

    it('should handle negative lift thresholds (accept-loss scenario)', () => {
      // -3 (meaning -3%) -> T_L = -0.03
      const result = normalizeThresholdToLift(-3, 'lift', 1_000_000);
      expect(result).toBe(-0.03);
    });

    it('should handle zero threshold', () => {
      const result = normalizeThresholdToLift(0, 'lift', 1_000_000);
      expect(result).toBe(0);
    });
  });
});

describe('determineDefaultDecision', () => {
  it('should return "ship" when mu_L > T_L', () => {
    // Prior mean (5%) > threshold (3%)
    const result = determineDefaultDecision(0.05, 0.03);
    expect(result).toBe('ship');
  });

  it('should return "dont-ship" when mu_L < T_L', () => {
    // Prior mean (2%) < threshold (5%)
    const result = determineDefaultDecision(0.02, 0.05);
    expect(result).toBe('dont-ship');
  });

  it('should return "ship" when mu_L equals T_L (tie goes to ship)', () => {
    // Per SPEC.md Section 8.1: "if mu_L >= T_L: Ship"
    const result = determineDefaultDecision(0.05, 0.05);
    expect(result).toBe('ship');
  });

  it('should handle negative thresholds correctly', () => {
    // mu_L = -0.02, T_L = -0.05 -> mu_L > T_L -> ship
    const result = determineDefaultDecision(-0.02, -0.05);
    expect(result).toBe('ship');
  });

  it('should handle zero values correctly', () => {
    // mu_L = 0, T_L = 0 -> ship (tie)
    expect(determineDefaultDecision(0, 0)).toBe('ship');

    // mu_L = 0, T_L = -0.01 -> ship
    expect(determineDefaultDecision(0, -0.01)).toBe('ship');

    // mu_L = 0, T_L = 0.01 -> dont-ship
    expect(determineDefaultDecision(0, 0.01)).toBe('dont-ship');
  });
});

describe('detectEdgeCases', () => {
  describe('nearZeroSigma', () => {
    it('should flag nearZeroSigma when sigma_L < 0.001', () => {
      const result = detectEdgeCases(0.0001, 0.05, 0.5);
      expect(result.nearZeroSigma).toBe(true);
    });

    it('should not flag nearZeroSigma when sigma_L >= 0.001', () => {
      const result = detectEdgeCases(0.05, 0.05, 0.5);
      expect(result.nearZeroSigma).toBe(false);
    });

    it('should flag nearZeroSigma at the boundary (0.001)', () => {
      // Exactly 0.001 should NOT be flagged (less than, not less than or equal)
      const result = detectEdgeCases(0.001, 0.05, 0.5);
      expect(result.nearZeroSigma).toBe(false);
    });

    it('should flag nearZeroSigma just below boundary', () => {
      const result = detectEdgeCases(0.0009999, 0.05, 0.5);
      expect(result.nearZeroSigma).toBe(true);
    });
  });

  describe('priorOneSided', () => {
    it('should flag priorOneSided when Phi_z > 0.9999', () => {
      const result = detectEdgeCases(0.05, 0.05, 0.99999);
      expect(result.priorOneSided).toBe(true);
    });

    it('should flag priorOneSided when Phi_z < 0.0001', () => {
      const result = detectEdgeCases(0.05, 0.05, 0.00001);
      expect(result.priorOneSided).toBe(true);
    });

    it('should not flag priorOneSided for moderate Phi_z values', () => {
      const result = detectEdgeCases(0.05, 0.05, 0.5);
      expect(result.priorOneSided).toBe(false);
    });

    it('should not flag priorOneSided at boundaries', () => {
      // Exactly 0.9999 should NOT be flagged
      const result1 = detectEdgeCases(0.05, 0.05, 0.9999);
      expect(result1.priorOneSided).toBe(false);

      // Exactly 0.0001 should NOT be flagged
      const result2 = detectEdgeCases(0.05, 0.05, 0.0001);
      expect(result2.priorOneSided).toBe(false);
    });
  });

  describe('truncationApplied', () => {
    it('should flag truncationApplied when prior has significant mass below L=-1', () => {
      // Prior with mu_L = -0.8, sigma_L = 0.2
      // z for L=-1: (-1 - (-0.8)) / 0.2 = -1
      // P(L < -1) = Phi(-1) ~ 0.16 > 0.001
      const result = detectEdgeCases(0.2, -0.8, 0.5);
      expect(result.truncationApplied).toBe(true);
    });

    it('should not flag truncationApplied when prior has negligible mass below L=-1', () => {
      // Prior with mu_L = 0, sigma_L = 0.05
      // z for L=-1: (-1 - 0) / 0.05 = -20
      // P(L < -1) = Phi(-20) ~ 0 < 0.001
      const result = detectEdgeCases(0.05, 0, 0.5);
      expect(result.truncationApplied).toBe(false);
    });

    it('should flag truncationApplied for priors centered near -100%', () => {
      // Prior with mu_L = -0.5, sigma_L = 0.3
      // z for L=-1: (-1 - (-0.5)) / 0.3 = -1.67
      // P(L < -1) = Phi(-1.67) ~ 0.047 > 0.001
      const result = detectEdgeCases(0.3, -0.5, 0.5);
      expect(result.truncationApplied).toBe(true);
    });

    it('should not flag truncationApplied for typical priors', () => {
      // Prior with mu_L = 0.05, sigma_L = 0.1
      // z for L=-1: (-1 - 0.05) / 0.1 = -10.5
      // P(L < -1) ~ 0 < 0.001
      const result = detectEdgeCases(0.1, 0.05, 0.5);
      expect(result.truncationApplied).toBe(false);
    });
  });
});
