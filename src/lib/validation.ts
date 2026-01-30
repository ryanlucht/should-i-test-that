/**
 * Validation Schemas
 *
 * Zod schemas for form validation. All numeric fields use z.number()
 * with appropriate constraints. Percentage inputs accept 0-100 in UI
 * but are stored as decimals (0-1) internally.
 *
 * Per SPEC.md Section 4:
 * - CR0: decimal in (0, 1), UI accepts percent
 * - N_year: annual visitors, >= 0
 * - V: dollars per conversion, >= 0
 */

import { z } from 'zod';

/**
 * Baseline Metrics Schema
 *
 * Validates the three core business inputs from SPEC.md Section 5.1:
 *
 * CR0 (baselineConversionRate):
 * - UI: percentage (e.g., 3.2%)
 * - Validation: 0 < CR0 < 100 (percentage form)
 * - Storage: decimal (0.032) - conversion happens in form submission
 *
 * N_year (annualVisitors):
 * - Validation: >= 1 (must have at least one visitor)
 * - Integer constraint for whole number of visitors
 *
 * V (valuePerConversion):
 * - Validation: >= 0.01 (minimum penny)
 * - Stored in dollars
 */
export const baselineMetricsSchema = z.object({
  /**
   * Baseline conversion rate as percentage (0-100)
   * SPEC: "Validate: 0% < CR0 < 100%"
   */
  baselineConversionRate: z
    .number({ error: 'Conversion rate is required' })
    .gt(0, { message: 'Must be greater than 0%' })
    .lt(100, { message: 'Must be less than 100%' }),

  /**
   * Annual visitors/opportunities
   * SPEC: "validate: N_year >= 0" (we use >= 1 to ensure meaningful data)
   */
  annualVisitors: z
    .number({ error: 'Annual visitors is required' })
    .int({ message: 'Must be a whole number' })
    .min(1, { message: 'Must be at least 1' }),

  /**
   * User-editable label for visitor unit (visitors, sessions, leads, etc.)
   * SPEC: "Label is user-editable text but defaults to 'visitors'"
   * Note: Default handled at form level, not schema level, for consistent types
   */
  visitorUnitLabel: z.string().min(1),

  /**
   * Value per conversion in dollars
   * SPEC: "validate: V >= 0" (we use >= 0.01 as minimum practical value)
   */
  valuePerConversion: z
    .number({ error: 'Value per conversion is required' })
    .min(0.01, { message: 'Must be at least $0.01' }),
});

export type BaselineMetricsFormData = z.infer<typeof baselineMetricsSchema>;

/**
 * Prior Selection Schema
 *
 * Users can either use the default prior or specify a custom 90% interval.
 * The interval bounds are in percentage form (e.g., -5% to 10%).
 *
 * Per SPEC.md Section 6.2:
 * - Default prior: N(0, 0.05)
 * - Custom: User specifies L_low and L_high, we derive mu_L and sigma_L
 *
 * Validation rules:
 * - Low bound can be negative (expecting loss is valid)
 * - High bound can be >100% (expecting huge gains, though unusual)
 * - Low must be strictly less than high
 * - Interval must not be impossibly narrow (results in near-zero sigma)
 */
export const priorSelectionSchema = z
  .object({
    /** Prior type: 'default' uses N(0, 0.05), 'custom' uses interval bounds */
    priorType: z.enum(['default', 'custom']),
    /**
     * Lower bound of 90% credible interval (percentage form)
     * e.g., -5 means "I'm 90% sure the lift is at least -5%"
     */
    intervalLow: z
      .number({ error: 'Lower bound is required' })
      .min(-100, { message: 'Cannot expect more than 100% loss' }),
    /**
     * Upper bound of 90% credible interval (percentage form)
     * e.g., 10 means "I'm 90% sure the lift is at most 10%"
     */
    intervalHigh: z.number({ error: 'Upper bound is required' }),
  })
  .refine((data) => data.intervalLow < data.intervalHigh, {
    message: 'Lower bound must be less than upper bound',
    path: ['intervalHigh'],
  })
  .refine((data) => data.intervalHigh - data.intervalLow >= 0.1, {
    message: 'Interval is too narrow (uncertainty too low)',
    path: ['intervalHigh'],
  });

export type PriorSelectionFormData = z.infer<typeof priorSelectionSchema>;

