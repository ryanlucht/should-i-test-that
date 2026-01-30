/**
 * Baseline Metrics Form
 *
 * Collects the three core business inputs from SPEC.md Section 5.1:
 * - Baseline conversion rate (CR0)
 * - Annual visitors (N_year)
 * - Value per conversion (V)
 *
 * These derive K = N_year * CR0 * V (annual dollars per unit lift)
 * which is used throughout EVPI/EVSI calculations.
 *
 * Per CONTEXT.md:
 * - Validation errors appear on blur only (not while typing)
 * - Continue button always enabled; clicking with invalid inputs shows errors
 */

import { useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  baselineMetricsSchema,
  type BaselineMetricsFormData,
} from '@/lib/validation';
import { percentToDecimal, decimalToPercent } from '@/lib/formatting';
import { useWizardStore } from '@/stores/wizardStore';
import { PercentageInput } from './inputs/PercentageInput';
import { NumberInput } from './inputs/NumberInput';
import { CurrencyInput } from './inputs/CurrencyInput';

/**
 * Ref handle exposed by BaselineMetricsForm for parent validation trigger
 */
export interface BaselineMetricsFormHandle {
  /** Validate the form and return true if valid, triggering error display if not */
  validate: () => Promise<boolean>;
}

/**
 * Baseline metrics form with three inputs and validation on blur
 */
export const BaselineMetricsForm = forwardRef<BaselineMetricsFormHandle>(
  function BaselineMetricsForm(_props, ref) {
    // Get store values and setters
    const sharedInputs = useWizardStore((state) => state.inputs.shared);
    const setSharedInput = useWizardStore((state) => state.setSharedInput);

    // Initialize form with react-hook-form and Zod validation
    const methods = useForm<BaselineMetricsFormData>({
      resolver: zodResolver(baselineMetricsSchema),
      mode: 'onBlur', // Validate on blur per CONTEXT.md
      reValidateMode: 'onBlur', // Re-validate on blur, not while typing
      defaultValues: {
        // Convert stored decimal to percentage for display
        baselineConversionRate:
          sharedInputs.baselineConversionRate !== null
            ? decimalToPercent(sharedInputs.baselineConversionRate)
            : undefined,
        annualVisitors: sharedInputs.annualVisitors ?? undefined,
        visitorUnitLabel: sharedInputs.visitorUnitLabel || 'visitors',
        valuePerConversion: sharedInputs.valuePerConversion ?? undefined,
      },
    });

    const {
      handleSubmit,
      trigger,
      watch,
      setValue,
      formState: { errors },
    } = methods;

    // Watch the unit label for the label text
    const unitLabel = watch('visitorUnitLabel');

    /**
     * Handle successful form submission - store values in Zustand
     * Converts percentage to decimal before storing per SPEC.md
     */
    const onSubmit = useCallback(
      (data: BaselineMetricsFormData) => {
        // Convert percentage (e.g., 5.0) to decimal (e.g., 0.05) before storing
        setSharedInput(
          'baselineConversionRate',
          percentToDecimal(data.baselineConversionRate)
        );
        setSharedInput('annualVisitors', data.annualVisitors);
        setSharedInput('visitorUnitLabel', data.visitorUnitLabel);
        setSharedInput('valuePerConversion', data.valuePerConversion);
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
     * Handle unit label changes
     * Updates both form state and store
     */
    const handleUnitLabelChange = useCallback(
      (value: string) => {
        setValue('visitorUnitLabel', value || 'visitors');
        setSharedInput('visitorUnitLabel', value || 'visitors');
      },
      [setValue, setSharedInput]
    );

    // Sync form with store changes (e.g., if store is reset)
    useEffect(() => {
      if (sharedInputs.baselineConversionRate !== null) {
        setValue(
          'baselineConversionRate',
          decimalToPercent(sharedInputs.baselineConversionRate)
        );
      }
      if (sharedInputs.annualVisitors !== null) {
        setValue('annualVisitors', sharedInputs.annualVisitors);
      }
      if (sharedInputs.visitorUnitLabel) {
        setValue('visitorUnitLabel', sharedInputs.visitorUnitLabel);
      }
      if (sharedInputs.valuePerConversion !== null) {
        setValue('valuePerConversion', sharedInputs.valuePerConversion);
      }
    }, [
      sharedInputs.baselineConversionRate,
      sharedInputs.annualVisitors,
      sharedInputs.visitorUnitLabel,
      sharedInputs.valuePerConversion,
      setValue,
    ]);

    return (
      <FormProvider {...methods}>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Baseline Conversion Rate */}
          <PercentageInput
            name="baselineConversionRate"
            label="Baseline conversion rate"
            placeholder="3.2%"
            helpText="This is your current conversion rate for the metric and audience/targeting you'd be testing. Ideally, choose a metric that is a revenue-generating event (e.g., visitors to signups)."
            tooltip="The percentage of visitors who complete the desired action before any changes."
            error={errors.baselineConversionRate?.message}
          />

          {/* Annual Visitors */}
          <NumberInput
            name="annualVisitors"
            label={`Annual ${unitLabel || 'visitors'}`}
            placeholder="1,000,000"
            helpText={`Enter the number of ${unitLabel || 'visitors'} you expect in a year. If you only know monthly traffic, multiply by 12.`}
            tooltip="Your annualized traffic volume. This determines how much revenue impact a lift percentage translates to."
            error={errors.annualVisitors?.message}
            unitLabelValue={unitLabel}
            onUnitLabelChange={handleUnitLabelChange}
          />

          {/* Value per Conversion */}
          <CurrencyInput
            name="valuePerConversion"
            label="Value per conversion"
            placeholder="$50"
            helpText="Put the business value of one conversion in dollars. Examples: average order value, gross margin per purchase, first-year LTV, or a blended estimate. Pick one that matches how you evaluate impact."
            tooltip="The dollar value your business gains from each conversion event."
            error={errors.valuePerConversion?.message}
          />
        </form>
      </FormProvider>
    );
  }
);
