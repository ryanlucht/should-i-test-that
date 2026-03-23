/**
 * Accuracy Test Suite
 *
 * High-signal tests per audit document Accuracy-13:
 * - Mathematical correctness validation
 * - Robustness property checks
 * - Monotonicity sanity tests
 *
 * These tests are designed to catch real bugs, not just achieve coverage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateEVSIMonteCarlo, calculateEVSINormalFastPath } from './evsi';
import { calculateNetValueMonteCarlo } from './net-value';
import { cdf } from './distributions';
import type { PriorDistribution } from './distributions';

/**
 * Seeded random for reproducible Monte Carlo tests
 * Uses Linear Congruential Generator (same as existing tests)
 */
let randomSeed = 12345;
function seededRandom(): number {
  randomSeed = (randomSeed * 1103515245 + 12345) & 0x7fffffff;
  return randomSeed / 0x7fffffff;
}

// ===========================================
// EVSI Validation Tests (Accuracy-13 items 4-6)
// ===========================================

describe('Accuracy-13.4: Normal fast-path vs Monte Carlo agreement', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fast-path and MC converge for standard scenario', () => {
    // Use a single well-behaved scenario with high sample count for reliable convergence
    // Threshold at prior mean gives maximum information value (good for testing)
    const inputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal' as const, mu_L: 0, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 5000,
    };

    const fastPath = calculateEVSINormalFastPath(inputs);

    // Use fixed seed for reproducible MC
    randomSeed = 12345;
    const monteCarlo = calculateEVSIMonteCarlo(inputs, 20000);

    // Both should produce positive EVSI
    expect(fastPath.evsiDollars).toBeGreaterThan(0);
    expect(monteCarlo.evsiDollars).toBeGreaterThan(0);

    // Should match within 20% (Monte Carlo variance is inherent)
    // This validates the mathematical equivalence, not exact precision
    const ratio = fastPath.evsiDollars / monteCarlo.evsiDollars;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.2);
  });
});

describe('Accuracy-13.5: One-arm-zero safety (guards from Plan 01)', () => {
  // Note: These tests verify guards added in 13-01-PLAN
  it('handles n_control=0, n_variant>0 without NaN', () => {
    const result = calculateEVSIMonteCarlo({
      K: 100000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 0,
      n_variant: 5000,
    });

    expect(result.evsiDollars).toBe(0);
    expect(Number.isNaN(result.evsiDollars)).toBe(false);
    expect(Number.isFinite(result.probabilityClearsThreshold)).toBe(true);
  });

  it('handles n_variant=0, n_control>0 without NaN', () => {
    const result = calculateEVSIMonteCarlo({
      K: 100000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 0,
    });

    expect(result.evsiDollars).toBe(0);
    expect(Number.isNaN(result.evsiDollars)).toBe(false);
  });

  it('fast path handles one-arm-zero without NaN', () => {
    const result = calculateEVSINormalFastPath({
      K: 100000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 0,
      n_variant: 5000,
    });

    expect(result.evsiDollars).toBe(0);
    expect(Number.isNaN(result.evsiDollars)).toBe(false);
  });
});

describe('Accuracy-13.6: Monotonicity sanity checks', () => {
  it('EVSI increases as both arm sizes scale up', () => {
    const baseInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal' as const, mu_L: 0, sigma_L: 0.05 },
    };

    const sizes = [100, 500, 1000, 5000, 10000];
    let previousEvsi = 0;

    for (const n of sizes) {
      const result = calculateEVSINormalFastPath({
        ...baseInputs,
        n_control: n,
        n_variant: n,
      });

      expect(result.evsiDollars).toBeGreaterThanOrEqual(previousEvsi);
      previousEvsi = result.evsiDollars;
    }
  });

});

// ===========================================
// NetValue Validation Tests (Accuracy-13 items 7-8)
// ===========================================

