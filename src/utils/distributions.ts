/**
 * Probability Distribution Functions
 * Based on Douglas Hubbard's "How to Measure Anything" Chapter 7
 *
 * Key concept from Hubbard:
 * "A calibrated estimator can reliably state a 90% confidence interval (CI)
 * such that there is a 90% chance the true value falls within the range."
 *
 * For a normal distribution:
 * - The 90% CI spans from the 5th to 95th percentile
 * - This corresponds to ±1.645 standard deviations from the mean
 */

/**
 * Standard normal cumulative distribution function (CDF)
 *
 * Approximation using the error function.
 * Returns P(X ≤ z) for standard normal distribution.
 *
 * @param z - The z-score
 * @returns Probability that a standard normal random variable is ≤ z
 */
export function standardNormalCDF(z: number): number {
  // Using Abramowitz and Stegun approximation for error function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // Save the sign
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);

  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Normal distribution cumulative distribution function (CDF)
 *
 * Returns P(X ≤ x) for a normal distribution with given mean and stdDev.
 *
 * @param x - The value to evaluate
 * @param mean - Mean of the distribution
 * @param stdDev - Standard deviation of the distribution
 * @returns Probability that X ≤ x
 */
export function normalCDF(x: number, mean: number, stdDev: number): number {
  if (stdDev <= 0) {
    // Degenerate case: all probability at mean
    return x < mean ? 0 : 1;
  }

  const z = (x - mean) / stdDev;
  return standardNormalCDF(z);
}

/**
 * Normal distribution probability density function (PDF)
 *
 * Returns the probability density at x for a normal distribution.
 *
 * @param x - The value to evaluate
 * @param mean - Mean of the distribution
 * @param stdDev - Standard deviation of the distribution
 * @returns Probability density at x
 */
export function normalPDF(x: number, mean: number, stdDev: number): number {
  if (stdDev <= 0) {
    // Degenerate case
    return x === mean ? Infinity : 0;
  }

  const z = (x - mean) / stdDev;
  const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
  return coefficient * Math.exp(-0.5 * z * z);
}

/**
 * Inverse standard normal CDF (quantile function)
 *
 * Given a probability p, returns the z-score z such that P(Z ≤ z) = p
 * for a standard normal distribution.
 *
 * Uses the rational approximation from Abramowitz and Stegun.
 *
 * @param p - Probability (0-1)
 * @returns z-score
 */
export function standardNormalInverseCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Coefficients for rational approximation
  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;

  if (p < pLow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    // Rational approximation for central region
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    // Rational approximation for upper region
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

/**
 * Inverse normal CDF
 *
 * Given a probability p, returns x such that P(X ≤ x) = p
 * for a normal distribution with given mean and stdDev.
 *
 * @param p - Probability (0-1)
 * @param mean - Mean of the distribution
 * @param stdDev - Standard deviation of the distribution
 * @returns The value x where P(X ≤ x) = p
 */
export function normalInverseCDF(p: number, mean: number, stdDev: number): number {
  return mean + stdDev * standardNormalInverseCDF(p);
}

/**
 * Convert 90% confidence interval bounds to normal distribution parameters
 *
 * From Hubbard's methodology:
 * - A calibrated 90% CI means 5% probability below lower bound, 5% above upper
 * - For normal distribution, 90% CI = mean ± 1.645 × stdDev
 *
 * Therefore:
 * - Mean = (lower + upper) / 2
 * - StdDev = (upper - lower) / (2 × 1.645) ≈ (upper - lower) / 3.29
 *
 * @param lowerBound - Lower bound of 90% CI (5th percentile)
 * @param upperBound - Upper bound of 90% CI (95th percentile)
 * @returns Mean and standard deviation
 */
export function ciToParams(lowerBound: number, upperBound: number): { mean: number; stdDev: number } {
  // The z-score for the 5th percentile is approximately -1.645
  // The z-score for the 95th percentile is approximately 1.645
  // Total span = 2 × 1.645 = 3.29 standard deviations
  const Z_90_CI = 1.6448536269514722; // More precise value

  const mean = (lowerBound + upperBound) / 2;
  const stdDev = (upperBound - lowerBound) / (2 * Z_90_CI);

  return { mean, stdDev };
}

/**
 * Calculate incremental probability for a slice of the distribution
 *
 * From Hubbard's "Computing an Incremental Probability" sidebar:
 * "The incremental probability is simply the difference between
 * the CDF values at the endpoints of the slice."
 *
 * @param sliceStart - Start of the slice
 * @param sliceEnd - End of the slice
 * @param mean - Mean of the distribution
 * @param stdDev - Standard deviation
 * @returns Probability that X falls within [sliceStart, sliceEnd]
 */
export function incrementalProbability(
  sliceStart: number,
  sliceEnd: number,
  mean: number,
  stdDev: number
): number {
  return normalCDF(sliceEnd, mean, stdDev) - normalCDF(sliceStart, mean, stdDev);
}

/**
 * Generate points for plotting a normal distribution curve
 *
 * @param mean - Mean of the distribution
 * @param stdDev - Standard deviation
 * @param numPoints - Number of points to generate (default 100)
 * @param sigmas - Number of standard deviations to span (default 4)
 * @returns Array of {x, y} points for plotting
 */
export function generateNormalCurve(
  mean: number,
  stdDev: number,
  numPoints: number = 100,
  sigmas: number = 4
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  const minX = mean - sigmas * stdDev;
  const maxX = mean + sigmas * stdDev;
  const step = (maxX - minX) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = minX + i * step;
    const y = normalPDF(x, mean, stdDev);
    points.push({ x, y });
  }

  return points;
}

