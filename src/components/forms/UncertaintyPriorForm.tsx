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
 */

import { useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  priorSelectionSchema,
  type PriorSelectionFormData,
} from '@/lib/validation';
import { DEFAULT_INTERVAL, computePriorFromInterval } from '@/lib/prior';
import { useWizardStore } from '@/stores/wizardStore';
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
 * Uncertainty prior form with default/custom selection and interval inputs
 */
export const UncertaintyPriorForm = forwardRef<UncertaintyPriorFormHandle>(
  function UncertaintyPriorForm(_props, ref) {
    // Get store values and setters
    const sharedInputs = useWizardStore((state) => state.inputs.shared);
    const setSharedInput = useWizardStore((state) => state.setSharedInput);

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
     */
    useImperativeHandle(
      ref,
      () => ({
        validate: async () => {
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
    useEffect(() => {
      if (sharedInputs.priorIntervalLow !== null) {
        setValue('intervalLow', sharedInputs.priorIntervalLow);
      }
      if (sharedInputs.priorIntervalHigh !== null) {
        setValue('intervalHigh', sharedInputs.priorIntervalHigh);
      }
    }, [sharedInputs.priorIntervalLow, sharedInputs.priorIntervalHigh, setValue]);

    return (
      <FormProvider {...methods}>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Section intro */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-foreground font-medium">
                How uncertain are you about whether this change will help or
                hurt?
              </p>
              <InfoTooltip content="A 'prior' is your belief about the effect before running a test. A wider range means more uncertainty." />
            </div>
            <p className="text-sm text-muted-foreground">
              A normal curve is a solid, usually conservative first-pass model
              for effect sizes. Advanced mode can use other shapes.
            </p>
          </div>

          {/* Default Prior Option (action button, no selected state) */}
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
                  I'm 90% sure the relative lift is between -8% and +8%
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This is a reasonable starting point if you're unsure. It
                  assumes most changes have small effects.
                </p>
              </div>
            </button>
          </div>

          {/* Custom Interval Section (always visible) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-foreground">
                Or specify your own 90% credible interval:
              </Label>
              <InfoTooltip content="This means you're 90% confident the true effect falls within this range." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Lower bound input */}
              <div className="space-y-2">
                <Label
                  htmlFor="intervalLow"
                  className="text-sm text-muted-foreground"
                >
                  I'm 90% sure the lift is at least
                </Label>
                <Controller
                  name="intervalLow"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        {...field}
                        id="intervalLow"
                        type="number"
                        step="0.1"
                        placeholder="-5"
                        className={cn(
                          'pr-6',
                          errors.intervalLow && 'border-destructive'
                        )}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        onBlur={() => {
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
                  and at most
                </Label>
                <Controller
                  name="intervalHigh"
                  control={control}
                  render={({ field }) => (
                    <div className="relative">
                      <Input
                        {...field}
                        id="intervalHigh"
                        type="number"
                        step="0.1"
                        placeholder="10"
                        className={cn(
                          'pr-6',
                          errors.intervalHigh && 'border-destructive'
                        )}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        onBlur={() => {
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
                      Implied expected lift:
                    </span>
                    <span className="font-medium text-foreground">
                      {impliedMeanPercent > 0 ? '+' : ''}
                      {impliedMeanPercent.toFixed(1)}%
                    </span>
                    {priorParams && (
                      <span className="text-muted-foreground">
                        (sigma: {(priorParams.sigma_L * 100).toFixed(2)}%)
                      </span>
                    )}
                  </div>

                  {/* Asymmetry Explanation */}
                  {asymmetryMessage && (
                    <div className="rounded-lg bg-muted/50 border border-muted px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        {asymmetryMessage}
                      </p>
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
