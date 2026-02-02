/**
 * EVSI (Expected Value of Sample Information) Calculation
 *
 * Implements pre-posterior analysis to value an A/B test as imperfect information.
 * EVSI quantifies how much the test result is expected to improve decisions.
 *
 * Per SPEC.md Sections A4-A5:
 * - Monte Carlo: works for all prior shapes (Normal, Student-t, Uniform)
 * - Normal fast path: O(1) closed-form for Normal priors using conjugate update
 *
 * Mathematical notes (for statistician audit):
 * - EVSI = E_data[ max_a E[Value(a) | data] ] - max_a E[Value(a)]
 *        = (pre-posterior expected value) - (prior expected value)
 * - For binary decisions (ship/don't ship), this simplifies to comparing
 *   expected regret with and without the test information
 * - The test is modeled as providing a noisy observation of true lift:
 *   L_hat | L ~ N(L, SE^2) where SE depends on sample sizes and CR0
 */

import { sample, cdf, getPriorMean } from './distributions';
import { standardNormalPDF, standardNormalCDF } from './statistics';
import type { EVSIInputs, EVSIResults } from './types';

/**
 * Calculate EVSI using Monte Carlo simulation
 *
 * Algorithm (per SPEC.md A5.1):
 * 1. For each Monte Carlo iteration:
 *    a. Sample true lift L_i from prior
 *    b. Feasibility check: reject if CR1 = CR0*(1+L) outside [0,1]
 *    c. Calculate value without test (based on default decision)
 *    d. Simulate observed lift: L_hat = L_i + noise, where noise ~ N(0, SE)
 *    e. Make posterior decision (ship if L_hat >= threshold)
 *    f. Calculate value with test
 * 2. EVSI = avg(value_with_test) - avg(value_without_test)
 *
 * Feasibility constraint:
 * - CR1 = CR0 * (1 + L) must be in [0, 1]
 * - This means L must be in [-1, (1/CR0) - 1]
 * - Samples violating this are rejected and resampled
 *
 * @param inputs - EVSI calculation parameters
 * @param numSamples - Number of Monte Carlo samples (default 5000)
 * @returns EVSI results with supporting metrics
 */
