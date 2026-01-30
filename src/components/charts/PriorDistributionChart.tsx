/**
 * Prior Distribution Chart Component
 *
 * Renders a smooth density curve visualizing the user's prior uncertainty
 * about the expected lift from their feature/experiment.
 *
 * Supports all prior distribution shapes:
 * - Normal (default for Basic mode and Advanced mode default)
 * - Student-t (Advanced mode option with heavier tails)
 * - Uniform (Advanced mode option with bounded flat distribution)
 *
 * Design requirements (per 04-CONTEXT.md):
 * - Datadog-style gradient fill under the curve
 * - Purple accent color (#7C3AED)
 * - Hidden Y-axis (users don't need to interpret density values)
 * - X-axis shows lift percentages with sign and %
 * - Responsive sizing via ResponsiveContainer
 *
 * Per 05-CONTEXT.md: "main chart updates live on selection"
 * Chart re-renders immediately when prior shape changes via store reactivity.
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
import {
  generateDistributionData,
  getDensityAtLiftForPrior,
} from '@/lib/calculations/chart-data';
import { getPriorMean, type PriorDistribution } from '@/lib/calculations';
import { formatLiftPercent } from '@/lib/formatting';
import { ChartTooltip } from './ChartTooltip';

/**
 * Z-score for 95th percentile of standard normal distribution
 * Used to calculate 90% credible interval bounds for Normal and Student-t
 */
const Z_95 = 1.6448536;

/**
 * Props for the PriorDistributionChart component
 *
 * The chart can render any prior distribution shape by accepting a
 * PriorDistribution object. For Basic mode, this is constructed from
 * mu_L and sigma_L with type='normal'.
 */
interface PriorDistributionChartProps {
  /** Prior distribution parameters */
  prior: PriorDistribution;
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
 * Calculate 90% credible interval bounds for display
 *
 * For Normal/Student-t: mu +/- Z_95 * sigma (approximate for t)
 * For Uniform: exact bounds [low, high] represent 100%, show full range
 */
function getIntervalBounds(prior: PriorDistribution): {
  low: number;
  high: number;
} {
  if (prior.type === 'uniform') {
    // For Uniform, the entire range is the distribution bounds
    // Don't shade 90% interval - the whole distribution IS the interval
    return { low: prior.low_L!, high: prior.high_L! };
  }

  // Normal and Student-t: use z-score approximation
  // (This is exact for Normal, approximate for Student-t)
  const mu_L = prior.mu_L!;
  const sigma_L = prior.sigma_L!;
  return {
    low: mu_L - Z_95 * sigma_L,
    high: mu_L + Z_95 * sigma_L,
  };
}

/**
 * Prior distribution chart with all overlays
 *
 * Displays:
 * - Smooth density curve with gradient fill (or rectangle for Uniform)
 * - 90% credible interval shading (purple)
 * - Threshold line (dashed with label)
 * - Mean marker (purple dot)
 * - Interactive tooltip with lift and dollar values
 *
 * Per 04-RESEARCH.md pitfall #1: Uses useMemo to prevent regenerating
 * chart data on every render. Animation disabled for live updates.
 */
export function PriorDistributionChart({
  prior,
  threshold_L,
  K,
}: PriorDistributionChartProps) {
  // Memoize chart data to prevent regeneration on every render
  // Dependency includes full prior object to update when shape or params change
  const chartData = useMemo(
    () => generateDistributionData(prior),
    [prior]
  );

  // Calculate interval bounds based on distribution type
  const intervalBounds = useMemo(() => getIntervalBounds(prior), [prior]);

  // Get prior mean for mean marker position
  const priorMean = getPriorMean(prior);

  // Convert to percentages for chart display
  const intervalLowPercent = intervalBounds.low * 100;
  const intervalHighPercent = intervalBounds.high * 100;
  const thresholdPercent = threshold_L * 100;
  const meanPercent = priorMean * 100;

  // Get density at mean for ReferenceDot y-position
  const densityAtMean = getDensityAtLiftForPrior(priorMean, prior);

  // Determine chart type for Area (Uniform should use step interpolation)
  const areaType = prior.type === 'uniform' ? 'stepAfter' : 'monotone';

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

        {/* 90% Interval Shading - only show for Normal/Student-t */}
        {/* For Uniform, the entire distribution represents the interval */}
        {prior.type !== 'uniform' && (
          <ReferenceArea
            x1={intervalLowPercent}
            x2={intervalHighPercent}
            fill="#7C3AED"
            fillOpacity={0.15}
            ifOverflow="hidden"
          />
        )}

        {/* Threshold Line - dashed vertical line with decision rule label */}
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
        {/* type varies: "monotone" for smooth curves, "stepAfter" for Uniform rectangle */}
        {/* Animation disabled per 04-RESEARCH.md for live updates */}
        <Area
          type={areaType}
          dataKey="density"
          stroke="#7C3AED"
          strokeWidth={2}
          fill="url(#densityGradient)"
          isAnimationActive={false}
        />

        {/* Custom Tooltip with lift and dollar conversion */}
        <Tooltip content={<ChartTooltip K={K} />} />

        {/* Mean Marker - purple dot at the mean of the distribution */}
        {/* For Uniform, this is at the midpoint; for Normal/t, at the peak */}
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

/**
 * Legacy props interface for backward compatibility
 *
 * This allows existing callers using mu_L/sigma_L to continue working.
 * Used by Basic mode which doesn't need to specify prior shape.
 */
interface LegacyPriorDistributionChartProps {
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
 * Backward-compatible wrapper for PriorDistributionChart
 *
 * Allows callers to pass mu_L and sigma_L directly (assumes Normal distribution).
 * This is used by ResultsSection in Basic mode where we don't need shape selection.
 */
export function PriorDistributionChartLegacy({
  mu_L,
  sigma_L,
  threshold_L,
  K,
}: LegacyPriorDistributionChartProps) {
  const prior: PriorDistribution = useMemo(
    () => ({
      type: 'normal' as const,
      mu_L,
      sigma_L,
    }),
    [mu_L, sigma_L]
  );

  return <PriorDistributionChart prior={prior} threshold_L={threshold_L} K={K} />;
}
