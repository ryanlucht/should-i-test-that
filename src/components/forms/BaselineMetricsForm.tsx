/**
 * Baseline Metrics Form
 *
 * Collects the three core business inputs from SPEC.md Section 5.1:
 * - Baseline conversion rate (CR0)
 * - Annual visitors (N_year)
 * - Value per conversion (V)
 *
 * These derive K = N_year * CR0 * V (annual dollars per unit lift)
 * which is used throughout EVSI calculations.
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
    const inputs = useWizardStore((state) => state.inputs);
    const setInput = useWizardStore((state) => state.setInput);

    // Initialize form with react-hook-form and Zod validation
    const methods = useForm<BaselineMetricsFormData>({
      resolver: zodResolver(baselineMetricsSchema),
      mode: 'onBlur', // Validate on blur per CONTEXT.md
      reValidateMode: 'onBlur', // Re-validate on blur, not while typing
      defaultValues: {
        // Convert stored decimal to percentage for display
        baselineConversionRate:
          inputs.baselineConversionRate !== null
            ? decimalToPercent(inputs.baselineConversionRate)
            : undefined,
        annualVisitors: inputs.annualVisitors ?? undefined,
        visitorUnitLabel: inputs.visitorUnitLabel || 'visitors',
        valuePerConversion: inputs.valuePerConversion ?? undefined,
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
    // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() is the intended API
    const unitLabel = watch('visitorUnitLabel');

    /**
     * Handle successful form submission - store values in Zustand
     * Converts percentage to decimal before storing per SPEC.md
     */
    const onSubmit = useCallback(
      (data: BaselineMetricsFormData) => {
        // Convert percentage (e.g., 5.0) to decimal (e.g., 0.05) before storing
        setInput(
          'baselineConversionRate',
          percentToDecimal(data.baselineConversionRate)
        );
        setInput('annualVisitors', data.annualVisitors);
        setInput('visitorUnitLabel', data.visitorUnitLabel);
        setInput('valuePerConversion', data.valuePerConversion);
      },
      [setInput]
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
        setInput('visitorUnitLabel', value || 'visitors');
      },
      [setValue, setInput]
    );

    // Sync form with store changes (e.g., if store is reset)
    useEffect(() => {
      if (inputs.baselineConversionRate !== null) {
        setValue(
          'baselineConversionRate',
          decimalToPercent(inputs.baselineConversionRate)
        );
      }
      if (inputs.annualVisitors !== null) {
        setValue('annualVisitors', inputs.annualVisitors);
      }
      if (inputs.visitorUnitLabel) {
        setValue('visitorUnitLabel', inputs.visitorUnitLabel);
      }
      if (inputs.valuePerConversion !== null) {
        setValue('valuePerConversion', inputs.valuePerConversion);
      }
    }, [
      inputs.baselineConversionRate,
      inputs.annualVisitors,
      inputs.visitorUnitLabel,
      inputs.valuePerConversion,
      setValue,
    ]);

    return (
      <FormProvider {...methods}>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Section helper text - keep full width */}
          <p className="text-sm text-muted-foreground">
            This will help us calculate the range of potential outcomes from the test in dollars.
          </p>

          {/* 3-column responsive grid per DRUIDS mockup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Baseline Conversion Rate */}
            <PercentageInput
              name="baselineConversionRate"
              label="Conversion rate"
              placeholder="3.2%"
              tooltip="This is your current conversion rate for the metric and audience/targeting you'd be testing. Ideally, choose a metric that is a revenue-generating event (e.g., visitors to signups)."
              error={errors.baselineConversionRate?.message}
              ariaLabel="Baseline conversion rate, percentage"
            />

            {/* Annual Visitors */}
            <NumberInput
              name="annualVisitors"
              label={`Annual ${unitLabel || 'visitors'}`}
              placeholder="1,000,000"
              tooltip="Enter the number of visitors you expect in a year, based on the audience and triggering conditions of the test. If you want to display a different unit of randomization, you can replace 'visitors' in the text field below."
              error={errors.annualVisitors?.message}
              unitLabelValue={unitLabel}
              onUnitLabelChange={handleUnitLabelChange}
              ariaLabel="Annual visitors, number"
            />

            {/* Value per Conversion */}
            <CurrencyInput
              name="valuePerConversion"
              label="Value per conversion"
              placeholder="$50"
              tooltip="Put the business value of one conversion in dollars. Examples: average order value, gross margin per purchase, first-year LTV, or a blended estimate. Pick one that matches how you evaluate impact."
              error={errors.valuePerConversion?.message}
              ariaLabel="Value per conversion, US dollars"
            />
          </div>
        </form>
      </FormProvider>
    );
  }
);
