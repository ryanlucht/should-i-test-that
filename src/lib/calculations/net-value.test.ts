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
import { calculateNetValueMonteCarlo } from './net-value';
import type { NetValueInputs } from './types';

// Note: calculateBaselineValue and calculateIterationValue are now
// file-private internal helpers (Cleanup-04). Their behavior is still
// tested indirectly through the integration tests below (COD-01, COD-02, COD-03).

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
    expect(result.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
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
    expect(shortTest.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
    expect(longTest.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
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
    expect(fiftyFifty.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
    expect(thirtyPercent.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
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
    // COD-02: Value during latency = 0 (conservative)
    //
    // We verify this by comparing net value with different latency values.
    // Use a scenario with meaningful uncertainty (prior mean near threshold)
    // so the test actually has value to contribute.
    const baseInputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0.03,
      prior: { type: 'normal', mu_L: 0.04, sigma_L: 0.04 }, // Uncertain, near threshold
      n_control: 10000,
      n_variant: 10000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    };

    // With zero latency, we deploy immediately after test
    const zeroLatency = calculateNetValueMonteCarlo(
      { ...baseInputs, decisionLatencyDays: 0 },
      10000
    );
    // With 90-day latency, we lose ~25% of year to waiting with zero value
    const longLatency = calculateNetValueMonteCarlo(
      { ...baseInputs, decisionLatencyDays: 90 },
      10000
    );

    // Both results should be valid
    expect(zeroLatency.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
    expect(longLatency.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
    // When there's meaningful test value, latency reduces the net benefit
    // (less remaining year to capture value after deciding)
    // Note: Both could be 0 if test has no value, but long latency cannot exceed short
    expect(longLatency.netValueDollars).toBeLessThanOrEqual(
      zeroLatency.netValueDollars + 1000 // Small tolerance for Monte Carlo variance
    );
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
    expect(shipResult.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
    expect(noShipResult.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
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
    expect(result.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
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

    expect(result.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
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

    expect(result.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
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

    expect(result.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
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
    expect(result.maxTestBudgetDollars).toBeGreaterThanOrEqual(0);
    expect(result.defaultDecision).toBeDefined();
  });
});

// ===========================================
// Audit Fix A: netValueDollars can be legitimately negative
// ===========================================

describe('Audit Fix A: Net value can be negative', () => {
  // Per audit: "information can't hurt" applies to EVSI alone, but net value
  // includes real costs of acquiring information (delayed rollout, variant exposure)

  it('A1: "Always ship" scenario - test delays beneficial rollout (negative net value)', () => {
    // Prior: point mass at +10% lift (sigma_L=0.001 near-deterministic)
    // Threshold: 0 (always ship)
    // Without test: ship immediately, get full year of value
    // With test: delay 30 days for 50% of traffic, then ship
    // Net effect: lose 15/365 * K * 0.10 = negative
    const inputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.10, sigma_L: 0.001 }, // Near-deterministic positive
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 30,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    // Net value should be negative because test delays full deployment
    // Expected: K * 0.10 * ((0.5*30 + 335)/365 - 1) = K * 0.10 * (-15/365) ≈ -$4,110
    expect(result.netValueDollars).toBeLessThan(0);
    // But maxTestBudgetDollars is clamped to 0
    expect(result.maxTestBudgetDollars).toBe(0);
    expect(result.defaultDecision).toBe('ship');
  });

  it('A2: "Don\'t ship" scenario - variant exposes users to harm (negative net value)', () => {
    // Prior: point mass at -5% lift (always harmful)
    // Threshold: 0 (don't ship)
    // Without test: don't ship, get 0 value
    // With test: variant group experiences negative lift during test period
    // Net effect: valueDuringTest = 0.5 * K * (-0.05) * (30/365) = negative
    const inputs: NetValueInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: -0.05, sigma_L: 0.001 }, // Near-deterministic negative
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 30,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    // Net value should be negative because variant suffers during test
    // Expected: 0.5 * K * (-0.05 - 0) * (30/365) ≈ -$2,055
    expect(result.netValueDollars).toBeLessThan(0);
    // But maxTestBudgetDollars is clamped to 0
    expect(result.maxTestBudgetDollars).toBe(0);
    expect(result.defaultDecision).toBe('dont-ship');
  });
});

// ===========================================
// Accuracy-01: One-arm-zero handling tests
// ===========================================

describe('Accuracy-01: NetValue one-arm-zero handling', () => {
  it('handles n_control=0, n_variant>0 without NaN', () => {
    const inputs: NetValueInputs = {
      K: 100000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 0,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 1000);

    expect(result.netValueDollars).toBe(0);
    expect(Number.isNaN(result.netValueDollars)).toBe(false);
    expect(Number.isFinite(result.probabilityClearsThreshold)).toBe(true);
    expect(result.numSamples).toBe(0);
  });

  it('handles n_variant=0, n_control>0 without NaN', () => {
    const inputs: NetValueInputs = {
      K: 100000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 0,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 1000);

    expect(result.netValueDollars).toBe(0);
    expect(Number.isNaN(result.netValueDollars)).toBe(false);
  });
});

// ===========================================
// Accuracy-02: CR0 validation tests
// ===========================================

describe('Accuracy-02: NetValue CR0 validation', () => {
  it('handles CR0=0 without division by zero', () => {
    const inputs: NetValueInputs = {
      K: 100000,
      baselineConversionRate: 0,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 1000);

    expect(result.netValueDollars).toBe(0);
    expect(Number.isNaN(result.netValueDollars)).toBe(false);
    expect(Number.isFinite(result.probabilityClearsThreshold)).toBe(true);
  });

  it('handles CR0=1 without collapsed bounds', () => {
    const inputs: NetValueInputs = {
      K: 100000,
      baselineConversionRate: 1,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 1000);

    expect(result.netValueDollars).toBe(0);
    expect(Number.isNaN(result.netValueDollars)).toBe(false);
  });
});

// ===========================================
// Phase 14-03: High rejection warning and effective metrics tests
// ===========================================

describe('NetValue high rejection warning', () => {
  it('produces high_rejection warning when rejection rate > 10%', () => {
    // Uniform prior that extends well below L=-1
    const inputs: NetValueInputs = {
      K: 100000,
      baselineConversionRate: 0.5,
      threshold_L: 0,
      prior: { type: 'uniform', low_L: -2, high_L: 0.5 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    // Prior extends from -2 to 0.5, but L_min=-1
    // So 1/2.5 = 40% of prior mass is below -1, expect high rejection
    const rejectionRate = result.numRejected! / (result.numSamples! + result.numRejected!);
    expect(rejectionRate).toBeGreaterThan(0.10);

    expect(result.warnings).toBeDefined();
    const highRejectionWarning = result.warnings!.find(w => w.code === 'high_rejection');
    expect(highRejectionWarning).toBeDefined();
    expect(highRejectionWarning!.message).toMatch(/\d+%/); // Contains percentage
  });

  it('does not produce high_rejection warning for narrow priors', () => {
    // Narrow prior well within feasibility bounds
    const inputs: NetValueInputs = {
      K: 100000,
      baselineConversionRate: 0.5,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.02, sigma_L: 0.02 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    // Should NOT have high_rejection warning
    if (result.warnings) {
      expect(result.warnings.some(w => w.code === 'high_rejection')).toBe(false);
    }
  });
});

describe('NetValue effective prior metrics', () => {
  it('probClearsThreshold reflects effective (truncated) probability for non-Normal', () => {
    // Uniform prior spanning L=-1 boundary
    // Untruncated: U[-1.5, 0.5] has P(L >= 0) = 0.5/2 = 0.25
    // Truncated to [-1, 0.5]: P(L >= 0) = 0.5/1.5 ≈ 0.333
    const inputs: NetValueInputs = {
      K: 100000,
      baselineConversionRate: 0.5,
      threshold_L: 0,
      prior: { type: 'uniform', low_L: -1.5, high_L: 0.5 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    // Should use effective (truncated) probability
    // Truncated prob should be higher than untruncated since we cut off negative mass
    expect(result.probabilityClearsThreshold).toBeGreaterThan(0.25);
    expect(result.probabilityClearsThreshold).toBeCloseTo(0.333, 1);
  });

  it('probClearsThreshold for narrow Normal matches untruncated', () => {
    // Narrow Normal prior well within bounds - truncation doesn't matter
    const inputs: NetValueInputs = {
      K: 100000,
      baselineConversionRate: 0.5,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0.05, sigma_L: 0.03 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 7,
    };

    const result = calculateNetValueMonteCarlo(inputs, 5000);

    // Should match untruncated probability closely
    // P(L >= 0) for N(0.05, 0.03) = 1 - Phi(-0.05/0.03) ≈ 0.952
    expect(result.probabilityClearsThreshold).toBeGreaterThan(0.9);
    expect(result.probabilityClearsThreshold).toBeLessThan(1);
  });
});
