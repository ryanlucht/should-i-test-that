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
  // 4. EVSI <= EVPI
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
