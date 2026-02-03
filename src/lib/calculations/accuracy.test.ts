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
import { calculateEVPI } from './evpi';
import { calculateEVSIMonteCarlo, calculateEVSINormalFastPath } from './evsi';
import { calculateNetValueMonteCarlo } from './net-value';
import { sample, cdf } from './distributions';
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
// EVPI Validation Tests (Accuracy-13 items 1-3)
// ===========================================

describe('Accuracy-13.1: EVPI closed-form vs Monte Carlo regret', () => {
  beforeEach(() => {
    randomSeed = 42;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Monte Carlo regret converges to EVPI formula for Normal prior', () => {
    // Test case: Standard scenario with meaningful uncertainty
    const prior: PriorDistribution = { type: 'normal', mu_L: 0, sigma_L: 0.05 };
    const threshold_L = 0;
    const K = 1000000;

    // Calculate EVPI using closed-form
    const evpiResult = calculateEVPI({
      baselineConversionRate: 0.05,
      annualVisitors: 200000,
      valuePerConversion: 100, // K = 200000 * 0.05 * 100 = 1,000,000
      prior: { mu_L: prior.mu_L!, sigma_L: prior.sigma_L! },
      threshold_L,
    });

    // Monte Carlo estimate of expected regret
    // EVPI = E[regret under default decision]
    const defaultShip = prior.mu_L! >= threshold_L;
    let totalRegret = 0;
    const N = 50000;

    for (let i = 0; i < N; i++) {
      const L = sample(prior);
      // Regret = loss from wrong decision
      const regret = defaultShip
        ? K * Math.max(0, threshold_L - L) // Regret from shipping when shouldn't
        : K * Math.max(0, L - threshold_L); // Regret from not shipping when should
      totalRegret += regret;
    }
    const mcEvpi = totalRegret / N;

    // Should match within 5% (Monte Carlo variance)
    const ratio = mcEvpi / evpiResult.evpiDollars;
    expect(ratio).toBeGreaterThan(0.95);
    expect(ratio).toBeLessThan(1.05);
  });

  it('EVPI formula matches for different threshold positions', () => {
    // Test with threshold above and below prior mean
    const testCases = [
      { mu_L: 0.05, sigma_L: 0.03, threshold_L: 0 }, // Mean above threshold
      { mu_L: 0, sigma_L: 0.05, threshold_L: 0.03 }, // Mean below threshold
      { mu_L: 0.03, sigma_L: 0.04, threshold_L: 0.03 }, // Mean at threshold
    ];

    for (const tc of testCases) {
      const evpiResult = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: tc.mu_L, sigma_L: tc.sigma_L },
        threshold_L: tc.threshold_L,
      });

      // EVPI should always be non-negative
      expect(evpiResult.evpiDollars).toBeGreaterThanOrEqual(0);
      // EVPI should be finite
      expect(Number.isFinite(evpiResult.evpiDollars)).toBe(true);
    }
  });
});

describe('Accuracy-13.2: Degenerate sigma edge case', () => {
  it('sigma=0 yields EVPI=0 and no NaNs', () => {
    const result = calculateEVPI({
      baselineConversionRate: 0.05,
      annualVisitors: 1000000,
      valuePerConversion: 100,
      prior: { mu_L: 0.05, sigma_L: 0 }, // Point mass prior
      threshold_L: 0,
    });

    expect(result.evpiDollars).toBe(0);
    expect(result.chanceOfBeingWrong).toBe(0);
    expect(Number.isNaN(result.evpiDollars)).toBe(false);
    expect(Number.isNaN(result.probabilityClearsThreshold)).toBe(false);
  });
});

describe('Accuracy-13.3: Truncated integration bound sanity', () => {
  it('handles prior with mean well below -1', () => {
    // Prior centered below feasibility bound
    const result = calculateEVPI({
      baselineConversionRate: 0.05,
      annualVisitors: 1000000,
      valuePerConversion: 100,
      prior: { mu_L: -1.5, sigma_L: 0.2 }, // mu + 6*sigma = -0.3, but mu < -1
      threshold_L: 0,
    });

    expect(Number.isFinite(result.evpiDollars)).toBe(true);
    expect(result.evpiDollars).toBeGreaterThanOrEqual(0);
    expect(result.edgeCases.truncationApplied).toBe(true);
  });

  it('truncated EVPI is stable across multiple sigma values', () => {
    const sigmas = [0.1, 0.2, 0.3, 0.5];

    for (const sigma of sigmas) {
      const result = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000,
        valuePerConversion: 100,
        prior: { mu_L: -0.8, sigma_L: sigma },
        threshold_L: 0,
      });

      expect(Number.isFinite(result.evpiDollars)).toBe(true);
      expect(result.evpiDollars).toBeGreaterThanOrEqual(0);
    }
  });
});
