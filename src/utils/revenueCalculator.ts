/**
 * Revenue Calculator for A/B Testing
 *
 * Converts business metrics (conversion rate, AOV, traffic) into
 * revenue per percentage point change in conversion rate.
 */

export interface RevenueCalculatorInputs {
  baselineConversionRate: number;  // As decimal (0.05 = 5%)
  averageOrderValue: number;       // Dollars
  annualTraffic: number;          // Number of visitors per year
}

/**
 * Calculate revenue impact per percentage point change in conversion rate
 *
 * Formula: (traffic × 0.01) × AOV
 *
 * Example:
 * - Traffic: 1,000,000 visitors/year
 * - Baseline conversion: 5%
 * - AOV: $100
 * - Revenue per 1% point: 1M × 0.01 × $100 = $1,000,000/year
 *
 * @param inputs - Business metrics
 * @returns Revenue impact per percentage point ($)
 */
export function calculateRevenuePerPercentagePoint(
  inputs: RevenueCalculatorInputs
): number {
  // Revenue per 1 percentage point improvement
  // = (traffic × 0.01) × AOV
  return (inputs.annualTraffic * 0.01) * inputs.averageOrderValue;
}

/**
 * Calculate total baseline revenue
 *
 * @param baselineConversionRate - Conversion rate as decimal
 * @param averageOrderValue - Average order value in dollars
 * @param traffic - Annual traffic
 * @returns Total annual revenue ($)
 */
export function calculateTotalRevenue(
  baselineConversionRate: number,
  averageOrderValue: number,
  traffic: number
): number {
  return (traffic * baselineConversionRate) * averageOrderValue;
}

/**
 * Calculate revenue impact of a given percentage point change
 *
 * @param percentagePointChange - Change in conversion rate (e.g., 2 = +2 percentage points)
 * @param inputs - Business metrics
 * @returns Revenue impact ($)
 */
export function calculateConversionImpact(
  percentagePointChange: number,
  inputs: RevenueCalculatorInputs
): number {
  // Revenue impact of X percentage point change
  return percentagePointChange * calculateRevenuePerPercentagePoint(inputs);
}
