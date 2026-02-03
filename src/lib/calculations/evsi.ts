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
 * EVSI-01 Correctness (Phase 8):
 * - Monte Carlo uses posterior mean E[L|L_hat] for decisions, not raw L_hat
 * - This Bayesian decision rule correctly accounts for shrinkage toward prior
 * - Ensures Monte Carlo and Normal fast-path produce consistent results
 *
 * Mathematical notes (for statistician audit):
 * - EVSI = E_data[ max_a E[Value(a) | data] ] - max_a E[Value(a)]
 *        = (pre-posterior expected value) - (prior expected value)
 * - For binary decisions (ship/don't ship), this simplifies to comparing
 *   expected regret with and without the test information
 * - The test is modeled as providing a noisy observation of true lift:
 *   L_hat | L ~ N(L, SE^2) where SE depends on sample sizes and CR0
 * - Posterior decision uses E[L|L_hat] >= T (Bayes-optimal rule)
 */

import { sample, cdf, getPriorMean, pdf, PriorDistribution } from './distributions';
import { standardNormalPDF, standardNormalCDF } from './statistics';
import { normalPdf, seOfRelativeLift, sampleStandardNormal } from './abtest-math';
import { determineDefaultDecision } from './derived';
import type { EVSIInputs, EVSIResults, CalculationWarning } from './types';

/**
 * Compute posterior mean E[L|L_hat] via grid integration for non-conjugate priors.
 *
 * This function numerically integrates to compute the expected value of true lift
 * given an observed sample estimate, for priors where conjugate updates don't apply.
 *
 * Mathematical basis (Bayes' theorem):
 * - Posterior: p(L|L_hat) ∝ p(L_hat|L) * p(L)
 * - E[L|L_hat] = ∫ L * p(L|L_hat) dL = Σ(L_i * w_i) / Σ(w_i)
 * - where w_i = prior_pdf(L_i) * likelihood_pdf(L_hat; L_i, SE)
 *
 * Per Accuracy-07: Grid upper bound is clamped to feasibility bound L <= 1/CR0 - 1
 *
 * @param L_hat - Observed sample estimate from simulated test
 * @param SE - Standard error of the estimate
 * @param prior - Prior distribution (Student-t or Uniform)
 * @param CR0 - Baseline conversion rate (for feasibility upper bound)
 * @param gridSize - Number of grid points (default 200)
 * @returns E[L|L_hat] - posterior mean of true lift given data
 */
function computePosteriorMeanGrid(
  L_hat: number,
  SE: number,
  prior: PriorDistribution,
  CR0: number,
  gridSize: number = 200
): number {
  // ===========================================
  // Step 1: Determine grid bounds from prior type
  // ===========================================
  // Grid must cover feasible L values: L >= -1 (CR1 >= 0)
  // Upper bound depends on prior support and feasibility constraint
  let L_min: number;
  let L_max: number;

  // Feasibility upper bound: CR1 = CR0 * (1 + L) <= 1, so L <= 1/CR0 - 1
  const feasibleMax = 1 / CR0 - 1;

  if (prior.type === 'uniform') {
    // Uniform has explicit bounds - use them directly, clamped to feasibility
    L_min = Math.max(-1, prior.low_L!);
    L_max = Math.min(prior.high_L!, feasibleMax);
  } else if (prior.type === 'student-t') {
    // Student-t is unbounded but we use practical bounds
    // Center around prior mean, extend by 6 scale parameters
    // This provides practical coverage for numerical integration
    // (exact coverage depends on df; heavier tails = less coverage)
    // Per Accuracy-07: Clamp upper bound to feasibility constraint
    const mu = prior.mu_L!;
    const sigma = prior.sigma_L!;
    L_min = Math.max(-1, mu - 6 * sigma);
    L_max = Math.min(mu + 6 * sigma, feasibleMax);
  } else {
    // Fallback for any other type (shouldn't reach here)
    L_min = -1;
    L_max = Math.min(2, feasibleMax);
  }

  const gridStep = (L_max - L_min) / gridSize;

  // ===========================================
  // Step 2: Compute unnormalized posterior weights at each grid point
  // ===========================================
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i <= gridSize; i++) {
    const L = L_min + i * gridStep;

    // Prior PDF at this L value (from distributions.ts)
    const priorPDF = pdf(L, prior);
    if (priorPDF <= 0) continue; // Skip zero-probability regions

    // Likelihood: L_hat | L ~ N(L, SE^2)
    // This is the probability of observing L_hat given true lift L
    // Uses normalPdf from abtest-math (replaces jStat.normal.pdf)
    const likelihoodPDF = normalPdf(L_hat, L, SE);

    // Unnormalized posterior weight: p(L|L_hat) ∝ p(L_hat|L) * p(L)
    const weight = priorPDF * likelihoodPDF;

    // Accumulate for weighted mean calculation
    weightedSum += L * weight;
    totalWeight += weight;
  }

  // ===========================================
  // Step 3: Return posterior mean = weighted average
  // ===========================================
  // E[L|L_hat] = Σ(L * weight) / Σ(weight)
  if (totalWeight === 0) {
    // Edge case: no probability mass found - fall back to prior mean
    // This can happen if likelihood is extremely narrow and misses all grid points
    return getPriorMean(prior);
  }

  return weightedSum / totalWeight;
}

