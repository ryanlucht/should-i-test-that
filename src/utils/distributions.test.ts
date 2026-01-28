import { describe, it, expect } from 'vitest';
import {
  gamma,
  getTQuantile,
  tDistributionPDF,
  tDistributionCDF,
  ciToTDistributionParams,
  generateTDistributionCurve,
  incrementalProbabilityT,
  normalPDF,
  normalCDF,
  ciToParams,
} from './distributions';

describe('Gamma Function', () => {
  it('calculates factorial for positive integers (Γ(n) = (n-1)!)', () => {
    expect(gamma(1)).toBeCloseTo(1, 5);      // 0! = 1
    expect(gamma(2)).toBeCloseTo(1, 5);      // 1! = 1
    expect(gamma(3)).toBeCloseTo(2, 5);      // 2! = 2
    expect(gamma(4)).toBeCloseTo(6, 5);      // 3! = 6
    expect(gamma(5)).toBeCloseTo(24, 4);     // 4! = 24
    expect(gamma(6)).toBeCloseTo(120, 3);    // 5! = 120
  });

  it('handles half-integer values', () => {
    // Γ(1/2) = √π ≈ 1.7725
    expect(gamma(0.5)).toBeCloseTo(Math.sqrt(Math.PI), 4);

    // Γ(3/2) = (1/2)√π ≈ 0.8862
    expect(gamma(1.5)).toBeCloseTo(0.5 * Math.sqrt(Math.PI), 4);
  });
});

describe('t-Quantile Lookup', () => {
  it('returns correct values for common degrees of freedom', () => {
    expect(getTQuantile(1)).toBeCloseTo(6.314, 2);
    expect(getTQuantile(5)).toBeCloseTo(2.015, 2);
    expect(getTQuantile(10)).toBeCloseTo(1.812, 2);
    expect(getTQuantile(30)).toBeCloseTo(1.697, 2);
  });

  it('approaches normal distribution for high df', () => {
    // Normal distribution z-score for 95th percentile is 1.645
    expect(getTQuantile(100)).toBeCloseTo(1.66, 1);
    expect(getTQuantile(1000)).toBeCloseTo(1.645, 1);
  });

  it('interpolates between values', () => {
    const t15 = getTQuantile(15);
    const t16 = getTQuantile(16);
    const t15_5 = getTQuantile(15.5);

    // Should be between t15 and t16
    expect(t15_5).toBeGreaterThan(t16);
    expect(t15_5).toBeLessThan(t15);
  });
});

describe('t-Distribution PDF', () => {
  it('is symmetric around the mean', () => {
    const df = 5;
    expect(tDistributionPDF(-2, df)).toBeCloseTo(tDistributionPDF(2, df), 8);
    expect(tDistributionPDF(-1, df)).toBeCloseTo(tDistributionPDF(1, df), 8);
  });

  it('peaks at the mean', () => {
    const df = 5;
    const mean = 3;
    const scale = 2;

    const atMean = tDistributionPDF(mean, df, mean, scale);
    const offMean = tDistributionPDF(mean + 1, df, mean, scale);

    expect(atMean).toBeGreaterThan(offMean);
  });

  it('has fatter tails than normal distribution', () => {
    // At 3 standard deviations, t-distribution should have higher density
    const df = 5;
    const x = 3;

    const tPDF = tDistributionPDF(x, df, 0, 1);
    const normalPdf = normalPDF(x, 0, 1);

    expect(tPDF).toBeGreaterThan(normalPdf);
  });

  it('approximates normal for high df', () => {
    const df = 100;
    const x = 1.5;

    const tPDF = tDistributionPDF(x, df, 0, 1);
    const normalPdf = normalPDF(x, 0, 1);

    expect(tPDF).toBeCloseTo(normalPdf, 2);
  });

  it('handles location and scale parameters', () => {
    const df = 10;
    const mean = 5;
    const scale = 2;

    // PDF at mean should equal standard t-PDF at 0, divided by scale
    const atMean = tDistributionPDF(mean, df, mean, scale);
    const standardAtZero = tDistributionPDF(0, df, 0, 1);

    expect(atMean).toBeCloseTo(standardAtZero / scale, 6);
  });
});

describe('t-Distribution CDF', () => {
  it('equals 0.5 at the mean', () => {
    const df = 5;
    expect(tDistributionCDF(0, df)).toBeCloseTo(0.5, 2);
    expect(tDistributionCDF(5, df, 5, 1)).toBeCloseTo(0.5, 2);
  });

  it('is bounded between 0 and 1', () => {
    const df = 5;
    expect(tDistributionCDF(-10, df)).toBeGreaterThanOrEqual(0);
    expect(tDistributionCDF(-10, df)).toBeLessThan(0.01);
    expect(tDistributionCDF(10, df)).toBeLessThanOrEqual(1);
    expect(tDistributionCDF(10, df)).toBeGreaterThan(0.99);
  });

  it('approximates normal CDF for high df', () => {
    const df = 50;
    const x = 1.5;

    const tCDF = tDistributionCDF(x, df, 0, 1);
    const normalCdf = normalCDF(x, 0, 1);

    expect(tCDF).toBeCloseTo(normalCdf, 2);
  });

  it('is monotonically increasing', () => {
    const df = 5;
    const x1 = tDistributionCDF(-1, df);
    const x2 = tDistributionCDF(0, df);
    const x3 = tDistributionCDF(1, df);

    expect(x2).toBeGreaterThan(x1);
    expect(x3).toBeGreaterThan(x2);
  });
});

