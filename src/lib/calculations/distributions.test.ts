/**
 * Distribution Abstraction Layer Tests
 *
 * Tests for PDF, CDF, sample, and getPriorMean functions
 * across Normal, Student-t, and Uniform distributions.
 */

import { describe, it, expect, vi } from 'vitest';
import { pdf, cdf, sample, getPriorMean, type PriorDistribution } from './distributions';

describe('distributions', () => {
  // Test priors for each distribution type
  const normalPrior: PriorDistribution = {
    type: 'normal',
    mu_L: 0.02, // 2% expected lift
    sigma_L: 0.05, // 5% standard deviation
  };

  const studentTPrior3: PriorDistribution = {
    type: 'student-t',
    mu_L: 0.02,
    sigma_L: 0.05,
    df: 3, // Heavy tails
  };

  const studentTPrior5: PriorDistribution = {
    type: 'student-t',
    mu_L: 0.02,
    sigma_L: 0.05,
    df: 5, // Moderate tails
  };

  const studentTPrior10: PriorDistribution = {
    type: 'student-t',
    mu_L: 0.02,
    sigma_L: 0.05,
    df: 10, // Near-normal
  };

  const uniformPrior: PriorDistribution = {
    type: 'uniform',
    low_L: -0.05, // -5% lower bound
    high_L: 0.10, // +10% upper bound
  };

  describe('pdf', () => {
    it('returns positive values for Normal distribution', () => {
      // PDF should be positive everywhere for Normal
      expect(pdf(0, normalPrior)).toBeGreaterThan(0);
      expect(pdf(0.02, normalPrior)).toBeGreaterThan(0); // at mean
      expect(pdf(0.10, normalPrior)).toBeGreaterThan(0); // in tail
      expect(pdf(-0.10, normalPrior)).toBeGreaterThan(0); // in left tail
    });

    it('Normal PDF is maximized at the mean', () => {
      const atMean = pdf(0.02, normalPrior);
      const awayFromMean = pdf(0.07, normalPrior);
      expect(atMean).toBeGreaterThan(awayFromMean);
    });

    it('returns positive values for Student-t distribution', () => {
      expect(pdf(0, studentTPrior3)).toBeGreaterThan(0);
      expect(pdf(0.02, studentTPrior3)).toBeGreaterThan(0);
      expect(pdf(0.10, studentTPrior3)).toBeGreaterThan(0);
    });

    it('Student-t PDF has heavier tails than Normal', () => {
      // At extreme values, Student-t (df=3) should have higher density than Normal
      // This is the defining characteristic of heavier tails
      const extremeValue = 0.20; // 20% lift, far from mean
      const normalDensity = pdf(extremeValue, normalPrior);
      const studentTDensity = pdf(extremeValue, studentTPrior3);

      // Student-t with df=3 should have heavier tails
      expect(studentTDensity).toBeGreaterThan(normalDensity);
    });

    it('Student-t approaches Normal as df increases', () => {
      // With df=10, Student-t should be close to Normal
      const testPoint = 0.05;
      const normalDensity = pdf(testPoint, normalPrior);
      const studentT10Density = pdf(testPoint, studentTPrior10);

      // Should be within 5% of each other
      const relativeDiff = Math.abs(studentT10Density - normalDensity) / normalDensity;
      expect(relativeDiff).toBeLessThan(0.05);
    });

    it('Uniform PDF is constant within bounds', () => {
      // PDF should be 1 / (0.10 - (-0.05)) = 1 / 0.15 = 6.667
      const expectedDensity = 1 / 0.15;
      expect(pdf(0, uniformPrior)).toBeCloseTo(expectedDensity, 5);
      expect(pdf(-0.03, uniformPrior)).toBeCloseTo(expectedDensity, 5);
      expect(pdf(0.08, uniformPrior)).toBeCloseTo(expectedDensity, 5);
    });

    it('Uniform PDF is zero outside bounds', () => {
      expect(pdf(-0.10, uniformPrior)).toBe(0); // Below lower bound
      expect(pdf(0.15, uniformPrior)).toBe(0); // Above upper bound
    });
  });

  describe('cdf', () => {
    it('Normal CDF at mean equals 0.5', () => {
      // For symmetric distributions, CDF(mean) = 0.5
      expect(cdf(0.02, normalPrior)).toBeCloseTo(0.5, 5);
    });

    it('Normal CDF is monotonically increasing', () => {
      const values = [-0.10, -0.05, 0, 0.02, 0.05, 0.10];
      const cdfValues = values.map((v) => cdf(v, normalPrior));

      for (let i = 1; i < cdfValues.length; i++) {
        expect(cdfValues[i]).toBeGreaterThan(cdfValues[i - 1]);
      }
    });

    it('Normal CDF approaches 0 and 1 at extremes', () => {
      expect(cdf(-0.20, normalPrior)).toBeLessThan(0.001);
      expect(cdf(0.25, normalPrior)).toBeGreaterThan(0.999);
    });

    it('Student-t CDF at mean equals 0.5', () => {
      // Student-t is symmetric, so CDF(mu) = 0.5
      expect(cdf(0.02, studentTPrior3)).toBeCloseTo(0.5, 5);
      expect(cdf(0.02, studentTPrior5)).toBeCloseTo(0.5, 5);
      expect(cdf(0.02, studentTPrior10)).toBeCloseTo(0.5, 5);
    });

    it('Student-t CDF is monotonically increasing', () => {
      const values = [-0.10, -0.05, 0, 0.02, 0.05, 0.10];
      const cdfValues = values.map((v) => cdf(v, studentTPrior5));

      for (let i = 1; i < cdfValues.length; i++) {
        expect(cdfValues[i]).toBeGreaterThan(cdfValues[i - 1]);
      }
    });

    it('Student-t has more mass in tails than Normal', () => {
      // For Student-t with df=3, P(L > 0.20) should be higher than Normal
      const normalTailProb = 1 - cdf(0.20, normalPrior);
      const studentTTailProb = 1 - cdf(0.20, studentTPrior3);

      expect(studentTTailProb).toBeGreaterThan(normalTailProb);
    });

    it('Uniform CDF equals 0 at lower bound', () => {
      expect(cdf(-0.05, uniformPrior)).toBe(0);
      expect(cdf(-0.10, uniformPrior)).toBe(0); // Below lower bound
    });

    it('Uniform CDF equals 1 at upper bound', () => {
      expect(cdf(0.10, uniformPrior)).toBe(1);
      expect(cdf(0.15, uniformPrior)).toBe(1); // Above upper bound
    });

    it('Uniform CDF is linear within bounds', () => {
      // At midpoint (-0.05 + 0.10) / 2 = 0.025, CDF should be 0.5
      const midpoint = (-0.05 + 0.10) / 2;
      expect(cdf(midpoint, uniformPrior)).toBeCloseTo(0.5, 5);

      // At 25% point, CDF should be 0.25
      const quarterPoint = -0.05 + 0.15 * 0.25;
      expect(cdf(quarterPoint, uniformPrior)).toBeCloseTo(0.25, 5);
    });
  });

  describe('sample', () => {
    it('Normal samples are in reasonable range', () => {
      // With mu=0.02, sigma=0.05, samples should mostly be within [-0.13, 0.17] (3 sigma)
      for (let i = 0; i < 100; i++) {
        const s = sample(normalPrior);
        expect(s).toBeGreaterThan(-0.5); // Very wide bounds to avoid false negatives
        expect(s).toBeLessThan(0.5);
      }
    });

    it('Normal sample mean converges to prior mean', () => {
      // Law of large numbers: sample mean should converge to population mean
      const numSamples = 10000;
      let sum = 0;
      for (let i = 0; i < numSamples; i++) {
        sum += sample(normalPrior);
      }
      const sampleMean = sum / numSamples;

      // Should be within 1% of true mean (with high probability)
      expect(Math.abs(sampleMean - 0.02)).toBeLessThan(0.01);
    });

    it('Student-t samples are in reasonable range', () => {
      // Student-t has heavier tails, but samples should still be bounded
      for (let i = 0; i < 100; i++) {
        const s = sample(studentTPrior5);
        expect(s).toBeGreaterThan(-1);
        expect(s).toBeLessThan(1);
      }
    });

    it('Student-t sample mean converges to prior mean', () => {
      const numSamples = 10000;
      let sum = 0;
      for (let i = 0; i < numSamples; i++) {
        sum += sample(studentTPrior5);
      }
      const sampleMean = sum / numSamples;

      // Student-t has heavier tails, allow slightly more variance
      expect(Math.abs(sampleMean - 0.02)).toBeLessThan(0.02);
    });

    it('Uniform samples are within bounds', () => {
      // Uniform samples must be strictly within [low, high]
      for (let i = 0; i < 100; i++) {
        const s = sample(uniformPrior);
        expect(s).toBeGreaterThanOrEqual(-0.05);
        expect(s).toBeLessThanOrEqual(0.10);
      }
    });

    it('Uniform sample mean converges to midpoint', () => {
      const numSamples = 10000;
      let sum = 0;
      for (let i = 0; i < numSamples; i++) {
        sum += sample(uniformPrior);
      }
      const sampleMean = sum / numSamples;
      const expectedMean = (-0.05 + 0.10) / 2; // 0.025

      expect(Math.abs(sampleMean - expectedMean)).toBeLessThan(0.01);
    });
  });

  describe('getPriorMean', () => {
    it('returns mu for Normal distribution', () => {
      expect(getPriorMean(normalPrior)).toBe(0.02);
    });

    it('returns mu for Student-t distribution', () => {
      expect(getPriorMean(studentTPrior3)).toBe(0.02);
      expect(getPriorMean(studentTPrior5)).toBe(0.02);
      expect(getPriorMean(studentTPrior10)).toBe(0.02);
    });

    it('returns midpoint for Uniform distribution', () => {
      // (low + high) / 2 = (-0.05 + 0.10) / 2 = 0.025
      expect(getPriorMean(uniformPrior)).toBeCloseTo(0.025, 10);
    });

    it('returns correct mean for symmetric Uniform', () => {
      const symmetricUniform: PriorDistribution = {
        type: 'uniform',
        low_L: -0.10,
        high_L: 0.10,
      };
      expect(getPriorMean(symmetricUniform)).toBe(0);
    });
  });

  describe('Student-t df presets', () => {
    // Per 05-CONTEXT.md: df=3 "Heavy tails", df=5 "Moderate", df=10 "Near-normal"
    it('df=3 has significantly heavier tails than df=10', () => {
      const extremeValue = 0.25; // 25% lift, very far from mean
      const tailProb3 = 1 - cdf(extremeValue, studentTPrior3);
      const tailProb10 = 1 - cdf(extremeValue, studentTPrior10);

      // df=3 should have at least 2x the tail probability
      expect(tailProb3 / tailProb10).toBeGreaterThan(2);
    });

    it('df=5 is between df=3 and df=10', () => {
      const extremeValue = 0.20;
      const tailProb3 = 1 - cdf(extremeValue, studentTPrior3);
      const tailProb5 = 1 - cdf(extremeValue, studentTPrior5);
      const tailProb10 = 1 - cdf(extremeValue, studentTPrior10);

      expect(tailProb5).toBeLessThan(tailProb3);
      expect(tailProb5).toBeGreaterThan(tailProb10);
    });
  });

  describe('edge cases', () => {
    it('handles Math.random() returning 0 in Normal sampling', () => {
      // Mock Math.random to return 0 then normal values
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 0; // u1 = 0 (would cause NaN without guard)
        return 0.5; // u2 = 0.5
      });

      const prior: PriorDistribution = { type: 'normal', mu_L: 0.05, sigma_L: 0.02 };
      const result = sample(prior);

      expect(Number.isFinite(result)).toBe(true);
      expect(Number.isNaN(result)).toBe(false);

      vi.restoreAllMocks();
    });

    it('handles non-finite Student-t inverse CDF by re-sampling', () => {
      // This is harder to test deterministically, but we can verify
      // that many samples are all finite
      const prior: PriorDistribution = { type: 'student-t', mu_L: 0, sigma_L: 0.1, df: 3 };

      for (let i = 0; i < 1000; i++) {
        const result = sample(prior);
        expect(Number.isFinite(result)).toBe(true);
      }
    });
  });

  // ===========================================
  // Edge Case 2: Uniform distribution bounds guards
  // ===========================================

  describe('Edge Case 2: Uniform invalid bounds', () => {
    const equalBoundsPrior: PriorDistribution = {
      type: 'uniform',
      low_L: 0.05,
      high_L: 0.05, // equal to low_L (width = 0)
    };

    const invertedBoundsPrior: PriorDistribution = {
      type: 'uniform',
      low_L: 0.10,
      high_L: 0.05, // high < low (width < 0)
    };

    it('pdf with equal bounds returns 0', () => {
      expect(pdf(0.05, equalBoundsPrior)).toBe(0);
      expect(pdf(0.00, equalBoundsPrior)).toBe(0);
      expect(pdf(0.10, equalBoundsPrior)).toBe(0);
    });

    it('pdf with inverted bounds returns 0', () => {
      expect(pdf(0.05, invertedBoundsPrior)).toBe(0);
      expect(pdf(0.07, invertedBoundsPrior)).toBe(0);
      expect(pdf(0.00, invertedBoundsPrior)).toBe(0);
    });

    it('cdf with equal bounds returns step function', () => {
      // CDF is 0 below low_L, 1 at/above low_L
      expect(cdf(0.04, equalBoundsPrior)).toBe(0);
      expect(cdf(0.05, equalBoundsPrior)).toBe(1);
      expect(cdf(0.06, equalBoundsPrior)).toBe(1);
    });

    it('cdf with inverted bounds returns step function', () => {
      // Treat as point mass at low_L (which is 0.10)
      expect(cdf(0.09, invertedBoundsPrior)).toBe(0);
      expect(cdf(0.10, invertedBoundsPrior)).toBe(1);
      expect(cdf(0.11, invertedBoundsPrior)).toBe(1);
    });

    it('sample with equal bounds returns low_L', () => {
      const result = sample(equalBoundsPrior);
      expect(result).toBe(0.05);
    });

    it('sample with inverted bounds returns low_L', () => {
      const result = sample(invertedBoundsPrior);
      expect(result).toBe(0.10);
    });

    it('pdf/cdf do not produce NaN or Infinity for invalid bounds', () => {
      const testPoints = [-1, 0, 0.05, 0.10, 1];
      for (const point of testPoints) {
        expect(Number.isNaN(pdf(point, equalBoundsPrior))).toBe(false);
        expect(Number.isNaN(cdf(point, equalBoundsPrior))).toBe(false);
        expect(Number.isFinite(pdf(point, equalBoundsPrior))).toBe(true);
        expect(Number.isFinite(cdf(point, equalBoundsPrior))).toBe(true);
      }
    });
  });

  // ===========================================
  // Edge Case 3: Student-t distribution guards
  // ===========================================

  describe('Edge Case 3: Student-t sigma=0 and invalid df', () => {
    const sigma0Prior: PriorDistribution = {
      type: 'student-t',
      mu_L: 0.03,
      sigma_L: 0,
      df: 5,
    };

    const df0Prior: PriorDistribution = {
      type: 'student-t',
      mu_L: 0.03,
      sigma_L: 0.05,
      df: 0,
    };

    const dfNegativePrior: PriorDistribution = {
      type: 'student-t',
      mu_L: 0.03,
      sigma_L: 0.05,
      df: -2,
    };

    it('pdf with sigma=0 returns 0', () => {
      expect(pdf(0.03, sigma0Prior)).toBe(0);
      expect(pdf(0.00, sigma0Prior)).toBe(0);
      expect(pdf(0.10, sigma0Prior)).toBe(0);
    });

    it('cdf with sigma=0 returns step function', () => {
      expect(cdf(0.02, sigma0Prior)).toBe(0);
      expect(cdf(0.03, sigma0Prior)).toBe(1);
      expect(cdf(0.04, sigma0Prior)).toBe(1);
    });

    it('sample with sigma=0 returns mu', () => {
      const result = sample(sigma0Prior);
      expect(result).toBe(0.03);
    });

    it('pdf with df=0 returns 0', () => {
      expect(pdf(0.03, df0Prior)).toBe(0);
      expect(pdf(0.00, df0Prior)).toBe(0);
    });

    it('cdf with df=0 returns step function at mu', () => {
      expect(cdf(0.02, df0Prior)).toBe(0);
      expect(cdf(0.03, df0Prior)).toBe(1);
      expect(cdf(0.04, df0Prior)).toBe(1);
    });

    it('pdf with df < 0 returns 0', () => {
      expect(pdf(0.03, dfNegativePrior)).toBe(0);
      expect(pdf(0.00, dfNegativePrior)).toBe(0);
    });

    it('cdf with df < 0 returns step function at mu', () => {
      expect(cdf(0.02, dfNegativePrior)).toBe(0);
      expect(cdf(0.03, dfNegativePrior)).toBe(1);
      expect(cdf(0.04, dfNegativePrior)).toBe(1);
    });

    it('pdf/cdf do not produce NaN or Infinity for sigma=0', () => {
      const testPoints = [-1, 0, 0.03, 0.10, 1];
      for (const point of testPoints) {
        expect(Number.isNaN(pdf(point, sigma0Prior))).toBe(false);
        expect(Number.isNaN(cdf(point, sigma0Prior))).toBe(false);
        expect(Number.isFinite(pdf(point, sigma0Prior))).toBe(true);
        expect(Number.isFinite(cdf(point, sigma0Prior))).toBe(true);
      }
    });

    it('pdf/cdf do not produce NaN or Infinity for invalid df', () => {
      const testPoints = [-1, 0, 0.03, 0.10, 1];
      for (const point of testPoints) {
        expect(Number.isNaN(pdf(point, df0Prior))).toBe(false);
        expect(Number.isNaN(cdf(point, df0Prior))).toBe(false);
        expect(Number.isNaN(pdf(point, dfNegativePrior))).toBe(false);
        expect(Number.isNaN(cdf(point, dfNegativePrior))).toBe(false);
        expect(Number.isFinite(pdf(point, df0Prior))).toBe(true);
        expect(Number.isFinite(cdf(point, df0Prior))).toBe(true);
        expect(Number.isFinite(pdf(point, dfNegativePrior))).toBe(true);
        expect(Number.isFinite(cdf(point, dfNegativePrior))).toBe(true);
      }
    });
  });

  // ===========================================
  // Accuracy-03: Normal sigma=0 handling
  // ===========================================

  describe('Accuracy-03: Normal sigma=0 handling', () => {
    it('cdf returns 0 below point mass', () => {
      const prior: PriorDistribution = { type: 'normal', mu_L: 0.05, sigma_L: 0 };
      expect(cdf(0.04, prior)).toBe(0);
      expect(cdf(-0.10, prior)).toBe(0);
    });

    it('cdf returns 1 at and above point mass', () => {
      const prior: PriorDistribution = { type: 'normal', mu_L: 0.05, sigma_L: 0 };
      expect(cdf(0.05, prior)).toBe(1);
      expect(cdf(0.06, prior)).toBe(1);
      expect(cdf(0.50, prior)).toBe(1);
    });

    it('pdf returns 0 for point mass (not NaN)', () => {
      const prior: PriorDistribution = { type: 'normal', mu_L: 0.05, sigma_L: 0 };
      expect(pdf(0.05, prior)).toBe(0);
      expect(pdf(0.04, prior)).toBe(0);
      expect(Number.isNaN(pdf(0.05, prior))).toBe(false);
    });

    it('cdf and pdf do not produce NaN or Infinity for sigma=0', () => {
      const prior: PriorDistribution = { type: 'normal', mu_L: 0.03, sigma_L: 0 };

      const testPoints = [-1, -0.5, 0, 0.03, 0.05, 0.5, 1];
      for (const point of testPoints) {
        expect(Number.isNaN(cdf(point, prior))).toBe(false);
        expect(Number.isNaN(pdf(point, prior))).toBe(false);
        expect(Number.isFinite(cdf(point, prior))).toBe(true);
        expect(Number.isFinite(pdf(point, prior))).toBe(true);
      }
    });
  });
});