describe('Accuracy-13.7: NetValue reduces to EVSI when timing is neutral', () => {
  beforeEach(() => {
    randomSeed = 54321;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('NetValue approximates EVSI when test/latency are zero', () => {
    const inputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal' as const, mu_L: 0, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 5000,
    };

    const evsiResult = calculateEVSINormalFastPath(inputs);

    randomSeed = 54321;
    const netValueResult = calculateNetValueMonteCarlo(
      {
        ...inputs,
        testDurationDays: 0,
        variantFraction: 0.5,
        decisionLatencyDays: 0,
      },
      10000
    );

    // With zero timing, net value should be close to EVSI
    // Allow wider tolerance due to Monte Carlo variance
    const ratio = netValueResult.netValueDollars / evsiResult.evsiDollars;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.2);
  });
});

describe('Accuracy-13.8: NetValue decreases with test/latency', () => {
  beforeEach(() => {
    randomSeed = 98765;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('NetValue generally decreases as test duration increases', () => {
    const baseInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0.02,
      prior: { type: 'normal' as const, mu_L: 0.04, sigma_L: 0.03 },
      n_control: 5000,
      n_variant: 5000,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    };

    randomSeed = 98765;
    const shortTest = calculateNetValueMonteCarlo(
      {
        ...baseInputs,
        testDurationDays: 7,
      },
      5000
    );

    randomSeed = 98765;
    const longTest = calculateNetValueMonteCarlo(
      {
        ...baseInputs,
        testDurationDays: 60,
      },
      5000
    );

    // Longer test generally reduces net value (more opportunity cost)
    // Allow for Monte Carlo variance
    expect(longTest.netValueDollars).toBeLessThanOrEqual(shortTest.netValueDollars + 5000);
  });

  it('NetValue generally decreases as latency increases', () => {
    const baseInputs = {
      K: 1000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal' as const, mu_L: 0.05, sigma_L: 0.02 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
    };

    randomSeed = 98765;
    const zeroLatency = calculateNetValueMonteCarlo(
      {
        ...baseInputs,
        decisionLatencyDays: 0,
      },
      5000
    );

    randomSeed = 98765;
    const longLatency = calculateNetValueMonteCarlo(
      {
        ...baseInputs,
        decisionLatencyDays: 30,
      },
      5000
    );

    // Longer latency reduces net value
    expect(longLatency.netValueDollars).toBeLessThanOrEqual(zeroLatency.netValueDollars + 3000);
  });
});

// ===========================================
// CDF/PDF Stability Tests (Accuracy-13 item 9)
// ===========================================

describe('Accuracy-13.9: CDF/PDF stability', () => {
  it('Normal CDF with sigma=0 never returns NaN', () => {
    const prior: PriorDistribution = { type: 'normal', mu_L: 0.05, sigma_L: 0 };

    const testPoints = [-1, 0, 0.04, 0.05, 0.06, 0.1, 1];
    for (const x of testPoints) {
      const result = cdf(x, prior);
      expect(Number.isNaN(result)).toBe(false);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it('CDF values are monotonically increasing', () => {
    const priors: PriorDistribution[] = [
      { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      { type: 'student-t', mu_L: 0, sigma_L: 0.05, df: 5 },
      { type: 'uniform', low_L: -0.1, high_L: 0.1 },
    ];

    const points = [-0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2];

    for (const prior of priors) {
      let prevCdf = 0;
      for (const x of points) {
        const currentCdf = cdf(x, prior);
        expect(currentCdf).toBeGreaterThanOrEqual(prevCdf);
        prevCdf = currentCdf;
      }
    }
  });

  it('CDF returns valid probability for extreme inputs', () => {
    const prior: PriorDistribution = { type: 'normal', mu_L: 0, sigma_L: 0.05 };

    // Test extreme values
    const extremeHigh = cdf(100, prior);
    const extremeLow = cdf(-100, prior);

    expect(extremeHigh).toBeCloseTo(1, 5);
    expect(extremeLow).toBeCloseTo(0, 5);
    expect(Number.isFinite(extremeHigh)).toBe(true);
    expect(Number.isFinite(extremeLow)).toBe(true);
  });
});
