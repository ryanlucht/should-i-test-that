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
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { generateDensityCurveData } from '@/lib/calculations/chart-data';
import { formatLiftPercent } from '@/lib/formatting';

/**
 * Props for the PriorDistributionChart component
 *
 * @property mu_L - Prior mean lift as decimal (e.g., 0.05 for 5%)
 * @property sigma_L - Prior standard deviation as decimal (e.g., 0.05 for 5%)
 */
interface PriorDistributionChartProps {
  /** Prior mean lift (decimal, e.g., 0.05 for 5%) */
  mu_L: number;
  /** Prior standard deviation (decimal, e.g., 0.05 for 5%) */
  sigma_L: number;
}

/**
 * Base prior distribution chart showing a smooth density curve
 *
 * This is the foundation component that will be extended with overlays
 * (threshold line, regret shading, mean marker) in plan 04-02.
 *
 * Per 04-RESEARCH.md pitfall #1: Uses useMemo to prevent regenerating
 * chart data on every render. Animation disabled for live updates.
 */
export function PriorDistributionChart({
  mu_L,
  sigma_L,
}: PriorDistributionChartProps) {
  // Memoize chart data to prevent regeneration on every render
  // Dependency array includes both prior parameters to update when user changes inputs
  const chartData = useMemo(
    () => generateDensityCurveData(mu_L, sigma_L),
    [mu_L, sigma_L]
  );

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
      </AreaChart>
    </ResponsiveContainer>
  );
}
