/**
 * Advanced Results Section - Complete Advanced mode results display
 *
 * Requirements covered:
 * - ADV-OUT-01: Primary verdict "up to $Y"
 * - ADV-OUT-02: Y = max(0, EVSI - CoD)
 * - ADV-OUT-03: EVSI display (gross value)
 * - ADV-OUT-04: Cost of Delay display
 * - ADV-OUT-05: Net value display
 * - ADV-OUT-07: Probability test changes decision
 *
 * Per 05-CONTEXT.md:
 * - EVSI only: Don't show EVPI comparison in Advanced mode
 * - Chart reflects selected prior shape
 * - Supporting cards adapt from Basic mode
 */

import { useEVSICalculations } from '@/hooks/useEVSICalculations';
import { useWizardStore } from '@/stores/wizardStore';
import { EVSIVerdictCard } from './EVSIVerdictCard';
import { CostOfDelayCard } from './CostOfDelayCard';
import { SupportingCard } from './SupportingCard';
import {
  formatSmartCurrency,
  formatProbabilityPercent,
  formatPercentage,
} from '@/lib/formatting';
import { DEFAULT_INTERVAL } from '@/lib/prior';

export function AdvancedResultsSection() {
  const { loading, results } = useEVSICalculations();
  const sharedInputs = useWizardStore((state) => state.inputs.shared);
  const advancedInputs = useWizardStore((state) => state.inputs.advanced);

  // Don't render anything if in wrong mode or no inputs
  // Hook already handles mode check, but we need advancedInputs for display
  if (!advancedInputs.testDurationDays) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Complete all previous sections to see your results.
        </p>
      </div>
    );
  }

  // Get prior interval for display
  const priorLow = sharedInputs.priorIntervalLow ?? DEFAULT_INTERVAL.low;
  const priorHigh = sharedInputs.priorIntervalHigh ?? DEFAULT_INTERVAL.high;
  const priorMean = (priorLow + priorHigh) / 2;

  // Get threshold for display
  const thresholdLift =
    sharedInputs.thresholdScenario === 'any-positive'
      ? 0
      : sharedInputs.thresholdValue ?? 0;

  return (
    <div className="space-y-6">
      {/* Primary Verdict - ADV-OUT-01, ADV-OUT-02 */}
      <EVSIVerdictCard
        netValueDollars={results ? Math.max(0, results.netValueDollars) : null}
        isLoading={loading}
      />

      {/* Supporting Metrics Grid - ADV-OUT-03 through ADV-OUT-07 */}
      {results && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* EVSI (gross value) - ADV-OUT-03 */}
            <SupportingCard
              title="EVSI (test value)"
              value={formatSmartCurrency(results.evsi.evsiDollars)}
              description="Value of information from this specific test"
            />

            {/* Cost of Delay - ADV-OUT-04 */}
            <CostOfDelayCard
              codResults={results.cod}
              testDurationDays={advancedInputs.testDurationDays}
            />

            {/* Net Value - ADV-OUT-05 */}
            <SupportingCard
              title="Net value"
              value={formatSmartCurrency(Math.max(0, results.netValueDollars))}
              description="EVSI minus Cost of Delay — your headline number"
            />

            {/* Probability test changes decision - ADV-OUT-07 */}
            <SupportingCard
              title="P(test changes decision)"
              value={formatProbabilityPercent(results.evsi.probabilityTestChangesDecision)}
              description={
                results.evsi.probabilityTestChangesDecision > 0.2
                  ? 'Significant chance the test will influence your decision'
                  : 'Low chance the test will change your mind'
              }
              variant={results.evsi.probabilityTestChangesDecision > 0.2 ? 'highlight' : 'default'}
            />
          </div>

          {/* Prior and threshold summary cards (reused from Basic mode pattern) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Prior Summary */}
            <SupportingCard
              title="Your belief (prior)"
              value={`${priorMean > 0 ? '+' : ''}${priorMean.toFixed(1)}% expected lift`}
              description={`90% confident: ${formatPercentage(priorLow)} to ${formatPercentage(priorHigh)}`}
            />

            {/* Threshold Summary */}
            <SupportingCard
              title="Shipping threshold"
              value={
                sharedInputs.thresholdScenario === 'any-positive'
                  ? 'Any positive impact'
                  : `${thresholdLift > 0 ? '+' : ''}${thresholdLift}% lift`
              }
              description={
                sharedInputs.thresholdScenario !== 'any-positive'
                  ? `Your minimum bar to ship`
                  : 'Ship if the change helps at all'
              }
            />
          </div>

          {/* EVSI Intuition */}
          <div className="rounded-xl border bg-muted/30 border-muted p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              How to interpret {formatSmartCurrency(Math.max(0, results.netValueDollars))}
            </p>
            <p className="text-sm text-muted-foreground">
              This test would give you imperfect information about whether your change
              helps. The {formatSmartCurrency(results.evsi.evsiDollars)} EVSI represents
              the expected improvement in your decision from running this test.
              {results.cod.codApplies && (
                <>
                  {' '}However, running the test delays the rollout, costing you{' '}
                  {formatSmartCurrency(results.cod.codDollars)} in expected value.
                </>
              )}
              {' '}The net {formatSmartCurrency(Math.max(0, results.netValueDollars))} is
              the most you should pay to run this test.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
