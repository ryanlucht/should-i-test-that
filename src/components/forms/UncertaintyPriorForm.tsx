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
 * Additional features:
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
import { deriveK } from '@/lib/calculations';
import { PriorDistributionChart } from '@/components/charts';
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
 * Callback props for Learning Bits guide integration (Phase 22).
 * These fire trigger events that advance the dialogue to the correct message.
 */
interface UncertaintyPriorFormProps {
  /** Fires when user opens the prior shape accordion (triggers guide M3) */
  onPriorShapeAccordionOpen?: () => void;
  /** Fires when user focuses lower or upper bound inputs (triggers guide M4) */
  onPriorBoundFocus?: () => void;
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
 * Used to provide the chart with the full prior specification.
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
export const UncertaintyPriorForm = forwardRef<UncertaintyPriorFormHandle, UncertaintyPriorFormProps>(
  function UncertaintyPriorForm({ onPriorShapeAccordionOpen, onPriorBoundFocus }, ref) {
    // Get store values and setters
    const inputs = useWizardStore((state) => state.inputs);
    const setInput = useWizardStore((state) => state.setInput);

    // Ref for PriorShapeForm validation
    const priorShapeFormRef = useRef<PriorShapeFormHandle>(null);

    // Accordion state for prior shape section (D-08 — default closed)
    const [priorShapeOpen, setPriorShapeOpen] = useState(false);

    // Check if Uniform prior is selected
    const isUniformPrior = inputs.priorShape === 'uniform';

    // Derive K from baseline inputs if available (for chart)
    // K = N_year * CR0 * V (dollars per unit lift)
    const derivedK =
      inputs.annualVisitors !== null &&
      inputs.baselineConversionRate !== null &&
      inputs.valuePerConversion !== null
        ? deriveK(
            inputs.annualVisitors,
            inputs.baselineConversionRate,
            inputs.valuePerConversion
          )
        : null;

    // Compute threshold in lift space for chart visualization
    // threshold_L = threshold / K (when in dollars) or threshold / 100 (when in lift %)
    const K = derivedK ?? 100000;
    const computedThreshold_L = (() => {
      if (inputs.thresholdValue === null) return 0;
      if (inputs.thresholdUnit === 'lift') return inputs.thresholdValue / 100;
      // dollars: convert to lift space
      return derivedK ? inputs.thresholdValue / derivedK : 0;
    })();

    // Initialize form with react-hook-form and Zod validation
    const methods = useForm<PriorSelectionFormData>({
      resolver: zodResolver(priorSelectionSchema),
      mode: 'onBlur', // Validate on blur per CONTEXT.md
      reValidateMode: 'onBlur', // Re-validate on blur, not while typing
      defaultValues: {
        priorType: inputs.priorType ?? 'default',
        intervalLow: inputs.priorIntervalLow ?? DEFAULT_INTERVAL.low,
        intervalHigh: inputs.priorIntervalHigh ?? DEFAULT_INTERVAL.high,
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
      inputs.priorIntervalLow !== null
        ? String(inputs.priorIntervalLow)
        : String(DEFAULT_INTERVAL.low)
    );
    const [intervalHighDisplay, setIntervalHighDisplay] = useState<string>(
      inputs.priorIntervalHigh !== null
        ? String(inputs.priorIntervalHigh)
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

    // Highlight pulse for implied expected lift when prior is off-center (D-09).
    // Uses a key counter to force DOM remount only on false→true transitions,
    // ensuring the CSS animation replays each time the threshold is crossed.
    // Threshold: |impliedMeanPercent| > 1 (more than 1% off-center)
    const [pulseKey, setPulseKey] = useState(0);
    const prevShouldHighlight = useRef(false);
    const shouldHighlight = Math.abs(impliedMeanPercent) > 1;

    useEffect(() => {
      if (shouldHighlight && !prevShouldHighlight.current) {
        setPulseKey((k) => k + 1); // Force remount for animation replay
      }
      prevShouldHighlight.current = shouldHighlight;
    }, [shouldHighlight]);

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

        setInput('priorType', derivedPriorType);
        setInput('priorIntervalLow', data.intervalLow);
        setInput('priorIntervalHigh', data.intervalHigh);
      },
      [setInput]
    );

    /**
     * Expose validate method to parent via ref
     * Returns true if form is valid and data is stored
     *
     * Also validates the PriorShapeForm
     */
    useImperativeHandle(
      ref,
      () => ({
        validate: async () => {
          // Validate shape form first
          if (priorShapeFormRef.current) {
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
      [trigger, handleSubmit, onSubmit]
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
      setInput('priorType', 'default');
      setInput('priorIntervalLow', DEFAULT_INTERVAL.low);
      setInput('priorIntervalHigh', DEFAULT_INTERVAL.high);
    }, [setValue, setInput]);

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
      if (inputs.priorIntervalLow !== null) {
        setValue('intervalLow', inputs.priorIntervalLow);
        setIntervalLowDisplay(String(inputs.priorIntervalLow));
      }
      if (inputs.priorIntervalHigh !== null) {
        setValue('intervalHigh', inputs.priorIntervalHigh);
        setIntervalHighDisplay(String(inputs.priorIntervalHigh));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputs.priorIntervalLow, inputs.priorIntervalHigh]);

    return (
      <FormProvider {...methods}>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Prior shape accordion toggle (D-08) — default closed */}
          <div className="space-y-4">
            <button
              type="button"
              aria-expanded={priorShapeOpen}
              aria-controls="prior-shape-content"
              onClick={() => {
                const willOpen = !priorShapeOpen;
                setPriorShapeOpen(willOpen);
                if (willOpen) onPriorShapeAccordionOpen?.();
              }}
              className="text-sm font-medium text-primary underline cursor-pointer"
            >
              I want to define the shape of the prior distribution (advanced)
            </button>

            {priorShapeOpen && (
              <div id="prior-shape-content" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground font-medium">
                      What shape describes your uncertainty?
                    </p>
                    <InfoTooltip content="A 'prior' is your belief about the effect before running a test. A wider range means more uncertainty." />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose a distribution shape, then specify your 90% interval.
                  </p>
                </div>
                <PriorShapeForm
                  ref={priorShapeFormRef}
                  onUseDefaultPrior={handleUseDefault}
                  onShapeOptionClick={onPriorShapeAccordionOpen}
                />
              </div>
            )}
          </div>
          {/* Divider between shape selector and interval inputs */}
          <div className="border-t border-border pt-6">
            <p className="text-sm font-medium text-foreground mb-4">
              {isUniformPrior
                ? 'Define the bounds of your uniform distribution:'
                : 'Specify your 90% credible interval:'}
            </p>
          </div>

          {/* Default Prior Option (action button, no selected state) - always shown */}

          {/* Prior selection options */}
          <div className="space-y-4">

              {/* Helper text for Uniform prior */}
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
                            // Fire guide trigger for M4 (bound focus event)
                            onPriorBoundFocus?.();
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
                            // Fire guide trigger for M4 (bound focus event)
                            onPriorBoundFocus?.();
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
                    {/* Highlight pulse container (D-09): wraps implied lift display.
                        Uses key to force remount and replay animation on each false→true transition.
                        Threshold: |impliedMeanPercent| > 1% triggers purple outline animation. */}
                    <div
                      key={shouldHighlight ? pulseKey : 'no-pulse'}
                      className={cn(
                        'flex items-center gap-2 text-sm',
                        shouldHighlight && 'highlight-pulse-container'
                      )}
                    >
                      <span className="text-muted-foreground">
                        {isUniformPrior
                          ? 'Midpoint (expected value):'
                          : 'Implied expected lift:'}
                      </span>
                      <span className="font-medium text-foreground">
                        {impliedMeanPercent > 0 ? '+' : ''}
                        {impliedMeanPercent.toFixed(1)}%
                      </span>
                      {/* For Normal: "std dev", for Student-t: "σ" (scale param, not SD) */}
                      {priorParams && !isUniformPrior && (
                        <span className="text-muted-foreground">
                          ({inputs.priorShape === 'student-t' ? 'σ' : 'std dev'}: {(priorParams.sigma_L * 100).toFixed(2)}%)
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
                  </div>
                )}
          </div>

          {/* Distribution chart - full width */}
          {priorParams && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">
                Your belief distribution:
              </p>
                  {/* Chart reflects selected prior shape */}
                  <PriorDistributionChart
                    prior={buildPriorDistribution(
                      inputs.priorShape ?? 'normal',
                      priorParams,
                      inputs.studentTDf,
                      inputs.priorIntervalLow,
                      inputs.priorIntervalHigh
                    )}
                    threshold_L={computedThreshold_L}
                    K={K}
                  />
            </div>
          )}
        </form>
      </FormProvider>
    );
  }
);