export function calculateEVSIMonteCarlo(
  inputs: EVSIInputs,
  numSamples: number = 5000
): EVSIResults {
  const { K, baselineConversionRate, threshold_L, prior, n_control, n_variant } =
    inputs;

  // ===========================================
  // Step 1: Calculate measurement noise (standard error)
  // ===========================================
  // SE of lift estimate from A/B test
  // For relative lift L = (CR1 - CR0) / CR0:
  //   SE(L) = sqrt(CR0*(1-CR0) * (1/n_control + 1/n_variant)) / CR0
  //
  // This is derived from the delta method applied to the ratio of binomials
  const CR0 = baselineConversionRate;

  // Handle zero sample size edge case
  const totalSamples = n_control + n_variant;
  if (totalSamples === 0) {
    // No data = no information = EVSI = 0
    const priorMean = getPriorMean(prior);
    const defaultDecision = priorMean >= threshold_L ? 'ship' : 'dont-ship';
    const probClearsThreshold = 1 - cdf(threshold_L, prior);

    return {
      evsiDollars: 0,
      defaultDecision,
      probabilityClearsThreshold: probClearsThreshold,
      probabilityTestChangesDecision: 0,
      numSamples: 0,
      numRejected: 0,
    };
  }

  // Calculate SE for non-zero samples
  // SE^2 = CR0*(1-CR0) * (1/n_control + 1/n_variant) / CR0^2
  //      = (1-CR0)/CR0 * (1/n_control + 1/n_variant)
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
  let sumValueWithoutTest = 0;
  let sumValueWithTest = 0;
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
    // Value is measured relative to the threshold because:
    // - Shipping when L_true > T_L gives positive value (correct decision)
    // - Shipping when L_true < T_L gives negative value (regret)
    // - Not shipping always gives 0 (threshold is our baseline)
    // This aligns with the EVPI formula which uses threshold-relative calculations.
    let valueWithoutTest: number;
    if (defaultDecision === 'ship') {
      // We ship, get value relative to threshold baseline
      // Value = K * (L_true - T_L) represents excess value above threshold
      valueWithoutTest = K * (L_true - threshold_L);
    } else {
      // We don't ship, get 0 (threshold defines our baseline)
      valueWithoutTest = 0;
    }

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
    // Simple decision rule: ship if L_hat >= T_L
    // (This is the optimal decision given the observed data and
    // Normal-Normal conjugacy assumption)
    const posteriorDecision = L_hat >= threshold_L ? 'ship' : 'dont-ship';

    // Track decision changes
    if (posteriorDecision !== defaultDecision) {
      decisionChanges++;
    }

    // ===========================================
    // Value WITH test (use posterior decision)
    // ===========================================
    // Same threshold-relative calculation as valueWithoutTest
    let valueWithTest: number;
    if (posteriorDecision === 'ship') {
      // Ship based on test result, get threshold-relative value
      valueWithTest = K * (L_true - threshold_L);
    } else {
      // Don't ship based on test result
      valueWithTest = 0;
    }

    sumValueWithoutTest += valueWithoutTest;
    sumValueWithTest += valueWithTest;
  }

  // ===========================================
  // Guard: Handle zero valid samples edge case
  // ===========================================
  // If feasibility filter rejected all draws (e.g., very tight CR0 constraints
  // with wide prior), validSamples can be 0. Return safe "no information" result.
  if (validSamples === 0) {
    return {
      evsiDollars: 0,
      defaultDecision,
      probabilityClearsThreshold: probClearsThreshold,
      probabilityTestChangesDecision: 0,
      numSamples: 0,
      numRejected: rejectedSamples,
    };
  }

  // ===========================================
  // Step 5: Calculate EVSI
  // ===========================================
  const avgValueWithoutTest = sumValueWithoutTest / validSamples;
  const avgValueWithTest = sumValueWithTest / validSamples;

  // EVSI = E[Value with test] - E[Value without test]
  let evsiDollars = avgValueWithTest - avgValueWithoutTest;

  // EVSI should be non-negative (information can't hurt in expectation)
  // Small negative values can occur due to Monte Carlo variance
  evsiDollars = Math.max(0, evsiDollars);

  const probabilityTestChangesDecision = decisionChanges / validSamples;

  return {
    evsiDollars,
    defaultDecision,
    probabilityClearsThreshold: probClearsThreshold,
    probabilityTestChangesDecision,
    numSamples: validSamples,
    numRejected: rejectedSamples,
  };
}

/**
 * Calculate EVSI using closed-form Normal fast path
 *
 * For Normal priors, EVSI has a closed-form solution using conjugate updates.
 *
 * Per SPEC.md A5.2 (Normal-Normal approximation):
 * - Prior: L ~ N(mu_prior, sigma_prior^2)
 * - Likelihood: L_hat | L ~ N(L, SE^2)
 * - Posterior: L | L_hat ~ N(mu_post, sigma_post^2)
 *
 * The key insight is that before seeing data, we can compute the
 * "pre-posterior" distribution - what we expect the posterior to look like.
 *
 * Pre-posterior sigma:
 *   sigma_preposterior^2 = sigma_prior^2 - sigma_post^2
 *   where sigma_post^2 = 1 / (1/sigma_prior^2 + 1/SE^2)
 *
 * EVSI then uses the same formula as EVPI but with pre-posterior sigma:
 *   EVSI = K * sigma_preposterior * phi(z_preposterior)
 *   (when threshold = prior mean, simplified formula)
 *
 * For general case, use full EVPI-style formula with pre-posterior sigma.
 *
 * @param inputs - EVSI calculation parameters (must have Normal prior)
 * @returns EVSI results
 */
