/**
 * Cost of Delay (CoD) Calculation
 *
 * Calculates the opportunity cost of running an A/B test.
 * CoD penalizes waiting: the time spent testing plus decision latency
 * represents foregone value if the true effect is positive.
 *
 * Per SPEC.md Section A6:
 * "Every day spent running an A/B test is a day the feature is not generating
 * value for the full user base."
 *
 * Mathematical notes (for statistician audit):
 * - CoD only applies when default decision is Ship (mu_L >= T_L)
 * - During the test, only the control group foregoes the potential benefit
 * - During decision latency, everyone foregoes the benefit
 */

/**
 * Input parameters for Cost of Delay calculation
 */
export interface CoDInputs {
  /** K = N_year * CR0 * V (annual dollars per unit lift) */
  K: number;

  /** Prior mean of relative lift (decimal, e.g., 0.05 for 5%) */
  mu_L: number;

  /** Threshold in lift units (decimal, e.g., 0.05 for 5%) */
  threshold_L: number;

  /** Test duration in days */
  testDurationDays: number;

  /** Fraction of traffic assigned to variant (decimal, e.g., 0.5 for 50%) */
  variantFraction: number;

  /** Days between test completion and shipping decision */
  decisionLatencyDays: number;
}

/**
 * Results from Cost of Delay calculation
 */
export interface CoDResults {
  /** Total Cost of Delay in dollars */
  codDollars: number;

  /** Daily opportunity cost (EV_ship_day) in dollars */
  dailyOpportunityCost: number;

  /** Whether CoD applies (true if default decision is Ship) */
  codApplies: boolean;
}

/**
 * Calculate Cost of Delay for an A/B test
 *
 * CoD captures the penalty of waiting for test results before rolling out.
 *
 * Intuition:
 * - If we believe the change is good (mu_L >= T_L), we'd ship without testing
 * - During the test, control users don't get the benefit
 * - During decision latency, no one gets the benefit
 * - CoD = foregone value during test + foregone value during latency
 *
 * Per SPEC.md Section A6:
 *   EV_ship_annual = K * (mu_L - T_L)  // Expected annual value of shipping
 *   EV_ship_day = EV_ship_annual / 365 // Daily expected value
 *
 *   If default is Ship (mu_L >= T_L):
 *     CoD = (1 - f_var) * EV_ship_day * D_test  // Control foregone value during test
 *         + EV_ship_day * D_latency              // Everyone's foregone value during latency
 *
 *   If default is Don't Ship (mu_L < T_L):
 *     CoD = 0  // No opportunity cost of waiting
 *
 * @param inputs - CoD calculation parameters
 * @returns CoD results with total cost and breakdown
 */
export function calculateCostOfDelay(inputs: CoDInputs): CoDResults {
  const {
    K,
    mu_L,
    threshold_L,
    testDurationDays,
    variantFraction,
    decisionLatencyDays,
  } = inputs;

  // ===========================================
  // Step 1: Calculate expected value of shipping
  // ===========================================
  // EV_ship_annual = K * (mu_L - T_L)
  // This is the expected annual value from shipping the change
  // (can be negative if mu_L < T_L, but then CoD doesn't apply)
  const EV_ship_annual = K * (mu_L - threshold_L);

  // ===========================================
  // Step 2: Determine if CoD applies
  // ===========================================
  // CoD only applies when default decision is Ship (EV_ship_annual > 0)
  // When mu_L = T_L exactly, EV = 0, so no opportunity cost
  // (tie goes to Ship for decision, but zero expected benefit)
  const codApplies = EV_ship_annual > 0;

  if (!codApplies) {
    // Default decision is Don't Ship - no opportunity cost of waiting
    // Per SPEC.md A6: "If default decision is Don't ship: CoD_delay = 0"
    return {
      codDollars: 0,
      dailyOpportunityCost: 0,
      codApplies: false,
    };
  }

  // ===========================================
  // Step 3: Calculate daily expected value
  // ===========================================
  // EV_ship_day = EV_ship_annual / 365
  // This is the daily opportunity cost of not having the feature live
  const EV_ship_day = EV_ship_annual / 365;

  // ===========================================
  // Step 4: Calculate Cost of Delay
  // ===========================================
  // Two components:
  //
  // 1. During the test: control users don't get the benefit
  //    CoD_test = (1 - f_var) * EV_ship_day * D_test
  //    (only the control fraction foregoes value)
  //
  // 2. During decision latency: no one gets the benefit
  //    CoD_latency = EV_ship_day * D_latency
  //    (everyone foregoes value while waiting for decision)
  const controlFraction = 1 - variantFraction;
  const codDuringTest = controlFraction * EV_ship_day * testDurationDays;
  const codDuringLatency = EV_ship_day * decisionLatencyDays;

  const codDollars = codDuringTest + codDuringLatency;

  return {
    codDollars,
    dailyOpportunityCost: EV_ship_day,
    codApplies: true,
  };
}
