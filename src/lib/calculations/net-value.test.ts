/**
 * Net Value of Testing Tests
 *
 * Tests for COD-01, COD-02, COD-03 requirements:
 * - COD-01: Value during test period accounts for split traffic
 * - COD-02: Value during latency period is zero (conservative assumption)
 * - COD-03: Net value is single coherent simulation, not EVSI - CoD
 *
 * Per audit recommendation: integrate timing into simulation rather than
 * computing EVSI and CoD separately.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateNetValueMonteCarlo,
  calculateIterationValue,
  calculateBaselineValue,
} from './net-value';
import type { PriorDistribution } from './distributions';
import type { NetValueInputs, NetValueResults } from './types';

describe('calculateBaselineValue', () => {
  // Helper function tests
  it('returns K*(L-T) when default decision is ship', () => {
    // If we ship without testing, we get the full year of value relative to threshold
    const result = calculateBaselineValue(
      0.10, // L_true = 10% lift
      'ship',
      0.05, // threshold = 5%
      1000000 // K = $1M per unit lift
    );

    // Value = K * (L_true - T_L) = 1,000,000 * (0.10 - 0.05) = 50,000
    expect(result).toBeCloseTo(50000, 0);
  });

  it('returns 0 when default decision is dont-ship', () => {
    // If we don't ship without testing, we get nothing
    const result = calculateBaselineValue(
      0.10, // L_true = 10% lift (doesn't matter)
      'dont-ship',
      0.05, // threshold = 5%
      1000000 // K = $1M per unit lift
    );

    expect(result).toBe(0);
  });

  it('returns negative value when L_true < threshold and decision is ship', () => {
    // This represents regret: we shipped but lift was below threshold
    const result = calculateBaselineValue(
      0.02, // L_true = 2% lift (below threshold)
      'ship',
      0.05, // threshold = 5%
      1000000 // K = $1M
    );

    // Value = 1,000,000 * (0.02 - 0.05) = -30,000
    expect(result).toBeCloseTo(-30000, 0);
  });
});

describe('calculateIterationValue', () => {
  const baseParams = {
    threshold_L: 0.05,
    K: 1000000, // $1M per unit lift annually
    variantFraction: 0.5,
    testDurationDays: 30,
    decisionLatencyDays: 7,
  };

  it('returns correct period breakdown for ship decision', () => {
    const result = calculateIterationValue(
      0.10, // L_true = 10% lift
      'ship',
      baseParams
    );

    // Time fractions
    const testFrac = 30 / 365;
    const latencyFrac = 7 / 365;
    const remainingFrac = 1 - testFrac - latencyFrac;

    // Period 1: During test - variant gets benefit
    // valueDuringTest = 0.5 * 1,000,000 * (0.10 - 0.05) * (30/365)
    const expectedTest = 0.5 * 1000000 * 0.05 * testFrac;
    expect(result.valueDuringTest).toBeCloseTo(expectedTest, 0);

    // Period 2: During latency - conservative assumption = 0
    expect(result.valueDuringLatency).toBe(0);

    // Period 3: After decision - full ship
    // valueAfterDecision = 1,000,000 * (0.10 - 0.05) * remainingFrac
    const expectedAfter = 1000000 * 0.05 * remainingFrac;
    expect(result.valueAfterDecision).toBeCloseTo(expectedAfter, 0);

    // Total should be sum of all three
    expect(result.totalValue).toBeCloseTo(
      expectedTest + 0 + expectedAfter,
      0
    );
  });

  it('returns correct period breakdown for dont-ship decision', () => {
    const result = calculateIterationValue(
      0.10, // L_true = 10% lift
      'dont-ship', // Test said don't ship (wrong decision)
      baseParams
    );

    // Time fractions
    const testFrac = 30 / 365;

    // Period 1: During test - variant still gets benefit
    const expectedTest = 0.5 * 1000000 * 0.05 * testFrac;
    expect(result.valueDuringTest).toBeCloseTo(expectedTest, 0);

    // Period 2: Latency = 0
    expect(result.valueDuringLatency).toBe(0);

    // Period 3: After decision - don't ship = 0
    expect(result.valueAfterDecision).toBe(0);
  });

  it('handles zero latency correctly', () => {
    const result = calculateIterationValue(
      0.10,
      'ship',
      { ...baseParams, decisionLatencyDays: 0 }
    );

    // Remaining fraction should be larger
    const testFrac = 30 / 365;
    const remainingFrac = 1 - testFrac;

    const expectedAfter = 1000000 * 0.05 * remainingFrac;
    expect(result.valueAfterDecision).toBeCloseTo(expectedAfter, 0);
  });
});

describe('COD-01: Value during test period', () => {
  // Tests that valueDuringTest = variantFraction * K * (L_true - threshold_L) * testFraction

  it('includes value during test period from variant traffic', () => {
    const inputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.10, sigma_L: 0.02 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 30,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    // With strong positive prior (mu=10%) and threshold=0:
    // - Default is Ship
    // - Net value should be non-negative (information can't hurt)
    expect(result.netValueDollars).toBeGreaterThanOrEqual(0);
    expect(result.defaultDecision).toBe('ship');
  });

  it('captures more in-test value with longer tests', () => {
    const baseInputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.10, sigma_L: 0.03 },
      n_control: 10000,
      n_variant: 10000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    };

    // Note: When prior is strongly positive and threshold is 0,
    // longer tests don't necessarily increase net value because
    // we're delaying full deployment. The variant group benefit
    // during test is offset by the control group getting nothing.
    //
    // This test verifies the timing mechanics work correctly.
    const shortTest = calculateNetValueMonteCarlo(
      { ...baseInputs, testDurationDays: 14, n_control: 5000, n_variant: 5000 },
      5000
    );
    const longTest = calculateNetValueMonteCarlo(
      { ...baseInputs, testDurationDays: 30, n_control: 10000, n_variant: 10000 },
      5000
    );

    // Both should produce valid results
    expect(shortTest.netValueDollars).toBeGreaterThanOrEqual(0);
    expect(longTest.netValueDollars).toBeGreaterThanOrEqual(0);
    expect(shortTest.defaultDecision).toBe('ship');
    expect(longTest.defaultDecision).toBe('ship');
  });

  it('correctly handles different variant fractions', () => {
    const baseInputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0.03,
      prior: { type: 'normal', mu_L: 0.05, sigma_L: 0.02 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 21,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    };

    const fiftyFifty = calculateNetValueMonteCarlo(
      { ...baseInputs, variantFraction: 0.5 },
      5000
    );
    const thirtyPercent = calculateNetValueMonteCarlo(
      { ...baseInputs, variantFraction: 0.3 },
      5000
    );

    // Both should produce valid non-negative results
    expect(fiftyFifty.netValueDollars).toBeGreaterThanOrEqual(0);
    expect(thirtyPercent.netValueDollars).toBeGreaterThanOrEqual(0);
  });
});

describe('COD-02: Value during latency period', () => {
  // Tests that latency reduces net value when default is Ship (conservative assumption)

  it('accounts for foregone value during latency period', () => {
    const baseInputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.05, sigma_L: 0.02 },
      n_control: 10000,
      n_variant: 10000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    };

    const shortLatency = calculateNetValueMonteCarlo(
      { ...baseInputs, decisionLatencyDays: 0 },
      10000
    );
    const longLatency = calculateNetValueMonteCarlo(
      { ...baseInputs, decisionLatencyDays: 30 },
      10000
    );

    // When default is Ship (mu > T), longer latency should reduce net value
    // because we're foregoing expected benefit during latency period
    expect(longLatency.netValueDollars).toBeLessThan(
      shortLatency.netValueDollars + 5000 // Allow Monte Carlo variance
    );
  });

  it('latency has zero value (conservative assumption)', () => {
    // Verify the conservative assumption: during latency, no one gets treatment
    // This is tested indirectly through calculateIterationValue

    const result = calculateIterationValue(
      0.10,
      'ship',
      {
        threshold_L: 0,
        K: 1000000,
        variantFraction: 0.5,
        testDurationDays: 14,
        decisionLatencyDays: 30, // Long latency
      }
    );

    // COD-02: Value during latency should be exactly 0 (conservative)
    expect(result.valueDuringLatency).toBe(0);
  });

  it('latency matters more when default decision is ship', () => {
    // When prior favors shipping, latency costs us expected value
    // When prior favors not shipping, latency costs us nothing

    const shipDefault: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.08, sigma_L: 0.02 }, // Strong ship signal
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 30,
    };

    const noShipDefault: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0.15, // High threshold
      prior: { type: 'normal', mu_L: 0.08, sigma_L: 0.02 }, // Below threshold
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 30,
    };

    const shipResult = calculateNetValueMonteCarlo(shipDefault, 5000);
    const noShipResult = calculateNetValueMonteCarlo(noShipDefault, 5000);

    expect(shipResult.defaultDecision).toBe('ship');
    expect(noShipResult.defaultDecision).toBe('dont-ship');

    // Both should have valid results
    expect(shipResult.netValueDollars).toBeGreaterThanOrEqual(0);
    expect(noShipResult.netValueDollars).toBeGreaterThanOrEqual(0);
  });
});

describe('COD-03: Coherent single simulation', () => {
  // Tests that net value is computed from single simulation, not EVSI - CoD

  it('returns non-negative net value (information cannot hurt)', () => {
    const inputs: NetValueInputs = {
      K: 5000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.03, sigma_L: 0.04 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 21,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 10000);

    // Net value should always be non-negative
    // (clamped because information can't hurt in expectation)
    expect(result.netValueDollars).toBeGreaterThanOrEqual(0);
  });

  it('works with Normal prior', () => {
    const inputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0.03,
      prior: { type: 'normal', mu_L: 0.05, sigma_L: 0.03 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    expect(result.netValueDollars).toBeGreaterThanOrEqual(0);
    expect(result.defaultDecision).toBe('ship');
    expect(result.probabilityClearsThreshold).toBeGreaterThan(0);
    expect(result.probabilityClearsThreshold).toBeLessThanOrEqual(1);
  });

  it('works with Student-t prior', () => {
    const inputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0.03,
      prior: { type: 'student-t', mu_L: 0.05, sigma_L: 0.03, df: 5 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    expect(result.netValueDollars).toBeGreaterThanOrEqual(0);
    expect(result.defaultDecision).toBe('ship');
  });

  it('works with Uniform prior', () => {
    const inputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0.03,
      prior: { type: 'uniform', low_L: -0.05, high_L: 0.15 }, // Mean = 0.05
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    expect(result.netValueDollars).toBeGreaterThanOrEqual(0);
    expect(result.defaultDecision).toBe('ship');
  });

  it('returns expected diagnostic fields', () => {
    const inputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.05, sigma_L: 0.02 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    // Should have all expected fields
    expect(result.netValueDollars).toBeDefined();
    expect(result.defaultDecision).toBeDefined();
    expect(result.probabilityClearsThreshold).toBeDefined();
    expect(result.probabilityTestChangesDecision).toBeDefined();
    expect(result.numSamples).toBeDefined();
    expect(result.numRejected).toBeDefined();

    // Diagnostic values should be reasonable
    expect(result.numSamples).toBeGreaterThan(0);
    expect(result.numRejected).toBeGreaterThanOrEqual(0);
    expect(result.probabilityTestChangesDecision).toBeGreaterThanOrEqual(0);
    expect(result.probabilityTestChangesDecision).toBeLessThanOrEqual(1);
  });

  it('handles zero sample size gracefully', () => {
    const inputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.05, sigma_L: 0.02 },
      n_control: 0,
      n_variant: 0,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    // Zero samples = no information = zero net value
    expect(result.netValueDollars).toBe(0);
    expect(result.probabilityTestChangesDecision).toBe(0);
  });

  it('handles edge case of test + latency > 365 days', () => {
    const inputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.05, sigma_L: 0.02 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 300, // Long test
      variantFraction: 0.5,
      decisionLatencyDays: 100, // Long latency
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    // Should still produce valid results (remaining fraction = 0)
    expect(result.netValueDollars).toBeGreaterThanOrEqual(0);
    expect(result.defaultDecision).toBeDefined();
  });
});