/**
 * Generate points for a uniform distribution
 *
 * @param lowerBound - Lower bound
 * @param upperBound - Upper bound
 * @returns Array of {x, y} points for plotting
 */
export function generateUniformCurve(
  lowerBound: number,
  upperBound: number
): { x: number; y: number }[] {
  const height = 1 / (upperBound - lowerBound);

  // Add padding outside the bounds for visualization
  const padding = (upperBound - lowerBound) * 0.2;

  return [
    { x: lowerBound - padding, y: 0 },
    { x: lowerBound, y: 0 },
    { x: lowerBound, y: height },
    { x: upperBound, y: height },
    { x: upperBound, y: 0 },
    { x: upperBound + padding, y: 0 },
  ];
}

// ============================================================================
// t-Distribution Functions (for fat-tailed distributions)
// ============================================================================

/**
 * Lanczos approximation for the Gamma function
 *
 * The Gamma function is needed for t-distribution calculations.
 * Γ(n) = (n-1)! for positive integers.
 *
 * @param z - Input value
 * @returns Gamma(z)
 */
export function gamma(z: number): number {
  // Lanczos coefficients
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];

  if (z < 0.5) {
    // Reflection formula: Γ(1-z)Γ(z) = π/sin(πz)
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }

  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }

  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/**
 * t-distribution quantile lookup table for 90% CI (95th percentile)
 *
 * These are the critical values for a two-tailed 90% confidence interval,
 * meaning t such that P(-t < T < t) = 0.90, or equivalently P(T < t) = 0.95
 */
const T_QUANTILE_95: Record<number, number> = {
  1: 6.314,   // Cauchy-like - very fat tails
  2: 2.920,
  3: 2.353,
  4: 2.132,
  5: 2.015,
  6: 1.943,
  7: 1.895,
  8: 1.860,
  9: 1.833,
  10: 1.812,
  11: 1.796,
  12: 1.782,
  13: 1.771,
  14: 1.761,
  15: 1.753,
  16: 1.746,
  17: 1.740,
  18: 1.734,
  19: 1.729,
  20: 1.725,
  25: 1.708,
  30: 1.697,  // Approaching normal (1.645)
  40: 1.684,
  50: 1.676,
  100: 1.660,
  Infinity: 1.645, // Normal distribution
};

/**
 * Get t-distribution quantile for 95th percentile
 *
 * Uses linear interpolation between lookup table values.
 *
 * @param df - Degrees of freedom
 * @returns t-value such that P(T < t) = 0.95
 */
export function getTQuantile(df: number): number {
  if (df <= 0) return Infinity;
  if (df >= 100) return T_QUANTILE_95[100] + (T_QUANTILE_95[Infinity] - T_QUANTILE_95[100]) * (df - 100) / 900;
  if (df >= 50) return T_QUANTILE_95[50] + (T_QUANTILE_95[100] - T_QUANTILE_95[50]) * (df - 50) / 50;
  if (df >= 40) return T_QUANTILE_95[40] + (T_QUANTILE_95[50] - T_QUANTILE_95[40]) * (df - 40) / 10;
  if (df >= 30) return T_QUANTILE_95[30] + (T_QUANTILE_95[40] - T_QUANTILE_95[30]) * (df - 30) / 10;
  if (df >= 25) return T_QUANTILE_95[25] + (T_QUANTILE_95[30] - T_QUANTILE_95[25]) * (df - 25) / 5;
  if (df >= 20) return T_QUANTILE_95[20] + (T_QUANTILE_95[25] - T_QUANTILE_95[20]) * (df - 20) / 5;

  // For df 1-20, use direct lookup or interpolation
  const lowerDf = Math.floor(df);
  const upperDf = Math.ceil(df);

  if (lowerDf === upperDf || lowerDf < 1) {
    return T_QUANTILE_95[Math.max(1, Math.round(df))] || T_QUANTILE_95[1];
  }

  const lowerVal = T_QUANTILE_95[lowerDf] || T_QUANTILE_95[1];
  const upperVal = T_QUANTILE_95[upperDf] || T_QUANTILE_95[20];

  return lowerVal + (upperVal - lowerVal) * (df - lowerDf);
}

