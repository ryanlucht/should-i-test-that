/**
 * Custom Tooltip for Prior Distribution Chart
 *
 * Displays lift percentage and dollar equivalent when hovering over the chart.
 * Per VIZ-06: Dollar values shown via K * L conversion.
 *
 * Dollar impact formula:
 *   Dollar Impact = K * L
 *   where K = N_year * CR0 * V (dollars per unit lift)
 *   and L = lift as decimal
 */

import { formatSmartCurrency } from '@/lib/formatting';

/**
 * Props for ChartTooltip
 *
 * @property active - Whether tooltip is currently active (from Recharts)
 * @property payload - Chart data at hover point (from Recharts)
 * @property K - Scaling constant: dollars per unit lift (N_year * CR0 * V)
 */
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { liftPercent: number; density: number } }>;
  /** Dollars per unit lift: K = N_year * CR0 * V */
  K: number;
}

/**
 * Custom tooltip component for the prior distribution chart
 *
 * Shows two pieces of information:
 * 1. Lift percentage with sign prefix (e.g., "+5.0% lift")
 * 2. Dollar equivalent per year (e.g., "≈ $25K/year")
 *
 * Per 04-CONTEXT.md: "Curve hover: Show tooltip with lift value AND dollar equivalent"
 */
export function ChartTooltip({ active, payload, K }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const { liftPercent } = payload[0].payload;
  // Convert percentage (5.0) to decimal (0.05) for dollar calculation
  const liftDecimal = liftPercent / 100;
  // Dollar impact = K * lift_L (K is dollars per unit lift)
  const dollarImpact = K * liftDecimal;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-foreground">
        {liftPercent > 0 ? '+' : ''}
        {liftPercent.toFixed(1)}% lift
      </p>
      <p className="text-xs text-muted-foreground">
        ≈ {formatSmartCurrency(dollarImpact)}/year
      </p>
    </div>
  );
}
