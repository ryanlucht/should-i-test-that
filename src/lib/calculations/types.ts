/**
 * Type definitions for EVSI (Expected Value of Sample Information) calculations
 *
 * Per SPEC.md Section 4 (Notation) and Section 8 (Calculations):
 * All values should be in their canonical forms:
 * - Rates as decimals (0.032 not 3.2%)
 * - Lift as decimals (0.05 not 5%)
 */

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
 *
 * Warning codes:
 * - rare_events: Expected conversions per arm are low (<20), normal approximation unreliable
 * - high_rejection: High rejection rate (>10%) due to prior mass outside feasible bounds
 * - high_feasibility_rejection: Legacy alias for high_rejection
 * - invalid_cr0: CR0 is invalid (outside (0,1))
 */
export interface CalculationWarning {
  /** Machine-readable warning code */
  code: 'rare_events' | 'high_rejection' | 'high_feasibility_rejection' | 'invalid_cr0' | 'low_acceptance';
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
