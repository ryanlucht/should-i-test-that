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
 * Chart reflects selected prior shape.
 */

import { useMemo, useEffect, useRef } from 'react';
import { useEVSICalculations } from '@/hooks/useEVSICalculations';
import { useWizardStore } from '@/stores/wizardStore';
import { EVSIVerdictCard } from './EVSIVerdictCard';
import { ValueBreakdownCard } from './ValueBreakdownCard';
import { SupportingCard } from './SupportingCard';
import { WaterfallBlock } from './WaterfallBlock';
import { ExportButton } from '@/components/export/ExportButton';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Info } from 'lucide-react';
import {
  formatSmartCurrency,
  formatProbabilityPercent,
  formatPercentage,
  formatThreshold,
} from '@/lib/formatting';
import { trackCalculationCompleted } from '@/lib/analytics';
import { buildPriorFromInputs, DEFAULT_INTERVAL } from '@/lib/prior';
import type { PriorDistribution } from '@/lib/calculations/types';

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
    // Uses centralized buildPriorFromInputs to ensure consistent calibration
    // with useEVSICalculations hook (Student-t uses t-quantile, not z_0.95).
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
  // The hook returns null results when inputs are incomplete.
  // When sharedNetValue is set (shared URL), skip the placeholder — the
  // verdict card will display the sender's result immediately.
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

  return (
    <div className="space-y-6">
      {/* Primary Verdict - ADV-OUT-01, ADV-OUT-02 */}
      {/* When arriving from a shared URL, show the sender's exact result
          (sharedNetValue) instead of the re-calculated value. This avoids
          Monte Carlo variance showing a different verdict to recipients. */}
      <EVSIVerdictCard
        netValueDollars={sharedNetValue ?? (results ? results.netValueDollars : null)}
        isLoading={sharedNetValue !== null ? false : loading}
      />

      {/* Supporting Metrics - ADV-OUT-03 through ADV-OUT-07 */}
      {results && (
        <>
          {/* "Why this result?" waterfall -- visible by default per RCI-02/D-05 */}
          <WaterfallBlock
            defaultDecision={results.evsi.defaultDecision}
            priorLow={priorLow}
            priorHigh={priorHigh}
            pDecisionChange={results.evsi.probabilityTestChangesDecision}
            testValue={results.evsi.evsiDollars}
            timingCost={results.evsi.evsiDollars - results.netValueDollars}
            netValue={results.netValueDollars}
          />

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

          {/* Value Breakdown Card - replaces separate EVSI/CoD/NetValue cards */}
          <ValueBreakdownCard
            evsiDollars={results.evsi.evsiDollars}
            netValueDollars={results.netValueDollars}
            testDurationDays={inputs.testDurationDays ?? 14}
            variantFraction={inputs.trafficSplit ?? 0.5}
            decisionLatencyDays={inputs.decisionLatencyDays ?? 0}
          />

          {/* Supporting Cards Grid - matches Basic mode DRUIDS pattern */}
          <div className="bg-card rounded-lg border overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              {/* Prior Summary */}
              <SupportingCard
                title="Prior Belief"
                value={`${priorMean > 0 ? '+' : ''}${priorMean.toFixed(1)}%`}
                description={`Range: ${formatPercentage(priorLow)} to ${formatPercentage(priorHigh)}`}
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
                    : 'Deploy if it helps'
                }
              />

              {/* Decision impact — directional split per RCI-04/D-05 */}
              <SupportingCard
                title="Decision impact"
                variant={results.evsi.probabilityTestChangesDecision > 0.2 ? 'highlight' : 'default'}
              >
                <div className="space-y-1.5">
                  <div>
                    <span className="text-xs text-muted-foreground block">Stops you from shipping</span>
                    <span className="text-lg font-bold text-foreground">
                      {formatProbabilityPercent(results.evsi.pStopsShip ?? 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Convinces you to ship</span>
                    <span className="text-lg font-bold text-foreground">
                      {formatProbabilityPercent(results.evsi.pConvincesShip ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Total chance the test changes your action: {formatProbabilityPercent(results.evsi.probabilityTestChangesDecision)}
                </div>
              </SupportingCard>
            </div>
          </div>

          {/* Statistical Interpretation Callout - POL-04 / RCI-05 */}
          {(() => {
            // Derive main decision mechanism from default decision (per UI-SPEC)
            // If defaultDecision='ship', the test's primary value is preventing bad ships
            // If defaultDecision='dont-ship', the test's primary value is enabling good ships
            const mainDecisionMechanism = results.evsi.defaultDecision === 'ship'
              ? 'stop you from shipping when downside is plausible'
              : 'give you confidence to ship when upside is uncertain';

            return (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-blue-900">
                    Statistical Interpretation
                  </h4>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    Based on your prior belief, the default decision without testing is to{' '}
                    <strong>{results.evsi.defaultDecision === 'ship' ? 'ship' : 'not ship'}</strong>.
                    {' '}This test is mainly valuable because it can{' '}
                    <strong>{mainDecisionMechanism}</strong>{' '}
                    in a meaningful share of outcomes.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* EVSI Intuition */}
          <div className="rounded-xl border bg-muted/30 border-muted p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">
              How to interpret {formatSmartCurrency(results.netValueDollars)}
            </p>
            <p className="text-sm text-muted-foreground">
              The {formatSmartCurrency(results.evsi.evsiDollars)} EVSI (Expected Value of Sample Information) represents
              the expected improvement in your decision from running this test.
              However, running a test has timing costs: during the test period,
              only the variant group receives treatment, and during decision latency,
              nobody does.{' '}
              {results.netValueDollars >= 0 ? (
                <>The net {formatSmartCurrency(results.netValueDollars)} accounts
                for these timing effects and is the most you should pay to run this test.</>
              ) : (
                <>The net {formatSmartCurrency(results.netValueDollars)} indicates
                the timing costs outweigh the expected learning from this test.</>
              )}
            </p>
          </div>

          {/* PNG Export - EXPORT-01 through EXPORT-04 */}
          {/* Analysis name field — per D-06, D-08 */}
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
        </>
      )}
    </div>
  );
}
