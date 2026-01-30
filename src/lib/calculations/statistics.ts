/**
 * Standard Normal Distribution Functions
 *
 * Mathematical primitives for EVPI calculation.
 * These are pure functions with no side effects.
 *
 * Per SPEC.md Section 8.4 and 03-RESEARCH.md:
 * - PDF (phi): Used in EVPI closed-form formula
 * - CDF (Phi): Used for default decision and z-score calculations
 */

/**
 * Square root of 2 * PI
 *
 * Pre-computed constant used in PDF calculation.
 * sqrt(2 * pi) = 2.5066282746310005...
 */
export const SQRT_2_PI = Math.sqrt(2 * Math.PI);

/**
 * Standard normal probability density function (PDF)
 *
 * Mathematical formula:
 *   phi(z) = (1 / sqrt(2*pi)) * exp(-z^2 / 2)
 *
 * Properties:
 * - Symmetric: phi(-z) = phi(z)
 * - Maximum at z=0: phi(0) = 1/sqrt(2*pi) approx 0.3989
 * - Approaches 0 as |z| -> infinity
 *
 * @param z - Standard normal z-score
 * @returns Probability density at z
 */
export function standardNormalPDF(z: number): number {
  // phi(z) = exp(-z^2 / 2) / sqrt(2*pi)
  return Math.exp(-0.5 * z * z) / SQRT_2_PI;
}

/**
 * Standard normal cumulative distribution function (CDF)
 *
 * Uses Abramowitz-Stegun approximation (formula 7.1.26) for erfc,
 * with maximum error < 7.5 * 10^-8.
 *
 * The relationship between Phi(z) and erfc is:
 *   Phi(z) = 0.5 * erfc(-z / sqrt(2))
 *
 * Mathematical definition:
 *   Phi(z) = integral from -infinity to z of phi(t) dt
 *          = P(Z <= z) where Z ~ N(0,1)
 *
 * Properties:
 * - Phi(-infinity) = 0
 * - Phi(0) = 0.5
 * - Phi(infinity) = 1
 * - Phi(-z) = 1 - Phi(z) (symmetry)
 * - Monotonically increasing
 *
 * @param z - Standard normal z-score
 * @returns Cumulative probability P(Z <= z)
 */
export function standardNormalCDF(z: number): number {
  // Handle special cases for +/- Infinity
  if (!isFinite(z)) {
    return z < 0 ? 0 : 1;
  }

  // Abramowitz-Stegun approximation coefficients for erfc
  // Source: Handbook of Mathematical Functions, formula 7.1.26
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  // Save the sign to handle symmetry
  const sign = z >= 0 ? 1 : -1;
  const absZ = Math.abs(z);

  // Convert to the error function argument: x = |z| / sqrt(2)
  const x = absZ / Math.SQRT2;

  // Abramowitz-Stegun formula 7.1.26 computes erfc(x)
  // erfc(x) = 1 - erf(x) where erf is the error function
  const t = 1.0 / (1.0 + p * x);

  // Evaluate polynomial using Horner's method for efficiency
  const erfcApprox =
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  // Phi(z) = 0.5 * erfc(-z / sqrt(2))
  // For positive z: Phi(z) = 1 - 0.5 * erfc(z / sqrt(2))
  // For negative z: Phi(z) = 0.5 * erfc(-z / sqrt(2)) = 0.5 * erfc(|z| / sqrt(2))
  if (sign >= 0) {
    return 1.0 - 0.5 * erfcApprox;
  } else {
    return 0.5 * erfcApprox;
  }
}
