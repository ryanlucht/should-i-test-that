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
