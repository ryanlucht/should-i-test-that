/**
 * Prior Distribution Chart Component
 *
 * Renders a smooth density curve visualizing the user's prior uncertainty
 * about the expected lift from their feature/experiment.
 *
 * Design requirements (per 04-CONTEXT.md):
 * - Datadog-style gradient fill under the curve
 * - Purple accent color (#7C3AED)
 * - Hidden Y-axis (users don't need to interpret density values)
 * - X-axis shows lift percentages with sign and %
 * - Responsive sizing via ResponsiveContainer
 *
 * Overlays (per 04-02-PLAN.md):
 * - VIZ-02: Mean marker (purple dot on curve)
 * - VIZ-03: 90% interval shading (purple region between 5th/95th percentiles)
 * - VIZ-04: Threshold line (dashed vertical line with label)
 * - VIZ-06: Custom tooltip with dollar conversion
 *
 * Note: VIZ-05 (regret shading) was removed per user feedback - too confusing
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Tooltip,
} from 'recharts';
import { generateDensityCurveData, getDensityAtLift } from '@/lib/calculations/chart-data';
import { formatLiftPercent } from '@/lib/formatting';
import { ChartTooltip } from './ChartTooltip';

/**
 * Z-score for 95th percentile of standard normal distribution
 * Used to calculate 90% credible interval bounds (5th to 95th percentile)
 */
const Z_95 = 1.6448536;

/**
 * Props for the PriorDistributionChart component
 *
 * @property mu_L - Prior mean lift as decimal (e.g., 0.05 for 5%)
 * @property sigma_L - Prior standard deviation as decimal (e.g., 0.05 for 5%)
 * @property threshold_L - Decision threshold in lift units (decimal)
 * @property K - Scaling constant: dollars per unit lift (N_year * CR0 * V)
 */
interface PriorDistributionChartProps {
  /** Prior mean lift (decimal, e.g., 0.05 for 5%) */
  mu_L: number;
  /** Prior standard deviation (decimal, e.g., 0.05 for 5%) */
  sigma_L: number;
  /** Threshold in lift units (decimal, e.g., 0 for "any positive") */
  threshold_L: number;
  /** Dollars per unit lift: K = N_year * CR0 * V */
  K: number;
}

/**
 * Generate threshold label text based on threshold value
 *
 * Per 04-CONTEXT.md: "Contextual label explaining the decision rule"
 */
function getThresholdLabel(thresholdPercent: number): string {
  if (thresholdPercent === 0) {
    return 'Ship if positive';
  }
  // Include sign for positive thresholds
  const sign = thresholdPercent > 0 ? '+' : '';
  return `Ship if > ${sign}${thresholdPercent.toFixed(1)}%`;
}

/**
 * Prior distribution chart with all overlays
 *
 * Displays:
 * - Smooth density curve with gradient fill
 * - 90% credible interval shading (purple)
 * - Threshold line (dashed with label)
 * - Mean marker (purple dot)
 * - Interactive tooltip with lift and dollar values
 *
 * Per 04-RESEARCH.md pitfall #1: Uses useMemo to prevent regenerating
 * chart data on every render. Animation disabled for live updates.
 */
export function PriorDistributionChart({
  mu_L,
  sigma_L,
  threshold_L,
  K,
}: PriorDistributionChartProps) {
  // Memoize chart data to prevent regeneration on every render
  // Dependency array includes both prior parameters to update when user changes inputs
  const chartData = useMemo(
    () => generateDensityCurveData(mu_L, sigma_L),
    [mu_L, sigma_L]
  );

  // Calculate 90% interval bounds (5th to 95th percentile)
  // lowBound = mu - Z_95 * sigma (5th percentile)
  // highBound = mu + Z_95 * sigma (95th percentile)
  const intervalLow = mu_L - Z_95 * sigma_L;
  const intervalHigh = mu_L + Z_95 * sigma_L;

  // Convert to percentages for chart display
  const intervalLowPercent = intervalLow * 100;
  const intervalHighPercent = intervalHigh * 100;
  const thresholdPercent = threshold_L * 100;
  const meanPercent = mu_L * 100;

  // Get density at mean for ReferenceDot y-position (peak of curve)
  const densityAtMean = getDensityAtLift(mu_L, mu_L, sigma_L);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart
        data={chartData}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        {/* Gradient definition for the area fill */}
        {/* Datadog-style: Purple (#7C3AED) from 60% opacity at top to 10% at bottom */}
        <defs>
          <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        {/* VIZ-03: 90% Interval Shading - renders BEFORE curve for background layering */}
        {/* Purple shading between 5th and 95th percentile bounds */}
        <ReferenceArea
          x1={intervalLowPercent}
          x2={intervalHighPercent}
          fill="#7C3AED"
          fillOpacity={0.15}
          ifOverflow="hidden"
        />

        {/* VIZ-04: Threshold Line - dashed vertical line with decision rule label */}
        <ReferenceLine
          x={thresholdPercent}
          stroke="#6B7280"
          strokeDasharray="5 5"
          label={{
            value: getThresholdLabel(thresholdPercent),
            position: 'top',
            fontSize: 11,
            fill: '#6B7280',
          }}
        />

        {/* X-axis: Lift percentage */}
        {/* Uses data bounds to ensure curve fills the chart area */}
        <XAxis
          dataKey="liftPercent"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatLiftPercent}
          stroke="#6B7280" // text-muted-foreground
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: '#E5E7EB' }}
        />

        {/* Y-axis: Hidden per design spec */}
        {/* Users don't need to interpret probability density values */}
        <YAxis hide domain={[0, 'auto']} />

        {/* Density curve with gradient fill */}
        {/* type="monotone" creates smooth Bezier curves between points */}
        {/* Animation disabled per 04-RESEARCH.md for live updates */}
        <Area
          type="monotone"
          dataKey="density"
          stroke="#7C3AED"
          strokeWidth={2}
          fill="url(#densityGradient)"
          isAnimationActive={false}
        />

        {/* VIZ-06: Custom Tooltip with lift and dollar conversion */}
        <Tooltip content={<ChartTooltip K={K} />} />

        {/* VIZ-02: Mean Marker - purple dot at the peak of the curve */}
        <ReferenceDot
          x={meanPercent}
          y={densityAtMean}
          r={5}
          fill="#7C3AED"
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