/**
 * Compute E[L|L_hat] - the posterior mean given observed sample estimate.
 *
 * This is the key function for fixing EVSI-01/02/03. Instead of deciding based
 * on the raw sample estimate L_hat, the Bayesian decision rule uses the
 * posterior mean E[L|L_hat], which incorporates prior information.
 *
 * Mathematical basis:
 * - For Normal prior with Normal likelihood (conjugate case):
 *   Posterior mean = w * L_hat + (1-w) * mu_prior
 *   where w = sigma_prior^2 / (sigma_prior^2 + SE^2) is the shrinkage weight
 *
 * - For non-Normal priors (Student-t, Uniform):
 *   Posterior mean computed via grid-based numerical integration
 *
 * Interpretation of shrinkage weight w:
 * - When SE is small (precise test), w → 1, posterior mean → L_hat
 * - When SE is large (noisy test), w → 0, posterior mean → mu_prior
 *
 * @param L_hat - Observed sample estimate from simulated test
 * @param SE - Standard error of the estimate
 * @param prior - Prior distribution
 * @param CR0 - Baseline conversion rate (optional, for grid feasibility bound)
 * @returns E[L|L_hat] - posterior mean of true lift given data
 */
export function computePosteriorMean(
  L_hat: number,
  SE: number,
  prior: PriorDistribution,
  CR0: number = 0.5
): number {
  if (prior.type === 'normal') {
    // ===========================================
    // Closed-form for Normal-Normal conjugacy
    // ===========================================
    // Source: https://stephens999.github.io/fiveMinuteStats/bayes_conjugate_normal_mean.html
    const sigma_prior = prior.sigma_L!;
    const mu_prior = prior.mu_L!;

    // Shrinkage weight: w = prior_variance / (prior_variance + data_variance)
    // This determines how much to trust the data (L_hat) vs the prior
    const prior_variance = sigma_prior * sigma_prior;
    const data_variance = SE * SE;

    // Handle edge case: sigma_prior = 0 (point mass prior)
    // w = 0 / (0 + SE^2) = 0, so posterior mean = mu_prior
    if (prior_variance === 0) {
      return mu_prior;
    }

    const w = prior_variance / (prior_variance + data_variance);

    // Posterior mean: weighted average of data and prior mean
    // E[L|L_hat] = w * L_hat + (1-w) * mu_prior
    return w * L_hat + (1 - w) * mu_prior;
  }

  // ===========================================
  // Grid integration for non-conjugate priors (Student-t, Uniform)
  // ===========================================
  return computePosteriorMeanGrid(L_hat, SE, prior, CR0);
}

