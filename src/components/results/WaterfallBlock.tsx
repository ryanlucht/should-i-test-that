/**
 * WaterfallBlock - Six-step plain-English "Why this result?" narrative
 *
 * Renders a causal waterfall explanation of the EVSI result,
 * showing how prior uncertainty flows into test value and net value.
 *
 * Per UI-SPEC: visible by default, no toggle, read-only prose block.
 * Step 1 explicitly shows the prior mean vs. shipping rule comparison
 * so users understand why the calculator picks ship or don't-ship.
 * Near-tie variant explains the tie-break convention.
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
  /** Prior mean in percentage form (e.g., 0.0 for 0.0%) */
  priorMean: number;
  /** Human-readable shipping rule label (e.g., "any positive impact") */
  shippingRuleLabel: string;
  /** Probability the test would change the decision (decimal 0-1) */
  pDecisionChange: number;
  /** Gross value of better decisions enabled by the test (evsiDollars) */
  testValue: number;
  /** Opportunity cost of waiting for the test (evsiDollars - netValueDollars) */
  timingCost: number;
  /** Net value after timing costs (netValueDollars) */
  netValue: number;
  /** True when prior mean is exactly at the shipping threshold (tie-break) */
  isTie?: boolean;
}

export function WaterfallBlock({
  defaultDecision,
  priorLow,
  priorHigh,
  priorMean,
  shippingRuleLabel,
  pDecisionChange,
  testValue,
  timingCost,
  netValue,
  isTie = false,
}: WaterfallBlockProps) {
  // Convert internal 'dont-ship' to display-friendly "not ship"
  const defaultDecisionLabel = defaultDecision === 'ship' ? 'ship' : 'not ship';

  // Format prior mean with sign for display
  const formattedMean = `${priorMean > 0 ? '+' : ''}${priorMean.toFixed(1)}%`;

  return (
    <section
      aria-label="Why this result?"
      className="bg-card border border-border rounded-xl p-6"
    >
      <h4 className="text-lg font-semibold text-foreground mb-4">
        Why this result?
      </h4>

      <ol className="space-y-3 list-none">
        {/* Step 1: Starting decision — shows explicit comparison of prior
            mean vs shipping rule so users understand the logic. Near-tie
            variant explains the boundary tie-break convention. */}
        <li className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold text-muted-foreground">1.</span>{' '}
          {isTie ? (
            <>
              Your expected effect ({formattedMean}) is right at the boundary of
              your shipping rule ({shippingRuleLabel}). At this point, shipping and
              not shipping are equally good — the calculator needs to pick one as a
              starting point, and defaults to
              {' '}<strong>{defaultDecisionLabel}</strong>.
              This choice doesn&apos;t affect the test&apos;s value.
            </>
          ) : (
            <>
              If you had to decide today, your best estimate of the effect ({formattedMean})
              {defaultDecision === 'ship' ? ' meets ' : ' doesn\u2019t meet '}
              your shipping rule ({shippingRuleLabel}), so you&apos;d {defaultDecisionLabel}.
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