/**
 * Student's t-distribution probability density function (PDF)
 *
 * The t-distribution has heavier tails than the normal distribution,
 * making it useful when extreme outcomes are more likely.
 *
 * PDF(x; df) = Γ((df+1)/2) / (√(df·π) · Γ(df/2)) · (1 + x²/df)^(-(df+1)/2)
 *
 * @param x - Value to evaluate
 * @param df - Degrees of freedom
 * @param mean - Location parameter (default 0)
 * @param scale - Scale parameter (default 1)
 * @returns Probability density at x
 */
export function tDistributionPDF(
  x: number,
  df: number,
  mean: number = 0,
  scale: number = 1
): number {
  if (df <= 0 || scale <= 0) return 0;

  const z = (x - mean) / scale;

  // For very high df, approximate with normal distribution
  if (df > 100) {
    return normalPDF(x, mean, scale);
  }

  const numerator = gamma((df + 1) / 2);
  const denominator = Math.sqrt(df * Math.PI) * gamma(df / 2);
  const term = Math.pow(1 + (z * z) / df, -(df + 1) / 2);

  return (numerator / denominator) * term / scale;
}

/**
 * Student's t-distribution cumulative distribution function (CDF)
 *
 * Uses numerical integration via Simpson's rule for accuracy.
 * For df > 30, approximates with normal distribution.
 *
 * @param x - Value to evaluate
 * @param df - Degrees of freedom
 * @param mean - Location parameter (default 0)
 * @param scale - Scale parameter (default 1)
 * @returns P(T ≤ x)
 */
export function tDistributionCDF(
  x: number,
  df: number,
  mean: number = 0,
  scale: number = 1
): number {
  if (df <= 0 || scale <= 0) return 0;

  // For high df, approximate with normal distribution
  if (df > 30) {
    return normalCDF(x, mean, scale);
  }

  const z = (x - mean) / scale;

  // Use numerical integration (Simpson's rule)
  // Integrate from -∞ to x, but practically from -20 to x
  const lowerBound = -20; // Far enough in the tail
  const upperBound = z;

  if (upperBound <= lowerBound) {
    return 0;
  }

  const n = 1000; // Number of intervals (must be even)
  const h = (upperBound - lowerBound) / n;

  let sum = tDistributionPDF(lowerBound, df, 0, 1) + tDistributionPDF(upperBound, df, 0, 1);

  for (let i = 1; i < n; i++) {
    const xi = lowerBound + i * h;
    const weight = i % 2 === 0 ? 2 : 4;
    sum += weight * tDistributionPDF(xi, df, 0, 1);
  }

  const probability = (h / 3) * sum;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, probability));
}

/**
 * Convert 90% confidence interval to t-distribution parameters
 *
 * Similar to ciToParams for normal distribution, but uses t-quantiles
 * which depend on degrees of freedom.
 *
 * @param lowerBound - Lower bound of 90% CI (5th percentile)
 * @param upperBound - Upper bound of 90% CI (95th percentile)
 * @param df - Degrees of freedom
 * @returns Mean and scale parameters
 */
export function ciToTDistributionParams(
  lowerBound: number,
  upperBound: number,
  df: number
): { mean: number; scale: number } {
  const mean = (lowerBound + upperBound) / 2;

  // For 90% CI with t-distribution:
  // scale = (upper - lower) / (2 × t-quantile(0.95, df))
  const tQuantile = getTQuantile(df);
  const scale = (upperBound - lowerBound) / (2 * tQuantile);

  return { mean, scale };
}

/**
 * Generate points for plotting a t-distribution curve
 *
 * Spans wider than normal distribution to show fat tails.
 *
 * @param mean - Location parameter
 * @param scale - Scale parameter
 * @param df - Degrees of freedom
 * @param numPoints - Number of points to generate (default 100)
 * @returns Array of {x, y} points for plotting
 */
export function generateTDistributionCurve(
  mean: number,
  scale: number,
  df: number,
  numPoints: number = 100
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  // Span wider than normal for fat tails (5 scale units vs 4 for normal)
  const span = df < 5 ? 6 : 5;
  const minX = mean - span * scale;
  const maxX = mean + span * scale;
  const step = (maxX - minX) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = minX + i * step;
    const y = tDistributionPDF(x, df, mean, scale);
    points.push({ x, y });
  }

  return points;
}

/**
 * Calculate incremental probability for t-distribution
 *
 * @param sliceStart - Start of the slice
 * @param sliceEnd - End of the slice
 * @param mean - Location parameter
 * @param scale - Scale parameter
 * @param df - Degrees of freedom
 * @returns Probability that X falls within [sliceStart, sliceEnd]
 */
export function incrementalProbabilityT(
  sliceStart: number,
  sliceEnd: number,
  mean: number,
  scale: number,
  df: number
): number {
  return tDistributionCDF(sliceEnd, df, mean, scale) - tDistributionCDF(sliceStart, df, mean, scale);
}
