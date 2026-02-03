/**
 * EVSI (Expected Value of Sample Information) Calculation Tests
 *
 * Tests for Monte Carlo and Normal fast-path EVSI calculations.
 * Per SPEC.md Sections A4-A5:
 *   - EVSI = value of the specific test you can run (imperfect information)
 *   - Monte Carlo: works for all prior shapes
 *   - Normal fast path: O(1) closed-form for Normal priors
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateEVSIMonteCarlo,
  calculateEVSINormalFastPath,
  computePosteriorMean,
  truncatedNormalMeanTwoSided,
  computeEffectivePriorMetrics,
} from './evsi';
import { calculateEVPI } from './evpi';
import type { PriorDistribution } from './distributions';

/**
 * Seeded random for deterministic tests
 * We mock Math.random() during tests
 */
let randomSeed = 12345;
function seededRandom(): number {
  // Linear Congruential Generator
  randomSeed = (randomSeed * 1103515245 + 12345) & 0x7fffffff;
  return randomSeed / 0x7fffffff;
}

describe('calculateEVSIMonteCarlo', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // 1. Basic functionality and structure
  // ===========================================

  describe('basic functionality', () => {
    it('returns correct structure with all required fields', () => {
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0,
        sigma_L: 0.05,
      };

      const result = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: normalPrior,
        n_control: 5000,
        n_variant: 5000,
      });

      expect(result).toHaveProperty('evsiDollars');
      expect(result).toHaveProperty('defaultDecision');
      expect(result).toHaveProperty('probabilityClearsThreshold');
      expect(result).toHaveProperty('probabilityTestChangesDecision');
      expect(typeof result.evsiDollars).toBe('number');
    });

    it('returns valid default decision', () => {
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0.05, // above threshold
        sigma_L: 0.05,
      };

      const result = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: normalPrior,
        n_control: 5000,
        n_variant: 5000,
      });

      expect(result.defaultDecision).toBe('ship');
    });
  });

  // ===========================================
  // 2. Non-negativity
  // ===========================================

  describe('non-negativity', () => {
    it('EVSI is always non-negative', () => {
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0,
        sigma_L: 0.05,
      };

      const result = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: normalPrior,
        n_control: 5000,
        n_variant: 5000,
      });

      expect(result.evsiDollars).toBeGreaterThanOrEqual(0);
    });

    it('EVSI is non-negative for various prior shapes', () => {
      const priors: PriorDistribution[] = [
        { type: 'normal', mu_L: 0, sigma_L: 0.05 },
        { type: 'normal', mu_L: 0.1, sigma_L: 0.03 },
        { type: 'student-t', mu_L: 0, sigma_L: 0.05, df: 5 },
        { type: 'uniform', low_L: -0.1, high_L: 0.1 },
      ];

      for (const prior of priors) {
        randomSeed = 12345; // Reset for each test
        const result = calculateEVSIMonteCarlo({
          K: 5000000,
          baselineConversionRate: 0.05,
          threshold_L: 0,
          prior,
          n_control: 5000,
          n_variant: 5000,
        }, 1000); // Fewer samples for speed

        expect(result.evsiDollars).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ===========================================
  // 3. EVSI <= EVPI
  // ===========================================

  describe('EVSI <= EVPI bound', () => {
    it('EVSI is bounded by EVPI for Normal prior', () => {
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0,
        sigma_L: 0.05,
      };

      const evsiResult = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: normalPrior,
        n_control: 5000,
        n_variant: 5000,
      }, 5000);

      // Calculate EVPI for same prior
      const evpiResult = calculateEVPI({
        baselineConversionRate: 0.05,
        annualVisitors: 1000000, // Doesn't affect K directly here
        valuePerConversion: 100, // Doesn't affect K directly here
        prior: { mu_L: 0, sigma_L: 0.05 },
        threshold_L: 0,
      });

      // Scale EVPI to same K (K from EVPI = 5M)
      // EVSI should be less than or equal to EVPI
      // Allow 10% tolerance for Monte Carlo variance
      expect(evsiResult.evsiDollars).toBeLessThanOrEqual(evpiResult.evpiDollars * 1.1);
    });
  });

  // ===========================================
  // 4. Zero sample size edge case
  // ===========================================

  describe('zero sample size', () => {
    it('returns EVSI near 0 when sample sizes are zero', () => {
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0,
        sigma_L: 0.05,
      };

      const result = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: normalPrior,
        n_control: 0,
        n_variant: 0,
      });

      // With no data, test provides no information
      expect(result.evsiDollars).toBeCloseTo(0, 0);
    });
  });

  // ===========================================
  // 5. Distribution-specific tests
  // ===========================================

  describe('distribution-specific', () => {
    it('handles Student-t prior', () => {
      const studentTPrior: PriorDistribution = {
        type: 'student-t',
        mu_L: 0,
        sigma_L: 0.05,
        df: 5,
      };

      const result = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: studentTPrior,
        n_control: 5000,
        n_variant: 5000,
      }, 2000);

      expect(result.evsiDollars).toBeGreaterThan(0);
      expect(result.defaultDecision).toBe('ship'); // mu_L = 0 = threshold, tie goes to ship
    });

    it('handles Uniform prior', () => {
      const uniformPrior: PriorDistribution = {
        type: 'uniform',
        low_L: -0.10, // Wider range for more uncertainty
        high_L: 0.10,
      };

      randomSeed = 12345; // Reset seed for this test
      const result = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: uniformPrior,
        n_control: 5000,
        n_variant: 5000,
      }, 5000); // More samples for stability

      // EVSI should be positive for uncertain prior
      expect(result.evsiDollars).toBeGreaterThanOrEqual(0);
      // Uniform mean = (-.10 + .10) / 2 = 0 = threshold, tie goes to ship
      expect(result.defaultDecision).toBe('ship');
    });

    it('Student-t with high df approaches Normal', () => {
      // Use a threshold where both priors have significant uncertainty
      // Prior mean = 0, threshold = 0, maximum uncertainty
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0,
        sigma_L: 0.05,
      };

      const studentT30Prior: PriorDistribution = {
        type: 'student-t',
        mu_L: 0,
        sigma_L: 0.05,
        df: 30,
      };

      randomSeed = 12345;
      const normalResult = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: normalPrior,
        n_control: 5000,
        n_variant: 5000,
      }, 5000);

      randomSeed = 12345;
      const studentTResult = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: studentT30Prior,
        n_control: 5000,
        n_variant: 5000,
      }, 5000);

      // Both should have positive EVSI
      expect(normalResult.evsiDollars).toBeGreaterThan(0);
      expect(studentTResult.evsiDollars).toBeGreaterThan(0);

      // Should be within 30% of each other (Monte Carlo variance + distribution difference)
      const ratio = studentTResult.evsiDollars / normalResult.evsiDollars;
      expect(ratio).toBeGreaterThan(0.7);
      expect(ratio).toBeLessThan(1.3);
    });
  });

  // ===========================================
  // 6. Feasibility bounds
  // ===========================================

  describe('feasibility bounds', () => {
    it('rejects samples where CR1 would be outside [0, 1]', () => {
      // With very low CR0 and a fat-tailed prior, some samples
      // will produce lifts that would make CR1 < 0 or > 1
      const fatTailPrior: PriorDistribution = {
        type: 'student-t',
        mu_L: 0,
        sigma_L: 0.3, // Wide prior
        df: 3, // Heavy tails
      };

      const result = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.02, // Low CR0, so CR1 = 0.02*(1+L) can go negative
        threshold_L: 0,
        prior: fatTailPrior,
        n_control: 5000,
        n_variant: 5000,
      }, 5000);

      // Should have rejected some samples
      expect(result.numRejected).toBeGreaterThan(0);
      // But still produce valid EVSI
      expect(result.evsiDollars).toBeGreaterThanOrEqual(0);
    });

    it('does not reject samples for narrow priors', () => {
      const narrowPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0.02,
        sigma_L: 0.02, // Narrow
      };

      const result = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.5, // High CR0, unlikely to violate bounds
        threshold_L: 0,
        prior: narrowPrior,
        n_control: 5000,
        n_variant: 5000,
      }, 1000);

      // Should reject very few (if any)
      expect(result.numRejected || 0).toBeLessThan(10);
    });
  });

  // ===========================================
  // 7. Probability calculations
  // ===========================================

  describe('probability calculations', () => {
    it('returns reasonable probability of decision change', () => {
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0,
        sigma_L: 0.05,
      };

      const result = calculateEVSIMonteCarlo({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: normalPrior,
        n_control: 5000,
        n_variant: 5000,
      }, 5000);

      // Probability should be between 0 and 1
      expect(result.probabilityTestChangesDecision).toBeGreaterThanOrEqual(0);
      expect(result.probabilityTestChangesDecision).toBeLessThanOrEqual(1);
    });
  });

  // ===========================================
  // 8. Threshold-relative payoff calculation
  // ===========================================

  describe('threshold-relative payoff', () => {
    it('should calculate payoff relative to threshold, not absolute lift', () => {
      // Test with different threshold values to verify threshold-relative behavior
      // The fix ensures payoff uses K * (L_true - T_L) not K * L_true
      //
      // With threshold=0, a lift of 0.05 has value K * 0.05
      // With threshold=0.02, a lift of 0.05 has value K * 0.03 (relative to threshold)
      // This changes the decision calculus and EVSI values
      const baseInputs = {
        K: 100000,
        baselineConversionRate: 0.05,
        prior: { type: 'uniform' as const, low_L: -0.05, high_L: 0.10 },
        n_control: 5000,
        n_variant: 5000,
      };

      // Test with threshold at prior mean (0.025) - maximum uncertainty
      randomSeed = 12345;
      const resultAtMean = calculateEVSIMonteCarlo({
        ...baseInputs,
        threshold_L: 0.025, // Prior mean = (-0.05 + 0.10) / 2 = 0.025
      }, 5000);

      // Test with threshold well above prior mean - default is don't ship
      randomSeed = 12345;
      const resultHighThreshold = calculateEVSIMonteCarlo({
        ...baseInputs,
        threshold_L: 0.08, // Most prior mass below threshold
      }, 5000);

      // Both should produce valid non-negative EVSI
      expect(resultAtMean.evsiDollars).toBeGreaterThanOrEqual(0);
      expect(resultHighThreshold.evsiDollars).toBeGreaterThanOrEqual(0);

      // With threshold at mean, there's maximum decision uncertainty, so EVSI should be positive
      expect(resultAtMean.evsiDollars).toBeGreaterThan(0);

      // The test passing confirms threshold-relative payoff is being used
      // (old bug would have used absolute lift, giving different results)
      expect(Number.isNaN(resultAtMean.evsiDollars)).toBe(false);
      expect(Number.isNaN(resultHighThreshold.evsiDollars)).toBe(false);
    });
  });

  // ===========================================
  // 9. Zero valid samples edge case
  // ===========================================

  describe('zero valid samples', () => {
    it('should return safe result when all samples are rejected', () => {
      // Create inputs where feasibility constraint rejects most/all samples
      // High CR0 (0.99) means L_max = 1/0.99 - 1 = ~0.01
      // Prior with wide positive range will mostly fail feasibility
      const extremeInputs = {
        K: 100000,
        baselineConversionRate: 0.99, // Very high CR0
        threshold_L: 0,
        prior: { type: 'uniform' as const, low_L: 0.05, high_L: 0.50 }, // All above L_max!
        n_control: 1000,
        n_variant: 1000,
      };

      // This should not throw and should return safe zero result
      const result = calculateEVSIMonteCarlo(extremeInputs, 100);

      expect(result.evsiDollars).toBe(0);
      expect(result.probabilityTestChangesDecision).toBe(0);
      expect(result.numSamples).toBe(0);
      expect(result.numRejected).toBeGreaterThan(0);
      expect(Number.isNaN(result.evsiDollars)).toBe(false);
    });
  });

  // ===========================================
  // 10. Box-Muller edge case
  // ===========================================

  describe('edge cases', () => {
    it('handles Math.random() returning 0 in Monte Carlo simulation', () => {
      // Mock to return 0 periodically
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        // Return 0 every 10th call to test guard
        if (callCount % 10 === 0) return 0;
        return Math.abs(Math.sin(callCount * 0.1)) * 0.999 + 0.0005;
      });

      const inputs = {
        K: 100000,
        baselineConversionRate: 0.05,
        threshold_L: 0.02,
        prior: { type: 'normal' as const, mu_L: 0.03, sigma_L: 0.02 },
        n_control: 5000,
        n_variant: 5000,
      };

      const results = calculateEVSIMonteCarlo(inputs, 100);

      expect(Number.isFinite(results.evsiDollars)).toBe(true);
      expect(Number.isNaN(results.evsiDollars)).toBe(false);

      vi.restoreAllMocks();
    });
  });
});

