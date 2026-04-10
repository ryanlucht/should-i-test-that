/**
 * Feasibility Module Tests
 *
 * Tests for shared feasibility truncation logic per ENG-03, ENG-04, ENG-05, ENG-12.
 *
 * The feasibility module owns truncation-related constants and helpers used by
 * evsi.ts, net-value.ts, and useEVSICalculations.ts to ensure consistent handling
 * of prior mass outside feasible lift bounds [L_min, L_max].
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  computeInfeasibleTailMass,
  TRUNCATION_THRESHOLD,
  checkRareEventsWarning,
  checkLowAcceptanceWarning,
  checkHighRejectionWarning,
} from './feasibility';
import { calculateEVSIMonteCarlo } from './evsi';
import { calculateNetValueMonteCarlo } from './net-value';
import type { PriorDistribution } from './distributions';

/**
 * Seeded random for deterministic tests
 */
let randomSeed = 12345;
function seededRandom(): number {
  randomSeed = (randomSeed * 1103515245 + 12345) & 0x7fffffff;
  return randomSeed / 0x7fffffff;
}

// ===========================================
// computeInfeasibleTailMass tests
// ===========================================

describe('computeInfeasibleTailMass', () => {
  it('returns ~0 for Normal(mu=0, sigma=0.05) with CR0=0.05 (negligible upper truncation)', () => {
    // L_max = 1/0.05 - 1 = 19 (very high upper bound)
    // Normal(0, 0.05) has negligible mass above L=19 or below L=-1
    const prior: PriorDistribution = { type: 'normal', mu_L: 0, sigma_L: 0.05 };
    const tailMass = computeInfeasibleTailMass(prior, 0.05);
    expect(tailMass).toBeLessThan(0.001); // Negligible
  });

  it('returns >0.10 for Normal(mu=0, sigma=0.10) with CR0=0.90 (material upper truncation)', () => {
    // L_max = 1/0.90 - 1 = 0.1111
    // Normal(0, 0.10) has ~13% mass above L_max=0.1111 (about 1.11 sigma above mean)
    // P(L > 0.1111) = 1 - Phi(1.111) ≈ 1 - 0.867 = 0.133
    const prior: PriorDistribution = { type: 'normal', mu_L: 0, sigma_L: 0.10 };
    const tailMass = computeInfeasibleTailMass(prior, 0.90);
    expect(tailMass).toBeGreaterThan(0.10);
  });

  it('detects upper-bound truncation the old heuristic would miss', () => {
    // The old heuristic was: sigma > |mu + 1|
    // For Normal(0, 0.10): sigma=0.10, |mu+1|=1.0, so 0.10 > 1.0 is FALSE
    // But with CR0=0.90, L_max=0.1111, and there's ~13% mass above L_max
    // The new tail-mass check catches this
    const prior: PriorDistribution = { type: 'normal', mu_L: 0, sigma_L: 0.10 };
    const oldHeuristicResult = prior.sigma_L! > Math.abs(prior.mu_L! + 1);
    expect(oldHeuristicResult).toBe(false); // Old heuristic misses this

    const tailMass = computeInfeasibleTailMass(prior, 0.90);
    expect(tailMass).toBeGreaterThan(TRUNCATION_THRESHOLD); // New check catches it
  });
});

// ===========================================
// TRUNCATION_THRESHOLD constant tests
// ===========================================

describe('TRUNCATION_THRESHOLD', () => {
  it('is 0.001 and is exported as a named constant', () => {
    expect(TRUNCATION_THRESHOLD).toBe(0.001);
  });
});

// ===========================================
// Default decision uses truncated mean (ENG-03)
// ===========================================

describe('ENG-03: Default decision uses truncated mean when truncation is material', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calculateEVSIMonteCarlo with CR0=0.90, Normal(0, 0.10), threshold_L=0 returns defaultDecision="dont-ship"', () => {
    // Untruncated mean = 0 >= threshold 0, so naive default = "ship"
    // But truncated mean is negative (~-0.025) because L_max=0.1111
    // truncates positive tail more than negative tail (which goes to -1)
    // So effective default should be "dont-ship"
    const result = calculateEVSIMonteCarlo({
      K: 1000000,
      baselineConversionRate: 0.90,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.10 },
      n_control: 5000,
      n_variant: 5000,
    }, 5000);

    expect(result.defaultDecision).toBe('dont-ship');
  });

  it('calculateNetValueMonteCarlo with same inputs also returns defaultDecision="dont-ship"', () => {
    const result = calculateNetValueMonteCarlo({
      K: 1000000,
      baselineConversionRate: 0.90,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.10 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    }, 5000);

    expect(result.defaultDecision).toBe('dont-ship');
  });
});

