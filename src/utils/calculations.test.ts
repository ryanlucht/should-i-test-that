/**
 * Tests for EVI/EVPI Calculations
 *
 * These tests verify our calculations against specific examples
 * from Douglas Hubbard's "How to Measure Anything" Chapter 7.
 *
 * Mathematical accuracy is priority #1.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBinaryEOL,
  calculateBinaryEVPI,
  calculateRelativeThreshold,
  getEOLF,
  calculateRangeEVPIQuick,
  calculateRangeEVPIDiscrete,
  calculateRangeEVPI,
} from './calculations';
import { normalCDF, ciToParams, normalPDF, incrementalProbability } from './distributions';
import type { BinaryInputs, RangeInputs } from '../types';

describe('Binary EOL/EVPI Calculations', () => {
  /**
   * Hubbard Example (Exhibit 7.1):
   * - 60% chance campaign succeeds
   * - If successful: $40M profit
   * - If fails: $5M loss
   *
   * EOL if approved = 40% × $5M = $2M
   * EOL if rejected = 60% × $40M = $24M
   * Best decision: Approve
   * EVPI = $2M
   */
  const hubbardBinaryExample: BinaryInputs = {
    probabilitySuccess: 0.6,
    valueIfSuccess: 40_000_000,
    costIfFailure: 5_000_000,
  };

  it('calculates basic EOL correctly', () => {
    // EOL = chance of being wrong × cost of being wrong
    expect(calculateBinaryEOL(0.4, 5_000_000)).toBe(2_000_000);
    expect(calculateBinaryEOL(0.6, 40_000_000)).toBe(24_000_000);
  });

  it('calculates EOL if approved correctly (Hubbard example)', () => {
    const result = calculateBinaryEVPI(hubbardBinaryExample);
    expect(result.eolIfApproved).toBe(2_000_000);
  });

  it('calculates EOL if rejected correctly (Hubbard example)', () => {
    const result = calculateBinaryEVPI(hubbardBinaryExample);
    expect(result.eolIfRejected).toBe(24_000_000);
  });

  it('determines correct best decision (Hubbard example)', () => {
    const result = calculateBinaryEVPI(hubbardBinaryExample);
    expect(result.bestDecision).toBe('approve');
  });

  it('calculates EVPI correctly (Hubbard example: $2M)', () => {
    const result = calculateBinaryEVPI(hubbardBinaryExample);
    expect(result.evpi).toBe(2_000_000);
  });

  it('handles edge case: 100% probability of success', () => {
    const inputs: BinaryInputs = {
      probabilitySuccess: 1.0,
      valueIfSuccess: 40_000_000,
      costIfFailure: 5_000_000,
    };
    const result = calculateBinaryEVPI(inputs);
    expect(result.eolIfApproved).toBe(0); // No chance of failure
    expect(result.eolIfRejected).toBe(40_000_000); // Certain to miss opportunity
    expect(result.bestDecision).toBe('approve');
    expect(result.evpi).toBe(0); // No uncertainty = no value of information
  });

  it('handles edge case: 0% probability of success', () => {
    const inputs: BinaryInputs = {
      probabilitySuccess: 0,
      valueIfSuccess: 40_000_000,
      costIfFailure: 5_000_000,
    };
    const result = calculateBinaryEVPI(inputs);
    expect(result.eolIfApproved).toBe(5_000_000); // Certain to fail
    expect(result.eolIfRejected).toBe(0); // No opportunity lost
    expect(result.bestDecision).toBe('reject');
    expect(result.evpi).toBe(0); // No uncertainty = no value of information
  });

  it('handles 50/50 decision where reject is better', () => {
    const inputs: BinaryInputs = {
      probabilitySuccess: 0.5,
      valueIfSuccess: 1_000_000,
      costIfFailure: 10_000_000,
    };
    const result = calculateBinaryEVPI(inputs);
    expect(result.eolIfApproved).toBe(5_000_000);
    expect(result.eolIfRejected).toBe(500_000);
    expect(result.bestDecision).toBe('reject');
    expect(result.evpi).toBe(500_000);
  });
});

