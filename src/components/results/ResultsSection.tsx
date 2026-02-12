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
 * - EXPORT-01 through EXPORT-04: PNG export functionality
 */

import { useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { useEVPICalculations } from '@/hooks/useEVPICalculations';
import { useWizardStore } from '@/stores/wizardStore';
import { trackCalculationCompleted } from '@/lib/analytics';
import { VerdictCard } from './VerdictCard';
import { SupportingCard } from './SupportingCard';
import { ExportButton } from '@/components/export/ExportButton';
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

  // Track when EVPI calculation completes (OBS-07)
  // Use ref to prevent duplicate tracking on re-renders
  const lastTrackedEvpi = useRef<number | null>(null);

  useEffect(() => {
    if (evpiResults && evpiResults.evpiDollars !== lastTrackedEvpi.current) {
      trackCalculationCompleted('EVPI', evpiResults.evpiDollars);
      lastTrackedEvpi.current = evpiResults.evpiDollars;
    }
  }, [evpiResults]);

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

  // Determine comparison wording for EVPI explanation (BASIC-OUT-07)
  // Uses tolerance for floating point equality comparison
  const EQUALITY_TOLERANCE = 0.001; // 0.1% tolerance
  const getComparisonWording = (): string => {
    if (Math.abs(priorMean - thresholdLift) < EQUALITY_TOLERANCE) {
      return 'meets';
    }
    return priorMean > thresholdLift ? 'exceeds' : 'falls below';
  };
  const comparisonWording = getComparisonWording();

  return (
    <div className="space-y-6">
      {/* Primary Verdict - BASIC-OUT-01, BASIC-OUT-02 */}
      <VerdictCard
        evpiDollars={evpiDollars}
        onAdvancedModeClick={onAdvancedModeClick}
      />

      {/* Supporting Cards Grid - BASIC-OUT-03 through BASIC-OUT-06 */}
      {/* 4-column grid with dividers per DRUIDS mockup (DES-06) */}
      <div className="bg-card rounded-lg border overflow-hidden shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {/* Prior Summary - BASIC-OUT-03 */}
          <SupportingCard
            title="Prior Belief"
            value={`${priorMean > 0 ? '+' : ''}${priorMean.toFixed(1)}%`}
            description={`Range: ${formatPercentage(priorLow)} to ${formatPercentage(priorHigh)}`}
          />

          {/* Threshold Summary - BASIC-OUT-04 */}
          <SupportingCard
            title="Threshold"
            value={
              sharedInputs.thresholdScenario === 'any-positive'
                ? 'Any positive'
                : `${thresholdLift > 0 ? '+' : ''}${thresholdLift}%`
            }
            description={
              sharedInputs.thresholdScenario !== 'any-positive'
                ? `~${formatSmartCurrency(threshold_dollars)}/year`
                : 'Ship if it helps'
            }
          />

          {/* Probability of clearing threshold - BASIC-OUT-05 */}
          <SupportingCard
            title="Success Probability"
            value={formatProbabilityPercent(probabilityClearsThreshold)}
            description={
              // Handle ~50% case separately to avoid misleading "more/less likely" text
              probabilityClearsThreshold >= 0.49 && probabilityClearsThreshold <= 0.51
                ? 'Even odds'
                : probabilityClearsThreshold > 0.5
                  ? 'Likely to clear'
                  : 'Unlikely to clear'
            }
          />

          {/* Chance of regret - BASIC-OUT-06 */}
          <SupportingCard
            title="Regret Risk"
            value={formatProbabilityPercent(chanceOfBeingWrong)}
            description={
              chanceOfBeingWrong > 0.2
                ? 'Significant risk'
                : 'Low risk'
            }
            variant={chanceOfBeingWrong > 0.2 ? 'highlight' : 'default'}
          />
        </div>
      </div>

      {/* Statistical Interpretation Callout - DES-07 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">
            Statistical Interpretation
          </h4>
          <p className="text-sm text-blue-800 leading-relaxed">
            {defaultDecision === 'ship' ? (
              <>
                Based on your current inputs, the expected lift ({priorMean > 0 ? '+' : ''}{priorMean.toFixed(1)}%)
                {' '}{comparisonWording} your threshold ({thresholdLift > 0 ? '+' : ''}{thresholdLift.toFixed(1)}%).
                Without further testing, the rational decision is to <strong>ship</strong>.
                {probabilityClearsThreshold < 0.8 && (
                  <> However, there is a {formatProbabilityPercent(chanceOfBeingWrong)} chance the change actually hurts.</>
                )}
              </>
            ) : (
              <>
                Based on your current inputs, the expected lift ({priorMean > 0 ? '+' : ''}{priorMean.toFixed(1)}%)
                {' '}{comparisonWording} your threshold ({thresholdLift > 0 ? '+' : ''}{thresholdLift.toFixed(1)}%).
                Without further testing, the rational decision is to <strong>not ship</strong>.
                {probabilityClearsThreshold > 0.2 && (
                  <> However, there is a {formatProbabilityPercent(probabilityClearsThreshold)} chance the change is actually worth shipping.</>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* EVPI Intuition - BASIC-OUT-07 */}
      <div className="rounded-xl border bg-muted/30 border-muted p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">
          What {formatSmartCurrency(evpiDollars)} represents
        </p>
        <p className="text-sm text-muted-foreground">
          The {formatSmartCurrency(evpiDollars)} is the expected value of
          the regret you'd avoid by having perfect foresight — it's the maximum
          you should pay for any information about whether this change helps.
        </p>
      </div>

      {/* PNG Export - EXPORT-01 through EXPORT-04 */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-3">
          Share your analysis
        </p>
        <ExportButton
          mode="basic"
          evpiResults={evpiResults}
          sharedInputs={sharedInputs}
        />
      </div>
    </div>
  );
}
