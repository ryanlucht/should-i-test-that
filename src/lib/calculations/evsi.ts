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

import { sample, cdf, getPriorMean, pdf } from './distributions';
import type { PriorDistribution } from './distributions';
import { standardNormalPDF, standardNormalCDF } from './statistics';
import { normalPdf, seOfRelativeLift, sampleStandardNormal, liftFeasibilityBounds } from './abtest-math';
import { determineDefaultDecision } from './derived';
import type { EVSIInputs, EVSIResults, CalculationWarning } from './types';

/**
 * Compute effective prior metrics under feasibility truncation.
 *
 * Per Controversial B: Monte Carlo EVSI/NetValue use rejection sampling
 * to enforce L in [-1, 1/CR0-1]. This means the simulation effectively
 * operates on a truncated prior. For consistency, we should display
 * metrics (mean, probClearsThreshold) from the same truncated prior.
 *
 * This function uses Monte Carlo to compute these metrics using the same
 * feasibility bounds as the main simulation, ensuring consistency.
 *
 * @param prior - Prior distribution
 * @param threshold_L - Decision threshold in lift units
 * @param CR0 - Baseline conversion rate (determines L_max)
 * @param numSamples - Number of Monte Carlo samples (default 2000)
 * @returns Effective prior metrics under feasibility truncation
 */
export function computeEffectivePriorMetrics(
  prior: PriorDistribution,
  threshold_L: number,
  CR0: number,
  numSamples: number = 2000
): { effectivePriorMean: number; effectiveProbClears: number } {
  // Feasibility bounds for lift (via shared helper)
  // CR1 = CR0 * (1 + L) must be in [0, 1]
  // L_min = -1 (CR1 = 0), L_max = (1/CR0) - 1 (CR1 = 1)
  const { L_min, L_max } = liftFeasibilityBounds(CR0);

  let sumL = 0;
  let countExceedsThreshold = 0;
  let accepted = 0;
  const maxIterations = numSamples * 10;
  let iterations = 0;

  while (accepted < numSamples && iterations < maxIterations) {
    iterations++;
    const L = sample(prior);

    // Apply same feasibility filter as main simulation
    if (L < L_min || L > L_max) continue;

    accepted++;
    sumL += L;
    if (L >= threshold_L) countExceedsThreshold++;
  }

  // Fallback if all samples rejected (degenerate case)
  // Return untruncated metrics since we can't compute effective metrics
  if (accepted === 0) {
    return {
      effectivePriorMean: getPriorMean(prior),
      effectiveProbClears: 1 - cdf(threshold_L, prior),
    };
  }

  return {
    effectivePriorMean: sumL / accepted,
    effectiveProbClears: countExceedsThreshold / accepted,
  };
}

/**
 * Compute mean of a Normal distribution truncated to [a, b].
 *
 * For Uniform prior U[a,b] with Normal likelihood N(L_hat, SE^2),
 * the posterior is proportional to Normal truncated to [a, b].
 * This is faster and more accurate than grid approximation.
 *
 * Mathematical formula (Wikipedia: Truncated normal distribution):
 *   E[X | a <= X <= b] = mu + sigma * (phi(alpha) - phi(beta)) / (Phi(beta) - Phi(alpha))
 *   where alpha = (a - mu)/sigma, beta = (b - mu)/sigma
 *
 * For likelihood-based inference: mu = L_hat, sigma = SE
 *
 * @param mu - Mean of the underlying Normal (L_hat from likelihood)
 * @param sigma - Std dev of the underlying Normal (SE from likelihood)
 * @param a - Lower truncation bound (max of prior low and feasibility -1)
 * @param b - Upper truncation bound (min of prior high and feasibility 1/CR0-1)
 * @returns Truncated normal mean, or clamped mu for degenerate cases
 */