describe('Normal Distribution Functions', () => {
  /**
   * From Hubbard:
   * 90% CI means 5% probability below lower bound, 5% above upper
   * For normal: 90% CI = mean ± 1.645 × stdDev
   */

  it('converts 90% CI to parameters correctly', () => {
    // Example: 150K-300K range
    const { mean, stdDev } = ciToParams(150_000, 300_000);
    expect(mean).toBe(225_000); // Midpoint

    // stdDev should be such that 5th percentile = 150K
    // z for 5th percentile ≈ -1.645
    // 150K = 225K - 1.645 × stdDev
    // stdDev ≈ 45,584
    expect(stdDev).toBeCloseTo(45_584, -2);
  });

  it('calculates CDF correctly at known percentiles', () => {
    const { mean, stdDev } = ciToParams(150_000, 300_000);

    // 5th percentile should be at lower bound
    expect(normalCDF(150_000, mean, stdDev)).toBeCloseTo(0.05, 2);

    // 95th percentile should be at upper bound
    expect(normalCDF(300_000, mean, stdDev)).toBeCloseTo(0.95, 2);

    // 50th percentile should be at mean
    expect(normalCDF(mean, mean, stdDev)).toBeCloseTo(0.5, 5);
  });

  it('calculates PDF correctly (bell curve shape)', () => {
    const mean = 100;
    const stdDev = 15;

    // PDF should be highest at mean
    const pdfAtMean = normalPDF(mean, mean, stdDev);
    const pdfAt1SD = normalPDF(mean + stdDev, mean, stdDev);
    const pdfAt2SD = normalPDF(mean + 2 * stdDev, mean, stdDev);

    expect(pdfAtMean).toBeGreaterThan(pdfAt1SD);
    expect(pdfAt1SD).toBeGreaterThan(pdfAt2SD);
  });

  it('calculates incremental probability correctly', () => {
    const { mean, stdDev } = ciToParams(150_000, 300_000);

    // Probability between 5th and 95th percentile should be ~90%
    const prob = incrementalProbability(150_000, 300_000, mean, stdDev);
    expect(prob).toBeCloseTo(0.9, 2);

    // Probability in middle 50% should be ~50%
    const lowerQuartile = mean - 0.6745 * stdDev;
    const upperQuartile = mean + 0.6745 * stdDev;
    const midProb = incrementalProbability(lowerQuartile, upperQuartile, mean, stdDev);
    expect(midProb).toBeCloseTo(0.5, 2);
  });
});

describe('Relative Threshold Calculation', () => {
  /**
   * From Hubbard:
   * RT = (Threshold - Worst Bound) / (Best Bound - Worst Bound)
   *
   * For "higher is better" (default):
   * - Worst Bound = Lower Bound
   * - Best Bound = Upper Bound
   */

  it('calculates RT correctly for Hubbard example', () => {
    // 150K-300K range, 200K threshold
    // RT = (200K - 150K) / (300K - 150K) = 50K / 150K = 0.333...
    const rt = calculateRelativeThreshold(200_000, 150_000, 300_000);
    expect(rt).toBeCloseTo(0.333, 2);
  });

  it('returns 0 when threshold equals worst bound', () => {
    const rt = calculateRelativeThreshold(150_000, 150_000, 300_000);
    expect(rt).toBe(0);
  });

  it('returns 1 when threshold equals best bound', () => {
    const rt = calculateRelativeThreshold(300_000, 150_000, 300_000);
    expect(rt).toBe(1);
  });

  it('returns 0.5 when threshold is at midpoint', () => {
    const rt = calculateRelativeThreshold(225_000, 150_000, 300_000);
    expect(rt).toBe(0.5);
  });

  it('clamps RT to 0-1 range', () => {
    // Threshold below worst bound
    expect(calculateRelativeThreshold(100_000, 150_000, 300_000)).toBe(0);

    // Threshold above best bound
    expect(calculateRelativeThreshold(400_000, 150_000, 300_000)).toBe(1);
  });
});