/**
 * Threshold Scenario Schema
 *
 * Three scenarios per SPEC.md Section 7.3:
 * 1. Ship any positive impact (T = 0)
 * 2. Needs minimum lift (T > 0)
 * 3. Worth it even with small loss (T < 0)
 *
 * Note: For scenario 3, user enters "acceptable loss" as positive,
 * but we store as negative threshold internally.
 */
export const thresholdScenarioSchema = z.discriminatedUnion('scenario', [
  // Scenario 1: Ship any positive
  z.object({
    scenario: z.literal('any-positive'),
    // No threshold value needed - T = 0
  }),
  // Scenario 2: Minimum lift required
  z.object({
    scenario: z.literal('minimum-lift'),
    thresholdUnit: z.enum(['dollars', 'lift']),
    thresholdValue: z
      .number({ error: 'Threshold value is required' })
      .positive({ message: 'Must be a positive value' }),
  }),
  // Scenario 3: Accept small loss
  z.object({
    scenario: z.literal('accept-loss'),
    thresholdUnit: z.enum(['dollars', 'lift']),
    // User enters positive "acceptable loss"
    acceptableLoss: z
      .number({ error: 'Acceptable loss is required' })
      .positive({ message: 'Enter as a positive value (e.g., 5 for 5% loss)' }),
  }),
]);

export type ThresholdScenarioFormData = z.infer<typeof thresholdScenarioSchema>;

/**
 * Prior Shape Schema (Advanced mode)
 *
 * Validates prior distribution type and Student-t df when applicable.
 * Uses discriminated union pattern where df is only required for Student-t.
 *
 * Per 05-CONTEXT.md:
 * - Normal: Standard bell curve (default)
 * - Student-t: Fat-tailed, with preset df values (3, 5, 10)
 * - Uniform: Equal probability across the interval
 */
export const priorShapeSchema = z.discriminatedUnion('shape', [
  z.object({
    shape: z.literal('normal'),
  }),
  z.object({
    shape: z.literal('student-t'),
    /** Degrees of freedom for Student-t distribution (3=Heavy, 5=Moderate, 10=Near-normal) */
    df: z.union([z.literal(3), z.literal(5), z.literal(10)]),
  }),
  z.object({
    shape: z.literal('uniform'),
  }),
]);

export type PriorShapeFormData = z.infer<typeof priorShapeSchema>;

/**
 * Experiment Design Schema (Advanced mode)
 *
 * Validates test parameters for EVSI calculation.
 * These inputs determine sample size and test precision.
 *
 * Per 05-CONTEXT.md defaults:
 * - trafficSplit: 0.5 (50/50 default)
 * - eligibilityFraction: 1.0 (100% default)
 * - conversionLatencyDays: 0 (default)
 * - decisionLatencyDays: 0 (default)
 * - testDurationDays: required (no default)
 * - dailyTraffic: required or auto-derived from annual visitors / 365
 */
export const experimentDesignSchema = z.object({
  /**
   * Test duration in days
   * Required - user must enter
   */
  testDurationDays: z
    .number({ error: 'Test duration is required' })
    .positive('Duration must be positive')
    .int('Duration must be whole days'),

  /**
   * Daily eligible traffic
   * Required - can be auto-derived from annual visitors or manually entered
   */
  dailyTraffic: z
    .number({ error: 'Daily traffic is required' })
    .positive('Traffic must be positive'),

  /**
   * Variant allocation as percentage (e.g., 50 for 50%)
   * UI shows percentage, converted to decimal (0.5) on form submit
   * Pre-filled with default 50 (50/50 split)
   */
  trafficSplit: z
    .number()
    .min(10, 'Variant split must be at least 10%')
    .max(90, 'Variant split must be at most 90%'),

  /**
   * Fraction of all traffic eligible for experiment as percentage
   * UI shows percentage, converted to decimal (1.0) on form submit
   * Pre-filled with default 100 (100%)
   */
  eligibilityFraction: z
    .number()
    .min(1, 'Eligibility must be at least 1%')
    .max(100, 'Eligibility cannot exceed 100%'),

  /**
   * Days from exposure to expected conversion
   * Optional with default 0 - visually de-emphasized in UI
   */
  conversionLatencyDays: z
    .number()
    .min(0, 'Latency cannot be negative')
    .int('Latency must be whole days'),

  /**
   * Days after test ends before shipping decision
   * Optional with default 0 - visually de-emphasized in UI
   */
  decisionLatencyDays: z
    .number()
    .min(0, 'Latency cannot be negative')
    .int('Latency must be whole days'),
});

export type ExperimentDesignFormData = z.infer<typeof experimentDesignSchema>;
