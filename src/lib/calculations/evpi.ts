/**
 * EVPI Calculation Engine
 *
 * Implements the Expected Value of Perfect Information calculation
 * using the closed-form Normal formula from SPEC.md Section 8.4.
 *
 * EVPI represents the maximum amount worth paying to eliminate
 * decision uncertainty - the "perfect crystal ball" ceiling.
 *
 * Per SPEC.md Section 8.3:
 *   EVPI = E[ Loss(L) ] (under the prior, using the default decision)
 *
 * Truncation Support (Phase 9 TRUNC-01/02/03):
 * When the prior has significant mass below L=-1 (feasibility bound),
 * we use Method B numerical integration over the truncated distribution
 * to ensure consistency with EVSI Monte Carlo rejection sampling.
 */

import { standardNormalPDF, standardNormalCDF } from './statistics';
import { deriveK, determineDefaultDecision, detectEdgeCases } from './derived';
import {
  truncatedNormalMean,
  truncatedNormalVariance,
  truncatedNormalCDF,
  truncatedNormalPDF,
} from './truncated-normal';
import type { EVPIInputs, EVPIResults } from './types';

/**
 * Calculate EVPI using Method B (numerical integration) for truncated prior
 *
 * Per SPEC.md Section 8.4 Method B and Audit Section 2.3:
 * When the prior has significant mass below L=-1 (the feasibility bound),
 * we use numerical integration over the truncated distribution.
 *
 * Mathematical approach:
 * 1. Compute truncated prior metrics (mean, variance)
 * 2. Determine default decision using truncated mean
 * 3. Integrate loss function over truncated prior using grid method
 *
 * Grid integration formula:
 *   EVPI = sum over bins of [loss(midpoint) * probability_mass(bin)]
 *
 * @param inputs - Business inputs, prior parameters, and threshold
 * @param gridSize - Number of integration points (default 200, per POST-01)
 * @returns EVPI results computed on truncated prior
 */
function calculateEVPITruncated(
  inputs: EVPIInputs,
  gridSize: number = 200
): EVPIResults {
  const {
    baselineConversionRate,
    annualVisitors,
    valuePerConversion,
    prior,
    threshold_L,
  } = inputs;

  const { mu_L, sigma_L } = prior;

  // K = annual dollars per unit lift (same as closed-form)
  const K = deriveK(annualVisitors, baselineConversionRate, valuePerConversion);

  // Lower bound for truncation (feasibility constraint: L >= -1)
  const lower = -1;

  // ===========================================
  // Step 1: Compute truncated prior metrics
  // ===========================================
  // These replace the untruncated mu_L and sigma_L for all subsequent calculations
  const truncatedMean = truncatedNormalMean(mu_L, sigma_L, lower);
  const truncatedVar = truncatedNormalVariance(mu_L, sigma_L, lower);
  const truncatedSigma = Math.sqrt(truncatedVar);

  // ===========================================
  // Step 2: Determine default decision using truncated mean
  // ===========================================
  // Per TRUNC-02: Decision must use truncated mean, not untruncated
  const defaultDecision = truncatedMean >= threshold_L ? 'ship' : 'dont-ship';

  // ===========================================
  // Step 3: Numerical integration for EVPI (Method B)
  // ===========================================
  // Per SPEC.md Section 8.4 Method B:
  // EVPI = integral[L_min to L_max] Loss(L) * f_truncated(L) dL
  //
  // We approximate this using a grid of bins

  // Integration bounds: from truncation point to conservative upper bound
  const L_min = lower; // Start at feasibility bound = -1

  // Accuracy-05: Guard against bound inversion when mu + 6*sigma < -1
  // This can happen if prior mean is far below feasibility bound
  // When this occurs, the prior has almost all mass below L=-1
  // Ensure L_max > L_min for valid integration
  const rawUpperBound = mu_L + 6 * sigma_L;
  const L_max = Math.max(L_min + 1e-6, rawUpperBound);

  const step = (L_max - L_min) / gridSize;

  let evpiDollars = 0;

  for (let i = 0; i < gridSize; i++) {
    // Bin edges and midpoint
    const binLow = L_min + i * step;
    const binHigh = binLow + step;
    const midpoint = (binLow + binHigh) / 2;

    // Probability mass in this bin under truncated prior
    // P(binLow <= L <= binHigh | L >= lower)
    const probLow = truncatedNormalCDF(binLow, mu_L, sigma_L, lower);
    const probHigh = truncatedNormalCDF(binHigh, mu_L, sigma_L, lower);
    const probMass = probHigh - probLow;

    // Loss function (regret from wrong decision)
    // Per SPEC.md Section 8.3:
    // - If default is Ship: regret = K * max(0, T_L - L) when L < T_L
    // - If default is Don't Ship: regret = K * max(0, L - T_L) when L > T_L
    let loss: number;
    if (defaultDecision === 'ship') {
      // We ship, but true L might be below threshold
      loss = K * Math.max(0, threshold_L - midpoint);
    } else {
      // We don't ship, but true L might be above threshold
      loss = K * Math.max(0, midpoint - threshold_L);
    }

    evpiDollars += loss * probMass;
  }

  // Clamp to non-negative (floating point safety)
  evpiDollars = Math.max(0, evpiDollars);

  // ===========================================
  // Step 4: Calculate probability metrics using truncated CDF
  // ===========================================
  // Per TRUNC-02: All probabilities must use truncated distribution

  // P(L >= T_L | L >= lower) = 1 - P(L < T_L | L >= lower)
  const probabilityClearsThreshold =
    1 - truncatedNormalCDF(threshold_L, mu_L, sigma_L, lower);

  // Chance of being wrong under truncated prior
  const chanceOfBeingWrong =
    defaultDecision === 'ship'
      ? truncatedNormalCDF(threshold_L, mu_L, sigma_L, lower) // P(L < T | ship)
      : probabilityClearsThreshold; // P(L >= T | don't ship)

  // ===========================================
  // Step 5: Calculate truncated diagnostics
  // ===========================================
  // Per Audit Fix C: Standard normal diagnostics (zScore, phiZ, PhiZ) are
  // not meaningful for truncated distributions. Instead, we provide
  // truncated-specific diagnostics and set the standard ones to NaN.
  const pdfAtThreshold = truncatedNormalPDF(threshold_L, mu_L, sigma_L, lower);
  const cdfAtThreshold = truncatedNormalCDF(threshold_L, mu_L, sigma_L, lower);

  // ===========================================
  // Step 6: Return results with truncation flag
  // ===========================================
  const threshold_dollars = K * threshold_L;

  return {
    evpiDollars,
    defaultDecision,
    probabilityClearsThreshold,
    chanceOfBeingWrong,
    K,
    threshold_L,
    threshold_dollars,
    // Standard normal diagnostics are NaN when truncation is applied
    // to prevent misuse (they don't represent standard normal values)
    zScore: Number.NaN,
    phiZ: Number.NaN,
    PhiZ: Number.NaN,
    edgeCases: {
      truncationApplied: true, // Always true when this function is called
      nearZeroSigma: truncatedSigma < 0.001,
      priorOneSided:
        probabilityClearsThreshold > 0.9999 ||
        probabilityClearsThreshold < 0.0001,
    },
    // Truncated-specific diagnostics for debugging
    truncatedDiagnostics: {
      truncatedMean,
      truncatedSigma,
      pdfAtThreshold,
      cdfAtThreshold,
    },
  };
}

