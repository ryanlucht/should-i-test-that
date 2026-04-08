/**
 * WaterfallBlock - Six-step plain-English "Why this result?" narrative
 *
 * Renders a causal waterfall explanation of the EVSI result,
 * showing how prior uncertainty flows into test value and net value.
 *
 * Per UI-SPEC: visible by default, no toggle, read-only prose block.
 * Per 25.1-02-PLAN.md: uses formatSmartCurrency, formatProbabilityPercent,
 * formatPercentage from @/lib/formatting and cn from @/lib/utils.
 */

import { cn } from '@/lib/utils';
import {
  formatSmartCurrency,
  formatProbabilityPercent,
  formatPercentage,
} from '@/lib/formatting';

interface WaterfallBlockProps {
  /** 'ship' or 'dont-ship' — the default decision without testing */
  defaultDecision: 'ship' | 'dont-ship';
  /** Prior interval lower bound in percentage form (e.g., -8.22 for -8.22%) */
  priorLow: number;
  /** Prior interval upper bound in percentage form (e.g., 8.22 for 8.22%) */
  priorHigh: number;
  /** Probability the test would change the decision (decimal 0-1) */
  pDecisionChange: number;
  /** Gross value of better decisions enabled by the test (evsiDollars) */
  testValue: number;
  /** Opportunity cost of waiting for the test (evsiDollars - netValueDollars) */
  timingCost: number;
  /** Net value after timing costs (netValueDollars) */
  netValue: number;
}

export function WaterfallBlock({
  defaultDecision,
  priorLow,
  priorHigh,
  pDecisionChange,
  testValue,
  timingCost,
  netValue,
}: WaterfallBlockProps) {
  // Convert internal 'dont-ship' to display-friendly "not ship"
  const defaultDecisionLabel = defaultDecision === 'ship' ? 'ship' : 'not ship';

  return (
    <section
      aria-label="Why this result?"
      className="bg-card border border-border rounded-xl p-6"
    >
      <h4 className="text-lg font-semibold text-foreground mb-4">
        Why this result?
      </h4>

      <ol className="space-y-3 list-none">
        {/* Step 1: Default decision */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">1.</span>{' '}
          Without testing, your current best choice is to {defaultDecisionLabel}.
        </li>

        {/* Step 2: Prior uncertainty range
            priorLow and priorHigh are already in percentage form (e.g., -8.22)
            formatPercentage handles the % suffix */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">2.</span>{' '}
          But you&apos;re still meaningfully uncertain: the true lift could plausibly be between{' '}
          {formatPercentage(priorLow)} and {formatPercentage(priorHigh)}.
        </li>

        {/* Step 3: How informative the test is
            pDecisionChange is a decimal probability (0-1) */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">3.</span>{' '}
          This experiment is informative enough that it would change your action in about{' '}
          {formatProbabilityPercent(pDecisionChange)} of similar situations.
        </li>

        {/* Step 4: Gross value of better decisions (EVSI)
            testValue = evsiDollars */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">4.</span>{' '}
          Across all those possible futures, the better decisions enabled by the test are worth{' '}
          {formatSmartCurrency(testValue)}.
        </li>

        {/* Step 5: Opportunity cost of waiting for test results
            Always show as positive cost (Math.abs) */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">5.</span>{' '}
          Waiting for the test and readout costs about {formatSmartCurrency(Math.abs(timingCost))}.
        </li>

        {/* Step 6: Net value after timing costs
            Color-coded: text-primary for positive, text-destructive for negative */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">6.</span>{' '}
          That leaves a net value of{' '}
          <span
            className={cn(
              'font-semibold',
              netValue >= 0 ? 'text-primary' : 'text-destructive'
            )}
          >
            {formatSmartCurrency(netValue)}
          </span>
          .
        </li>
      </ol>
    </section>
  );
}
