/**
 * Integrated Net Value of Testing Calculation
 *
 * Implements a single coherent Monte Carlo simulation that computes the
 * net value of running an A/B test, accounting for timing effects.
 *
 * Per audit recommendation (COD-01, COD-02, COD-03):
 * - Instead of computing EVSI and CoD separately and subtracting, this
 *   integrates timing into the simulation directly.
 * - Net Value = E[ValueWithTest] - E[ValueWithoutTest]
 * - This addresses the inconsistency where EVSI assumed full-year value
 *   while CoD used prior mean lift.
 *
 * Mathematical notes (for statistician audit):
 * - Net Value = E_L [ max(ValueWithTest(L), 0) - max(ValueWithoutTest(L), 0) ]
 * - ValueWithTest = ValueDuringTest + ValueDuringLatency + ValueAfterDecision
 * - ValueWithoutTest = K * (L - T) if default=ship, else 0
 * - Information cannot hurt, so net value is clamped to >= 0
 *
 * Three time periods modeled:
 * 1. Test period: variant fraction gets treatment, control gets nothing
 * 2. Latency period: conservative assumption - no one gets treatment
 * 3. Post-decision period: based on posterior decision (ship or don't ship)
 */

import { sample, cdf, getPriorMean } from './distributions';
import { computePosteriorMean } from './evsi';
import type { PriorDistribution } from './distributions';
import type { NetValueInputs, NetValueResults } from './types';

/**
 * Calculate baseline value (what happens without testing)
 *
 * Without a test, we use the default decision immediately for the full year.
 * This is our comparison point for net value.
 *
 * Mathematical basis:
 * - If default is Ship: Value = K * (L_true - T_L) for full year
 *   This can be negative if L_true < T_L (regret from wrong decision)
 * - If default is Don't Ship: Value = 0 for full year
 *   No regret, no gain (threshold defines baseline)
 *
 * @param L_true - The actual true lift
 * @param defaultDecision - What we'd do without testing
 * @param threshold_L - Threshold in lift units (T_L)
 * @param K - Annual dollars per unit lift
 * @returns Value relative to threshold baseline for full year
 */
export function calculateBaselineValue(
  L_true: number,
  defaultDecision: 'ship' | 'dont-ship',
  threshold_L: number,
  K: number
): number {
  if (defaultDecision === 'ship') {
    // Ship now: get full year of treatment value (relative to threshold)
    // K * (L_true - T_L) represents excess value above threshold
    // Can be negative if L_true < T_L (regret from shipping bad change)
    return K * (L_true - threshold_L);
  } else {
    // Don't ship: get nothing (threshold defines baseline)
    return 0;
  }
}

/**
 * Calculate total value for one Monte Carlo iteration (with testing)
 *
 * This computes the full value path when we run a test:
 * 1. Value during test (variant gets treatment, control doesn't)
 * 2. Value during latency (conservative: no one gets treatment)
 * 3. Value after decision (based on posterior decision)
 *
 * Mathematical basis:
 * - Period 1 (test): valueDuringTest = f_var * K * (L_true - T_L) * (D_test / 365)
 *   Only variant fraction receives treatment benefit during test
 *
 * - Period 2 (latency): valueDuringLatency = 0
 *   Conservative assumption: no treatment during decision period
 *   (Alternative: variant continues - could be user setting)
 *
 * - Period 3 (post-decision): depends on posteriorDecision
 *   If ship: K * (L_true - T_L) * remainingFraction
 *   If don't ship: 0
 *
 * @param L_true - The actual true lift
 * @param posteriorDecision - Decision made based on test result
 * @param params - Test parameters
 * @returns Breakdown of value across three periods
 */
