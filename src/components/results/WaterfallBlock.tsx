/**
 * WaterfallBlock - Six-step plain-English "Why this result?" narrative
 *
 * Renders a causal waterfall explanation of the EVSI result,
 * showing how prior uncertainty flows into test value and net value.
 *
 * Per UI-SPEC: visible by default, no toggle, read-only prose block.
 * Includes near-tie conditional copy when the prior mean is close to
 * the shipping threshold (explains why the calculator treats "ship"
 * as the starting decision when outcomes look nearly tied).
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
  /** True when prior mean is close to the shipping threshold (tie-breaking case) */
  isNearTie?: boolean;
}

export function WaterfallBlock({
  defaultDecision,
  priorLow,
  priorHigh,
  pDecisionChange,
  testValue,
  timingCost,
  netValue,
  isNearTie = false,
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
        {/* Step 1: Starting decision — with near-tie variant when
            prior mean is close to the shipping threshold */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">1.</span>{' '}
          {isNearTie ? (
            <>
              Before testing, shipping and not shipping look nearly equally good.
              In that tie case, the calculator treats &ldquo;{defaultDecisionLabel}&rdquo; as the starting decision.
            </>
          ) : (
            <>
              If you had to decide today, your current rule would lead you to {defaultDecisionLabel}.
            </>
          )}
        </li>

        {/* Step 2: Prior uncertainty range
            priorLow and priorHigh are already in percentage form (e.g., -8.22)
            formatPercentage handles the % suffix */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">2.</span>{' '}
          But you&apos;re still uncertain about the true effect: before testing,
          a plausible range runs from {formatPercentage(priorLow)} to {formatPercentage(priorHigh)}.
        </li>

        {/* Step 3: Test precision — how often the test changes the decision
            pDecisionChange is a decimal probability (0-1) */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">3.</span>{' '}
          Given your traffic and test duration, this experiment is precise enough
          to change what you&apos;d do in about {formatProbabilityPercent(pDecisionChange)} of similar cases.
        </li>

        {/* Step 4: Value of improved decisions (EVSI before delay costs)
            testValue = evsiDollars */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">4.</span>{' '}
          When the test changes your decision, that improved decision-making is
          worth about {formatSmartCurrency(testValue)} on average.
        </li>

        {/* Step 5: Opportunity cost of waiting for test results
            Always show as positive cost (Math.abs) */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">5.</span>{' '}
          Running the test and waiting for readout delays action, which costs
          about {formatSmartCurrency(Math.abs(timingCost))}.
        </li>

        {/* Step 6: Net value after timing costs
            Color-coded: text-primary for positive, text-destructive for negative */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">6.</span>{' '}
          After subtracting that delay cost, the test&apos;s net value is{' '}
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
