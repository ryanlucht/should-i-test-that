/**
 * Uncertainty Prior Form
 *
 * Collects the user's prior belief about relative lift.
 * Two options:
 * 1. Default prior: N(0, 0.05) - "typical uncertainty"
 * 2. Custom 90% interval: user specifies L_low and L_high
 *
 * Per CONTEXT.md:
 * - Custom interval inputs always visible (not hidden)
 * - Default values pre-populated in interval fields
 * - "Use Default Prior" button resets to defaults
 * - Show implied mean when custom
 * - Explain asymmetric intervals (mean != 0)
 *
 * Per SPEC.md Section 6.2:
 * - mu_L = (L_low + L_high) / 2
 * - sigma_L = (L_high - L_low) / (2 * z_0.95)
 *
 * Advanced Mode (05-CONTEXT.md):
 * - Shows PriorShapeForm above interval inputs for shape selection
 * - For Uniform prior, interval inputs become distribution bounds
 */

import {
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
  useRef,
} from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  priorSelectionSchema,
  type PriorSelectionFormData,
} from '@/lib/validation';
import { DEFAULT_INTERVAL, computePriorFromInterval } from '@/lib/prior';
import { useWizardStore } from '@/stores/wizardStore';
import { useEVPICalculations } from '@/hooks/useEVPICalculations';
import { deriveK } from '@/lib/calculations';
import { PriorDistributionChart, PriorDistributionChartLegacy } from '@/components/charts';
import type { PriorDistribution } from '@/lib/calculations';
import { PriorShapeForm, type PriorShapeFormHandle } from './PriorShapeForm';
import { InfoTooltip } from './inputs/InfoTooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Ref handle exposed by UncertaintyPriorForm for parent validation trigger
 */
export interface UncertaintyPriorFormHandle {
  /** Validate the form and return true if valid, triggering error display if not */
  validate: () => Promise<boolean>;
}

/**
 * Get the asymmetry explanation message based on implied mean
 * Per CONTEXT.md: Show message when |mean| > 0.5 (percentage points)
 */
function getAsymmetryMessage(impliedMeanPercent: number): string | null {
  const absMean = Math.abs(impliedMeanPercent);

  // No message for symmetric or near-symmetric intervals
  if (absMean <= 0.5) {
    return null;
  }

  if (impliedMeanPercent > 0) {
    // Positive expectation (expecting improvement)
    if (absMean > 5) {
      return "You're encoding a strong prediction that this change will win.";
    } else if (absMean > 2) {
      return "You're encoding a moderate expectation of improvement.";
    } else {
      return "You're encoding a slight expectation that the change will help.";
    }
  } else {
    // Negative expectation (skeptical)
    if (absMean > 5) {
      return "You're encoding a strong expectation that this will underperform.";
    } else if (absMean > 2) {
      return "You're encoding some skepticism about this change.";
    } else {
      return "You're encoding a slight concern that this might hurt.";
    }
  }
}

/**
 * Build a PriorDistribution object based on the selected shape
 *
 * Used in Advanced mode to provide the chart with the full prior specification.
 *
 * @param shape - Selected prior shape ('normal', 'student-t', 'uniform')
 * @param normalParams - Normal distribution parameters (mu_L, sigma_L)
 * @param studentTDf - Degrees of freedom for Student-t (3, 5, or 10)
 * @param intervalLow - Low bound of 90% interval (percentage, e.g., -8.22)
 * @param intervalHigh - High bound of 90% interval (percentage, e.g., 8.22)
 */
function buildPriorDistribution(
  shape: 'normal' | 'student-t' | 'uniform',
  normalParams: { mu_L: number; sigma_L: number },
  studentTDf: 3 | 5 | 10 | null,
  intervalLow: number | null,
  intervalHigh: number | null
): PriorDistribution {
  switch (shape) {
    case 'normal':
      return {
        type: 'normal',
        mu_L: normalParams.mu_L,
        sigma_L: normalParams.sigma_L,
      };

    case 'student-t':
      return {
        type: 'student-t',
        mu_L: normalParams.mu_L,
        sigma_L: normalParams.sigma_L,
        df: studentTDf ?? 5, // Default to moderate tails
      };

    case 'uniform':
      // Uniform uses interval bounds directly (convert percentage to decimal)
      return {
        type: 'uniform',
        low_L: (intervalLow ?? DEFAULT_INTERVAL.low) / 100,
        high_L: (intervalHigh ?? DEFAULT_INTERVAL.high) / 100,
      };

    default:
      // Fallback to Normal
      return {
        type: 'normal',
        mu_L: normalParams.mu_L,
        sigma_L: normalParams.sigma_L,
      };
  }
}

