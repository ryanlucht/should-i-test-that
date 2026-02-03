/**
 * Value Breakdown Card - Shows EVSI, Timing Costs, and Net Value
 *
 * Replaces separate EVSI/CoD/NetValue cards with a transparent breakdown
 * that explains where the numbers come from.
 *
 * The "timing costs" represent value foregone during:
 * 1. Test period: Only variant users get treatment (control gets nothing)
 * 2. Latency period: Nobody gets treatment while deciding
 *
 * This addresses confusion where CoD showed $0 but Net Value < EVSI.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatSmartCurrency } from '@/lib/formatting';
import { cn } from '@/lib/utils';

interface ValueBreakdownCardProps {
  /** EVSI in dollars (gross value of test information) */
  evsiDollars: number;
  /** Net value in dollars (from integrated simulation) */
  netValueDollars: number;
  /** Test duration in days (for explanation) */
  testDurationDays: number;
  /** Variant fraction (for explanation) */
  variantFraction: number;
  /** Decision latency in days (for explanation) */
  decisionLatencyDays: number;
}

export function ValueBreakdownCard({
  evsiDollars,
  netValueDollars,
  testDurationDays,
  variantFraction,
  decisionLatencyDays,
}: ValueBreakdownCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Timing costs = EVSI - Net Value
  // This captures value lost during test period and latency
  const timingCostsDollars = evsiDollars - netValueDollars;

  // Format for display (net value clamped to 0 for display)
  const displayNetValue = Math.max(0, netValueDollars);

  // Control fraction for explanation
  const controlPercent = Math.round((1 - variantFraction) * 100);

  return (
    <div className="rounded-xl border bg-card border-border p-4 space-y-3">
      {/* Breakdown rows */}
      <div className="space-y-2">
        {/* EVSI row */}
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">EVSI (test value)</span>
          <span className="text-base font-medium text-foreground">
            {formatSmartCurrency(evsiDollars)}
          </span>
        </div>

        {/* Timing costs row - clickable for expansion */}
        <div
          className={cn(
            'flex justify-between items-baseline cursor-pointer rounded px-1 -mx-1 transition-colors',
            'hover:bg-muted/50'
          )}
          onClick={() => setIsExpanded(!isExpanded)}
          role="button"
          aria-expanded={isExpanded}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            Timing costs
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="text-base font-medium text-foreground">
            {timingCostsDollars > 0 ? '-' : ''}
            {formatSmartCurrency(Math.abs(timingCostsDollars))}
          </span>
        </div>

        {/* Expanded explanation */}
        {isExpanded && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-2">
            <p>
              <strong>During the test ({testDurationDays} days):</strong> Only{' '}
              {Math.round(variantFraction * 100)}% of users (variant group) receive the
              treatment. The {controlPercent}% in control get nothing, even if the
              treatment is beneficial.
            </p>
            {decisionLatencyDays > 0 && (
              <p>
                <strong>During decision latency ({decisionLatencyDays} days):</strong> While
                you analyze results and decide, nobody receives the treatment.
              </p>
            )}
            <p className="pt-1 border-t border-muted">
              These timing effects are computed per Monte Carlo iteration, capturing
              the true opportunity cost regardless of your default decision.
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border my-1" />

        {/* Net value row */}
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-medium text-foreground">Net value</span>
          <span className="text-lg font-semibold text-primary">
            {formatSmartCurrency(displayNetValue)}
          </span>
        </div>
      </div>

      {/* Brief description */}
      <p className="text-xs text-muted-foreground pt-1">
        Net value is the most you should pay to run this test.
      </p>
    </div>
  );
}
