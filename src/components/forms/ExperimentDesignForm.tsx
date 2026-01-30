/**
 * Experiment Design Form (Advanced mode)
 *
 * Collects test parameters for EVSI calculation per 05-CONTEXT.md:
 * - Test duration in days (required)
 * - Daily eligible traffic (required, can auto-derive from annual visitors)
 * - Traffic split / variant allocation (default 50%)
 * - Eligibility fraction (default 100%)
 * - Conversion latency in days (default 0, visually de-emphasized)
 * - Decision latency in days (default 0, visually de-emphasized)
 *
 * These inputs determine sample size and test precision for EVSI.
 *
 * Per CONTEXT.md:
 * - Validation errors appear on blur only (not while typing)
 * - Continue button always enabled; clicking with invalid inputs shows errors
 */

import { useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  experimentDesignSchema,
  type ExperimentDesignFormData,
} from '@/lib/validation';
import { useWizardStore } from '@/stores/wizardStore';
import { NumberInput } from './inputs/NumberInput';
import { PercentageInput } from './inputs/PercentageInput';
import { Button } from '@/components/ui/button';
import { decimalToPercent, percentToDecimal } from '@/lib/formatting';

/**
 * Ref handle exposed by ExperimentDesignForm for parent validation trigger
 */
export interface ExperimentDesignFormHandle {
  /** Validate the form and return true if valid, triggering error display if not */
  validate: () => Promise<boolean>;
}

/**
 * Experiment design form with test parameters and validation on blur
 */