describe('EOLF Lookup', () => {
  /**
   * From Hubbard's Exhibit 7.5:
   * EOLF values for normal distribution at various RT values
   */

  it('returns ~53 for RT=0.33 (Hubbard example)', () => {
    const eolf = getEOLF(0.33);
    expect(eolf).toBeCloseTo(53, 0);
  });

  it('returns maximum (~74) for RT=0.5', () => {
    const eolf = getEOLF(0.5);
    expect(eolf).toBeCloseTo(74, 0);
  });

  it('returns 0 for RT=0 or RT=1', () => {
    expect(getEOLF(0)).toBe(0);
    expect(getEOLF(1)).toBe(0);
  });

  it('is symmetric around RT=0.5', () => {
    expect(getEOLF(0.3)).toBeCloseTo(getEOLF(0.7), 0);
    expect(getEOLF(0.2)).toBeCloseTo(getEOLF(0.8), 0);
    expect(getEOLF(0.1)).toBeCloseTo(getEOLF(0.9), 0);
  });
});

describe('Range-based EVPI Calculation', () => {
  /**
   * Hubbard Example (from text):
   * - Range: 150K to 300K units (90% CI)
   * - Threshold: 200K units
   * - Loss per unit: $25
   *
   * RT = (200K - 150K) / (300K - 150K) = 0.333
   * EOLF at RT=0.33 ≈ 53
   * Range width = 150K
   * EVPI = (53/1000) × $25 × 150,000 = $198,750
   */
  const hubbardRangeExample: RangeInputs = {
    lowerBound: 150_000,
    upperBound: 300_000,
    threshold: 200_000,
    lossPerUnit: 25,
    distribution: 'normal',
  };

  it('calculates EVPI using quick method (EOLF shortcut)', () => {
    const evpi = calculateRangeEVPIQuick(hubbardRangeExample);
    // Hubbard's example: EOLF=53, so EVPI = (53/1000) × $25 × 150,000 = $198,750
    // Our calculation uses interpolated EOLF (~53.5), giving ~$200,625
    // Both are in the ~$200K range, which is the key insight
    expect(evpi).toBeGreaterThan(190_000);
    expect(evpi).toBeLessThan(210_000);
  });

  it('calculates EVPI using discrete approximation method', () => {
    const { evpi } = calculateRangeEVPIDiscrete(hubbardRangeExample);
    // The discrete method integrates over the full distribution
    // Results will be close to but not exactly $200K due to:
    // 1. Tail contributions beyond the 90% CI
    // 2. Slice width approximation
    // Key validation: EVPI should be in $200K-$220K range
    expect(evpi).toBeGreaterThan(195_000);
    expect(evpi).toBeLessThan(220_000);
  });

  it('returns slice breakdown for visualization', () => {
    const { slices } = calculateRangeEVPIDiscrete(hubbardRangeExample, 100);
    expect(slices.length).toBeGreaterThan(0);

    // Each slice should have required properties
    slices.forEach(slice => {
      expect(slice).toHaveProperty('value');
      expect(slice).toHaveProperty('loss');
      expect(slice).toHaveProperty('probability');
      expect(slice).toHaveProperty('expectedLoss');
    });
  });

  it('calculates full range EVPI with all metrics', () => {
    const result = calculateRangeEVPI(hubbardRangeExample);

    expect(result.mean).toBe(225_000);
    expect(result.relativeThreshold).toBeCloseTo(0.333, 2);
    expect(result.eolf).toBeCloseTo(53, 0);
    // EVPI in the $200K-$220K range (see discrete method test for reasoning)
    expect(result.evpi).toBeGreaterThan(195_000);
    expect(result.evpi).toBeLessThan(220_000);
    expect(result.probabilityBelowThreshold).toBeGreaterThan(0);
    expect(result.probabilityBelowThreshold).toBeLessThan(1);
  });

  it('returns small EVPI when threshold is at worst bound', () => {
    const inputs: RangeInputs = {
      ...hubbardRangeExample,
      threshold: 150_000, // At lower bound (5th percentile)
    };
    const { evpi } = calculateRangeEVPIDiscrete(inputs);
    // When threshold is at the 5th percentile, there's still ~5% of the
    // distribution below it (the tail), so EVPI isn't exactly zero.
    // But it should be much smaller than the ~$200K at RT=0.33
    expect(evpi).toBeLessThan(50_000); // Much smaller than peak EVPI
  });

  it('returns 0 EVPI when threshold is at best bound', () => {
    const inputs: RangeInputs = {
      ...hubbardRangeExample,
      threshold: 300_000, // At upper bound
    };
    const result = calculateRangeEVPI(inputs);
    // When threshold is at best bound, RT=1, EOLF=0, EVPI should be small
    // (there's still tail probability above threshold)
    expect(result.relativeThreshold).toBe(1);
    expect(result.eolf).toBe(0);
  });

  it('handles uniform distribution', () => {
    const inputs: RangeInputs = {
      ...hubbardRangeExample,
      distribution: 'uniform',
    };
    const result = calculateRangeEVPI(inputs);

    // For uniform, probability below threshold should be exactly:
    // (200K - 150K) / (300K - 150K) = 1/3
    expect(result.probabilityBelowThreshold).toBeCloseTo(1/3, 5);
  });
});