/**
 * Calculate EVSI using Monte Carlo simulation
 *
 * Algorithm (per SPEC.md A5.1):
 * 1. For each Monte Carlo iteration:
 *    a. Sample true lift L_i from prior
 *    b. Feasibility check: reject if CR1 = CR0*(1+L) outside [0,1]
 *    c. Calculate value without test (based on default decision)
 *    d. Simulate observed lift: L_hat = L_i + noise, where noise ~ N(0, SE)
 *    e. Compute posteriorMean = E[L | L_hat] (Bayesian shrinkage estimate)
 *    f. Make posterior decision (ship if posteriorMean >= threshold)
 *    g. Calculate value with test
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
  // Step 1: Input validation guards (Accuracy-01, Accuracy-02)
  // ===========================================
  const CR0 = baselineConversionRate;

  // Guard: One-arm-zero produces Infinity in SE formula (1/0)
  // This can happen when Math.floor() in sample-size derivation produces 0
  if (n_control <= 0 || n_variant <= 0) {
    const priorMean = getPriorMean(prior);
    const defaultDecision = determineDefaultDecision(priorMean, threshold_L);
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

  // Guard: CR0 must be strictly in (0, 1)
  // CR0=0 causes division by zero in SE formula
  // CR0=1 collapses feasibility bounds (L_max = 0)
  if (!(CR0 > 0 && CR0 < 1)) {
    const priorMean = getPriorMean(prior);
    const defaultDecision = determineDefaultDecision(priorMean, threshold_L);

    return {
      evsiDollars: 0,
      defaultDecision,
      probabilityClearsThreshold: 0.5, // Indeterminate
      probabilityTestChangesDecision: 0,
      numSamples: 0,
      numRejected: 0,
    };
  }

  // ===========================================
  // Step 2: Calculate measurement noise (standard error)
  // ===========================================
  // SE of lift estimate from A/B test
  // For relative lift L = (CR1 - CR0) / CR0:
  //   SE(L) = sqrt(CR0*(1-CR0) * (1/n_control + 1/n_variant)) / CR0
  //
  // This is derived from the delta method applied to the ratio of binomials

  // Calculate SE using shared seOfRelativeLift
  // SE = sqrt((1-CR0)/CR0 * (1/n_control + 1/n_variant))
  const SE = seOfRelativeLift(CR0, n_control, n_variant);

  // ===========================================
  // Step 2.5: Check for rare events warning (Accuracy-08)
  // ===========================================
  // The Normal approximation for lift becomes unreliable when expected
  // conversions per arm are low (<20). Warn user to consider alternatives.
  // Threshold condition: min(n_control * CR0, n_variant * CR0) < 20
  const warnings: CalculationWarning[] = [];
  const expectedConvControl = n_control * CR0;
  const expectedConvVariant = n_variant * CR0;
  const minExpectedConversions = Math.min(expectedConvControl, expectedConvVariant);

  if (minExpectedConversions < 20) {
    warnings.push({
      code: 'rare_events',
      message:
        'Expected conversions per group are low (<20). The normal approximation for lift may be less accurate. Consider increasing test duration or traffic.',
    });
  }

  // ===========================================
  // Step 3: Determine prior mean and default decision
  // ===========================================
  const priorMean = getPriorMean(prior);
  const defaultDecision = determineDefaultDecision(priorMean, threshold_L);

  // Probability of clearing threshold under prior
  const probClearsThreshold = 1 - cdf(threshold_L, prior);

  // ===========================================
  // Step 4: Feasibility bounds for lift
  // ===========================================
  // CR1 = CR0 * (1 + L) must be in [0, 1]
  // L_min = -1 (CR1 = 0)
  // L_max = (1/CR0) - 1 (CR1 = 1)
  const L_min = -1;
  const L_max = 1 / CR0 - 1;

  // ===========================================
  // Step 5: Monte Carlo simulation
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
    // Uses shared sampleStandardNormal (Box-Muller with guard against log(0))
    const z = sampleStandardNormal();
    const L_hat = L_true + SE * z;

    // ===========================================
    // Make posterior decision based on test result
    // ===========================================
    // EVSI-01 FIX: Compute posterior mean E[L|L_hat] for Bayesian decision rule
    // The posterior mean incorporates prior information, shrinking L_hat toward
    // the prior mean when the test data is noisy (large SE relative to prior sigma).
    // This is the Bayes-optimal decision rule for the linear utility model.
    // CR0 is passed to enforce feasibility upper bound in grid integration (Accuracy-07)
    const posteriorMean = computePosteriorMean(L_hat, SE, prior, CR0);

    // Decision based on POSTERIOR MEAN, not raw sample L_hat
    // E[L|L_hat] >= T is the correct Bayesian decision rule
    const posteriorDecision = posteriorMean >= threshold_L ? 'ship' : 'dont-ship';

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
  // Step 6: Handle zero valid samples edge case
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
      ...(warnings.length > 0 && { warnings }),
    };
  }

  // ===========================================
  // Step 7: Calculate EVSI
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
    ...(warnings.length > 0 && { warnings }),
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
  const CR0 = baselineConversionRate;

  // ===========================================
  // Input validation guards (Accuracy-01, Accuracy-02)
  // ===========================================

  // Guard: One-arm-zero produces Infinity in SE formula (1/0)
  if (n_control <= 0 || n_variant <= 0) {
    const defaultDecision = determineDefaultDecision(mu_prior, threshold_L);
    // Handle sigma_prior = 0 edge case for probClearsThreshold
    const probClearsThreshold = sigma_prior === 0
      ? (mu_prior >= threshold_L ? 1 : 0)
      : 1 - standardNormalCDF((threshold_L - mu_prior) / sigma_prior);

    return {
      evsiDollars: 0,
      defaultDecision,
      probabilityClearsThreshold: probClearsThreshold,
      probabilityTestChangesDecision: 0,
    };
  }

  // Guard: CR0 must be strictly in (0, 1)
  // CR0=0 causes division by zero in SE formula
  // CR0=1 collapses feasibility bounds
  if (!(CR0 > 0 && CR0 < 1)) {
    const defaultDecision = determineDefaultDecision(mu_prior, threshold_L);

    return {
      evsiDollars: 0,
      defaultDecision,
      probabilityClearsThreshold: 0.5, // Indeterminate
      probabilityTestChangesDecision: 0,
    };
  }

  // ===========================================
  // Step 1: Calculate measurement precision (1/SE^2)
  // ===========================================
  const varianceFactor = (1 - CR0) / CR0;
  const sampleFactor = 1 / n_control + 1 / n_variant;
  const SE_squared = varianceFactor * sampleFactor;
  const data_precision = 1 / SE_squared; // 1/SE^2

  // ===========================================
  // Step 1.5: Check for rare events warning (Accuracy-08)
  // ===========================================
  // The Normal approximation for lift becomes unreliable when expected
  // conversions per arm are low (<20). Warn user to consider alternatives.
  // Threshold condition: min(n_control * CR0, n_variant * CR0) < 20
  const warnings: CalculationWarning[] = [];
  const expectedConvControl = n_control * CR0;
  const expectedConvVariant = n_variant * CR0;
  const minExpectedConversions = Math.min(expectedConvControl, expectedConvVariant);

  if (minExpectedConversions < 20) {
    warnings.push({
      code: 'rare_events',
      message:
        'Expected conversions per group are low (<20). The normal approximation for lift may be less accurate. Consider increasing test duration or traffic.',
    });
  }

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
  const defaultDecision = determineDefaultDecision(mu_prior, threshold_L);

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
    ...(warnings.length > 0 && { warnings }),
  };
}