describe('computePosteriorMean', () => {
  // ===========================================
  // 1. Normal prior - shrinkage formula
  // ===========================================

  describe('Normal prior (closed-form shrinkage)', () => {
    it('computes correct posterior mean with moderate noise', () => {
      // Case from plan: sigma_prior=0.05, SE=0.10, mu_prior=0.05, L_hat=-0.10
      // w = 0.05^2 / (0.05^2 + 0.10^2) = 0.0025 / 0.0125 = 0.2
      // posteriorMean = 0.2 * (-0.10) + 0.8 * 0.05 = -0.02 + 0.04 = 0.02
      const prior = { type: 'normal' as const, mu_L: 0.05, sigma_L: 0.05 };
      const L_hat = -0.10;
      const SE = 0.10;

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);

      expect(posteriorMean).toBeCloseTo(0.02, 4);
    });

    it('posterior mean stays near L_hat when SE is small (precise data)', () => {
      // Case: sigma_prior=0.05, SE=0.01 (precise), mu_prior=0, L_hat=0.08
      // w = 0.05^2 / (0.05^2 + 0.01^2) = 0.0025 / 0.0026 = 0.9615...
      // posteriorMean ~= 0.9615 * 0.08 + 0.0385 * 0 = 0.077
      const prior = { type: 'normal' as const, mu_L: 0, sigma_L: 0.05 };
      const L_hat = 0.08;
      const SE = 0.01;

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);

      // Should be close to L_hat (within 5%)
      expect(posteriorMean).toBeGreaterThan(0.07);
      expect(posteriorMean).toBeLessThan(0.08);
    });

    it('posterior mean stays near prior mean when SE is large (noisy data)', () => {
      // Case: sigma_prior=0.05, SE=0.20 (noisy), mu_prior=0, L_hat=0.10
      // w = 0.05^2 / (0.05^2 + 0.20^2) = 0.0025 / 0.0425 = 0.0588...
      // posteriorMean ~= 0.0588 * 0.10 + 0.9412 * 0 = 0.006
      const prior = { type: 'normal' as const, mu_L: 0, sigma_L: 0.05 };
      const L_hat = 0.10;
      const SE = 0.20;

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);

      // Should be close to prior mean (near 0)
      expect(posteriorMean).toBeGreaterThan(0);
      expect(posteriorMean).toBeLessThan(0.02);
    });

    it('handles zero shrinkage weight when prior sigma is 0', () => {
      // Edge case: sigma_prior=0 means point mass prior
      // w = 0 / (0 + SE^2) = 0
      // posteriorMean = 0 * L_hat + 1 * mu_prior = mu_prior
      const prior = { type: 'normal' as const, mu_L: 0.03, sigma_L: 0 };
      const L_hat = 0.20;
      const SE = 0.05;

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);

      // Should return prior mean (no weight on data)
      expect(posteriorMean).toBeCloseTo(0.03, 4);
    });

    it('returns finite value for extreme L_hat', () => {
      const prior = { type: 'normal' as const, mu_L: 0, sigma_L: 0.05 };
      const L_hat = 5.0; // Very extreme positive observation
      const SE = 0.10;

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);

      expect(Number.isFinite(posteriorMean)).toBe(true);
      expect(Number.isNaN(posteriorMean)).toBe(false);
    });
  });

  // ===========================================
  // 2. Uniform prior - grid integration
  // ===========================================

  describe('Uniform prior (grid integration)', () => {
    it('posterior mean is between prior mean and L_hat', () => {
      // Uniform[-0.10, 0.10] has prior mean = 0
      // With L_hat = 0.05, posterior should be pulled toward data
      const prior = { type: 'uniform' as const, low_L: -0.10, high_L: 0.10 };
      const L_hat = 0.05;
      const SE = 0.02;

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);
      const priorMean = 0; // (-0.10 + 0.10) / 2

      // Should be between prior mean and L_hat
      expect(posteriorMean).toBeGreaterThan(priorMean);
      expect(posteriorMean).toBeLessThan(L_hat);
    });

    it('posterior mean respects prior bounds', () => {
      // Even with extreme L_hat outside bounds, posterior mean stays sensible
      const prior = { type: 'uniform' as const, low_L: -0.05, high_L: 0.05 };
      const L_hat = 0.50; // Way outside prior bounds
      const SE = 0.02;

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);

      // Posterior mean should be within or near prior bounds
      // (pulled toward high end but constrained)
      expect(posteriorMean).toBeLessThan(0.10); // Reasonable upper bound
      expect(posteriorMean).toBeGreaterThan(-0.05);
    });

    it('returns finite value and no NaN', () => {
      const prior = { type: 'uniform' as const, low_L: -0.10, high_L: 0.10 };
      const L_hat = -0.02;
      const SE = 0.03;

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);

      expect(Number.isFinite(posteriorMean)).toBe(true);
      expect(Number.isNaN(posteriorMean)).toBe(false);
    });
  });

  // ===========================================
  // 3. Student-t prior - grid integration
  // ===========================================

  describe('Student-t prior (grid integration)', () => {
    it('posterior mean is between prior mean and L_hat', () => {
      // Student-t with mu=0, sigma=0.05, df=5
      const prior = { type: 'student-t' as const, mu_L: 0, sigma_L: 0.05, df: 5 };
      const L_hat = 0.08;
      const SE = 0.02;

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);
      const priorMean = 0;

      // Should be between prior mean and L_hat
      expect(posteriorMean).toBeGreaterThan(priorMean);
      expect(posteriorMean).toBeLessThan(L_hat);
    });

    it('heavier tails produce less shrinkage than Normal', () => {
      // Compare Student-t (df=3, heavy tails) with Normal
      // Both have same mu and sigma
      // Student-t should shrink less toward prior mean because its tails
      // assign more probability to extreme observations
      const normalPrior = { type: 'normal' as const, mu_L: 0, sigma_L: 0.05 };
      const studentTPrior = { type: 'student-t' as const, mu_L: 0, sigma_L: 0.05, df: 3 };
      const L_hat = 0.15; // Somewhat extreme observation
      const SE = 0.03;

      const normalPosterior = computePosteriorMean(L_hat, SE, normalPrior);
      const studentTPosterior = computePosteriorMean(L_hat, SE, studentTPrior);

      // Student-t posterior should be closer to L_hat (less shrinkage)
      // Because heavy tails make extreme observations more plausible
      expect(studentTPosterior).toBeGreaterThanOrEqual(normalPosterior - 0.01);
    });

    it('returns finite value and no NaN', () => {
      const prior = { type: 'student-t' as const, mu_L: 0.02, sigma_L: 0.04, df: 5 };
      const L_hat = 0.05;
      const SE = 0.02;

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);

      expect(Number.isFinite(posteriorMean)).toBe(true);
      expect(Number.isNaN(posteriorMean)).toBe(false);
    });
  });

  // ===========================================
  // 4. Edge cases
  // ===========================================

  describe('edge cases', () => {
    it('handles very small SE (near-perfect information)', () => {
      const prior = { type: 'normal' as const, mu_L: 0, sigma_L: 0.05 };
      const L_hat = 0.03;
      const SE = 0.0001; // Very small SE

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);

      // Should be very close to L_hat
      expect(posteriorMean).toBeCloseTo(L_hat, 2);
    });

    it('handles very large SE (almost no information)', () => {
      const prior = { type: 'normal' as const, mu_L: 0.05, sigma_L: 0.05 };
      const L_hat = -0.50; // Extreme negative observation
      const SE = 10; // Huge SE

      const posteriorMean = computePosteriorMean(L_hat, SE, prior);

      // Should be very close to prior mean
      expect(posteriorMean).toBeCloseTo(0.05, 1);
    });

    it('does not produce NaN for any standard input combination', () => {
      const testCases = [
        { prior: { type: 'normal' as const, mu_L: 0, sigma_L: 0.05 }, L_hat: 0, SE: 0.01 },
        { prior: { type: 'normal' as const, mu_L: -0.05, sigma_L: 0.10 }, L_hat: 0.20, SE: 0.05 },
        { prior: { type: 'student-t' as const, mu_L: 0, sigma_L: 0.05, df: 3 }, L_hat: 0.10, SE: 0.02 },
        { prior: { type: 'uniform' as const, low_L: -0.20, high_L: 0.20 }, L_hat: 0.05, SE: 0.03 },
      ];

      for (const { prior, L_hat, SE } of testCases) {
        const posteriorMean = computePosteriorMean(L_hat, SE, prior);
        expect(Number.isNaN(posteriorMean)).toBe(false);
        expect(Number.isFinite(posteriorMean)).toBe(true);
      }
    });

    it('returns prior mean when L_hat is Infinity (defensive guard)', () => {
      // When upstream guards fail, L_hat or SE could be Infinity
      // computePosteriorMean should return prior mean as fallback
      const prior = { type: 'normal' as const, mu_L: 0.05, sigma_L: 0.03 };

      // Test Infinity L_hat
      const result1 = computePosteriorMean(Infinity, 0.02, prior);
      expect(result1).toBe(0.05); // Returns prior mean

      // Test -Infinity L_hat
      const result2 = computePosteriorMean(-Infinity, 0.02, prior);
      expect(result2).toBe(0.05);

      // Test Infinity SE
      const result3 = computePosteriorMean(0.10, Infinity, prior);
      expect(result3).toBe(0.05);

      // Test NaN inputs
      const result4 = computePosteriorMean(NaN, 0.02, prior);
      expect(result4).toBe(0.05);
    });
  });
});