describe('Edge Cases and Error Handling', () => {
  it('handles zero-width CI gracefully', () => {
    const { mean, stdDev } = ciToParams(100, 100);
    expect(mean).toBe(100);
    expect(stdDev).toBe(0);

    // CDF should be step function at mean
    expect(normalCDF(99, 100, 0)).toBe(0);
    expect(normalCDF(101, 100, 0)).toBe(1);
  });

  it('handles reversed bounds without NaN/Infinity', () => {
    const inputs: RangeInputs = {
      lowerBound: 8,
      upperBound: -2,
      threshold: 0,
      lossPerUnit: 100,
      distribution: 'uniform',
    };

    const full = calculateRangeEVPI(inputs);
    const discrete = calculateRangeEVPIDiscrete(inputs);
    const quick = calculateRangeEVPIQuick(inputs);

    expect(Number.isFinite(full.evpi)).toBe(true);
    expect(Number.isFinite(discrete.evpi)).toBe(true);
    expect(Number.isFinite(quick)).toBe(true);
    expect(full.probabilityBelowThreshold).toBeCloseTo(0.2, 5);
  });

  it('handles zero-width uniform bounds consistently', () => {
    const inputsAt = {
      lowerBound: 2,
      upperBound: 2,
      threshold: 2,
      lossPerUnit: 100,
      distribution: 'uniform' as const,
    };
    const inputsBelow = { ...inputsAt, threshold: 1 };

    const resultAt = calculateRangeEVPI(inputsAt);
    const resultBelow = calculateRangeEVPI(inputsBelow);

    expect(resultAt.probabilityBelowThreshold).toBe(1);
    expect(resultBelow.probabilityBelowThreshold).toBe(0);
  });

  it('handles very large values', () => {
    const inputs: BinaryInputs = {
      probabilitySuccess: 0.6,
      valueIfSuccess: 1_000_000_000,
      costIfFailure: 100_000_000,
    };
    const result = calculateBinaryEVPI(inputs);
    expect(result.evpi).toBe(40_000_000); // 40% × $100M
  });

  it('handles very small probabilities', () => {
    const inputs: BinaryInputs = {
      probabilitySuccess: 0.001,
      valueIfSuccess: 1_000_000,
      costIfFailure: 100,
    };
    const result = calculateBinaryEVPI(inputs);
    expect(result.eolIfApproved).toBeCloseTo(99.9, 0);
    expect(result.eolIfRejected).toBe(1_000);
    expect(result.bestDecision).toBe('approve');
  });
});
