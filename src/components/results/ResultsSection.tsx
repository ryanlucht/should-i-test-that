/**
 * ResultsSection - Complete results display with verdict and supporting cards
 *
 * Requirements covered:
 * - BASIC-OUT-01: Primary verdict
 * - BASIC-OUT-02: EVPI warning
 * - BASIC-OUT-03: Prior summary card
 * - BASIC-OUT-04: Threshold summary card
 * - BASIC-OUT-05: Probability of clearing threshold
 * - BASIC-OUT-06: Chance of regret intuition
 * - BASIC-OUT-07: EVPI intuition (expected regret)
 */

import { useEVPICalculations } from '@/hooks/useEVPICalculations';
import { useWizardStore } from '@/stores/wizardStore';
import { VerdictCard } from './VerdictCard';
import { SupportingCard } from './SupportingCard';
import {
  formatSmartCurrency,
  formatProbabilityPercent,
  formatPercentage,
} from '@/lib/formatting';
import { DEFAULT_INTERVAL } from '@/lib/prior';

interface ResultsSectionProps {
  onAdvancedModeClick?: () => void;
}

export function ResultsSection({ onAdvancedModeClick }: ResultsSectionProps) {
  const evpiResults = useEVPICalculations();
  const sharedInputs = useWizardStore((state) => state.inputs.shared);

  // Don't render anything if calculations aren't complete
  if (!evpiResults) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Complete all previous sections to see your results.
        </p>
      </div>
    );
  }

  // Derive display values from EVPI results
  const {
    evpiDollars,
    defaultDecision,
    probabilityClearsThreshold,
    chanceOfBeingWrong,
    threshold_dollars,
  } = evpiResults;

  // Get prior interval for display
  // Use defaults if not set (handles initial state)
  const priorLow = sharedInputs.priorIntervalLow ?? DEFAULT_INTERVAL.low;
  const priorHigh = sharedInputs.priorIntervalHigh ?? DEFAULT_INTERVAL.high;
  // Prior mean is the midpoint of the interval (in percentage units)
  const priorMean = (priorLow + priorHigh) / 2;

  // Get threshold for display
  // For "any-positive", threshold is effectively 0%
  const thresholdLift = sharedInputs.thresholdScenario === 'any-positive'
    ? 0
    : sharedInputs.thresholdValue ?? 0;

  return (
    <div className="space-y-6">
      {/* Primary Verdict - BASIC-OUT-01, BASIC-OUT-02 */}
      <VerdictCard
        evpiDollars={evpiDollars}
        onAdvancedModeClick={onAdvancedModeClick}
      />

      {/* Supporting Cards Grid - BASIC-OUT-03 through BASIC-OUT-06 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Prior Summary - BASIC-OUT-03 */}
        <SupportingCard
          title="Your belief (prior)"
          value={`${priorMean > 0 ? '+' : ''}${priorMean.toFixed(1)}% expected lift`}
          description={`90% confident: ${formatPercentage(priorLow)} to ${formatPercentage(priorHigh)}`}
        />

        {/* Threshold Summary - BASIC-OUT-04 */}
        <SupportingCard
          title="Shipping threshold"
          value={
            sharedInputs.thresholdScenario === 'any-positive'
              ? 'Any positive impact'
              : `${thresholdLift > 0 ? '+' : ''}${thresholdLift}% lift`
          }
          description={
            sharedInputs.thresholdScenario !== 'any-positive'
              ? `Approx. ${formatSmartCurrency(threshold_dollars)}/year`
              : 'Ship if the change helps at all'
          }
        />

        {/* Probability of clearing threshold - BASIC-OUT-05 */}
        <SupportingCard
          title="Chance of clearing threshold"
          value={formatProbabilityPercent(probabilityClearsThreshold)}
          description={
            // Handle ~50% case separately to avoid misleading "more/less likely" text
            probabilityClearsThreshold >= 0.49 && probabilityClearsThreshold <= 0.51
              ? 'Equal odds of clearing the bar'
              : probabilityClearsThreshold > 0.5
                ? 'More likely than not to clear the bar'
                : 'Less likely than not to clear the bar'
          }
        />

        {/* Chance of regret - BASIC-OUT-06 */}
        <SupportingCard
          title="Chance you'd regret not testing"
          value={formatProbabilityPercent(chanceOfBeingWrong)}
          description={
            defaultDecision === 'ship'
              ? `If you ship without testing, there's a ${formatProbabilityPercent(chanceOfBeingWrong)} chance the change actually hurts`
              : `If you don't ship, there's a ${formatProbabilityPercent(chanceOfBeingWrong)} chance you're leaving gains on the table`
          }
          variant={chanceOfBeingWrong > 0.2 ? 'highlight' : 'default'}
        />
      </div>

      {/* EVPI Intuition - BASIC-OUT-07 */}
      <div className="rounded-xl border bg-muted/30 border-muted p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">
          What {formatSmartCurrency(evpiDollars)} represents
        </p>
        <p className="text-sm text-muted-foreground">
          Without testing, your default decision is to{' '}
          <strong>{defaultDecision === 'ship' ? 'ship' : 'not ship'}</strong>.
          The {formatSmartCurrency(evpiDollars)} EVPI is the expected value of
          the regret you'd avoid by having perfect foresight — it's the maximum
          you should pay for any information about whether this change helps.
        </p>
      </div>
    </div>
  );
}
