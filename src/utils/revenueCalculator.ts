/**
 * Revenue Calculator for A/B Testing
 *
 * Converts business metrics (conversion rate, AOV, traffic) into
 * revenue per 1% relative change in conversion rate.
 */

export interface RevenueCalculatorInputs {
  baselineConversionRate: number;  // As decimal (0.05 = 5%)
  averageOrderValue: number;       // Dollars
  annualTraffic: number;          // Number of visitors per year
}

/**
 * Calculate revenue impact per 1% relative change in conversion rate
 *
 * If conversion rate changes by +1% relative, the absolute change is:
 *   baselineConversionRate × 0.01
 *
 * Formula: traffic × (baselineConversionRate × 0.01) × AOV
 *
 * Example:
 * - Traffic: 1,000,000 visitors/year
 * - Baseline conversion: 5%
 * - AOV: $100
 * - Revenue per 1% relative change: 1M × (0.05 × 0.01) × $100 = $50,000/year
 *
 * @param inputs - Business metrics
 * @returns Revenue impact per 1% relative change ($)
 */
export function calculateRevenuePerPercentagePoint(
  inputs: RevenueCalculatorInputs
): number {
  // Revenue per 1% relative improvement
  // = traffic × (baselineConversionRate × 0.01) × AOV
  return inputs.annualTraffic * (inputs.baselineConversionRate * 0.01) * inputs.averageOrderValue;
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
 * Calculate revenue impact of a given relative percentage change
 *
 * @param percentagePointChange - Relative change (e.g., 2 = +2% relative)
 * @param inputs - Business metrics
 * @returns Revenue impact ($)
 */
export function calculateConversionImpact(
  percentagePointChange: number,
  inputs: RevenueCalculatorInputs
): number {
  // Revenue impact of X% relative change
  return percentagePointChange * calculateRevenuePerPercentagePoint(inputs);
}
