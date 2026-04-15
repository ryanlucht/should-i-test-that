/**
 * WaterfallBlock - Six-step plain-English explanation of the EVSI result
 *
 * Renders a causal waterfall in a blue info panel, showing how prior
 * uncertainty flows into test value and net value. Step 1 includes the
 * directional interpretation (guardrail/confidence-builder) so there's
 * no need for a separate interpretation callout.
 *
 * Per UI-SPEC: visible by default, no toggle, read-only prose block.
 */

import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
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
  /** Directional interpretation sentence (guardrail / confidence-builder / both) */
  directionSentence: string;
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
  /** Effective prior mean in percentage form (after feasibility truncation).
   * When provided and different from priorMean, step 1 explains the discrepancy (SA-4/CR-4). */
  effectivePriorMeanPercent?: number;
}

export function WaterfallBlock({
  defaultDecision,
  priorLow,
  priorHigh,
  priorMean,
  shippingRuleLabel,
  directionSentence,
  pDecisionChange,
  testValue,
  timingCost,
  netValue,
  isTie = false,
  effectivePriorMeanPercent,
}: WaterfallBlockProps) {
  // Convert internal 'dont-ship' to display-friendly "not ship"
  const defaultDecisionLabel = defaultDecision === 'ship' ? 'ship' : 'not ship';

  // Format prior mean with sign for display
  const formattedMean = `${priorMean > 0 ? '+' : ''}${priorMean.toFixed(1)}%`;

  // SA-4/CR-4: Detect when truncation materially shifts the effective prior mean.
  // When effectivePriorMeanPercent is provided and differs from priorMean by >0.1pp,
  // step 1 explains the adjustment from raw input to effective (truncated) prior.
  const hasEffectiveAdjustment = effectivePriorMeanPercent !== undefined
    && Math.abs(effectivePriorMeanPercent - priorMean) > 0.1;
  const formattedEffectiveMean = hasEffectiveAdjustment
    ? `${effectivePriorMeanPercent! > 0 ? '+' : ''}${effectivePriorMeanPercent!.toFixed(1)}%`
    : undefined;

  return (
    <section
      aria-label="Plain English explanation"
      className="bg-blue-50 border border-blue-200 rounded-lg p-6"
    >
      <div className="flex gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-blue-900 mb-4">
            Plain English explanation
          </h4>

          <ol className="space-y-3 list-none">
            {/* Step 1: Starting decision + directional interpretation.
                Shows explicit prior-mean vs shipping-rule comparison,
                then the guardrail/confidence-builder sentence. */}
            <li className="text-sm text-blue-800 leading-relaxed">
              <span className="font-semibold text-blue-900">1.</span>{' '}
              {isTie ? (
                <>
                  Your expected effect ({formattedMean}) is right at the boundary of
                  your shipping rule ({shippingRuleLabel}). Calculating the value of the
                  test requires comparing the post-experiment information to a default
                  decision, and in your case, your pre-experiment guess is a perfect tie
                  between shipping and not shipping. So the calculator has broken the tie
                  by defaulting to <strong>{defaultDecisionLabel}</strong> (don&apos;t
                  worry, the math is equivalent). In this setup, {directionSentence}
                </>
              ) : hasEffectiveAdjustment ? (
                <>
                  Your expected effect ({formattedMean}) is adjusted to {formattedEffectiveMean} after
                  accounting for the range of feasible outcomes. This adjusted expectation
                  {defaultDecision === 'ship' ? ' meets ' : ' doesn\u2019t meet '}
                  your shipping rule ({shippingRuleLabel}), so the calculator starts
                  from <strong>{defaultDecisionLabel}</strong>.
                  In this case, {directionSentence}
                </>
              ) : (
                <>
                  Your expected effect ({formattedMean})
                  {defaultDecision === 'ship' ? ' meets ' : ' doesn\u2019t meet '}
                  your shipping rule ({shippingRuleLabel}), so the calculator starts
                  from <strong>{defaultDecisionLabel}</strong>.
                  In this case, {directionSentence}
                </>
              )}
            </li>

            {/* Step 2: Prior uncertainty range */}
            <li className="text-sm text-blue-800 leading-relaxed">
              <span className="font-semibold text-blue-900">2.</span>{' '}
              But you&apos;re still uncertain about the true effect: before testing,
              a plausible range runs from {formatPercentage(priorLow)} to {formatPercentage(priorHigh)}.
            </li>

            {/* Step 3: Test precision */}
            <li className="text-sm text-blue-800 leading-relaxed">
              <span className="font-semibold text-blue-900">3.</span>{' '}
              Given your traffic and test duration, this experiment is precise enough
              to change what you&apos;d do in about {formatProbabilityPercent(pDecisionChange)} of similar cases.
            </li>

            {/* Step 4: Value of improved decisions (EVSI before delay costs) */}
            <li className="text-sm text-blue-800 leading-relaxed">
              <span className="font-semibold text-blue-900">4.</span>{' '}
              When the test changes your decision, that improved decision-making is
              worth about {formatSmartCurrency(testValue)} on average.
            </li>

            {/* Step 5: Opportunity cost of waiting */}
            <li className="text-sm text-blue-800 leading-relaxed">
              <span className="font-semibold text-blue-900">5.</span>{' '}
              Running the test and waiting for readout delays action, which costs
              about {formatSmartCurrency(Math.abs(timingCost))}.
            </li>

            {/* Step 6: Net value after timing costs */}
            <li className="text-sm text-blue-800 leading-relaxed">
              <span className="font-semibold text-blue-900">6.</span>{' '}
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
        </div>
      </div>
    </section>
  );
}
