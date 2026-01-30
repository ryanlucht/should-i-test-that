/**
 * Cost of Delay Card - Expandable breakdown
 *
 * Per 05-CONTEXT.md:
 * - Shown as derived value, with expandable breakdown on click
 * - Formula breakdown when expanded: "X days x $Y/day = $Z Cost of Delay"
 *
 * Requirements covered:
 * - ADV-OUT-04: Cost of Delay display
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatSmartCurrency } from '@/lib/formatting';
import type { CoDResults } from '@/lib/calculations/cost-of-delay';
import { cn } from '@/lib/utils';

interface CostOfDelayCardProps {
  /** CoD calculation results */
  codResults: CoDResults;
  /** Test duration in days (for breakdown display) */
  testDurationDays: number;
}

export function CostOfDelayCard({
  codResults,
  testDurationDays,
}: CostOfDelayCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { codDollars, dailyOpportunityCost, codApplies } = codResults;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-2 cursor-pointer transition-colors',
        'bg-card border-border hover:bg-muted/30'
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
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Cost of Delay</p>
          <p className="text-lg font-semibold text-foreground">
            {formatSmartCurrency(codDollars)}
          </p>
        </div>
        <div className="text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </div>

      {/* Expandable breakdown */}
      {isExpanded && (
        <div className="pt-2 border-t border-border">
          {codApplies ? (
            <p className="text-sm text-muted-foreground">
              {testDurationDays} days x {formatSmartCurrency(dailyOpportunityCost)}/day ={' '}
              {formatSmartCurrency(codDollars)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No Cost of Delay — your default decision is not to ship,
              so waiting for test results doesn't cost you anything.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
