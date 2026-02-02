/**
 * Distribution Abstraction Layer
 *
 * Unified interface for Normal, Student-t, and Uniform prior distributions.
 * Used for PDF calculations (chart rendering) and sampling (Monte Carlo EVSI).
 *
 * Per 05-RESEARCH.md:
 * - Normal uses existing standardNormalPDF/CDF with z-transform
 * - Student-t uses jStat with location/scale adjustment
 * - Uniform uses simple bounds-based calculations
 *
 * Mathematical notes (for statistician audit):
 * - All lift values (L) are in decimal form (0.05 = 5%)
 * - Student-t location-scale: if Z ~ t(df), then X = mu + sigma*Z ~ t(df, mu, sigma)
 * - Uniform: constant density 1/(b-a) on [a,b], zero elsewhere
 */

import { standardNormalPDF, standardNormalCDF } from './statistics';
import jStat from 'jstat';

/**
 * Distribution type identifier
 */
export type DistributionType = 'normal' | 'student-t' | 'uniform';

/**
 * Prior distribution parameters
 *
 * The parameters depend on the distribution type:
 * - Normal: { type: 'normal', mu_L, sigma_L }
 * - Student-t: { type: 'student-t', mu_L, sigma_L, df }
 * - Uniform: { type: 'uniform', low_L, high_L }
 *
 * All lift parameters are in decimal form (e.g., 0.05 for 5% lift)
 */
export interface PriorDistribution {
  type: DistributionType;

  // Normal / Student-t parameters (location-scale family)
  /** Location parameter (mean for Normal, center for Student-t) */
  mu_L?: number;
  /** Scale parameter (std dev for Normal, spread for Student-t) */
  sigma_L?: number;
  /** Degrees of freedom (Student-t only) */
  df?: number;

  // Uniform parameters
  /** Lower bound of uniform distribution */
  low_L?: number;
  /** Upper bound of uniform distribution */
  high_L?: number;
}

/**
 * Probability Density Function (PDF)
 *
 * Returns the probability density at a given lift value.
 * Used for chart rendering (density curves).
 *
 * Mathematical formulas:
 * - Normal: f(L) = phi((L - mu) / sigma) / sigma
 *   where phi is the standard normal PDF
 *
 * - Student-t: f(L) = t_df((L - mu) / sigma) / sigma
 *   where t_df is the standardized Student-t PDF with df degrees of freedom
 *   IMPORTANT: jStat.studentt.pdf uses the standardized form (location=0, scale=1)
 *
 * - Uniform: f(L) = 1 / (high - low) if low <= L <= high, else 0
 *
 * @param lift_L - Lift value in decimal form (e.g., 0.05 for 5%)
 * @param prior - Distribution parameters
 * @returns Probability density at the given lift value
 */
export function pdf(lift_L: number, prior: PriorDistribution): number {
  switch (prior.type) {
    case 'normal': {
      // Transform to z-score: z = (L - mu) / sigma
      // Then scale the standard normal PDF by 1/sigma
      // f(L) = phi(z) / sigma = phi((L - mu) / sigma) / sigma
      const z = (lift_L - prior.mu_L!) / prior.sigma_L!;
      return standardNormalPDF(z) / prior.sigma_L!;
    }

    case 'student-t': {
      // jStat.studentt.pdf(x, df) gives the standardized Student-t PDF
      // For location-scale form: f(L; mu, sigma, df) = t_df((L - mu) / sigma) / sigma
      //
      // CRITICAL per 05-RESEARCH.md Pitfall 1:
      // jStat implements the STANDARD Student-t (location=0, scale=1)
      // We must transform to z-score and scale the density
      const z = (lift_L - prior.mu_L!) / prior.sigma_L!;
      return jStat.studentt.pdf(z, prior.df!) / prior.sigma_L!;
    }

    case 'uniform': {
      // Uniform PDF is constant within bounds, zero outside
      // f(L) = 1 / (high - low) for low <= L <= high
      // f(L) = 0 otherwise
      if (lift_L < prior.low_L! || lift_L > prior.high_L!) {
        return 0;
      }
      return 1 / (prior.high_L! - prior.low_L!);
    }
  }
}

