/**
 * Sample Size Derivation
 *
 * Derives sample sizes from experiment design parameters for EVSI calculation.
 * Used in Advanced mode to determine how much data the test will collect.
 *
 * Per SPEC.md Section A3.3:
 *   - n_total = dailyTraffic * testDurationDays * eligibilityFraction
 *   - n_variant = n_total * variantFraction
 *   - n_control = n_total - n_variant
 *
 * Mathematical notes (for statistician audit):
 * - All fractions are decimals in [0, 1]
 * - Results are floored to integers (can't have fractional users)
 * - n_control = n_total - n_variant ensures exact summation
 */

/**
 * Input parameters for sample size derivation
 */
export interface SampleSizeInputs {
  /** Daily traffic (visitors/sessions per day) */
  dailyTraffic: number;

  /** Test duration in days */
  testDurationDays: number;

  /** Fraction of traffic eligible for experiment (decimal, e.g., 0.5 for 50%) */
  eligibilityFraction: number;

  /** Fraction of eligible traffic assigned to variant (decimal, e.g., 0.5 for 50%) */
  variantFraction: number;
}

/**
 * Results from sample size derivation
 */
export interface SampleSizeResults {
  /** Total sample size (control + variant) */
  n_total: number;

  /** Sample size in control group */
  n_control: number;

  /** Sample size in variant group */
  n_variant: number;
}

/**
 * Derive sample sizes from experiment design parameters
 *
 * Calculates the expected number of users in each test group based on:
 * - Traffic volume (daily visitors)
 * - Test duration (days)
 * - Eligibility fraction (what % of traffic enters the experiment)
 * - Variant fraction (what % of eligible traffic sees the variant)
 *
 * Per SPEC.md Section A3.3:
 *   n_total = N_day * D_test * f_eligible
 *   n_variant = n_total * f_variant
 *   n_control = n_total * (1 - f_variant)
 *
 * Note: We calculate n_control as n_total - n_variant to ensure exact summation
 * after flooring (avoids rounding errors that could make n_control + n_variant != n_total)
 *
 * @param inputs - Experiment design parameters
 * @returns Sample sizes for total, control, and variant groups
 */
export function deriveSampleSizes(inputs: SampleSizeInputs): SampleSizeResults {
  const { dailyTraffic, testDurationDays, eligibilityFraction, variantFraction } =
    inputs;

  // ===========================================
  // Step 1: Calculate total sample size
  // ===========================================
  // n_total = dailyTraffic * testDurationDays * eligibilityFraction
  // This is the total number of users who will be part of the experiment
  const n_total_raw = dailyTraffic * testDurationDays * eligibilityFraction;

  // Floor to integer (can't have fractional users)
  const n_total = Math.floor(n_total_raw);

  // ===========================================
  // Step 2: Calculate variant sample size
  // ===========================================
  // n_variant = n_total * variantFraction
  // This is the number of users who will see the variant (treatment)
  const n_variant_raw = n_total * variantFraction;

  // Floor to integer
  const n_variant = Math.floor(n_variant_raw);

  // ===========================================
  // Step 3: Calculate control sample size
  // ===========================================
  // n_control = n_total - n_variant
  // Calculate as difference to ensure n_control + n_variant = n_total exactly
  // (avoids rounding errors from flooring both independently)
  const n_control = n_total - n_variant;

  return {
    n_total,
    n_control,
    n_variant,
  };
}