/**
 * Uncertainty prior form with default/custom selection and interval inputs
 */
export const UncertaintyPriorForm = forwardRef<UncertaintyPriorFormHandle>(
  function UncertaintyPriorForm(_props, ref) {
    // Get store values and setters
    const mode = useWizardStore((state) => state.mode);
    const sharedInputs = useWizardStore((state) => state.inputs.shared);
    const advancedInputs = useWizardStore((state) => state.inputs.advanced);
    const setSharedInput = useWizardStore((state) => state.setSharedInput);

    // Ref for PriorShapeForm validation (Advanced mode only)
    const priorShapeFormRef = useRef<PriorShapeFormHandle>(null);

    // Check if Uniform prior is selected (Advanced mode)
    const isUniformPrior =
      mode === 'advanced' && advancedInputs.priorShape === 'uniform';

    // Get EVPI results for chart props (null if inputs incomplete)
    // This provides threshold_L and K when user has completed all sections
    const evpiResults = useEVPICalculations();

    // Derive K from baseline inputs if available (for chart before EVPI completes)
    // K = N_year * CR0 * V (dollars per unit lift)
    const derivedK =
      sharedInputs.annualVisitors !== null &&
      sharedInputs.baselineConversionRate !== null &&
      sharedInputs.valuePerConversion !== null
        ? deriveK(
            sharedInputs.annualVisitors,
            sharedInputs.baselineConversionRate,
            sharedInputs.valuePerConversion
          )
        : null;

    // Initialize form with react-hook-form and Zod validation
    const methods = useForm<PriorSelectionFormData>({
      resolver: zodResolver(priorSelectionSchema),
      mode: 'onBlur', // Validate on blur per CONTEXT.md
      reValidateMode: 'onBlur', // Re-validate on blur, not while typing
      defaultValues: {
        priorType: sharedInputs.priorType ?? 'default',
        intervalLow: sharedInputs.priorIntervalLow ?? DEFAULT_INTERVAL.low,
        intervalHigh: sharedInputs.priorIntervalHigh ?? DEFAULT_INTERVAL.high,
      },
    });

    const {
      control,
      handleSubmit,
      trigger,
      watch,
      setValue,
      formState: { errors },
    } = methods;

    // Local state for interval input display values
    // This allows holding partial input like "-" or "." without parseFloat coercing to NaN
    // The raw string is stored while editing; parsing to number happens on blur
    const [intervalLowDisplay, setIntervalLowDisplay] = useState<string>(
      sharedInputs.priorIntervalLow !== null
        ? String(sharedInputs.priorIntervalLow)
        : String(DEFAULT_INTERVAL.low)
    );
    const [intervalHighDisplay, setIntervalHighDisplay] = useState<string>(
      sharedInputs.priorIntervalHigh !== null
        ? String(sharedInputs.priorIntervalHigh)
        : String(DEFAULT_INTERVAL.high)
    );

    // Track focus state for each interval input
    const [intervalLowFocused, setIntervalLowFocused] = useState(false);
    const [intervalHighFocused, setIntervalHighFocused] = useState(false);

    // Watch interval values for computed displays
    // Note: priorType is tracked in form state but not used for UI styling
    const intervalLow = watch('intervalLow');
    const intervalHigh = watch('intervalHigh');

    // Compute implied mean and prior parameters
    const impliedMeanPercent =
      intervalLow !== undefined && intervalHigh !== undefined
        ? (intervalLow + intervalHigh) / 2
        : 0;

    const priorParams =
      intervalLow !== undefined && intervalHigh !== undefined
        ? computePriorFromInterval(intervalLow, intervalHigh)
        : null;

    // Get asymmetry message
    const asymmetryMessage = getAsymmetryMessage(impliedMeanPercent);

    /**
     * Handle successful form submission - store values in Zustand
     * Derives priorType based on whether interval values match defaults
     */
    const onSubmit = useCallback(
      (data: PriorSelectionFormData) => {
        // Derive priorType based on whether values match defaults
        // Tolerance of 0.01 accounts for floating point comparison
        const isDefault =
          Math.abs(data.intervalLow - DEFAULT_INTERVAL.low) < 0.01 &&
          Math.abs(data.intervalHigh - DEFAULT_INTERVAL.high) < 0.01;

        const derivedPriorType = isDefault ? 'default' : 'custom';

        setSharedInput('priorType', derivedPriorType);
        setSharedInput('priorIntervalLow', data.intervalLow);
        setSharedInput('priorIntervalHigh', data.intervalHigh);
      },
      [setSharedInput]
    );

    /**
     * Expose validate method to parent via ref
     * Returns true if form is valid and data is stored
     *
     * In Advanced mode, also validates the PriorShapeForm
     */
    useImperativeHandle(
      ref,
      () => ({
        validate: async () => {
          // In Advanced mode, validate shape form first
          if (mode === 'advanced' && priorShapeFormRef.current) {
            const shapeValid = await priorShapeFormRef.current.validate();
            if (!shapeValid) {
              return false;
            }
          }

          const isValid = await trigger();
          if (isValid) {
            // Manually trigger submission to store values
            await handleSubmit(onSubmit)();
          }
          return isValid;
        },
      }),
      [trigger, handleSubmit, onSubmit, mode]
    );

    /**
     * Handle "Use Recommended Default" button click
     * Resets interval to default values and sets priorType to 'default'
     */
    const handleUseDefault = useCallback(() => {
      setValue('priorType', 'default');
      setValue('intervalLow', DEFAULT_INTERVAL.low);
      setValue('intervalHigh', DEFAULT_INTERVAL.high);
      // Update display values to match
      setIntervalLowDisplay(String(DEFAULT_INTERVAL.low));
      setIntervalHighDisplay(String(DEFAULT_INTERVAL.high));
      // Also store immediately
      setSharedInput('priorType', 'default');
      setSharedInput('priorIntervalLow', DEFAULT_INTERVAL.low);
      setSharedInput('priorIntervalHigh', DEFAULT_INTERVAL.high);
    }, [setValue, setSharedInput]);

    /**
     * When interval fields change, set priorType to 'custom'
     * The priorType will be derived at validation time based on actual values
     */
    const handleIntervalChange = useCallback(() => {
      setValue('priorType', 'custom');
    }, [setValue]);

    // Sync form with store changes (e.g., if store is reset or back nav)
    // Note: priorType is derived at validation time, so we only sync interval values
    //
    // IMPORTANT: Do NOT include `setValue` in the dependency array!
    // react-hook-form's setValue is not memoized and changes reference every render.
    // Including it would cause this effect to run on every render, overwriting user input.
    // This effect should ONLY run when the store values actually change (from external
    // sources like "Fill with Recommended Default" button or navigation).
    useEffect(() => {
      if (sharedInputs.priorIntervalLow !== null) {
        setValue('intervalLow', sharedInputs.priorIntervalLow);
        setIntervalLowDisplay(String(sharedInputs.priorIntervalLow));
      }
      if (sharedInputs.priorIntervalHigh !== null) {
        setValue('intervalHigh', sharedInputs.priorIntervalHigh);
        setIntervalHighDisplay(String(sharedInputs.priorIntervalHigh));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sharedInputs.priorIntervalLow, sharedInputs.priorIntervalHigh]);

    return (
      <FormProvider {...methods}>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Section intro - varies by mode */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-foreground font-medium">
                {mode === 'advanced'
                  ? 'What shape describes your uncertainty?'
                  : 'How uncertain are you about whether this change will help or hurt?'}
              </p>
              <InfoTooltip content="A 'prior' is your belief about the effect before running a test. A wider range means more uncertainty." />
            </div>
            <p className="text-sm text-muted-foreground">
              {mode === 'advanced'
                ? 'Choose a distribution shape, then specify your 90% interval.'
                : 'A normal distribution is a solid first-pass model for effect sizes. Advanced mode can use other shapes.'}
            </p>
          </div>

          {/* Prior Shape Form (Advanced mode only) */}
          {mode === 'advanced' && (
            <>
              <PriorShapeForm ref={priorShapeFormRef} onUseDefaultPrior={handleUseDefault} />
              {/* Divider between shape selector and interval inputs */}
              <div className="border-t border-border pt-6">
                <p className="text-sm font-medium text-foreground mb-4">
                  {isUniformPrior
                    ? 'Define the bounds of your uniform distribution:'
                    : 'Specify your 90% credible interval:'}
                </p>
              </div>
            </>
          )}

          {/* Default Prior Option (action button, no selected state) */}
          {/* Only show in Basic mode */}
          {mode === 'basic' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleUseDefault}
                className={cn(
                  'w-full rounded-xl border-2 p-4 text-left transition-all',
                  'hover:border-primary/50 hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'border-border bg-card hover:bg-muted/50'
                )}
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    Fill with Recommended Default
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    I&apos;m 90% sure the relative lift is between -8% and +8%
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This is a reasonable starting point if you&apos;re unsure.
                    It assumes most changes have small effects.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Custom Interval Section (always visible) */}
          <div className="space-y-4">
            {/* Only show the header label in Basic mode (Advanced mode has its own header above) */}
            {mode === 'basic' && (
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-foreground">
                  Or specify your own 90% credible interval:
                </Label>
                <InfoTooltip content="This means you're 90% confident the true effect falls within this range." />
              </div>
            )}

            {/* Helper text for Uniform prior in Advanced mode */}
            {isUniformPrior && (
              <p className="text-xs text-muted-foreground">
                These bounds define the edges of your uniform distribution.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Lower bound input */}
              <div className="space-y-2">
                <Label
                  htmlFor="intervalLow"
                  className="text-sm text-muted-foreground"
                >
                  {isUniformPrior
                    ? 'Minimum possible lift'
                    : "I'm 90% sure the lift is at least"}
                </Label>
                <Controller
                  name="intervalLow"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        id="intervalLow"
                        type="text"
                        inputMode="decimal"
                        placeholder="-5"
                        className={cn(
                          'pr-6',
                          errors.intervalLow && 'border-destructive'
                        )}
                        // When focused, show raw string to allow typing "-" or "."
                        // When blurred, show the form value (number converted to string)
                        value={
                          intervalLowFocused
                            ? intervalLowDisplay
                            : field.value !== undefined && field.value !== null
                              ? String(field.value)
                              : ''
                        }
                        onChange={(e) => {
                          // Store raw string in local state (allows "-", ".", etc.)
                          setIntervalLowDisplay(e.target.value);
                        }}
                        onFocus={() => {
                          setIntervalLowFocused(true);
                          // Initialize display value from current form value
                          const val = field.value;
                          setIntervalLowDisplay(
                            val !== undefined && val !== null ? String(val) : ''
                          );
                        }}
                        onBlur={() => {
                          setIntervalLowFocused(false);
                          // Parse and propagate to form on blur
                          const trimmed = intervalLowDisplay.trim();
                          if (
                            trimmed === '' ||
                            trimmed === '-' ||
                            trimmed === '.'
                          ) {
                            field.onChange(undefined);
                          } else {
                            const parsed = parseFloat(trimmed);
                            field.onChange(
                              Number.isNaN(parsed) ? undefined : parsed
                            );
                          }
                          field.onBlur();
                          handleIntervalChange();
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                  )}
                />
                {errors.intervalLow && (
                  <p className="text-sm text-destructive">
                    {errors.intervalLow.message}
                  </p>
                )}
              </div>

              {/* Upper bound input */}
              <div className="space-y-2">
                <Label
                  htmlFor="intervalHigh"
                  className="text-sm text-muted-foreground"
                >
                  {isUniformPrior ? 'Maximum possible lift' : 'and at most'}
                </Label>
                <Controller
                  name="intervalHigh"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        id="intervalHigh"
                        type="text"
                        inputMode="decimal"
                        placeholder="10"
                        className={cn(
                          'pr-6',
                          errors.intervalHigh && 'border-destructive'
                        )}
                        // When focused, show raw string to allow typing "-" or "."
                        // When blurred, show the form value (number converted to string)
                        value={
                          intervalHighFocused
                            ? intervalHighDisplay
                            : field.value !== undefined && field.value !== null
                              ? String(field.value)
                              : ''
                        }
                        onChange={(e) => {
                          // Store raw string in local state (allows "-", ".", etc.)
                          setIntervalHighDisplay(e.target.value);
                        }}
                        onFocus={() => {
                          setIntervalHighFocused(true);
                          // Initialize display value from current form value
                          const val = field.value;
                          setIntervalHighDisplay(
                            val !== undefined && val !== null ? String(val) : ''
                          );
                        }}
                        onBlur={() => {
                          setIntervalHighFocused(false);
                          // Parse and propagate to form on blur
                          const trimmed = intervalHighDisplay.trim();
                          if (
                            trimmed === '' ||
                            trimmed === '-' ||
                            trimmed === '.'
                          ) {
                            field.onChange(undefined);
                          } else {
                            const parsed = parseFloat(trimmed);
                            field.onChange(
                              Number.isNaN(parsed) ? undefined : parsed
                            );
                          }
                          field.onBlur();
                          handleIntervalChange();
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                  )}
                />
                {errors.intervalHigh && (
                  <p className="text-sm text-destructive">
                    {errors.intervalHigh.message}
                  </p>
                )}
              </div>
            </div>

            {/* Implied Mean Display */}
            {intervalLow !== undefined &&
              intervalHigh !== undefined &&
              !errors.intervalLow &&
              !errors.intervalHigh && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      {isUniformPrior
                        ? 'Midpoint (expected value):'
                        : 'Implied expected lift:'}
                    </span>
                    <span className="font-medium text-foreground">
                      {impliedMeanPercent > 0 ? '+' : ''}
                      {impliedMeanPercent.toFixed(1)}%
                    </span>
                    {/* Only show std dev in Advanced mode, hidden in Basic mode */}
                    {priorParams && !isUniformPrior && mode === 'advanced' && (
                      <span className="text-muted-foreground">
                        (std dev: {(priorParams.sigma_L * 100).toFixed(2)}%)
                      </span>
                    )}
                  </div>

                  {/* Asymmetry Explanation (not for Uniform) */}
                  {asymmetryMessage && !isUniformPrior && (
                    <div className="rounded-lg bg-muted/50 border border-muted px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        {asymmetryMessage}
                      </p>
                    </div>
                  )}

                  {/* Prior Distribution Chart */}
                  {/* Per 04-CONTEXT.md: Chart lives in Prior section because it visualizes uncertainty input */}
                  {/* Shows when priorParams are valid; uses EVPI results when available, else derives */}
                  {/* Per 05-CONTEXT.md: In Advanced mode, chart reflects selected prior shape */}
                  {priorParams && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Your belief distribution:
                      </p>
                      {mode === 'advanced' ? (
                        // Advanced mode: build full PriorDistribution based on selected shape
                        <PriorDistributionChart
                          prior={buildPriorDistribution(
                            advancedInputs.priorShape ?? 'normal',
                            priorParams,
                            advancedInputs.studentTDf,
                            sharedInputs.priorIntervalLow,
                            sharedInputs.priorIntervalHigh
                          )}
                          threshold_L={
                            evpiResults
                              ? evpiResults.threshold_dollars / evpiResults.K
                              : 0
                          }
                          K={evpiResults?.K ?? derivedK ?? 100000}
                        />
                      ) : (
                        // Basic mode: use legacy chart (always Normal)
                        <PriorDistributionChartLegacy
                          mu_L={priorParams.mu_L}
                          sigma_L={priorParams.sigma_L}
                          threshold_L={
                            evpiResults
                              ? evpiResults.threshold_dollars / evpiResults.K
                              : 0
                          }
                          K={evpiResults?.K ?? derivedK ?? 100000}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
          </div>
        </form>
      </FormProvider>
    );
  }
);
