/**
 * Results Section - EVSI results display
 *
 * Requirements covered:
 * - ADV-OUT-01: Primary verdict "up to $Y"
 * - ADV-OUT-02: Y = max(0, EVSI - CoD)
 * - ADV-OUT-03: EVSI display (gross value)
 * - ADV-OUT-04: Cost of Delay display
 * - ADV-OUT-05: Net value display
 * - ADV-OUT-07: Probability test changes decision
 * - EXPORT-01 through EXPORT-04: PNG export functionality
 *
 * Layout order: Verdict > Warnings > ValueBreakdown > SupportingCards
 *   > Waterfall > Plain-English Interpretation > Export > FAQAccordion
 */

import { useMemo, useEffect, useRef } from 'react';
import { useEVSICalculations } from '@/hooks/useEVSICalculations';
import { useWizardStore } from '@/stores/wizardStore';
import { EVSIVerdictCard } from './EVSIVerdictCard';
import { ValueBreakdownCard } from './ValueBreakdownCard';
import { SupportingCard } from './SupportingCard';
import { WaterfallBlock } from './WaterfallBlock';
import { FAQAccordion } from './FAQAccordion';
import { ExportButton } from '@/components/export/ExportButton';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Info } from 'lucide-react';
import {
  formatProbabilityPercent,
  formatPercentage,
  formatThreshold,
} from '@/lib/formatting';
import { trackCalculationCompleted } from '@/lib/analytics';
import { buildPriorFromInputs, DEFAULT_INTERVAL } from '@/lib/prior';
import type { PriorDistribution } from '@/lib/calculations/types';

/**
 * Determine whether the prior mean is exactly at the shipping threshold
 * (an actual tie, not a near-miss). This triggers special copy explaining
 * the tie-break convention.
 *
 * Uses a tiny epsilon (0.01 percentage points) for floating-point tolerance
 * only — not to create a "near-tie" band.
 * - 'any-positive': threshold is 0%, so |priorMean| < 0.01
 * - 'minimum-lift': threshold is thresholdValue, so |priorMean - threshold| < 0.01
 * - 'accept-loss': threshold is -thresholdValue, so |priorMean + threshold| < 0.01
 */
function computeIsTie(
  priorMean: number,
  thresholdScenario: string | null,
  thresholdValue: number | null,
): boolean {
  const TIE_EPSILON = 0.01; // floating-point tolerance only

  if (!thresholdScenario || thresholdScenario === 'any-positive') {
    return Math.abs(priorMean) < TIE_EPSILON;
  }
  if (thresholdScenario === 'minimum-lift' && thresholdValue != null) {
    return Math.abs(priorMean - thresholdValue) < TIE_EPSILON;
  }
  if (thresholdScenario === 'accept-loss' && thresholdValue != null) {
    return Math.abs(priorMean + thresholdValue) < TIE_EPSILON;
  }
  return false;
}

/**
 * Derive a human-readable label for the shipping rule to use in the
 * Plain-English Interpretation block.
 */
function getShippingRuleLabel(thresholdScenario: string | null): string {
  if (!thresholdScenario || thresholdScenario === 'any-positive') {
    return 'ship if the effect looks positive';
  }
  if (thresholdScenario === 'minimum-lift') {
    return 'ship only if the effect clears a minimum bar';
  }
  return 'ship even if the effect is slightly negative';
}