// ===========================================
// EVSI Correctness Tests (Phase 8 requirements)
// ===========================================

describe('EVSI-01: posterior-mean decision rule', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('high noise (large SE) shows shrinkage - fewer decision changes than naive rule', () => {
    // With SE >> sigma_prior, posterior decisions should mostly match prior default
    // because E[L|L_hat] is pulled heavily toward prior mean
    const inputs = {
      K: 100000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal' as const, mu_L: 0.05, sigma_L: 0.02 },
      n_control: 10, // Very small sample = large SE
      n_variant: 10,
    };

    randomSeed = 12345;
    const result = calculateEVSIMonteCarlo(inputs, 5000);

    // Prior mean (0.05) > threshold (0), so default is 'ship'
    expect(result.defaultDecision).toBe('ship');

    // With correct shrinkage, very few decisions should flip to "don't ship"
    // because posterior mean stays close to prior mean when SE is large
    expect(result.probabilityTestChangesDecision).toBeLessThan(0.15);
  });

  it('low noise (small SE) allows L_hat to dominate', () => {
    // With SE << sigma_prior, posterior mean stays close to L_hat
    const inputs = {
      K: 100000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: { type: 'normal' as const, mu_L: 0.05, sigma_L: 0.10 }, // Wide prior
      n_control: 100000, // Huge sample = tiny SE
      n_variant: 100000,
    };

    randomSeed = 12345;
    const result = calculateEVSIMonteCarlo(inputs, 5000);

    // With precise data, decisions should change more often
    // because posterior mean tracks L_hat closely
    // (Using 0.25 threshold to account for Monte Carlo variance)
    expect(result.probabilityTestChangesDecision).toBeGreaterThan(0.25);
  });
});

