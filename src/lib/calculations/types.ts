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

  /** T_L = threshold in lift units (decimal) */
  threshold_L: number;

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

/**
 * Import PriorDistribution from distributions module for EVSI
 */
import type { PriorDistribution } from './distributions';
export type { PriorDistribution };

/**
 * Input parameters for EVSI calculation
 *
 * EVSI (Expected Value of Sample Information) values the specific
 * A/B test you can actually run, accounting for sample size and noise.
 *
 * Per SPEC.md Section A4-A5 (Pre-posterior analysis)
 */
export interface EVSIInputs {
  /** K = N_year * CR0 * V (annual dollars per unit lift) */
  K: number;

  /** Baseline conversion rate (CR0) as decimal, e.g., 0.032 for 3.2% */
  baselineConversionRate: number;

  /** Threshold in lift units (T_L) as decimal, e.g., 0.05 for 5% */
  threshold_L: number;

  /** Prior distribution parameters */
  prior: PriorDistribution;

  /** Sample size in control group */
  n_control: number;

  /** Sample size in variant group */
  n_variant: number;
}

/**
 * Warning about calculation reliability or approximation limits
 *
 * Per Accuracy-08: Users should be informed when statistical approximations
 * may be unreliable, so they can adjust their expectations or use alternative methods.
 */
export interface CalculationWarning {
  /** Machine-readable warning code */
  code: 'rare_events' | 'high_feasibility_rejection' | 'invalid_cr0';
  /** Human-readable warning message */
  message: string;
}

/**
 * Results from EVSI calculation
 *
 * Contains the primary result (evsiDollars) along with supporting
 * metrics for display and decision analysis.
 */
export interface EVSIResults {
  /** EVSI in annual dollars - the headline result */
  evsiDollars: number;

  /** Default decision based on prior mean vs threshold */
  defaultDecision: 'ship' | 'dont-ship';

  /** P(L >= T_L) - probability the true lift clears threshold (under prior) */
  probabilityClearsThreshold: number;

  /** Probability the test changes the decision from the default */
  probabilityTestChangesDecision: number;

  /** Number of Monte Carlo samples used (for diagnostics) */
  numSamples?: number;

  /** Number of samples rejected for feasibility (CR1 outside [0,1]) */
  numRejected?: number;

  /** Warnings about calculation reliability */
  warnings?: CalculationWarning[];
}

/**
 * Input parameters for integrated Net Value calculation
 *
 * Net Value computes the value of testing in one coherent simulation,
 * accounting for value during test period (split traffic) and latency period.
 *
 * Per audit recommendation (COD-01, COD-02, COD-03):
 * Instead of computing EVSI and CoD separately, this integrates timing
 * into a single Monte Carlo simulation.
 *
 * Mathematical basis:
 * - Net Value = E[ValueWithTest] - E[ValueWithoutTest]
 * - ValueWithTest accounts for: test period, latency period, post-decision period
 * - ValueWithoutTest uses default decision for full year
 */
export interface NetValueInputs {
  /** K = N_year * CR0 * V (annual dollars per unit lift) */
  K: number;

  /** Baseline conversion rate (CR0) as decimal, e.g., 0.032 for 3.2% */
  baselineConversionRate: number;

  /** Threshold in lift units (T_L) as decimal, e.g., 0.05 for 5% */
  threshold_L: number;

  /** Prior distribution parameters */
  prior: PriorDistribution;

  /** Sample size in control group */
  n_control: number;

  /** Sample size in variant group */
  n_variant: number;

  /** Test duration in days */
  testDurationDays: number;

  /** Fraction of traffic assigned to variant (decimal, e.g., 0.5 for 50%) */
  variantFraction: number;

  /** Days between test completion and shipping decision */
  decisionLatencyDays: number;
}

/**
 * Results from integrated Net Value calculation
 *
 * Contains the primary result (netValueDollars) along with supporting
 * metrics for display and decision analysis.
 */
export interface NetValueResults {
  /**
   * Net value of testing in dollars - the headline result.
   * CAN BE NEGATIVE when testing delays rollout of a beneficial change
   * or exposes users to harm during the test period.
   */
  netValueDollars: number;

  /**
   * Maximum amount you should pay for a test (clamped to >= 0).
   * Use this for "test budget" calculations. Derived from netValueDollars.
   */
  maxTestBudgetDollars: number;

  /** Default decision based on prior mean vs threshold */
  defaultDecision: 'ship' | 'dont-ship';

  /** P(L >= T_L) - probability the true lift clears threshold (under prior) */
  probabilityClearsThreshold: number;

  /** Probability the test changes the decision from the default */
  probabilityTestChangesDecision: number;

  /** Number of Monte Carlo samples used (for diagnostics) */
  numSamples?: number;

  /** Number of samples rejected for feasibility (CR1 outside [0,1]) */
  numRejected?: number;

  /** Warnings about calculation reliability */
  warnings?: CalculationWarning[];
}