export function ResultsSection() {
  const { loading, results } = useEVSICalculations();
  const inputs = useWizardStore((state) => state.inputs);

  // Shared URL result: the sender's exact computed value.
  // Used instead of the re-calculated value so recipients see the same verdict.
  // Cleared when the recipient modifies any input (setInput clears it).
  const sharedNetValue = useWizardStore((state) => state.sharedNetValue);

  // Analysis name for export filename and sharing context (EXPORT-02 D-06)
  const analysisName = useWizardStore((state) => state.analysisName);
  const setAnalysisName = useWizardStore((state) => state.setAnalysisName);

  // Build prior distribution for export
  // Uses centralized buildPriorFromInputs to ensure consistent calibration
  // with useEVSICalculations hook (Student-t uses t-quantile, not z_0.95).
  // Must be before early return to satisfy React hooks rules.
  const prior: PriorDistribution = useMemo(() => {
    return buildPriorFromInputs({
      priorShape: inputs.priorShape ?? 'normal',
      studentTDf: inputs.studentTDf ?? undefined,
      intervalLowPercent: inputs.priorIntervalLow,
      intervalHighPercent: inputs.priorIntervalHigh,
    });
  }, [
    inputs.priorIntervalLow,
    inputs.priorIntervalHigh,
    inputs.priorShape,
    inputs.studentTDf,
  ]);

  // Track when EVSI calculation completes (OBS-07)
  // Use ref to prevent duplicate tracking on re-renders
  const lastTrackedNetValue = useRef<number | null>(null);

  useEffect(() => {
    // Only track when results exist and loading is complete
    if (!loading && results && results.netValueDollars !== lastTrackedNetValue.current) {
      trackCalculationCompleted('EVSI', results.netValueDollars);
      lastTrackedNetValue.current = results.netValueDollars;
    }
  }, [loading, results]);

  // Show placeholder if no results, not loading, and no shared result.
  if (!loading && !results && sharedNetValue === null) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Complete all previous sections to see your results.
        </p>
      </div>
    );
  }

  // Get prior interval for display
  const priorLow = inputs.priorIntervalLow ?? DEFAULT_INTERVAL.low;
  const priorHigh = inputs.priorIntervalHigh ?? DEFAULT_INTERVAL.high;
  const priorMean = (priorLow + priorHigh) / 2;

  // Tie detection: when prior mean is exactly at the shipping threshold,
  // the starting decision is a tie-break and needs explanation
  const isTie = computeIsTie(
    priorMean,
    inputs.thresholdScenario,
    inputs.thresholdValue,
  );

  return (
    <div className="space-y-6">
      {/* Primary Verdict - ADV-OUT-01, ADV-OUT-02 */}
      <EVSIVerdictCard
        netValueDollars={sharedNetValue ?? (results ? results.netValueDollars : null)}
        isLoading={sharedNetValue !== null ? false : loading}
      />

      {/* Supporting Metrics - ADV-OUT-03 through ADV-OUT-07 */}
      {results && (
        <>
          {/* Calculation Warnings - Accuracy-08 */}
          {results.warnings && results.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  {results.warnings.map((warning, index) => (
                    <p key={warning.code} className={index > 0 ? 'mt-2' : ''}>
                      {warning.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Value Breakdown Card */}
          <ValueBreakdownCard
            evsiDollars={results.evsi.evsiDollars}
            netValueDollars={results.netValueDollars}
            testDurationDays={inputs.testDurationDays ?? 14}
            variantFraction={inputs.trafficSplit ?? 0.5}
            decisionLatencyDays={inputs.decisionLatencyDays ?? 0}
          />

          {/* Supporting Cards Grid */}
          <div className="bg-card rounded-lg border overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {/* Prior Belief — bold the range, show mean as secondary */}
              <SupportingCard
                title="Prior Belief"
                value={`${formatPercentage(priorLow)} to ${formatPercentage(priorHigh)}`}
                description={`Mean: ${priorMean > 0 ? '+' : ''}${priorMean.toFixed(1)}%`}
              />

              {/* Shipping rule — renamed from Threshold per RCI-03/D-05 */}
              <SupportingCard
                title="Shipping rule"
                value={formatThreshold({
                  scenario: (inputs.thresholdScenario ?? 'any-positive') as 'any-positive' | 'minimum-lift' | 'accept-loss',
                  unit: inputs.thresholdUnit,
                  value: inputs.thresholdValue,
                })}
                description={
                  inputs.thresholdScenario !== 'any-positive'
                    ? 'Your minimum bar to deploy'
                    : 'Deploy if the estimated effect is positive'
                }
              />

              {/* Decision impact — directional split per RCI-04/D-05.
                  Only show the dominant direction; hide the near-zero
                  direction since it will always be <1% and is confusing. */}
              <SupportingCard
                title="Decision impact"
                variant={results.evsi.probabilityTestChangesDecision > 0.2 ? 'highlight' : 'default'}
              >
                <div className="space-y-1.5">
                  {/* Show "Keeps you from shipping" row when default is ship (dominant direction) */}
                  {results.evsi.defaultDecision === 'ship' && (
                    <div>
                      <span className="text-xs text-muted-foreground block">P(Keeps you from shipping)</span>
                      <span className="text-lg font-bold text-foreground">
                        {formatProbabilityPercent(results.evsi.pStopsShip ?? 0)}
                      </span>
                    </div>
                  )}
                  {/* Show "Pushes you to ship" row when default is dont-ship (dominant direction) */}
                  {results.evsi.defaultDecision !== 'ship' && (
                    <div>
                      <span className="text-xs text-muted-foreground block">P(Pushes you to ship)</span>
                      <span className="text-lg font-bold text-foreground">
                        {formatProbabilityPercent(results.evsi.pConvincesShip ?? 0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Total chance the test changes your action: {formatProbabilityPercent(results.evsi.probabilityTestChangesDecision)}
                </div>
              </SupportingCard>
            </div>
          </div>

          {/* "Why this result?" waterfall -- visible by default per RCI-02/D-05 */}
          <WaterfallBlock
            defaultDecision={results.evsi.defaultDecision}
            priorLow={priorLow}
            priorHigh={priorHigh}
            priorMean={priorMean}
            shippingRuleLabel={formatThreshold({
              scenario: (inputs.thresholdScenario ?? 'any-positive') as 'any-positive' | 'minimum-lift' | 'accept-loss',
              unit: inputs.thresholdUnit,
              value: inputs.thresholdValue,
            }).toLowerCase()}
            pDecisionChange={results.evsi.probabilityTestChangesDecision}
            testValue={results.evsi.evsiDollars}
            timingCost={results.evsi.evsiDollars - results.netValueDollars}
            netValue={results.netValueDollars}
            isTie={isTie}
          />

          {/* Plain-English Interpretation — explains the starting decision logic */}
          {(() => {
            const shippingRuleLabel = getShippingRuleLabel(inputs.thresholdScenario);
            const formattedMean = `${priorMean > 0 ? '+' : ''}${priorMean.toFixed(1)}%`;
            const defaultLabel = results.evsi.defaultDecision === 'ship' ? 'ship' : 'not ship';

            // Derive directional interpretation sentence
            const pStopsShip = results.evsi.pStopsShip ?? 0;
            const pConvincesShip = results.evsi.pConvincesShip ?? 0;
            let directionSentence: string;
            if (pStopsShip > 0.01 && pConvincesShip > 0.01) {
              directionSentence =
                'the test is meaningful in both directions: it can either prevent a rollout or increase confidence to launch.';
            } else if (results.evsi.defaultDecision === 'ship') {
              directionSentence =
                'the test is valuable mainly as a guardrail: it often helps you avoid shipping when the downside is still plausible.';
            } else {
              directionSentence =
                'the test is valuable mainly as a confidence builder: it can give you evidence to ship when the upside is uncertain.';
            }

            return (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-blue-900">
                    Plain-English interpretation
                  </h4>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    {isTie ? (
                      <>
                        Your expected effect ({formattedMean}) is right at the boundary of your
                        shipping rule ({shippingRuleLabel}). At this point, shipping and not shipping
                        are equally good — the calculator defaults
                        to <strong>{defaultLabel}</strong>, but this choice doesn&apos;t affect the
                        test&apos;s value. In this setup, {directionSentence}
                      </>
                    ) : (
                      <>
                        Your expected effect ({formattedMean})
                        {results.evsi.defaultDecision === 'ship' ? ' meets ' : ' doesn\u2019t meet '}
                        your shipping rule ({shippingRuleLabel}), so the calculator starts
                        from <strong>{defaultLabel}</strong>.
                        In this case, {directionSentence}
                      </>
                    )}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* PNG Export - EXPORT-01 through EXPORT-04 */}
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-3">
              Share your analysis
            </p>
            <Input
              type="text"
              value={analysisName}
              onChange={(e) => setAnalysisName(e.target.value)}
              placeholder="Name this analysis (optional)"
              className="text-sm mb-3"
              aria-label="Analysis name for export and sharing"
            />
            <ExportButton
              evsiResults={results}
              sharedInputs={inputs}
              prior={prior}
              testDurationDays={inputs.testDurationDays ?? undefined}
              analysisName={analysisName}
            />
          </div>

          {/* FAQ Accordion explainers -- collapsed by default per D-02 */}
          <FAQAccordion
            traffic={inputs.dailyTraffic ?? 0}
            valuePerConversion={inputs.valuePerConversion ?? 0}
            priorLow={priorLow}
            priorHigh={priorHigh}
            pDecisionChange={results.evsi.probabilityTestChangesDecision}
            testValue={results.evsi.evsiDollars}
            timingCost={results.evsi.evsiDollars - results.netValueDollars}
            netValue={results.netValueDollars}
          />
        </>
      )}
    </div>
  );
}