/**
 * Calculate EVPI and supporting metrics for Basic mode
 *
 * Uses closed-form Normal formula per SPEC.md Section 8.4:
 *
 * If default decision is Ship:
 *   EVPI = K * [ (T_L - mu_L) * Phi(z) + sigma_L * phi(z) ]
 *
 * If default decision is Don't ship:
 *   EVPI = K * [ (mu_L - T_L) * (1 - Phi(z)) + sigma_L * phi(z) ]
 *
 * Where:
 *   z = (T_L - mu_L) / sigma_L  (standardized threshold)
 *   phi(z) = standard normal PDF
 *   Phi(z) = standard normal CDF
 *   K = N_year * CR0 * V (annual dollars per unit lift)
 *
 * @param inputs - Business inputs, prior parameters, and threshold
 * @returns EVPI results with all supporting metrics
 */
export function calculateEVPI(inputs: EVPIInputs): EVPIResults {
  const {
    baselineConversionRate,
    annualVisitors,
    valuePerConversion,
    prior,
    threshold_L,
  } = inputs;

  const { mu_L, sigma_L } = prior;

  // ===========================================
  // Step 0: Check if truncation is significant
  // ===========================================
  // Per TRUNC-01: Apply truncation when P(L < -1) > 0.001 (0.1%)
  // This ensures consistency with EVSI Monte Carlo which uses rejection sampling
  //
  // Calculate: alpha = (-1 - mu_L) / sigma_L
  // Then: P(L < -1) = Phi(alpha)
  if (sigma_L > 0) {
    const alpha = (-1 - mu_L) / sigma_L;
    const probBelowMinus1 = standardNormalCDF(alpha);

    if (probBelowMinus1 > 0.001) {
      // Truncation is significant - use Method B numerical integration
      return calculateEVPITruncated(inputs);
    }
  }

  // Continue with closed-form calculation for non-truncated case...

  // ===========================================
  // Step 1: Derive K (annual dollars per unit lift)
  // ===========================================
  // Per SPEC.md Section 4.2: K = N_year * CR0 * V
  // This is the scaling constant that converts lift (decimal) to dollars
  const K = deriveK(annualVisitors, baselineConversionRate, valuePerConversion);

  // ===========================================
  // Step 2: Determine default decision
  // ===========================================
  // Per SPEC.md Section 8.1: Ship if mu_L >= T_L
  // This is what you would decide without running a test,
  // based solely on your prior beliefs about the treatment effect
  const defaultDecision = determineDefaultDecision(mu_L, threshold_L);

  // ===========================================
  // Step 2.5: Handle degenerate prior (sigma = 0)
  // ===========================================
  // When sigma_L = 0, the prior is a point mass at mu_L.
  // There is no uncertainty, so EVPI = 0 (information has no value).
  // All derived metrics must reflect the deterministic case.
  if (sigma_L === 0) {
    const threshold_dollars = K * threshold_L;

    return {
      evpiDollars: 0, // No uncertainty = no value of information
      defaultDecision,
      // Point mass: either entirely above or entirely below threshold
      // Use >= for threshold comparison (shipping at exactly threshold is acceptable)
      probabilityClearsThreshold: mu_L >= threshold_L ? 1 : 0,
      chanceOfBeingWrong: 0, // No uncertainty = no chance of being wrong
      K,
      threshold_L,
      threshold_dollars,
      // z-score: represent where threshold is relative to point mass
      zScore: mu_L === threshold_L ? 0 : (threshold_L > mu_L ? Infinity : -Infinity),
      phiZ: 0, // PDF is 0 at any finite point for a point mass
      PhiZ: mu_L >= threshold_L ? 0 : 1, // CDF: 0 if point mass is above threshold, 1 if below
      edgeCases: {
        truncationApplied: false,
        nearZeroSigma: true,
        priorOneSided: mu_L !== threshold_L,
      },
    };
  }

  // ===========================================
  // Step 3: Calculate z-score (standardized threshold)
  // ===========================================
  // z = (T_L - mu_L) / sigma_L
  // This standardizes the threshold relative to the prior distribution
  // Note: sigma_L > 0 guaranteed by early return above
  const zScore = (threshold_L - mu_L) / sigma_L;

  // ===========================================
  // Step 4: Calculate standard normal PDF and CDF at z
  // ===========================================
  // phi(z) = standard normal probability density function
  // Phi(z) = standard normal cumulative distribution function
  const phiZ = standardNormalPDF(zScore);
  const PhiZ = standardNormalCDF(zScore);

  // ===========================================
  // Step 5: Calculate EVPI using closed-form formula
  // ===========================================
  // The formula differs based on the default decision
  // Per SPEC.md Section 8.4
  let evpiDollars: number;

  if (defaultDecision === 'ship') {
    // EVPI = K * [ (T_L - mu_L) * Phi(z) + sigma_L * phi(z) ]
    // This represents the expected regret from shipping when we shouldn't
    // The first term: (T_L - mu_L) * Phi(z) captures the probability-weighted
    //   distance from threshold when we're below it
    // The second term: sigma_L * phi(z) captures the "density adjustment"
    //   at the threshold boundary
    evpiDollars = K * ((threshold_L - mu_L) * PhiZ + sigma_L * phiZ);
  } else {
    // EVPI = K * [ (mu_L - T_L) * (1 - Phi(z)) + sigma_L * phi(z) ]
    // This represents the expected regret from not shipping when we should
    // The first term: (mu_L - T_L) * (1 - Phi(z)) captures the probability-weighted
    //   distance from threshold when we're above it
    // The second term: sigma_L * phi(z) captures the "density adjustment"
    evpiDollars = K * ((mu_L - threshold_L) * (1 - PhiZ) + sigma_L * phiZ);
  }

  // EVPI is mathematically non-negative, but floating point errors
  // could produce tiny negative values. Clamp to zero defensively.
  evpiDollars = Math.max(0, evpiDollars);

  // ===========================================
  // Step 6: Calculate probability of clearing threshold
  // ===========================================
  // P(L >= T_L) = 1 - Phi(z)
  // This is the probability that the true lift exceeds the threshold
  const probabilityClearsThreshold = 1 - PhiZ;

  // ===========================================
  // Step 7: Calculate chance of being wrong
  // ===========================================
  // Per SPEC.md Section 8.5:
  // - If default Ship: P(wrong) = P(L < T_L) = Phi(z)
  //   (We ship, but the true lift is below threshold)
  // - If default Don't Ship: P(wrong) = P(L >= T_L) = 1 - Phi(z)
  //   (We don't ship, but the true lift is above threshold)
  const chanceOfBeingWrong =
    defaultDecision === 'ship' ? PhiZ : 1 - PhiZ;

  // ===========================================
  // Step 8: Detect edge cases for UI messaging
  // ===========================================
  // These flags help the UI show appropriate educational notes
  const edgeCases = detectEdgeCases(sigma_L, mu_L, PhiZ);

  // ===========================================
  // Step 9: Calculate threshold in dollars
  // ===========================================
  // T_$ = K * T_L
  // This converts the lift threshold to annual dollar impact
  const threshold_dollars = K * threshold_L;

  return {
    evpiDollars,
    defaultDecision,
    probabilityClearsThreshold,
    chanceOfBeingWrong,
    K,
    threshold_L,
    threshold_dollars,
    zScore,
    phiZ,
    PhiZ,
    edgeCases,
  };
}
