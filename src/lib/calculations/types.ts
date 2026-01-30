/**
 * Type definitions for EVPI (Expected Value of Perfect Information) calculations
 *
 * Per SPEC.md Section 4 (Notation) and Section 8 (Calculations):
 * All values should be in their canonical forms:
 * - Rates as decimals (0.032 not 3.2%)
 * - Lift as decimals (0.05 not 5%)
 */

/**
 * Input parameters for EVPI calculation
 *
 * These values come from the wizard form inputs after conversion
 * to their canonical (internal) representations.
 */
export interface EVPIInputs {
  /** Baseline conversion rate (CR0) as decimal, e.g., 0.032 for 3.2% */
  baselineConversionRate: number;

  /** Annual visitors (N_year) */
  annualVisitors: number;

  /** Value per conversion (V) in dollars */
  valuePerConversion: number;

  /**
   * Prior distribution parameters
   * mu_L: Prior mean of relative lift (decimal, e.g., 0.05 for 5%)
   * sigma_L: Prior standard deviation of relative lift (decimal)
   */
  prior: { mu_L: number; sigma_L: number };

  /** Threshold in lift units (T_L) as decimal, e.g., 0.05 for 5% */
  threshold_L: number;
}

/**
 * Results from EVPI calculation
 *
 * Contains the primary result (evpiDollars) along with supporting
 * metrics for display and debugging.
 */
export interface EVPIResults {
  /** EVPI in annual dollars - the headline result */
  evpiDollars: number;

  /** Default decision based on prior mean vs threshold */
  defaultDecision: 'ship' | 'dont-ship';

  /** P(L >= T_L) - probability the true lift clears threshold */
  probabilityClearsThreshold: number;

  /** Probability of making the wrong decision without testing */
  chanceOfBeingWrong: number;

  // Derived values for debugging panel
  /** K = N_year * CR0 * V (annual dollars per unit lift) */
  K: number;

  /** T_$ = K * T_L (threshold in dollars) */
  threshold_dollars: number;

  /** z = (T_L - mu_L) / sigma_L (standardized z-score) */
  zScore: number;

  /** phi(z) - standard normal PDF at z */
  phiZ: number;

  /** Phi(z) - standard normal CDF at z */
  PhiZ: number;

  /** Flags indicating special edge cases */
  edgeCases: EdgeCaseFlags;
}

/**
 * Flags indicating edge cases that may require special UI messaging
 *
 * Per 03-CONTEXT.md: Show educational notes for edge cases
 */
export interface EdgeCaseFlags {
  /**
   * True if prior had significant mass below L = -1 (100% loss)
   * which was truncated for the calculation
   */
  truncationApplied: boolean;

  /**
   * True if sigma_L is very small (< 0.001), indicating
   * the user is essentially certain about the outcome
   */
  nearZeroSigma: boolean;

  /**
   * True if essentially all prior mass is on one side of threshold
   * (Phi(z) > 0.9999 or Phi(z) < 0.0001)
   */
  priorOneSided: boolean;
}
