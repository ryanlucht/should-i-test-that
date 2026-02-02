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
 */

import { standardNormalPDF, standardNormalCDF } from './statistics';
import { deriveK, determineDefaultDecision, detectEdgeCases } from './derived';
import type { EVPIInputs, EVPIResults } from './types';

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