export function truncatedNormalMeanTwoSided(
  mu: number,
  sigma: number,
  a: number,
  b: number
): number {
  // Guard: degenerate bounds
  if (!(b > a)) {
    return Math.max(a, Math.min(b, mu));
  }

  // Guard: sigma = 0 means point mass at mu
  if (sigma === 0) {
    return Math.max(a, Math.min(b, mu));
  }

  const alpha = (a - mu) / sigma;
  const beta = (b - mu) / sigma;

  const phiAlpha = standardNormalPDF(alpha);
  const phiBeta = standardNormalPDF(beta);
  const PhiAlpha = standardNormalCDF(alpha);
  const PhiBeta = standardNormalCDF(beta);

  const Z = PhiBeta - PhiAlpha; // Normalization constant

  // Guard: Z near zero means almost all prior mass lies outside [a, b].
  // The posterior collapses to the nearest bound (not the midpoint).
  if (Z < 1e-10) {
    if (mu <= a) return a;
    if (mu >= b) return b;
    return mu; // mu inside [a, b]: return mu directly
  }

  // Truncated normal mean formula
  return mu + sigma * (phiAlpha - phiBeta) / Z;
}

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
  const { L_max: feasibleMax } = liftFeasibilityBounds(CR0);

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

  // Guard: Invalid bounds after feasibility clamping (Controversial C.2)
  // This can occur when prior bounds conflict with feasibility bounds.
  // E.g., Student-t with mu=0.5, sigma=0.1 and CR0=0.99 gives feasibleMax=0.0101
  // which is below mu - 6*sigma = -0.1, so L_max < L_min after clamping.
  // Return safe fallback: clamp prior mean to feasible range
  if (!(L_max > L_min)) {
    const priorMean = getPriorMean(prior);
    return Math.max(-1, Math.min(feasibleMax, priorMean));
  }

  const gridStep = (L_max - L_min) / gridSize;

  // ===========================================
  // Step 2: Compute log weights at each grid point (Controversial C.1)
  // ===========================================
  // Using log-space prevents underflow when SE is small (narrow likelihood spike)
  // Without this, all weights can underflow to 0 when likelihood PDF values are tiny

  const logWeights: number[] = [];
  const gridPoints: number[] = [];
  let maxLogWeight = -Infinity;

  for (let i = 0; i <= gridSize; i++) {
    const L = L_min + i * gridStep;
    gridPoints.push(L);

    // Prior PDF at this L value (from distributions.ts)
    const priorPDF = pdf(L, prior);
    if (priorPDF <= 0) {
      logWeights.push(-Infinity);
      continue;
    }

    // Likelihood: L_hat | L ~ N(L, SE^2)
    // This is the probability of observing L_hat given true lift L
    const likelihoodPDF = normalPdf(L_hat, L, SE);
    if (likelihoodPDF <= 0) {
      logWeights.push(-Infinity);
      continue;
    }

    // Log of unnormalized posterior weight
    // log(priorPDF * likelihoodPDF) = log(priorPDF) + log(likelihoodPDF)
    const logWeight = Math.log(priorPDF) + Math.log(likelihoodPDF);
    logWeights.push(logWeight);
    maxLogWeight = Math.max(maxLogWeight, logWeight);
  }

  // ===========================================
  // Step 3: Exponentiate with max subtraction (log-sum-exp trick)
  // ===========================================
  // Subtracting maxLogWeight before exp() prevents overflow/underflow
  // The subtraction cancels out in the ratio (weightedSum / totalWeight)

  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i <= gridSize; i++) {
    if (logWeights[i] === -Infinity) continue;

    // exp(logWeight - maxLogWeight) is numerically stable
    const weight = Math.exp(logWeights[i] - maxLogWeight);
    weightedSum += gridPoints[i] * weight;
    totalWeight += weight;
  }

  // ===========================================
  // Step 4: Return posterior mean = weighted average
  // ===========================================
  if (totalWeight === 0) {
    // Edge case: no valid weights (shouldn't happen with log-space)
    // Fallback: clamp L_hat to valid range (data-dominant regime)
    // Changed from prior mean per audit recommendation
    return Math.max(L_min, Math.min(feasibleMax, L_hat));
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
  // Guard: Return prior mean if inputs are non-finite (defensive)
  // This prevents NaN propagation if upstream guards are bypassed
  if (!Number.isFinite(L_hat) || !Number.isFinite(SE)) {
    return getPriorMean(prior);
  }

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
  // Exact formula for Uniform prior (Controversial C.3)
  // ===========================================
  // For Uniform prior U[a,b] with Normal likelihood N(L_hat, SE^2),
  // the posterior is Normal truncated to [a, b].
  // Use exact truncated normal mean formula (faster and more accurate than grid).
  if (prior.type === 'uniform') {
    // Feasibility bounds intersected with prior bounds
    const { L_max: feasibleMax } = liftFeasibilityBounds(CR0);
    const a = Math.max(-1, prior.low_L!);
    const b = Math.min(prior.high_L!, feasibleMax);

    // Use exact truncated normal formula (mu=L_hat, sigma=SE)
    return truncatedNormalMeanTwoSided(L_hat, SE, a, b);
  }

  // ===========================================
  // Grid integration for Student-t only
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

  // ===========================================
  // Step 3.5: Compute effective prior metrics under feasibility truncation
  // ===========================================
  // Per Controversial B: Monte Carlo uses rejection sampling to enforce
  // L in [-1, 1/CR0-1]. This means the simulation effectively operates
  // on a truncated prior. For consistency, we should display metrics
  // (mean, probClearsThreshold) from the same truncated prior.
  //
  // Only compute effective metrics when truncation is likely to matter:
  // - Non-Normal priors (Uniform, Student-t) often have mass near bounds
  // - Normal priors with wide sigma relative to distance to L=-1
  // This adds ~2000 samples overhead, so skip for tight Normal priors
  let effectiveProbClears = 1 - cdf(threshold_L, prior);

  const needsEffectiveMetrics =
    prior.type !== 'normal' ||
    (prior.type === 'normal' && prior.sigma_L! > Math.abs(prior.mu_L! + 1));

  if (needsEffectiveMetrics) {
    const effective = computeEffectivePriorMetrics(prior, threshold_L, CR0);
    effectiveProbClears = effective.effectiveProbClears;
  }

  // Use effective probClears for the returned metric
  const probClearsThreshold = effectiveProbClears;

  // ===========================================
  // Step 4: Feasibility bounds for lift (via shared helper)
  // ===========================================
  // CR1 = CR0 * (1 + L) must be in [0, 1]
  // L_min = -1 (CR1 = 0), L_max = (1/CR0) - 1 (CR1 = 1)
  const { L_min, L_max } = liftFeasibilityBounds(CR0);

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
  // Step 5.5: Check for high rejection rate warning (Edge Case 6)
  // ===========================================
  // High rejection indicates prior places substantial mass outside feasible bounds.
  // This can lead to metrics that don't reflect the full prior distribution.
  // Threshold: >10% rejection rate triggers warning.
  const totalAttempted = validSamples + rejectedSamples;
  if (totalAttempted > 0) {
    const rejectionRate = rejectedSamples / totalAttempted;
    if (rejectionRate > 0.10) {
      warnings.push({
        code: 'high_rejection',
        message: `High rejection rate (${Math.round(rejectionRate * 100)}%) due to prior mass outside feasible conversion bounds. Consider narrowing prior or adjusting baseline rate.`,
      });
    }
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
  // Input validation guards (Accuracy-01, Accuracy-02, Accuracy-B)
  // ===========================================

  // Guard: Degenerate prior (sigma=0) means no uncertainty => EVSI = 0
  // Must check BEFORE any division by sigma_prior to avoid Infinity/NaN
  if (sigma_prior === 0) {
    const defaultDecision = determineDefaultDecision(mu_prior, threshold_L);
    // Point mass prior: P(L >= T) is 1 if mu >= T, else 0
    const probabilityClearsThreshold = mu_prior >= threshold_L ? 1 : 0;

    return {
      evsiDollars: 0,
      defaultDecision,
      probabilityClearsThreshold,
      probabilityTestChangesDecision: 0,
    };
  }

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