export function calculateIterationValue(
  L_true: number,
  posteriorDecision: 'ship' | 'dont-ship',
  params: {
    threshold_L: number;
    K: number;
    variantFraction: number;
    testDurationDays: number;
    decisionLatencyDays: number;
  }
): {
  valueDuringTest: number;
  valueDuringLatency: number;
  valueAfterDecision: number;
  totalValue: number;
} {
  const {
    threshold_L,
    K,
    variantFraction,
    testDurationDays,
    decisionLatencyDays,
  } = params;

  // ===========================================
  // Time fractions (relative to 365-day year)
  // ===========================================
  // Each day is counted exactly once in one of three periods
  const testFraction = testDurationDays / 365;
  const latencyFraction = decisionLatencyDays / 365;
  // Remaining fraction can be 0 if test + latency >= 365 days
  const remainingFraction = Math.max(0, 1 - testFraction - latencyFraction);

  // ===========================================
  // Period 1: During test
  // ===========================================
  // Only the variant group receives treatment during the test.
  // Control group gets nothing (status quo).
  // Value = f_var * K * (L_true - T_L) * testFraction
  //
  // Note: This can be negative if L_true < T_L (variant getting bad treatment)
  // but that's correct - it's a cost during the test period.
  const valueDuringTest =
    variantFraction * K * (L_true - threshold_L) * testFraction;

  // ===========================================
  // Period 2: During latency
  // ===========================================
  // Conservative assumption: no one gets treatment during latency.
  // This models the time between test completion and shipping decision.
  // COD-02: valueDuringLatency = 0 (conservative)
  //
  // Alternative: could model "variant continues" policy where variant
  // group keeps getting treatment during latency. This would be:
  // const valueDuringLatency = variantFraction * K * (L_true - threshold_L) * latencyFraction;
  // Currently using conservative (0) per audit recommendation.
  const valueDuringLatency = 0;

  // ===========================================
  // Period 3: After decision (remaining year)
  // ===========================================
  // If posterior decision is Ship: full traffic gets treatment
  // If posterior decision is Don't Ship: no one gets treatment
  let valueAfterDecision: number;
  if (posteriorDecision === 'ship') {
    // Ship based on test result: get remaining fraction of annual value
    valueAfterDecision = K * (L_true - threshold_L) * remainingFraction;
  } else {
    // Don't ship based on test result: get nothing for remaining period
    valueAfterDecision = 0;
  }

  // Total value is sum of all three periods
  const totalValue = valueDuringTest + valueDuringLatency + valueAfterDecision;

  return {
    valueDuringTest,
    valueDuringLatency,
    valueAfterDecision,
    totalValue,
  };
}

/**
 * Calculate Net Value using integrated Monte Carlo simulation
 *
 * This is the main entry point for the integrated calculation.
 * Instead of computing EVSI and CoD separately, it simulates:
 * 1. Value with test (three periods: test, latency, post-decision)
 * 2. Value without test (default decision for full year)
 * 3. Net value = avgValueWithTest - avgValueWithoutTest
 *
 * Algorithm:
 * For each Monte Carlo iteration:
 *   a. Sample L_true from prior
 *   b. Feasibility check: reject if CR1 = CR0*(1+L) outside [0,1]
 *   c. Calculate valueWithoutTest (baseline using default decision)
 *   d. Simulate test outcome: L_hat = L_true + SE * z
 *   e. Compute posteriorMean via computePosteriorMean (Bayesian optimal)
 *   f. Make posterior decision based on posteriorMean >= threshold_L
 *   g. Calculate valueWithTest (three periods)
 *   h. Accumulate sums
 *
 * Net value = avgValueWithTest - avgValueWithoutTest
 * Clamped to max(0, netValue) because information can't hurt.
 *
 * @param inputs - Net value calculation parameters
 * @param numSamples - Number of Monte Carlo samples (default 5000)
 * @returns Net value results with supporting metrics
 */