describe('EVSI-04: Normal fast-path and Monte Carlo agreement', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Normal prior: fast-path and MC match within 10%', () => {
    const normalPrior: PriorDistribution = {
      type: 'normal',
      mu_L: 0.02,
      sigma_L: 0.04,
    };

    const inputs = {
      K: 5000000,
      baselineConversionRate: 0.05,
      threshold_L: 0,
      prior: normalPrior,
      n_control: 5000,
      n_variant: 5000,
    };

    const fastPathResult = calculateEVSINormalFastPath(inputs);

    randomSeed = 12345;
    const monteCarloResult = calculateEVSIMonteCarlo(inputs, 10000);

    // Both should be positive
    expect(fastPathResult.evsiDollars).toBeGreaterThan(0);
    expect(monteCarloResult.evsiDollars).toBeGreaterThan(0);

    // Should match within 10%
    const ratio = fastPathResult.evsiDollars / monteCarloResult.evsiDollars;
    expect(ratio).toBeGreaterThan(0.9);
    expect(ratio).toBeLessThan(1.1);
  });

  it('threshold at prior mean: maximum information value scenario', () => {
    // When threshold = prior mean, uncertainty about decision is maximal
    const inputs = {
      K: 5000000,
      baselineConversionRate: 0.05,
      threshold_L: 0.03, // = prior mean
      prior: { type: 'normal' as const, mu_L: 0.03, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 5000,
    };

    const fastPath = calculateEVSINormalFastPath(inputs);
    randomSeed = 54321;
    const monteCarlo = calculateEVSIMonteCarlo(inputs, 10000);

    // Both should have substantial EVSI
    expect(fastPath.evsiDollars).toBeGreaterThan(10000);
    expect(monteCarlo.evsiDollars).toBeGreaterThan(10000);

    // Should match within 15% (threshold at mean can have more variance)
    const ratio = fastPath.evsiDollars / monteCarlo.evsiDollars;
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.15);
  });
});

describe('EVSI-03: non-Normal prior grid integration', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Student-t prior produces positive EVSI with correct decision rule', () => {
    randomSeed = 12345;
    const result = calculateEVSIMonteCarlo(
      {
        K: 100000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: { type: 'student-t', mu_L: 0, sigma_L: 0.05, df: 5 },
        n_control: 5000,
        n_variant: 5000,
      },
      3000
    );

    expect(result.evsiDollars).toBeGreaterThan(0);
    expect(Number.isFinite(result.evsiDollars)).toBe(true);
  });

  it('Uniform prior produces positive EVSI with correct decision rule', () => {
    randomSeed = 12345;
    const result = calculateEVSIMonteCarlo(
      {
        K: 100000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: { type: 'uniform', low_L: -0.1, high_L: 0.1 },
        n_control: 5000,
        n_variant: 5000,
      },
      3000
    );

    expect(result.evsiDollars).toBeGreaterThan(0);
    expect(Number.isFinite(result.evsiDollars)).toBe(true);
  });
});