export const ExperimentDesignForm = forwardRef<ExperimentDesignFormHandle>(
  function ExperimentDesignForm(_props, ref) {
    // Get store values and setters
    const advancedInputs = useWizardStore((state) => state.inputs.advanced);
    const sharedInputs = useWizardStore((state) => state.inputs.shared);
    const setAdvancedInput = useWizardStore((state) => state.setAdvancedInput);

    // Initialize form with react-hook-form and Zod validation
    const methods = useForm<ExperimentDesignFormData>({
      resolver: zodResolver(experimentDesignSchema),
      mode: 'onBlur', // Validate on blur per CONTEXT.md
      reValidateMode: 'onBlur', // Re-validate on blur, not while typing
      defaultValues: {
        testDurationDays: advancedInputs.testDurationDays ?? undefined,
        dailyTraffic: advancedInputs.dailyTraffic ?? undefined,
        // Convert decimal to percentage for display (0.5 -> 50)
        // Check for null, undefined, AND NaN to handle stale session data
        trafficSplit: advancedInputs.trafficSplit != null && !Number.isNaN(advancedInputs.trafficSplit)
          ? decimalToPercent(advancedInputs.trafficSplit)
          : 50,
        // Convert decimal to percentage for display (1.0 -> 100)
        eligibilityFraction: advancedInputs.eligibilityFraction != null && !Number.isNaN(advancedInputs.eligibilityFraction)
          ? decimalToPercent(advancedInputs.eligibilityFraction)
          : 100,
        conversionLatencyDays: advancedInputs.conversionLatencyDays ?? 0,
        decisionLatencyDays: advancedInputs.decisionLatencyDays ?? 0,
      },
    });

    const {
      handleSubmit,
      trigger,
      setValue,
      formState: { errors },
    } = methods;

    /**
     * Handle successful form submission - store values in Zustand
     * Converts percentages back to decimals before storing
     */
    const onSubmit = useCallback(
      (data: ExperimentDesignFormData) => {
        setAdvancedInput('testDurationDays', data.testDurationDays);
        setAdvancedInput('dailyTraffic', data.dailyTraffic);
        // Convert percentage (e.g., 50) to decimal (e.g., 0.5) before storing
        setAdvancedInput('trafficSplit', percentToDecimal(data.trafficSplit));
        setAdvancedInput('eligibilityFraction', percentToDecimal(data.eligibilityFraction));
        setAdvancedInput('conversionLatencyDays', data.conversionLatencyDays);
        setAdvancedInput('decisionLatencyDays', data.decisionLatencyDays);
      },
      [setAdvancedInput]
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
     * Auto-derive daily traffic from annual visitors
     * Formula: annualVisitors / 365 (rounded to whole number)
     */
    const handleDeriveFromAnnual = useCallback(() => {
      if (sharedInputs.annualVisitors !== null) {
        const derivedDaily = Math.round(sharedInputs.annualVisitors / 365);
        setValue('dailyTraffic', derivedDaily);
        setAdvancedInput('dailyTraffic', derivedDaily);
      }
    }, [sharedInputs.annualVisitors, setValue, setAdvancedInput]);

    // Check if we can show the derive button
    const canDeriveFromAnnual = sharedInputs.annualVisitors !== null && sharedInputs.annualVisitors > 0;

    // Sync form with store changes (e.g., if store is reset)
    // Use != null to check for both null AND undefined (handles stale session data)
    useEffect(() => {
      if (advancedInputs.testDurationDays != null) {
        setValue('testDurationDays', advancedInputs.testDurationDays);
      }
      if (advancedInputs.dailyTraffic != null) {
        setValue('dailyTraffic', advancedInputs.dailyTraffic);
      }
      if (advancedInputs.trafficSplit != null && !Number.isNaN(advancedInputs.trafficSplit)) {
        setValue('trafficSplit', decimalToPercent(advancedInputs.trafficSplit));
      }
      if (advancedInputs.eligibilityFraction != null && !Number.isNaN(advancedInputs.eligibilityFraction)) {
        setValue('eligibilityFraction', decimalToPercent(advancedInputs.eligibilityFraction));
      }
      if (advancedInputs.conversionLatencyDays != null) {
        setValue('conversionLatencyDays', advancedInputs.conversionLatencyDays);
      }
      if (advancedInputs.decisionLatencyDays != null) {
        setValue('decisionLatencyDays', advancedInputs.decisionLatencyDays);
      }
    }, [
      advancedInputs.testDurationDays,
      advancedInputs.dailyTraffic,
      advancedInputs.trafficSplit,
      advancedInputs.eligibilityFraction,
      advancedInputs.conversionLatencyDays,
      advancedInputs.decisionLatencyDays,
      setValue,
    ]);

    return (
      <FormProvider {...methods}>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Section intro */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Plan your experiment</h3>
            <p className="text-sm text-muted-foreground">
              These parameters determine sample size and test precision
            </p>
          </div>

          {/* Test Duration (required) */}
          <NumberInput
            name="testDurationDays"
            label="How long will you run the test?"
            placeholder="14"
            helpText="Enter duration in days. Longer tests = more data = less noise."
            tooltip="The number of days you plan to run the experiment. Affects sample size and statistical power."
            error={errors.testDurationDays?.message}
            suffix="days"
          />

          {/* Daily Traffic (required, with auto-derive option) */}
          <div className="space-y-2">
            <NumberInput
              name="dailyTraffic"
              label="Daily eligible traffic"
              placeholder="2,740"
              helpText="Average daily visitors who can enter the experiment"
              tooltip="The number of visitors per day who are eligible to be included in the test."
              error={errors.dailyTraffic?.message}
            />
            {canDeriveFromAnnual && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeriveFromAnnual}
                className="text-primary hover:text-primary/80"
              >
                Derive from annual ({Math.round(sharedInputs.annualVisitors! / 365).toLocaleString()}/day)
              </Button>
            )}
          </div>

          {/* Traffic Split (pre-filled 50%) */}
          <PercentageInput
            name="trafficSplit"
            label="Variant allocation"
            placeholder="50%"
            helpText="Percentage of traffic seeing the variant (50% = standard A/B)"
            tooltip="The fraction of test traffic assigned to the treatment/variant group."
            error={errors.trafficSplit?.message}
          />

          {/* Eligibility Fraction (pre-filled 100%) */}
          <PercentageInput
            name="eligibilityFraction"
            label="Eligible traffic"
            placeholder="100%"
            helpText="What fraction of all traffic is eligible for this experiment?"
            tooltip="Not all visitors may be eligible for every test (e.g., new users only, mobile only)."
            error={errors.eligibilityFraction?.message}
          />

          {/* Latency fields - visually de-emphasized */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Advanced timing (optional)
            </p>

            {/* Conversion Latency (default 0, de-emphasized) */}
            <div className="opacity-75">
              <NumberInput
                name="conversionLatencyDays"
                label="Conversion latency"
                placeholder="0"
                helpText="Days from exposure to expected conversion (e.g., 7 for weekly purchases)"
                tooltip="If conversions typically happen days after first visit, enter that delay here."
                error={errors.conversionLatencyDays?.message}
                suffix="days"
              />
            </div>

            {/* Decision Latency (default 0, de-emphasized) */}
            <div className="opacity-75">
              <NumberInput
                name="decisionLatencyDays"
                label="Decision latency"
                placeholder="0"
                helpText="Days after test ends before you can ship the decision"
                tooltip="Time needed for analysis, review, and deployment after the test concludes."
                error={errors.decisionLatencyDays?.message}
                suffix="days"
              />
            </div>
          </div>
        </form>
      </FormProvider>
    );
  }
);
