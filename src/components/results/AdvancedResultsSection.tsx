/**
 * Results Section - EVSI results display
 *
 * Requirements covered:
 * - ADV-OUT-01: Primary verdict (net value headline)
 * - ADV-OUT-03: EVSI display (gross value)
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
import { AlertTriangle } from 'lucide-react';
import {
  formatProbabilityPercent,
  formatPercentage,
  formatThreshold,
} from '@/lib/formatting';
import { trackCalculationCompleted } from '@/lib/analytics';
import { buildPriorFromInputs, DEFAULT_INTERVAL } from '@/lib/prior';
import type { PriorDistribution } from '@/lib/calculations/types';

/**
 * Threshold for displaying truncation disclosure in the UI.
 * When |effectivePriorMean - rawPriorMean| > this value (in lift units),
 * the UI shows the effective mean after feasibility truncation.
 * 0.001 = 0.1 percentage points of lift difference.
 */
export const TRUNCATION_DISPLAY_THRESHOLD = 0.001;

/**
 * Determine whether the effective prior mean is at the shipping threshold.
 * All comparisons in lift-unit space (decimal) for unit consistency (SA-5).
 *
 * Uses threshold_L from the engine (already normalized to decimal lift units
 * regardless of whether user entered dollars or percentage), so dollar
 * thresholds are handled correctly.
 *
 * @param effectivePriorMeanDecimal - Effective prior mean in decimal lift units
 * @param threshold_L - Threshold in decimal lift units (from engine)
 */
function computeIsTie(
  effectivePriorMeanDecimal: number,
  threshold_L: number,
): boolean {
  const TIE_EPSILON = 0.0001; // 0.01 percentage points in decimal lift
  return Math.abs(effectivePriorMeanDecimal - threshold_L) < TIE_EPSILON;
}


export function ResultsSection() {
  const { loading, results } = useEVSICalculations();
  const inputs = useWizardStore((state) => state.inputs);

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

  // Show placeholder if no results and not loading.
  if (!loading && !results) {
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

  // Raw prior midpoint (user's input, for Prior Belief card display)
  // priorLow/priorHigh are in percentage form (e.g., -5 and 15 for -5% to +15%)
  const rawPriorMean = (priorLow + priorHigh) / 2;
  // Convert to decimal lift units (e.g., 5.0% → 0.05) for comparison with engine output
  const rawPriorMeanDecimal = rawPriorMean / 100;

  // Effective prior mean (after feasibility truncation, from engine)
  // Engine returns effectivePriorMean in decimal lift units (e.g., 0.05 for 5%)
  // NaN guard: if effectivePriorMean is NaN (infeasible prior), fall back to rawPriorMeanDecimal
  // This prevents NaN from propagating to the display layer.
  // (Addresses Codex review concern: NaN propagation through charts/formatters)
  const effectivePriorMean = (results?.effectivePriorMean != null && !isNaN(results.effectivePriorMean))
    ? results.effectivePriorMean
    : rawPriorMeanDecimal;
  // Compare in consistent units (both decimal lift) to detect material truncation
  const truncationMaterial = Math.abs(effectivePriorMean - rawPriorMeanDecimal) > TRUNCATION_DISPLAY_THRESHOLD;

  // Keep priorMean alias for backward compatibility with downstream uses
  const priorMean = rawPriorMean;

  // Tie detection: when effective prior mean is exactly at the shipping threshold,
  // the starting decision is a tie-break and needs explanation.
  // SA-5: Compare in decimal lift units using threshold_L from engine (handles dollar thresholds correctly).
  const isTie = results
    ? computeIsTie(effectivePriorMean, results.threshold_L)
    : false;

  return (
    <div className="space-y-6">
      {/* Primary Verdict - ADV-OUT-01 */}
      <EVSIVerdictCard
        netValueDollars={results ? results.netValueDollars : null}
        isLoading={loading}
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

          {/* SA-3: Infeasible prior message -- suppresses interpretive cards below */}
          {results.isInfeasiblePrior && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Prior belief is infeasible</p>
              <p className="mt-1">
                Your prior belief is incompatible with the baseline conversion rate.
                The entire range of outcomes you specified falls outside what is
                mathematically feasible. Please revise your prior interval or baseline
                rate to see meaningful results.
              </p>
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
          <p className="text-xs text-muted-foreground italic">
            Value scaled to all annual visitors (assumes full rollout after test).
          </p>

          {/* SA-3: Suppress interpretive cards when prior is infeasible */}
          {!results.isInfeasiblePrior && (
          <>
          {/* Supporting Cards Grid */}
          <div className="bg-card rounded-lg border overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {/* Prior Belief — bold the range, show mean as secondary.
                  When truncation is material, use children to render both value and annotation. */}
              {truncationMaterial ? (
                <SupportingCard
                  title="Prior Belief"
                  description={`Mean: ${priorMean > 0 ? '+' : ''}${priorMean.toFixed(1)}%`}
                >
                  <div className="text-xl font-bold text-foreground">
                    {formatPercentage(priorLow)} to {formatPercentage(priorHigh)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    After feasibility truncation: {effectivePriorMean > 0 ? '+' : ''}{(effectivePriorMean * 100).toFixed(1)}%
                  </div>
                </SupportingCard>
              ) : (
                <SupportingCard
                  title="Prior Belief"
                  value={`${formatPercentage(priorLow)} to ${formatPercentage(priorHigh)}`}
                  description={`Mean: ${priorMean > 0 ? '+' : ''}${priorMean.toFixed(1)}%`}
                />
              )}

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

          {/* Plain English explanation — waterfall with integrated interpretation */}
          {(() => {
            // Derive directional interpretation sentence for step 1
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
                directionSentence={directionSentence}
                pDecisionChange={results.evsi.probabilityTestChangesDecision}
                testValue={results.evsi.evsiDollars}
                timingCost={results.evsi.evsiDollars - results.netValueDollars}
                netValue={results.netValueDollars}
                isTie={isTie}
                effectivePriorMeanPercent={truncationMaterial ? effectivePriorMean * 100 : undefined}
              />
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
              mode="advanced"
              evsiResults={results}
              sharedInputs={inputs}
              prior={prior}
              testDurationDays={inputs.testDurationDays ?? undefined}
              analysisName={analysisName}
              effectivePriorMean={results?.effectivePriorMean}
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
        </>
      )}
    </div>
  );
}