// ===========================================
// Rejection sampling cap increase (ENG-12)
// ===========================================

// ===========================================
// Shared warning helper tests (ENG-14)
// ===========================================

describe('checkRareEventsWarning', () => {
  it('returns warning when min expected conversions < 20', () => {
    // n_control=100, n_variant=100, CR0=0.05: min expected = 100*0.05 = 5 < 20
    const warning = checkRareEventsWarning(100, 100, 0.05);
    expect(warning).not.toBeNull();
    expect(warning!.code).toBe('rare_events');
    expect(warning!.message).toContain('low');
  });

  it('returns null when min expected conversions >= 20', () => {
    // n_control=10000, n_variant=10000, CR0=0.05: min expected = 500 >= 20
    const warning = checkRareEventsWarning(10000, 10000, 0.05);
    expect(warning).toBeNull();
  });

  it('uses the smaller arm for the check', () => {
    // n_control=100, n_variant=10000, CR0=0.05: min expected = 100*0.05 = 5 < 20
    const warning = checkRareEventsWarning(100, 10000, 0.05);
    expect(warning).not.toBeNull();
  });

  it('returns null exactly at threshold (min expected = 20)', () => {
    // n_control=400, n_variant=400, CR0=0.05: min expected = 400*0.05 = 20 (not < 20)
    const warning = checkRareEventsWarning(400, 400, 0.05);
    expect(warning).toBeNull();
  });
});

describe('checkLowAcceptanceWarning', () => {
  it('returns warning when accepted < 50% of requested', () => {
    // 200 valid out of 1000 requested = 20% < 50%
    const warning = checkLowAcceptanceWarning(200, 1000);
    expect(warning).not.toBeNull();
    expect(warning!.code).toBe('low_acceptance');
    expect(warning!.message).toContain('200');
    expect(warning!.message).toContain('1000');
  });

  it('returns null when accepted >= 50% of requested', () => {
    // 600 valid out of 1000 requested = 60% >= 50%
    const warning = checkLowAcceptanceWarning(600, 1000);
    expect(warning).toBeNull();
  });

  it('returns null exactly at threshold (50%)', () => {
    // 500 valid out of 1000 requested = exactly 50% (not < 50%)
    const warning = checkLowAcceptanceWarning(500, 1000);
    expect(warning).toBeNull();
  });
});

describe('checkHighRejectionWarning', () => {
  it('returns warning when rejection rate > 10%', () => {
    // 900 valid, 200 rejected: rejection rate = 200/1100 = 18.2% > 10%
    const warning = checkHighRejectionWarning(900, 200);
    expect(warning).not.toBeNull();
    expect(warning!.code).toBe('high_rejection');
    expect(warning!.message).toContain('18%');
  });

  it('returns null when rejection rate <= 10%', () => {
    // 1000 valid, 50 rejected: rejection rate = 50/1050 = 4.8% <= 10%
    const warning = checkHighRejectionWarning(1000, 50);
    expect(warning).toBeNull();
  });

  it('returns null when no samples attempted', () => {
    // 0 valid, 0 rejected: totalAttempted = 0
    const warning = checkHighRejectionWarning(0, 0);
    expect(warning).toBeNull();
  });

  it('returns null exactly at threshold (10%)', () => {
    // 900 valid, 100 rejected: rejection rate = 100/1000 = exactly 10% (not > 10%)
    const warning = checkHighRejectionWarning(900, 100);
    expect(warning).toBeNull();
  });
});

describe('ENG-12: Rejection sampling cap and low_acceptance warning', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('EVSI with high-rejection scenario collects samples within 10x iteration cap', () => {
    // Use a prior where many samples are rejected to verify the cap handles it
    // Normal(0, 0.10) with CR0=0.90 has ~13% upper-bound rejection
    // With 10x cap (maxIterations = numSamples * 10), ~13% rejection is well within budget
    const result = calculateEVSIMonteCarlo({
      K: 1000000,
      baselineConversionRate: 0.90,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.10 },
      n_control: 5000,
      n_variant: 5000,
    }, 5000);

    // With 10x cap, should be able to collect all 5000 samples even with ~13% rejection
    expect(result.numSamples).toBe(5000);
  });

  it('net-value with high-rejection scenario collects samples within 10x iteration cap', () => {
    const result = calculateNetValueMonteCarlo({
      K: 1000000,
      baselineConversionRate: 0.90,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.10 },
      n_control: 5000,
      n_variant: 5000,
      testDurationDays: 14,
      variantFraction: 0.5,
      decisionLatencyDays: 0,
    }, 5000);

    expect(result.numSamples).toBe(5000);
  });
});
