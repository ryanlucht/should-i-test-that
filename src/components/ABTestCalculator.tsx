import { useState, useMemo } from 'react';
import { Slider } from './InputControls/Slider';
import { DistributionChart } from './Visualizations/DistributionChart';
import { Tooltip } from './Tooltip';
import { calculateRangeEVPI, calculateRelativeThreshold, getEOLF } from '../utils/calculations';
import { calculateRevenuePerPercentagePoint } from '../utils/revenueCalculator';
import type { DistributionType, RevenueCalculatorInputs } from '../types';

interface ABTestCalculatorProps {
  onBack: () => void;
}

type WizardStep = 'business' | 'impact' | 'threshold' | 'distribution' | 'complete';

/**
 * A/B Test Calculator with wizard-style flow
 *
 * Guides users through:
 * 1. Business Impact (revenue metrics)
 * 2. Expected Impact Range (uncertainty bounds)
 * 3. Decision Threshold (ship criteria)
 * 4. Distribution Shape (advanced)
 */
export function ABTestCalculator({ onBack }: ABTestCalculatorProps) {
  // Wizard state - tracks which sections are "unlocked"
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const [activeStep, setActiveStep] = useState<WizardStep>('business');

  // Revenue inputs
  const [revenueInputs, setRevenueInputs] = useState<RevenueCalculatorInputs>({
    baselineConversionRate: 0.05,
    averageOrderValue: 100,
    annualTraffic: 1_000_000,
  });

  // Distribution settings
  const [distribution, setDistribution] = useState<DistributionType>('normal');
  const [degreesOfFreedom, setDegreesOfFreedom] = useState(5);

  // CI and threshold
  const [lowerBound, setLowerBound] = useState(-2);
  const [upperBound, setUpperBound] = useState(8);
  const [threshold, setThreshold] = useState(0);
  const [thresholdType, setThresholdType] = useState<'zero' | 'positive' | 'negative'>('zero');

  // Calculate revenue per point
  const revenuePerPoint = useMemo(() => {
    return calculateRevenuePerPercentagePoint(revenueInputs);
  }, [revenueInputs]);

  // Calculate EVPI
  const results = useMemo(() => {
    return calculateRangeEVPI({
      lowerBound,
      upperBound,
      threshold,
      lossPerUnit: revenuePerPoint,
      distribution,
      degreesOfFreedom,
    });
  }, [lowerBound, upperBound, threshold, revenuePerPoint, distribution, degreesOfFreedom]);

  const rt = useMemo(
    () => calculateRelativeThreshold(threshold, lowerBound, upperBound),
    [threshold, lowerBound, upperBound]
  );
  const eolf = useMemo(() => getEOLF(rt), [rt]);

  // Number formatting
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${Math.round(value).toLocaleString('en-US')}`;
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatWithCommas = (num: number): string => {
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatPercentSimple = (value: number) => `${(value * 100).toFixed(1)}%`;
  const boundsValid = lowerBound < upperBound;
  const rangeWidthDisplay = Math.abs(upperBound - lowerBound);

  // Step completion handlers
  const completeStep = (step: WizardStep, nextStep: WizardStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
    setActiveStep(nextStep);
  };

  const isStepAccessible = (step: WizardStep): boolean => {
    if (step === 'business') return true;
    if (step === 'impact') return completedSteps.has('business');
    if (step === 'threshold') return completedSteps.has('impact');
    if (step === 'distribution') return completedSteps.has('threshold');
    if (step === 'complete') return completedSteps.has('distribution');
    return false;
  };

  const isStepActive = (step: WizardStep): boolean => {
    return activeStep === step || completedSteps.has(step);
  };

  // Handle threshold type change
  const handleThresholdTypeChange = (type: 'zero' | 'positive' | 'negative') => {
    setThresholdType(type);
    if (type === 'zero') {
      setThreshold(0);
      return;
    }
    if (type === 'positive') {
      setThreshold((prev) => Math.abs(prev));
      return;
    }
    setThreshold((prev) => -Math.abs(prev));
  };

  // Compact number input component
  const CompactInput = ({
    label,
    value,
    onChange,
    prefix,
    suffix,
    helper,
    min,
    max,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    prefix?: string;
    suffix?: string;
    helper?: string;
    min?: number;
    max?: number;
  }) => {
    const [focused, setFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/,/g, '');
      if (!/^-?\d*\.?\d*$/.test(raw) && raw !== '') return;
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        let clamped = parsed;
        if (min !== undefined) clamped = Math.max(min, clamped);
        if (max !== undefined) clamped = Math.min(max, clamped);
        onChange(clamped);
      }
    };

    return (
      <div className="flex-1">
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <div className="relative">
          {prefix && (
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>
          )}
          <input
            type="text"
            inputMode="decimal"
            value={focused ? value.toString() : formatWithCommas(value)}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={`w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${prefix ? 'pl-5' : ''} ${suffix ? 'pr-12' : ''}`}
          />
          {suffix && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">{suffix}</span>
          )}
        </div>
        {helper && <p className="text-xs text-slate-500 mt-1">{helper}</p>}
      </div>
    );
  };

  // Section wrapper with wizard styling
  const Section = ({
    step,
    title,
    children,
    onNext,
    nextLabel = 'Continue',
    showNext = true,
  }: {
    step: WizardStep;
    title: React.ReactNode;
    children: React.ReactNode;
    onNext?: () => void;
    nextLabel?: string;
    showNext?: boolean;
  }) => {
    const accessible = isStepAccessible(step);
    const active = isStepActive(step);
    const completed = completedSteps.has(step);
    const isCurrent = activeStep === step;

    return (
      <div
        className={`card transition-all duration-200 ${
          !accessible ? 'opacity-40 pointer-events-none' : ''
        } ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
        onClick={() => accessible && setActiveStep(step)}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {completed && !isCurrent && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              Done
            </span>
          )}
        </div>

        <div className={!active ? 'opacity-60' : ''}>{children}</div>

        {showNext && isCurrent && onNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="mt-4 btn-primary w-full"
          >
            {nextLabel}
          </button>
        )}
      </div>
    );
  };

  const showResults = completedSteps.has('threshold');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Calculate Your Maximum Test Budget
          </h2>
          <p className="text-slate-600 mt-1">
            Answer a few questions to find out how much an A/B test is worth.
          </p>
        </div>
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">
          ← Back
        </button>
      </div>

      {/* Results - shown after threshold is set */}
      {showResults && (
        <div className="result-highlight">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-1">Maximum Test Budget</h3>
              <p className="text-slate-600 text-sm">
                If you can run your test for less than this, it's worth doing.
              </p>
            </div>
            <div className="text-4xl font-bold text-green-700">{formatCurrency(results.evpi)}</div>
          </div>
        </div>
      )}

      {/* Visualization - shown after impact range is set */}
      {completedSteps.has('impact') && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Your Uncertainty Distribution</h3>
          <div className="bg-slate-50 rounded-lg p-4">
            <DistributionChart
              lowerBound={lowerBound}
              upperBound={upperBound}
              threshold={threshold}
              distribution={distribution}
              degreesOfFreedom={degreesOfFreedom}
              height={180}
              centerAtZero={true}
            />
            <div className="flex gap-6 mt-3 text-sm justify-center flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.3)', border: '1px solid rgb(239, 68, 68)' }} />
                <span className="text-slate-600">Below threshold ({formatPercentSimple(results.probabilityBelowThreshold)})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', border: '1px solid rgb(59, 130, 246)' }} />
                <span className="text-slate-600">Above threshold ({formatPercentSimple(1 - results.probabilityBelowThreshold)})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Business Impact */}
      <Section
        step="business"
        title="1. Business Impact"
        onNext={() => completeStep('business', 'impact')}
      >
        <p className="text-slate-600 text-sm mb-4">
          Help us understand how much revenue is at stake for this experiment.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <CompactInput
              label="Baseline Conversion Rate"
              value={revenueInputs.baselineConversionRate * 100}
              onChange={(v) => setRevenueInputs((prev) => ({ ...prev, baselineConversionRate: v / 100 }))}
              suffix="%"
              helper="Conversion rate from experiment trigger to revenue event"
            />
            <CompactInput
              label="Avg. Conversion Value"
              value={revenueInputs.averageOrderValue}
              onChange={(v) => setRevenueInputs((prev) => ({ ...prev, averageOrderValue: v }))}
              prefix="$"
            />
            <CompactInput
              label="Annual Traffic"
              value={revenueInputs.annualTraffic}
              onChange={(v) => setRevenueInputs((prev) => ({ ...prev, annualTraffic: v }))}
              helper="Based on the targeting conditions of the experiment"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-slate-600">Revenue per 1% relative change:</span>
            <span className="font-semibold text-slate-900">{formatCurrency(revenuePerPoint)}/year</span>
          </div>
        </div>
      </Section>

      {/* Step 2: Expected Impact Range */}
      <Section
        step="impact"
        title="2. Expected Impact Range"
        onNext={() => completeStep('impact', 'threshold')}
      >
        <p className="text-slate-600 text-sm mb-4">
          Estimate the range of possible outcomes. We want your 90% confidence interval—the range where
          you'd be genuinely surprised if the true result fell outside.
        </p>

        <div className="space-y-5">
          <div className="bg-red-50 border border-red-100 rounded-lg p-4">
            <label className="block text-sm font-medium text-red-900 mb-2">
              Pessimistic Bound (Lower)
            </label>
            <p className="text-sm text-red-700 mb-3">
              If this experiment hurts performance, what's the worst realistic outcome? Think of a bad-but-plausible scenario, not an extreme catastrophe.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={lowerBound}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setLowerBound(v);
                }}
                className="w-20 px-2 py-1.5 text-sm border border-red-200 rounded-md focus:ring-2 focus:ring-red-500 text-center"
              />
              <span className="text-sm text-red-700">% relative change in conversion rate</span>
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <label className="block text-sm font-medium text-green-900 mb-2">
              Optimistic Bound (Upper)
            </label>
            <p className="text-sm text-green-700 mb-3">
              If this experiment succeeds, what's the best realistic outcome? Think ambitious but believable—not a miracle.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={upperBound}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setUpperBound(v);
                }}
                className="w-20 px-2 py-1.5 text-sm border border-green-200 rounded-md focus:ring-2 focus:ring-green-500 text-center"
              />
              <span className="text-sm text-green-700">% relative change in conversion rate</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Your range: {formatPercent(lowerBound)} to {formatPercent(upperBound)} (width: {rangeWidthDisplay.toFixed(1)}% relative)
          </p>
          {!boundsValid && (
            <p className="text-xs text-red-600">
              Lower bound must be less than upper bound.
            </p>
          )}
        </div>
      </Section>

      {/* Step 3: Decision Threshold */}
      <Section
        step="threshold"
        title="3. Decision Threshold"
        onNext={() => completeStep('threshold', 'distribution')}
      >
        <p className="text-slate-600 text-sm mb-4">
          What result would you need to see to ship this change?
        </p>

        <div className="space-y-3">
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              thresholdType === 'zero'
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="threshold"
              checked={thresholdType === 'zero'}
              onChange={() => handleThresholdTypeChange('zero')}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-slate-900">Ship any positive impact</div>
              <div className="text-sm text-slate-600">
                If the experiment shows any improvement (even small), we'll ship it.
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              thresholdType === 'positive'
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="threshold"
              checked={thresholdType === 'positive'}
              onChange={() => handleThresholdTypeChange('positive')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900">Requires minimum lift to justify costs</div>
              <div className="text-sm text-slate-600 mb-2">
                The change has implementation costs, maintenance burden, or other trade-offs that require a certain lift to be worth it.
              </div>
              {thresholdType === 'positive' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Minimum lift needed:</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={threshold > 0 ? threshold : ''}
                    placeholder="e.g., 2"
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setThreshold(isNaN(v) ? 0 : Math.max(0, v));
                    }}
                    className="w-16 px-2 py-1 text-sm border border-slate-300 rounded-md text-center"
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
              )}
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              thresholdType === 'negative'
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="threshold"
              checked={thresholdType === 'negative'}
              onChange={() => handleThresholdTypeChange('negative')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900">Would accept a small loss</div>
              <div className="text-sm text-slate-600 mb-2">
                The change has strategic importance or expected long-term benefits that make it worth shipping even with a small negative impact.
              </div>
              {thresholdType === 'negative' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Acceptable loss up to:</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={threshold < 0 ? Math.abs(threshold) : ''}
                    placeholder="e.g., 1"
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setThreshold(isNaN(v) ? 0 : -Math.abs(v));
                    }}
                    className="w-16 px-2 py-1 text-sm border border-slate-300 rounded-md text-center"
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
              )}
            </div>
          </label>
        </div>

        <p className="text-xs text-slate-500 mt-3">
          Current threshold: {formatPercent(threshold)}
        </p>
      </Section>

      {/* Step 4: Distribution Shape (Advanced) */}
      <Section
        step="distribution"
        title={
          <span className="flex items-center gap-2">
            4. Distribution Shape
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-normal">
              Advanced
            </span>
          </span>
        }
        onNext={() => completeStep('distribution', 'complete')}
        nextLabel="Calculate"
      >
        <p className="text-slate-600 text-sm mb-4">
          How do you expect outcomes to be distributed? Most users should stick with the default.
        </p>

        <div className="space-y-2">
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              distribution === 'normal'
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="distribution"
              checked={distribution === 'normal'}
              onChange={() => setDistribution('normal')}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-slate-900">Normal Distribution</div>
              <div className="text-sm text-slate-500">
                Standard bell curve. Most outcomes cluster near the middle. <span className="text-blue-600">(Recommended)</span>
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              distribution === 't-distribution'
                ? 'border-blue-300 bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="distribution"
              checked={distribution === 't-distribution'}
              onChange={() => setDistribution('t-distribution')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900">Fat Tails (t-distribution)</div>
              <div className="text-sm text-slate-500 mb-1">
                Extreme outcomes (big wins or losses) are more likely than normal. Research suggests A/B tests
                often exhibit fat tails.{' '}
                <span className="text-slate-400">
                  <a href="https://eduardomazevedo.github.io/papers/azevedo-et-al-ab.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">[1]</a>{' '}
                  <a href="https://blog.analytics-toolkit.com/2022/what-can-be-learned-from-1001-a-b-tests/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">[2]</a>
                </span>
              </div>
              {distribution === 't-distribution' && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <Slider
                    label="Degrees of Freedom"
                    value={degreesOfFreedom}
                    onChange={setDegreesOfFreedom}
                    min={1}
                    max={30}
                    step={1}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Lower = fatter tails (more extreme outcomes possible).
                  </p>
                </div>
              )}
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              distribution === 'uniform'
                ? 'border-amber-300 bg-amber-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <input
              type="radio"
              name="distribution"
              checked={distribution === 'uniform'}
              onChange={() => setDistribution('uniform')}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-slate-900 flex items-center gap-2">
                Uninformed (Uniform)
                <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">Rarely used</span>
              </div>
              <div className="text-sm text-slate-500">
                All outcomes equally likely. Only use this if you truly have no basis for expecting
                outcomes to cluster around a central value.
              </div>
            </div>
          </label>
        </div>
      </Section>

      {/* Final calculation details (collapsible) */}
      {completedSteps.has('distribution') && (
        <details className="card">
          <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
            How is this calculated?
          </summary>

          <div className="mt-4 space-y-4 text-sm">
            <p className="text-slate-600">
              The <strong>Expected Value of Perfect Information (EVPI)</strong> is calculated using
              methodology from Douglas Hubbard's "How to Measure Anything."
            </p>

            <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Relative Threshold (RT):</span>
                <span>{rt.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <Tooltip content="Expected Opportunity Loss Factor from Hubbard's lookup table">
                  <span className="text-slate-500 border-b border-dashed border-slate-400 cursor-help">EOLF:</span>
                </Tooltip>
                <span>{eolf.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Range Width:</span>
                <span>{(upperBound - lowerBound).toFixed(1)}% relative</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Revenue per 1% relative:</span>
                <span>{formatCurrency(revenuePerPoint)}</span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between font-semibold">
                <span>EVPI =</span>
                <span>{formatCurrency(results.evpi)}</span>
              </div>
            </div>

            <p className="text-slate-500 text-xs">
              EVPI is highest when your threshold is near the middle of your uncertainty range
              (RT ≈ 0.5), meaning you're genuinely uncertain about which way the decision will go.
            </p>
          </div>
        </details>
      )}

      {/* Insight when threshold is at edge */}
      {completedSteps.has('threshold') && (rt < 0.15 || rt > 0.85) && (
        <div className="card bg-amber-50 border border-amber-200">
          <p className="text-amber-800 text-sm">
            <strong>Note:</strong> Your threshold is near the {rt < 0.5 ? 'pessimistic' : 'optimistic'} end
            of your range. This means you're already fairly confident about your decision, so the
            test value is relatively low. Consider whether you really need to test.
          </p>
        </div>
      )}
    </div>
  );
}