export function calculateEVSINormalFastPath(inputs: EVSIInputs): EVSIResults {
  const { K, baselineConversionRate, threshold_L, prior, n_control, n_variant } =
    inputs;

  // Validate Normal prior
  if (prior.type !== 'normal') {
    throw new Error('Normal fast path requires Normal prior');
  }

  const mu_prior = prior.mu_L!;
  const sigma_prior = prior.sigma_L!;

  // Handle zero sample size
  const totalSamples = n_control + n_variant;
  if (totalSamples === 0) {
    const defaultDecision = mu_prior >= threshold_L ? 'ship' : 'dont-ship';
    const probClearsThreshold = 1 - standardNormalCDF((threshold_L - mu_prior) / sigma_prior);

    return {
      evsiDollars: 0,
      defaultDecision,
      probabilityClearsThreshold: probClearsThreshold,
      probabilityTestChangesDecision: 0,
    };
  }

  // ===========================================
  // Step 1: Calculate measurement precision (1/SE^2)
  // ===========================================
  const CR0 = baselineConversionRate;
  const varianceFactor = (1 - CR0) / CR0;
  const sampleFactor = 1 / n_control + 1 / n_variant;
  const SE_squared = varianceFactor * sampleFactor;
  const data_precision = 1 / SE_squared; // 1/SE^2

  // ===========================================
  // Step 2: Calculate prior precision
  // ===========================================
  const prior_precision = 1 / (sigma_prior * sigma_prior);

  // ===========================================
  // Step 3: Calculate posterior precision
  // ===========================================
  // Conjugate update: posterior_precision = prior_precision + data_precision
  // Note: sigma_post^2 = 1 / posterior_precision (used conceptually, not directly)
  const posterior_precision = prior_precision + data_precision;

  // ===========================================
  // Step 4: Calculate pre-posterior sigma
  // ===========================================
  // The pre-posterior is the marginal distribution of the posterior mean
  // before observing data. Its variance is the reduction in variance.
  //
  // sigma_preposterior^2 = sigma_prior^2 - sigma_post^2
  //                      = data_precision / (prior_precision * posterior_precision)
  //
  // Alternatively: sigma_preposterior = sigma_prior * sqrt(data_precision / posterior_precision)
  const sigma_preposterior = sigma_prior * Math.sqrt(data_precision / posterior_precision);

  // ===========================================
  // Step 5: Calculate EVSI using EVPI formula with pre-posterior sigma
  // ===========================================
  // This is the key insight: EVSI for Normal-Normal is equivalent to
  // EVPI calculated with the pre-posterior sigma instead of prior sigma.
  //
  // z = (T_L - mu_prior) / sigma_preposterior
  // (Using prior mean because pre-posterior mean = prior mean)
  const z = (threshold_L - mu_prior) / sigma_preposterior;
  const phiZ = standardNormalPDF(z);
  const PhiZ = standardNormalCDF(z);

  // Default decision based on prior mean vs threshold
  const defaultDecision = mu_prior >= threshold_L ? 'ship' : 'dont-ship';

  // Calculate EVSI using same formula structure as EVPI
  let evsiDollars: number;
  if (defaultDecision === 'ship') {
    // EVSI = K * [ (T_L - mu) * Phi(z) + sigma_pre * phi(z) ]
    evsiDollars = K * ((threshold_L - mu_prior) * PhiZ + sigma_preposterior * phiZ);
  } else {
    // EVSI = K * [ (mu - T_L) * (1 - Phi(z)) + sigma_pre * phi(z) ]
    evsiDollars = K * ((mu_prior - threshold_L) * (1 - PhiZ) + sigma_preposterior * phiZ);
  }

  // Clamp to non-negative (floating point safety)
  evsiDollars = Math.max(0, evsiDollars);

  // Probability of clearing threshold under prior
  const z_prior = (threshold_L - mu_prior) / sigma_prior;
  const probClearsThreshold = 1 - standardNormalCDF(z_prior);

  // Probability test changes decision (approximate)
  // This is roughly the probability that the posterior decision differs from prior
  // For Normal, this is related to the probability of the posterior mean
  // crossing the threshold when the prior mean is on one side.
  const probabilityTestChangesDecision = defaultDecision === 'ship' ? PhiZ : (1 - PhiZ);

  return {
    evsiDollars,
    defaultDecision,
    probabilityClearsThreshold: probClearsThreshold,
    probabilityTestChangesDecision,
  };
}