/**
 * Cumulative Distribution Function (CDF)
 *
 * Returns P(L <= lift_L) under the prior distribution.
 * Used for computing probabilities and decision rules.
 *
 * Mathematical formulas:
 * - Normal: F(L) = Phi((L - mu) / sigma)
 *   where Phi is the standard normal CDF
 *
 * - Student-t: F(L) = T_df((L - mu) / sigma)
 *   where T_df is the standardized Student-t CDF with df degrees of freedom
 *
 * - Uniform: F(L) = (L - low) / (high - low) clamped to [0, 1]
 *
 * @param lift_L - Lift value in decimal form (e.g., 0.05 for 5%)
 * @param prior - Distribution parameters
 * @returns Cumulative probability P(L <= lift_L)
 */
export function cdf(lift_L: number, prior: PriorDistribution): number {
  switch (prior.type) {
    case 'normal': {
      // Transform to z-score and use standard normal CDF
      // F(L) = Phi((L - mu) / sigma)
      const z = (lift_L - prior.mu_L!) / prior.sigma_L!;
      return standardNormalCDF(z);
    }

    case 'student-t': {
      // jStat.studentt.cdf(x, df) gives the standardized Student-t CDF
      // For location-scale form: F(L; mu, sigma, df) = T_df((L - mu) / sigma)
      const z = (lift_L - prior.mu_L!) / prior.sigma_L!;
      return jStat.studentt.cdf(z, prior.df!);
    }

    case 'uniform': {
      // Linear interpolation within bounds, clamped to [0, 1]
      // F(L) = 0 if L <= low
      // F(L) = 1 if L >= high
      // F(L) = (L - low) / (high - low) otherwise
      if (lift_L <= prior.low_L!) return 0;
      if (lift_L >= prior.high_L!) return 1;
      return (lift_L - prior.low_L!) / (prior.high_L! - prior.low_L!);
    }
  }
}

/**
 * Sample from the prior distribution
 *
 * Returns a random draw from the specified distribution.
 * Used in Monte Carlo EVSI simulation.
 *
 * Sampling methods:
 * - Normal: Box-Muller transform
 *   z = sqrt(-2 * ln(U1)) * cos(2 * pi * U2) where U1, U2 ~ Uniform(0,1)
 *   then L = mu + sigma * z
 *
 * - Student-t: Inverse CDF method
 *   L = mu + sigma * T_df^{-1}(U) where U ~ Uniform(0,1)
 *   Uses jStat.studentt.inv for the quantile function
 *
 * - Uniform: Linear scaling
 *   L = low + U * (high - low) where U ~ Uniform(0,1)
 *
 * @param prior - Distribution parameters
 * @returns Random sample from the distribution
 */
export function sample(prior: PriorDistribution): number {
  switch (prior.type) {
    case 'normal': {
      // Box-Muller transform for normal sampling
      // This generates standard normal, then transform to location-scale
      // Guard against u1 = 0 which causes Math.log(0) = -Infinity -> NaN
      const u1 = Math.max(Math.random(), 1e-16);
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return prior.mu_L! + prior.sigma_L! * z;
    }

    case 'student-t': {
      // Inverse CDF method using jStat's quantile function
      // jStat.studentt.inv(p, df) returns T_df^{-1}(p)
      // Then transform to location-scale
      const u = Math.random();
      const z = jStat.studentt.inv(u, prior.df!);
      // Guard: re-sample if inverse CDF returned non-finite value (extreme tails)
      if (!isFinite(z)) {
        return sample(prior); // Recursive re-sample
      }
      return prior.mu_L! + prior.sigma_L! * z;
    }

    case 'uniform': {
      // Simple linear scaling of uniform random
      return prior.low_L! + Math.random() * (prior.high_L! - prior.low_L!);
    }
  }
}

/**
 * Get the mean of the prior distribution
 *
 * Used for determining the default decision (ship if E[L] >= threshold).
 *
 * Mean formulas:
 * - Normal: E[L] = mu
 * - Student-t: E[L] = mu (for df > 1; undefined for df <= 1)
 * - Uniform: E[L] = (low + high) / 2
 *
 * @param prior - Distribution parameters
 * @returns Mean of the distribution
 */
export function getPriorMean(prior: PriorDistribution): number {
  switch (prior.type) {
    case 'normal':
    case 'student-t':
      // Both Normal and Student-t (df > 1) have mean = location parameter
      return prior.mu_L!;

    case 'uniform':
      // Uniform mean is the midpoint of the interval
      return (prior.low_L! + prior.high_L!) / 2;
  }
}