export function calculateNetValueMonteCarlo(
  inputs: NetValueInputs,
  numSamples: number = 5000
): NetValueResults {
  const {
    K,
    baselineConversionRate,
    threshold_L,
    prior,
    n_control,
    n_variant,
    testDurationDays,
    variantFraction,
    decisionLatencyDays,
  } = inputs;

  // ===========================================
  // Step 1: Calculate measurement noise (standard error)
  // ===========================================
  // SE of lift estimate from A/B test
  // For relative lift L = (CR1 - CR0) / CR0:
  //   SE(L) = sqrt(CR0*(1-CR0) * (1/n_control + 1/n_variant)) / CR0
  //         = sqrt((1-CR0)/CR0 * (1/n_control + 1/n_variant))
  const CR0 = baselineConversionRate;

  // Handle zero sample size edge case
  const totalSamples = n_control + n_variant;
  if (totalSamples === 0) {
    // No data = no information = zero net value
    const priorMean = getPriorMean(prior);
    const defaultDecision = priorMean >= threshold_L ? 'ship' : 'dont-ship';
    const probClearsThreshold = 1 - cdf(threshold_L, prior);

    return {
      netValueDollars: 0,
      defaultDecision,
      probabilityClearsThreshold: probClearsThreshold,
      probabilityTestChangesDecision: 0,
      numSamples: 0,
      numRejected: 0,
    };
  }

  // Calculate SE for non-zero samples
  // SE^2 = (1-CR0)/CR0 * (1/n_control + 1/n_variant)
  const varianceFactor = (1 - CR0) / CR0;
  const sampleFactor = 1 / n_control + 1 / n_variant;
  const SE = Math.sqrt(varianceFactor * sampleFactor);

  // ===========================================
  // Step 2: Determine prior mean and default decision
  // ===========================================
  const priorMean = getPriorMean(prior);
  const defaultDecision = priorMean >= threshold_L ? 'ship' : 'dont-ship';

  // Probability of clearing threshold under prior
  const probClearsThreshold = 1 - cdf(threshold_L, prior);

  // ===========================================
  // Step 3: Feasibility bounds for lift
  // ===========================================
  // CR1 = CR0 * (1 + L) must be in [0, 1]
  // L_min = -1 (CR1 = 0)
  // L_max = (1/CR0) - 1 (CR1 = 1)
  const L_min = -1;
  const L_max = 1 / CR0 - 1;

  // ===========================================
  // Step 4: Monte Carlo simulation
  // ===========================================
  let sumValueWithTest = 0;
  let sumValueWithoutTest = 0;
  let validSamples = 0;
  let rejectedSamples = 0;
  let decisionChanges = 0;

  const maxIterations = numSamples * 10; // Cap to prevent infinite loops
  let iterations = 0;

  while (validSamples < numSamples && iterations < maxIterations) {
    iterations++;

    // Sample true lift from prior
    const L_true = sample(prior);

    // Feasibility check: CR1 must be in [0, 1]
    if (L_true < L_min || L_true > L_max) {
      rejectedSamples++;
      continue;
    }

    validSamples++;

    // ===========================================
    // Value WITHOUT test (use default decision)
    // ===========================================
    // This is the baseline: what happens if we don't test.
    // Apply default decision for the full year.
    const valueWithoutTest = calculateBaselineValue(
      L_true,
      defaultDecision,
      threshold_L,
      K
    );

    // ===========================================
    // Simulate test outcome
    // ===========================================
    // L_hat = L_true + noise, noise ~ N(0, SE)
    // Use Box-Muller for normal sampling
    // Guard against u1 = 0 which causes Math.log(0) = -Infinity -> NaN
    const u1 = Math.max(Math.random(), 1e-16);
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const L_hat = L_true + SE * z;

    // ===========================================
    // Make posterior decision based on test result
    // ===========================================
    // Compute posterior mean E[L|L_hat] for Bayesian decision rule
    // The posterior mean incorporates prior information, shrinking L_hat
    // toward the prior mean when the test data is noisy.
    const posteriorMean = computePosteriorMean(L_hat, SE, prior);

    // Decision based on POSTERIOR MEAN, not raw sample L_hat
    // E[L|L_hat] >= T is the correct Bayesian decision rule
    const posteriorDecision =
      posteriorMean >= threshold_L ? 'ship' : 'dont-ship';

    // Track decision changes
    if (posteriorDecision !== defaultDecision) {
      decisionChanges++;
    }

    // ===========================================
    // Value WITH test (three periods)
    // ===========================================
    const iterationValue = calculateIterationValue(L_true, posteriorDecision, {
      threshold_L,
      K,
      variantFraction,
      testDurationDays,
      decisionLatencyDays,
    });

    sumValueWithTest += iterationValue.totalValue;
    sumValueWithoutTest += valueWithoutTest;
  }

  // ===========================================
  // Guard: Handle zero valid samples edge case
  // ===========================================
  if (validSamples === 0) {
    return {
      netValueDollars: 0,
      defaultDecision,
      probabilityClearsThreshold: probClearsThreshold,
      probabilityTestChangesDecision: 0,
      numSamples: 0,
      numRejected: rejectedSamples,
    };
  }

  // ===========================================
  // Step 5: Calculate Net Value
  // ===========================================
  const avgValueWithoutTest = sumValueWithoutTest / validSamples;
  const avgValueWithTest = sumValueWithTest / validSamples;

  // Net Value = E[Value with test] - E[Value without test]
  // This is the coherent "EVSI - CoD" computed in one simulation
  let netValueDollars = avgValueWithTest - avgValueWithoutTest;

  // Net value should be non-negative (information can't hurt in expectation)
  // Small negative values can occur due to Monte Carlo variance
  netValueDollars = Math.max(0, netValueDollars);

  const probabilityTestChangesDecision = decisionChanges / validSamples;

  return {
    netValueDollars,
    defaultDecision,
    probabilityClearsThreshold: probClearsThreshold,
    probabilityTestChangesDecision,
    numSamples: validSamples,
    numRejected: rejectedSamples,
  };
}