describe('CI to t-Distribution Parameters', () => {
  it('calculates mean correctly', () => {
    const { mean } = ciToTDistributionParams(-2, 8, 5);
    expect(mean).toBe(3); // Midpoint of [-2, 8]
  });

  it('calculates scale based on df', () => {
    const { scale: scale5 } = ciToTDistributionParams(-2, 8, 5);
    const { scale: scale10 } = ciToTDistributionParams(-2, 8, 10);
    const { scale: scale30 } = ciToTDistributionParams(-2, 8, 30);

    // Lower df = higher t-quantile = smaller scale
    expect(scale5).toBeLessThan(scale10);
    expect(scale10).toBeLessThan(scale30);
  });

  it('matches normal distribution parameters for high df', () => {
    const df = 100;
    const { mean: tMean, scale: tScale } = ciToTDistributionParams(-2, 8, df);
    const { mean: normalMean, stdDev: normalStdDev } = ciToParams(-2, 8);

    expect(tMean).toBeCloseTo(normalMean, 5);
    expect(tScale).toBeCloseTo(normalStdDev, 1);
  });
});

describe('Generate t-Distribution Curve', () => {
  it('generates the requested number of points', () => {
    const curve = generateTDistributionCurve(0, 1, 5, 50);
    expect(curve.length).toBe(50);
  });

  it('generates points centered around the mean', () => {
    const mean = 5;
    const curve = generateTDistributionCurve(mean, 1, 5, 100);

    const xValues = curve.map(p => p.x);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);

    // Check that mean is roughly in the center
    const center = (minX + maxX) / 2;
    expect(center).toBeCloseTo(mean, 1);
  });

  it('produces valid probability densities', () => {
    const curve = generateTDistributionCurve(0, 1, 5);

    // All y values should be non-negative
    expect(curve.every(p => p.y >= 0)).toBe(true);

    // Peak should be at or near x=0
    const maxY = Math.max(...curve.map(p => p.y));
    const peakPoint = curve.find(p => p.y === maxY);
    expect(peakPoint?.x).toBeCloseTo(0, 0);
  });
});

describe('Incremental Probability for t-Distribution', () => {
  it('returns probability between 0 and 1', () => {
    const prob = incrementalProbabilityT(-1, 1, 0, 1, 5);
    expect(prob).toBeGreaterThan(0);
    expect(prob).toBeLessThanOrEqual(1);
  });

  it('is symmetric for symmetric intervals', () => {
    const df = 5;
    const prob1 = incrementalProbabilityT(-1, 0, 0, 1, df);
    const prob2 = incrementalProbabilityT(0, 1, 0, 1, df);

    expect(prob1).toBeCloseTo(prob2, 4);
  });

  it('sums to approximately 1 over full range', () => {
    const df = 5;
    const sliceWidth = 0.1;
    let totalProb = 0;

    // Sum probability from -10 to 10
    for (let x = -10; x < 10; x += sliceWidth) {
      totalProb += incrementalProbabilityT(x, x + sliceWidth, 0, 1, df);
    }

    expect(totalProb).toBeCloseTo(1, 1);
  });

  it('captures more probability in tails than normal', () => {
    const df = 5;
    const mean = 0;
    const scale = 1;

    // Probability in the right tail (x > 2)
    const tTailProb = incrementalProbabilityT(2, 10, mean, scale, df);

    // For normal with same scale
    const normalTailProb = normalCDF(10, mean, scale) - normalCDF(2, mean, scale);

    // t-distribution should have more probability in the tail
    expect(tTailProb).toBeGreaterThan(normalTailProb);
  });
});

describe('Real-world A/B Test Scenarios', () => {
  it('handles typical A/B test effect size range', () => {
    // -2% to +8% effect, df=5 (fat tails)
    const { mean, scale } = ciToTDistributionParams(-2, 8, 5);

    expect(mean).toBe(3);  // Expected effect is +3%
    expect(scale).toBeGreaterThan(0);

    // Generate curve
    const curve = generateTDistributionCurve(mean, scale, 5);
    expect(curve.length).toBeGreaterThan(0);

    // Probability of being below 0% (negative effect)
    const probNegative = tDistributionCDF(0, 5, mean, scale);
    expect(probNegative).toBeGreaterThan(0);
    expect(probNegative).toBeLessThan(0.5);  // Should be less likely than positive
  });

  it('shows more extreme outcomes with lower df', () => {
    const bounds = { lower: -2, upper: 8 };

    // Calculate probability of extreme outcome (< -5%) for different df
    const { mean: m5, scale: s5 } = ciToTDistributionParams(bounds.lower, bounds.upper, 5);
    const { mean: m30, scale: s30 } = ciToTDistributionParams(bounds.lower, bounds.upper, 30);

    const probExtreme5 = tDistributionCDF(-5, 5, m5, s5);
    const probExtreme30 = tDistributionCDF(-5, 30, m30, s30);

    // Lower df should have higher probability of extreme outcomes
    expect(probExtreme5).toBeGreaterThan(probExtreme30);
  });
});