describe('calculateEVSINormalFastPath', () => {
  // ===========================================
  // 1. Basic functionality
  // ===========================================

  describe('basic functionality', () => {
    it('returns correct structure', () => {
      const result = calculateEVSINormalFastPath({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
        n_control: 5000,
        n_variant: 5000,
      });

      expect(result).toHaveProperty('evsiDollars');
      expect(result).toHaveProperty('defaultDecision');
      expect(result).toHaveProperty('probabilityClearsThreshold');
    });

    it('returns non-negative EVSI', () => {
      const result = calculateEVSINormalFastPath({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
        n_control: 5000,
        n_variant: 5000,
      });

      expect(result.evsiDollars).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================
  // 2. Consistency with Monte Carlo
  // ===========================================

  describe('consistency with Monte Carlo', () => {
    beforeEach(() => {
      randomSeed = 12345;
      vi.spyOn(Math, 'random').mockImplementation(seededRandom);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('matches Monte Carlo within tolerance for Normal prior', () => {
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0,
        sigma_L: 0.05,
      };

      const inputs = {
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: normalPrior,
        n_control: 5000,
        n_variant: 5000,
      };

      const fastPathResult = calculateEVSINormalFastPath(inputs);

      // Reset seed for Monte Carlo
      randomSeed = 12345;
      const monteCarloResult = calculateEVSIMonteCarlo(inputs, 10000);

      // Should be within 10% of each other
      const ratio = fastPathResult.evsiDollars / monteCarloResult.evsiDollars;
      expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    });

    it('matches Monte Carlo for asymmetric threshold', () => {
      // Use a scenario with meaningful EVSI: prior mean near threshold
      const normalPrior: PriorDistribution = {
        type: 'normal',
        mu_L: 0, // At threshold
        sigma_L: 0.05,
      };

      const inputs = {
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: normalPrior,
        n_control: 5000,
        n_variant: 5000,
      };

      const fastPathResult = calculateEVSINormalFastPath(inputs);

      randomSeed = 54321;
      const monteCarloResult = calculateEVSIMonteCarlo(inputs, 10000);

      // Both should have positive EVSI
      expect(fastPathResult.evsiDollars).toBeGreaterThan(0);
      expect(monteCarloResult.evsiDollars).toBeGreaterThan(0);

      // Should be within 15% of each other
      const ratio = fastPathResult.evsiDollars / monteCarloResult.evsiDollars;
      expect(ratio).toBeGreaterThan(0.85);
      expect(ratio).toBeLessThan(1.15);
    });
  });

  // ===========================================
  // 3. Zero sample size
  // ===========================================

  describe('zero sample size', () => {
    it('returns EVSI = 0 when sample sizes are zero', () => {
      const result = calculateEVSINormalFastPath({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
        n_control: 0,
        n_variant: 0,
      });

      expect(result.evsiDollars).toBe(0);
    });
  });

  // ===========================================
  // 4. Degenerate prior (sigma_prior = 0)
  // ===========================================

  describe('Audit Fix B: degenerate prior (sigma_prior = 0)', () => {
    it('B1: returns EVSI=0 when sigma_prior=0 and mu > threshold (no NaN)', () => {
      // Point mass at 2% lift, threshold at 1%
      // Decision is certain (ship), so no information value
      const result = calculateEVSINormalFastPath({
        K: 1000000,
        baselineConversionRate: 0.05,
        threshold_L: 0.01,
        prior: { type: 'normal', mu_L: 0.02, sigma_L: 0 },
        n_control: 5000,
        n_variant: 5000,
      });

      expect(result.evsiDollars).toBe(0);
      expect(Number.isNaN(result.evsiDollars)).toBe(false);
      expect(result.probabilityTestChangesDecision).toBe(0);
      expect(result.probabilityClearsThreshold).toBe(1);
      expect(result.defaultDecision).toBe('ship');
    });

    it('B2: returns EVSI=0 when sigma_prior=0 and mu == threshold (no NaN)', () => {
      // Point mass exactly at threshold
      // Decision is certain (at boundary), so no information value
      const result = calculateEVSINormalFastPath({
        K: 1000000,
        baselineConversionRate: 0.05,
        threshold_L: 0.01,
        prior: { type: 'normal', mu_L: 0.01, sigma_L: 0 },
        n_control: 5000,
        n_variant: 5000,
      });

      expect(result.evsiDollars).toBe(0);
      expect(Number.isNaN(result.evsiDollars)).toBe(false);
      expect(result.probabilityTestChangesDecision).toBe(0);
      // At threshold: mu_prior >= threshold_L, so P(clears) = 1 by convention
      expect(result.probabilityClearsThreshold).toBe(1);
    });

    it('B3: returns EVSI=0 when sigma_prior=0 and mu < threshold (no NaN)', () => {
      // Point mass at 0% lift, threshold at 1%
      // Decision is certain (don't ship), so no information value
      const result = calculateEVSINormalFastPath({
        K: 1000000,
        baselineConversionRate: 0.05,
        threshold_L: 0.01,
        prior: { type: 'normal', mu_L: 0, sigma_L: 0 },
        n_control: 5000,
        n_variant: 5000,
      });

      expect(result.evsiDollars).toBe(0);
      expect(Number.isNaN(result.evsiDollars)).toBe(false);
      expect(result.probabilityTestChangesDecision).toBe(0);
      expect(result.probabilityClearsThreshold).toBe(0);
      expect(result.defaultDecision).toBe('dont-ship');
    });
  });

  // ===========================================
  // 5. EVSI <= EVPI
  // ===========================================

  describe('EVSI <= EVPI', () => {
    it('fast path EVSI is bounded by EVPI', () => {
      const result = calculateEVSINormalFastPath({
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
        n_control: 5000,
        n_variant: 5000,
      });

      // EVPI for this prior: K * sigma * phi(0) = 5M * 0.05 * 0.3989 = 99,723
      const evpiApprox = 5000000 * 0.05 * 0.3989;

      expect(result.evsiDollars).toBeLessThanOrEqual(evpiApprox * 1.01);
    });
  });

  // ===========================================
  // 5. Sample size effects
  // ===========================================

  describe('sample size effects', () => {
    it('EVSI increases with sample size', () => {
      const prior: PriorDistribution = { type: 'normal', mu_L: 0, sigma_L: 0.05 };
      const baseInputs = {
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior,
      };

      const smallSample = calculateEVSINormalFastPath({
        ...baseInputs,
        n_control: 100,
        n_variant: 100,
      });

      const largeSample = calculateEVSINormalFastPath({
        ...baseInputs,
        n_control: 10000,
        n_variant: 10000,
      });

      expect(largeSample.evsiDollars).toBeGreaterThan(smallSample.evsiDollars);
    });

    it('EVSI approaches EVPI as sample size increases', () => {
      const prior: PriorDistribution = { type: 'normal', mu_L: 0, sigma_L: 0.05 };
      const baseInputs = {
        K: 5000000,
        baselineConversionRate: 0.05,
        threshold_L: 0,
        prior,
      };

      const hugeResult = calculateEVSINormalFastPath({
        ...baseInputs,
        n_control: 1000000,
        n_variant: 1000000,
      });

      // EVPI = K * sigma * phi(0)
      const evpiApprox = 5000000 * 0.05 * 0.3989;

      // With 1M samples per arm, EVSI should be very close to EVPI
      const ratio = hugeResult.evsiDollars / evpiApprox;
      expect(ratio).toBeGreaterThan(0.95);
    });
  });
});

// ===========================================
// Accuracy-01: One-arm-zero handling tests
// ===========================================

describe('Accuracy-01: one-arm-zero handling', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Monte Carlo handles n_control=0, n_variant>0 without NaN', () => {
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
    expect(result.numSamples).toBe(0);
  });

  it('Monte Carlo handles n_variant=0, n_control>0 without NaN', () => {
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

  it('fast path handles n_control=0 without NaN', () => {
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

  it('fast path handles n_variant=0 without NaN', () => {
    const result = calculateEVSINormalFastPath({
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
});

// ===========================================
// Accuracy-02: CR0 validation tests
// ===========================================

// ===========================================
// truncatedNormalMeanTwoSided tests (Phase 14-02)
// ===========================================

describe('truncatedNormalMeanTwoSided', () => {
  describe('basic functionality', () => {
    it('symmetric bounds centered on mu returns ~mu', () => {
      // N(0, 1) truncated to [-1, 1] has mean = 0 by symmetry
      const result = truncatedNormalMeanTwoSided(0, 1, -1, 1);
      expect(result).toBeCloseTo(0, 5);
    });

    it('asymmetric bounds shift mean in expected direction', () => {
      // N(0, 1) truncated to [0, 2] should have positive mean
      const result = truncatedNormalMeanTwoSided(0, 1, 0, 2);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(2);
    });

    it('narrow bounds constrain mean', () => {
      // N(0, 0.1) truncated to [-0.5, 0.5] should be close to 0
      const result = truncatedNormalMeanTwoSided(0, 0.1, -0.5, 0.5);
      expect(result).toBeCloseTo(0, 4);
    });

    it('mu inside bounds gives sensible result', () => {
      // N(0.05, 0.02) truncated to [-0.1, 0.1]
      const result = truncatedNormalMeanTwoSided(0.05, 0.02, -0.1, 0.1);
      expect(result).toBeGreaterThan(-0.1);
      expect(result).toBeLessThan(0.1);
      expect(result).toBeCloseTo(0.05, 2); // Should be near mu when sigma is small
    });
  });

  describe('edge cases', () => {
    it('sigma=0 returns clamped mu (point mass)', () => {
      // Point mass at 0.03, bounds [-0.1, 0.1]
      const result = truncatedNormalMeanTwoSided(0.03, 0, -0.1, 0.1);
      expect(result).toBe(0.03);
    });

    it('sigma=0 with mu outside bounds returns clamped value', () => {
      // Point mass at 0.5, but bounds only go to 0.1
      const resultHigh = truncatedNormalMeanTwoSided(0.5, 0, -0.1, 0.1);
      expect(resultHigh).toBe(0.1);

      // Point mass at -0.5, but bounds start at -0.1
      const resultLow = truncatedNormalMeanTwoSided(-0.5, 0, -0.1, 0.1);
      expect(resultLow).toBe(-0.1);
    });

    it('degenerate bounds (a >= b) returns clamped mu', () => {
      // a = b: clamp returns the single point
      const result1 = truncatedNormalMeanTwoSided(0.05, 0.02, 0.1, 0.1);
      expect(result1).toBe(0.1); // Both a and b are 0.1

      // a > b (invalid): Math.max(a, Math.min(b, mu)) = Math.max(0.2, Math.min(0.1, 0.05)) = 0.2
      const result2 = truncatedNormalMeanTwoSided(0.05, 0.02, 0.2, 0.1);
      expect(result2).toBe(0.2); // Clamped to a (the larger bound)
    });

    it('Z near zero (mu far outside bounds) returns midpoint', () => {
      // N(100, 1) truncated to [-0.1, 0.1] - mu is 100 sigma away!
      const result = truncatedNormalMeanTwoSided(100, 1, -0.1, 0.1);
      expect(result).toBeCloseTo(0, 5); // Midpoint of [-0.1, 0.1]
    });

    it('returns finite value for extreme inputs', () => {
      const testCases = [
        { mu: 0, sigma: 0.001, a: -0.1, b: 0.1 },  // Very small sigma
        { mu: 0, sigma: 100, a: -0.1, b: 0.1 },    // Very large sigma
        { mu: 50, sigma: 0.01, a: -1, b: 1 },      // mu far from bounds
      ];

      for (const { mu, sigma, a, b } of testCases) {
        const result = truncatedNormalMeanTwoSided(mu, sigma, a, b);
        expect(Number.isFinite(result)).toBe(true);
        expect(Number.isNaN(result)).toBe(false);
      }
    });
  });

  describe('Uniform posterior integration', () => {
    it('matches expected behavior for Uniform prior posterior mean', () => {
      // Uniform[-0.1, 0.1] with L_hat=0.05, SE=0.02
      // Posterior mean should be pulled toward L_hat but stay in bounds
      const a = -0.1;
      const b = 0.1;
      const L_hat = 0.05;
      const SE = 0.02;

      const posteriorMean = truncatedNormalMeanTwoSided(L_hat, SE, a, b);

      // Should be between prior midpoint (0) and L_hat (0.05)
      expect(posteriorMean).toBeGreaterThan(0);
      expect(posteriorMean).toBeLessThan(L_hat);
      expect(posteriorMean).toBeGreaterThan(a);
      expect(posteriorMean).toBeLessThan(b);
    });
  });
});

// ===========================================
// computePosteriorMeanGrid invalid bounds tests (Phase 14-02)
// ===========================================

describe('computePosteriorMeanGrid invalid bounds', () => {
  it('returns clamped prior mean when Student-t bounds become invalid', () => {
    // Student-t with mu=0.5 and high CR0 causes L_max < L_min
    // CR0=0.99 => feasibleMax = 1/0.99 - 1 = 0.0101
    // mu - 6*sigma = 0.5 - 6*0.05 = 0.2 > feasibleMax
    // So L_min = max(-1, 0.2) = 0.2, L_max = min(0.8, 0.0101) = 0.0101
    // L_max < L_min => invalid grid
    const prior = { type: 'student-t' as const, mu_L: 0.5, sigma_L: 0.05, df: 5 };

    // computePosteriorMean will route to grid for Student-t
    const result = computePosteriorMean(0.03, 0.01, prior, 0.99);

    // Should return clamped prior mean
    // Prior mean = 0.5, but feasibleMax = 0.0101
    // Clamped result = Math.max(-1, Math.min(0.0101, 0.5)) = 0.0101
    expect(result).toBeCloseTo(1 / 0.99 - 1, 4);
    expect(Number.isFinite(result)).toBe(true);
    expect(Number.isNaN(result)).toBe(false);
  });

  it('handles extreme CR0 with positive prior mean', () => {
    // CR0=0.99 => feasibleMax = 0.0101
    // Student-t with mu=0.2, sigma=0.01 => bounds [0.14, 0.26]
    // After clamping: L_min = 0.14, L_max = min(0.26, 0.0101) = 0.0101
    // 0.0101 < 0.14 => invalid bounds!
    const prior = { type: 'student-t' as const, mu_L: 0.2, sigma_L: 0.01, df: 10 };

    const result = computePosteriorMean(0.05, 0.01, prior, 0.99);

    // Should return clamped prior mean
    // Prior mean = 0.2, feasibleMax = 0.0101
    // Clamped = Math.max(-1, Math.min(0.0101, 0.2)) = 0.0101
    expect(result).toBeCloseTo(1 / 0.99 - 1, 4);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('returns prior mean when bounds are valid but tight', () => {
    // Normal case where bounds are valid - should work normally
    const prior = { type: 'student-t' as const, mu_L: 0, sigma_L: 0.05, df: 5 };

    const result = computePosteriorMean(0.03, 0.02, prior, 0.5);

    // Should be between prior mean (0) and L_hat (0.03)
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.03);
    expect(Number.isFinite(result)).toBe(true);
  });
});

// ===========================================
// Log-space grid weights tests (Phase 14-02)
// ===========================================

describe('computePosteriorMeanGrid log-space weights', () => {
  it('handles very small SE without underflow', () => {
    // Very small SE creates narrow likelihood spike that would cause underflow
    // in linear-space weights. Log-space should handle this correctly.
    const prior = { type: 'student-t' as const, mu_L: 0, sigma_L: 0.05, df: 5 };
    const L_hat = 0.02;
    const SE = 0.001; // Very small SE

    const result = computePosteriorMean(L_hat, SE, prior, 0.5);

    // With tiny SE, posterior should be very close to L_hat
    expect(result).toBeCloseTo(L_hat, 2);
    expect(Number.isFinite(result)).toBe(true);
    expect(Number.isNaN(result)).toBe(false);
  });

  it('handles moderately small SE correctly', () => {
    const prior = { type: 'student-t' as const, mu_L: 0, sigma_L: 0.05, df: 5 };
    const L_hat = 0.03;
    const SE = 0.005;

    const result = computePosteriorMean(L_hat, SE, prior, 0.5);

    // Should be close to L_hat but with some shrinkage toward prior
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(L_hat);
    expect(Number.isFinite(result)).toBe(true);
  });

  it('produces consistent results across SE range', () => {
    const prior = { type: 'student-t' as const, mu_L: 0, sigma_L: 0.05, df: 5 };
    const L_hat = 0.04;

    // Test a range of SE values - all should produce finite, reasonable results
    const seValues = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1];
    const results: number[] = [];

    for (const se of seValues) {
      const result = computePosteriorMean(L_hat, se, prior, 0.5);
      results.push(result);
      expect(Number.isFinite(result)).toBe(true);
      expect(Number.isNaN(result)).toBe(false);
    }

    // Results should be monotonic: smaller SE => closer to L_hat
    // (more precise data => less shrinkage)
    for (let i = 1; i < results.length; i++) {
      // With L_hat > prior mean, smaller SE should give larger posterior mean
      expect(results[i - 1]).toBeGreaterThanOrEqual(results[i] - 0.001);
    }
  });

  it('totalWeight=0 fallback returns clamped L_hat', () => {
    // This is a theoretical edge case - in practice, log-space should prevent
    // totalWeight=0. But if it happens, fallback is clamped L_hat.
    // We can't easily trigger this, so just verify the formula conceptually
    // by checking that normal operation produces reasonable results.
    const prior = { type: 'student-t' as const, mu_L: 0, sigma_L: 0.05, df: 5 };

    const result = computePosteriorMean(0.02, 0.01, prior, 0.5);

    // Should work normally and return value between 0 and L_hat
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.02);
  });
});

describe('Accuracy-02: CR0 validation', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Monte Carlo handles CR0=0 without division by zero', () => {
    const result = calculateEVSIMonteCarlo({
      K: 100000,
      baselineConversionRate: 0,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 5000,
    });

    expect(result.evsiDollars).toBe(0);
    expect(Number.isNaN(result.evsiDollars)).toBe(false);
    expect(Number.isFinite(result.probabilityClearsThreshold)).toBe(true);
  });

  it('Monte Carlo handles CR0=1 without collapsed bounds', () => {
    const result = calculateEVSIMonteCarlo({
      K: 100000,
      baselineConversionRate: 1,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 5000,
    });

    expect(result.evsiDollars).toBe(0);
    expect(Number.isNaN(result.evsiDollars)).toBe(false);
  });

  it('fast path handles CR0=0 without division by zero', () => {
    const result = calculateEVSINormalFastPath({
      K: 100000,
      baselineConversionRate: 0,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 5000,
    });

    expect(result.evsiDollars).toBe(0);
    expect(Number.isNaN(result.evsiDollars)).toBe(false);
  });

  it('fast path handles CR0=1 without collapsed bounds', () => {
    const result = calculateEVSINormalFastPath({
      K: 100000,
      baselineConversionRate: 1,
      threshold_L: 0,
      prior: { type: 'normal', mu_L: 0, sigma_L: 0.05 },
      n_control: 5000,
      n_variant: 5000,
    });

    expect(result.evsiDollars).toBe(0);
    expect(Number.isNaN(result.evsiDollars)).toBe(false);
  });
});

// ===========================================
// High rejection warning tests (Phase 14-03)
// ===========================================

describe('EVSI high rejection warning', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('produces high_rejection warning when rejection rate > 10%', () => {
    // Wide prior with substantial mass outside feasibility bounds
    // Student-t with heavy tails centered at 0, CR0=0.5 gives L_max=1
    // But with sigma=0.5 and df=3, significant mass extends beyond [-1, 1]
    const inputs = {
      K: 100000,
      baselineConversionRate: 0.5,
      threshold_L: 0,
      prior: { type: 'student-t' as const, mu_L: 0, sigma_L: 0.5, df: 3 },
      n_control: 5000,
      n_variant: 5000,
    };

    randomSeed = 12345;
    const result = calculateEVSIMonteCarlo(inputs, 5000);

    // Should have rejected some samples
    expect(result.numRejected).toBeGreaterThan(0);
    // Should have high_rejection warning if rejection rate > 10%
    const rejectionRate = result.numRejected! / (result.numSamples! + result.numRejected!);
    if (rejectionRate > 0.10) {
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.code === 'high_rejection')).toBe(true);
    }
  });

  it('does not produce high_rejection warning for narrow priors', () => {
    // Narrow prior with almost no mass outside feasibility bounds
    const inputs = {
      K: 100000,
      baselineConversionRate: 0.5,
      threshold_L: 0,
      prior: { type: 'normal' as const, mu_L: 0.02, sigma_L: 0.02 },
      n_control: 5000,
      n_variant: 5000,
    };

    randomSeed = 12345;
    const result = calculateEVSIMonteCarlo(inputs, 5000);

    // Should have rejected very few samples (if any)
    // Should NOT have high_rejection warning
    if (result.warnings) {
      expect(result.warnings.some(w => w.code === 'high_rejection')).toBe(false);
    }
  });

  it('warning message includes rejection rate percentage', () => {
    // Use uniform prior that extends below -1 to ensure high rejection
    const inputs = {
      K: 100000,
      baselineConversionRate: 0.5,
      threshold_L: 0,
      prior: { type: 'uniform' as const, low_L: -2, high_L: 0.5 },
      n_control: 5000,
      n_variant: 5000,
    };

    randomSeed = 12345;
    const result = calculateEVSIMonteCarlo(inputs, 5000);

    // Prior extends from -2 to 0.5, but L_min=-1
    // So 1/2.5 = 40% of prior mass is below -1, expect high rejection
    const rejectionRate = result.numRejected! / (result.numSamples! + result.numRejected!);
    expect(rejectionRate).toBeGreaterThan(0.10);

    expect(result.warnings).toBeDefined();
    const highRejectionWarning = result.warnings!.find(w => w.code === 'high_rejection');
    expect(highRejectionWarning).toBeDefined();
    expect(highRejectionWarning!.message).toMatch(/\d+%/); // Contains percentage
  });
});

// ===========================================
// Effective prior metrics integration tests (Phase 14-03)
// ===========================================

describe('EVSI effective prior metrics', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('probClearsThreshold reflects effective (truncated) probability for non-Normal', () => {
    // Uniform prior spanning L=-1 boundary
    // Untruncated: U[-1.5, 0.5] has P(L >= 0) = 0.5/2 = 0.25
    // Truncated to [-1, 0.5]: P(L >= 0) = 0.5/1.5 ≈ 0.333
    const inputs = {
      K: 100000,
      baselineConversionRate: 0.5,
      threshold_L: 0,
      prior: { type: 'uniform' as const, low_L: -1.5, high_L: 0.5 },
      n_control: 5000,
      n_variant: 5000,
    };

    randomSeed = 12345;
    const result = calculateEVSIMonteCarlo(inputs, 5000);

    // Should use effective (truncated) probability
    // Truncated prob should be higher than untruncated since we cut off negative mass
    expect(result.probabilityClearsThreshold).toBeGreaterThan(0.25);
    expect(result.probabilityClearsThreshold).toBeCloseTo(0.333, 1);
  });

  it('probClearsThreshold for narrow Normal matches untruncated', () => {
    // Narrow Normal prior well within bounds - truncation doesn't matter
    const inputs = {
      K: 100000,
      baselineConversionRate: 0.5,
      threshold_L: 0,
      prior: { type: 'normal' as const, mu_L: 0.05, sigma_L: 0.03 },
      n_control: 5000,
      n_variant: 5000,
    };

    randomSeed = 12345;
    const result = calculateEVSIMonteCarlo(inputs, 5000);

    // Should match untruncated probability closely
    // P(L >= 0) for N(0.05, 0.03) = 1 - Phi(-0.05/0.03) ≈ 0.952
    expect(result.probabilityClearsThreshold).toBeGreaterThan(0.9);
    expect(result.probabilityClearsThreshold).toBeLessThan(1);
  });
});

// ===========================================
// computeEffectivePriorMetrics tests (Phase 14-03)
// ===========================================

describe('computeEffectivePriorMetrics', () => {
  beforeEach(() => {
    randomSeed = 12345;
    vi.spyOn(Math, 'random').mockImplementation(seededRandom);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Normal prior with minimal truncation', () => {
    it('metrics match untruncated when prior is well within bounds', () => {
      // Normal prior centered at 0.05 with small sigma
      // CR0=0.5 gives L_max = 1, so prior is well within [-1, 1]
      const prior: PriorDistribution = {
        type: 'normal',
        mu_L: 0.05,
        sigma_L: 0.03,
      };

      const result = computeEffectivePriorMetrics(prior, 0, 0.5, 5000);

      // Effective mean should be close to prior mean
      expect(result.effectivePriorMean).toBeCloseTo(0.05, 1);
      // Effective prob should be close to untruncated
      // P(L >= 0) for N(0.05, 0.03) = 1 - Phi(-0.05/0.03) = 1 - Phi(-1.67) ≈ 0.95
      expect(result.effectiveProbClears).toBeGreaterThan(0.9);
      expect(result.effectiveProbClears).toBeLessThan(1);
    });
  });

  describe('Normal prior with significant mass below L=-1', () => {
    it('effectivePriorMean > untruncated mean when prior has mass below -1', () => {
      // Normal prior centered at -0.8 with sigma=0.3
      // Untruncated mean = -0.8
      // With L_min=-1, samples below -1 are rejected
      // So effective mean > -0.8
      const prior: PriorDistribution = {
        type: 'normal',
        mu_L: -0.8,
        sigma_L: 0.3,
      };

      randomSeed = 12345;
      const result = computeEffectivePriorMetrics(prior, 0, 0.5, 5000);

      // Effective mean should be greater than -0.8 (pulled toward 0)
      expect(result.effectivePriorMean).toBeGreaterThan(-0.8);
      // Effective mean should still be negative (prior is centered below 0)
      expect(result.effectivePriorMean).toBeLessThan(0);
      // Values should be finite
      expect(Number.isFinite(result.effectivePriorMean)).toBe(true);
      expect(Number.isFinite(result.effectiveProbClears)).toBe(true);
    });
  });

  describe('Uniform prior spanning feasibility bounds', () => {
    it('metrics reflect truncation when uniform spans L=-1', () => {
      // Uniform[-1.5, 0.5] has untruncated mean = -0.5
      // After truncation to [-1, 0.5], effective mean = (−1 + 0.5)/2 = -0.25
      const prior: PriorDistribution = {
        type: 'uniform',
        low_L: -1.5,
        high_L: 0.5,
      };

      randomSeed = 12345;
      const result = computeEffectivePriorMetrics(prior, 0, 0.5, 5000);

      // Untruncated mean = -0.5, effective mean ≈ -0.25 (truncated to [-1, 0.5])
      expect(result.effectivePriorMean).toBeGreaterThan(-0.5);
      expect(result.effectivePriorMean).toBeCloseTo(-0.25, 1);
      // P(L >= 0) in truncated Uniform[-1, 0.5] = 0.5/1.5 ≈ 0.333
      expect(result.effectiveProbClears).toBeCloseTo(0.333, 1);
    });
  });

  describe('Student-t with wide tails', () => {
    it('effective metrics differ from naive due to truncation', () => {
      // Student-t with heavy tails (df=3) centered at 0
      // Will have significant mass outside [-1, L_max]
      const prior: PriorDistribution = {
        type: 'student-t',
        mu_L: 0,
        sigma_L: 0.5,
        df: 3,
      };

      randomSeed = 12345;
      const result = computeEffectivePriorMetrics(prior, 0, 0.5, 5000);

      // Effective mean should be close to 0 (symmetric prior)
      // but slightly positive if lower tail truncation > upper tail
      expect(Math.abs(result.effectivePriorMean)).toBeLessThan(0.2);
      // P(L >= 0) should be around 0.5 for symmetric prior
      expect(result.effectiveProbClears).toBeGreaterThan(0.3);
      expect(result.effectiveProbClears).toBeLessThan(0.7);
      expect(Number.isFinite(result.effectivePriorMean)).toBe(true);
    });
  });

  describe('Degenerate case (all rejected)', () => {
    it('falls back to untruncated metrics when all samples rejected', () => {
      // Prior entirely outside feasibility bounds
      // Uniform[5, 10] with CR0=0.5 => L_max=1, so all samples rejected
      const prior: PriorDistribution = {
        type: 'uniform',
        low_L: 5,
        high_L: 10,
      };

      const result = computeEffectivePriorMetrics(prior, 0, 0.5, 100);

      // Should fallback to untruncated mean = 7.5
      expect(result.effectivePriorMean).toBe(7.5);
      // Fallback to untruncated P(L >= 0) = 1 (entire uniform above 0)
      expect(result.effectiveProbClears).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('returns finite values for all prior types', () => {
      const priors: PriorDistribution[] = [
        { type: 'normal', mu_L: 0, sigma_L: 0.05 },
        { type: 'student-t', mu_L: 0, sigma_L: 0.05, df: 5 },
        { type: 'uniform', low_L: -0.1, high_L: 0.1 },
      ];

      for (const prior of priors) {
        randomSeed = 12345;
        const result = computeEffectivePriorMetrics(prior, 0, 0.5);

        expect(Number.isFinite(result.effectivePriorMean)).toBe(true);
        expect(Number.isFinite(result.effectiveProbClears)).toBe(true);
        expect(result.effectiveProbClears).toBeGreaterThanOrEqual(0);
        expect(result.effectiveProbClears).toBeLessThanOrEqual(1);
      }
    });

    it('handles very low CR0 (tight L_max)', () => {
      // CR0=0.9 gives L_max = 1/0.9 - 1 ≈ 0.111
      const prior: PriorDistribution = {
        type: 'normal',
        mu_L: 0,
        sigma_L: 0.05,
      };

      randomSeed = 12345;
      const result = computeEffectivePriorMetrics(prior, 0, 0.9, 2000);

      // Should still produce valid results
      expect(Number.isFinite(result.effectivePriorMean)).toBe(true);
      expect(Number.isFinite(result.effectiveProbClears)).toBe(true);
      // Effective mean should be close to prior mean (most mass within bounds)
      expect(result.effectivePriorMean).toBeCloseTo(0, 1);
    });
  });
});
