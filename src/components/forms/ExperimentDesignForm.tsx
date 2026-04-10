/**
 * Experiment Design Form
 *
 * Collects test parameters for EVSI calculation per 05-CONTEXT.md:
 * - Test duration in days (required)
 * - Total daily traffic before eligibility filtering (required, can auto-derive from annual visitors)
 * - Traffic split / variant allocation (default 50%)
 * - Eligibility fraction (default 100%)
 * - Decision latency in days (default 0, visually de-emphasized)
 *
 * These inputs determine sample size and test precision for EVSI.
 *
 * Per CONTEXT.md:
 * - Validation errors appear on blur only (not while typing)
 * - Continue button always enabled; clicking with invalid inputs shows errors
 */

import { useEffect, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  experimentDesignSchema,
  type ExperimentDesignFormData,
} from '@/lib/validation';
import { useWizardStore } from '@/stores/wizardStore';
import { NumberInput } from './inputs/NumberInput';
import { PercentageInput } from './inputs/PercentageInput';
import { decimalToPercent, percentToDecimal } from '@/lib/formatting';

/**
 * Ref handle exposed by ExperimentDesignForm for parent validation trigger
 */
export interface ExperimentDesignFormHandle {
  /** Validate the form and return true if valid, triggering error display if not */
  validate: () => Promise<boolean>;
}

/**
 * Callback props for Learning Bits guide integration (Phase 22).
 */
interface ExperimentDesignFormProps {
  /** Fires when user opens the advanced timing accordion (triggers guide M7) */
  onAdvancedTimingOpen?: () => void;
}

/**
 * Experiment design form with test parameters and validation on blur
 */
export const ExperimentDesignForm = forwardRef<ExperimentDesignFormHandle, ExperimentDesignFormProps>(
  function ExperimentDesignForm({ onAdvancedTimingOpen }, ref) {
    // Get store values and setters
    const inputs = useWizardStore((state) => state.inputs);
    const setInput = useWizardStore((state) => state.setInput);

    // Accordion state for advanced timing section (D-10 — default closed)
    const [advancedTimingOpen, setAdvancedTimingOpen] = useState(false);

    // Auto-derive daily traffic state (POL-03)
    // derivedHint: shown when auto-fill happens, cleared on manual edit
    // derivedValue: tracks the auto-filled value to detect manual edits
    const [derivedHint, setDerivedHint] = useState<string | null>(null);
    const [derivedValue, setDerivedValue] = useState<number | null>(null);

    // Initialize form with react-hook-form and Zod validation
    const methods = useForm<ExperimentDesignFormData>({
      resolver: zodResolver(experimentDesignSchema),
      mode: 'onBlur', // Validate on blur per CONTEXT.md
      reValidateMode: 'onBlur', // Re-validate on blur, not while typing
      defaultValues: {
        testDurationDays: inputs.testDurationDays ?? undefined,
        dailyTraffic: inputs.dailyTraffic ?? undefined,
        // Convert decimal to percentage for display (0.5 -> 50)
        // Check for null, undefined, AND NaN to handle stale session data
        trafficSplit: inputs.trafficSplit != null && !Number.isNaN(inputs.trafficSplit)
          ? decimalToPercent(inputs.trafficSplit)
          : 50,
        // Convert decimal to percentage for display (1.0 -> 100)
        eligibilityFraction: inputs.eligibilityFraction != null && !Number.isNaN(inputs.eligibilityFraction)
          ? decimalToPercent(inputs.eligibilityFraction)
          : 100,
        decisionLatencyDays: inputs.decisionLatencyDays ?? 0,
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
        setInput('testDurationDays', data.testDurationDays);
        setInput('dailyTraffic', data.dailyTraffic);
        // Convert percentage (e.g., 50) to decimal (e.g., 0.5) before storing
        setInput('trafficSplit', percentToDecimal(data.trafficSplit));
        setInput('eligibilityFraction', percentToDecimal(data.eligibilityFraction));
        setInput('decisionLatencyDays', data.decisionLatencyDays);
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
     * Auto-derive daily traffic from annual visitors
     * Formula: annualVisitors / 365 (rounded to whole number)
     */
    const handleDeriveFromAnnual = useCallback(() => {
      if (inputs.annualVisitors !== null) {
        const derivedDaily = Math.round(inputs.annualVisitors / 365);
        setValue('dailyTraffic', derivedDaily);
        setInput('dailyTraffic', derivedDaily);
      }
    }, [inputs.annualVisitors, setValue, setInput]);

    // Check if we can show the derive button
    const canDeriveFromAnnual = inputs.annualVisitors !== null && inputs.annualVisitors > 0;

    // Per D-01: Auto-derive daily traffic from annual visitors when daily traffic is empty
    // Per D-02: Never overwrite — only when dailyTraffic is null (empty)
    useEffect(() => {
      if (
        inputs.annualVisitors !== null &&
        inputs.annualVisitors > 0 &&
        inputs.dailyTraffic === null
      ) {
        const derived = Math.round(inputs.annualVisitors / 365);
        setValue('dailyTraffic', derived);
        setInput('dailyTraffic', derived);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: derived state sync from store (D-01 auto-derive)
        setDerivedValue(derived);
        setDerivedHint('(derived from annual visitors)');
      }
    }, [inputs.annualVisitors, inputs.dailyTraffic, setValue, setInput]);

    // Clear hint when user manually edits the daily traffic field (D-03)
    useEffect(() => {
      if (
        derivedValue !== null &&
        inputs.dailyTraffic !== null &&
        inputs.dailyTraffic !== derivedValue
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: clear hint when user overrides derived value
        setDerivedHint(null);
      }
    }, [inputs.dailyTraffic, derivedValue]);

    // Sync form with store changes (e.g., if store is reset)
    // Use != null to check for both null AND undefined (handles stale session data)
    useEffect(() => {
      if (inputs.testDurationDays != null) {
        setValue('testDurationDays', inputs.testDurationDays);
      }
      if (inputs.dailyTraffic != null) {
        setValue('dailyTraffic', inputs.dailyTraffic);
      }
      if (inputs.trafficSplit != null && !Number.isNaN(inputs.trafficSplit)) {
        setValue('trafficSplit', decimalToPercent(inputs.trafficSplit));
      }
      if (inputs.eligibilityFraction != null && !Number.isNaN(inputs.eligibilityFraction)) {
        setValue('eligibilityFraction', decimalToPercent(inputs.eligibilityFraction));
      }
      if (inputs.decisionLatencyDays != null) {
        setValue('decisionLatencyDays', inputs.decisionLatencyDays);
      }
    }, [
      inputs.testDurationDays,
      inputs.dailyTraffic,
      inputs.trafficSplit,
      inputs.eligibilityFraction,
      inputs.decisionLatencyDays,
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

          {/* Primary inputs - 2-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Test Duration (required) */}
            <NumberInput
              name="testDurationDays"
              label="Test duration"
              placeholder="14"
              tooltip="Enter duration in days. Longer tests = more data = less noise."
              error={errors.testDurationDays?.message}
              suffix="days"
              ariaLabel="Test duration in days"
            />

            {/* Daily Traffic (required, with inline derive option) */}
            <NumberInput
              name="dailyTraffic"
              label="Total daily traffic (before eligibility)"
              placeholder="5,000"
              tooltip="Total daily traffic to the site or app, before experiment eligibility filtering. Use Eligible traffic below to specify the share that qualifies."
              error={errors.dailyTraffic?.message}
              helpText={derivedHint ?? undefined}
              labelSuffix={
                canDeriveFromAnnual ? (
                  <button
                    type="button"
                    onClick={handleDeriveFromAnnual}
                    className="text-xs text-primary hover:text-primary/80"
                    title="Sets daily traffic = annual visitors / 365 (total traffic, before eligibility filtering)"
                  >
                    (derive: {Math.round(inputs.annualVisitors! / 365).toLocaleString()}/day)
                  </button>
                ) : undefined
              }
              ariaLabel="Total daily traffic before eligibility, number"
            />

            {/* Traffic Split (pre-filled 50%) */}
            <PercentageInput
              name="trafficSplit"
              label="Variant allocation"
              placeholder="50%"
              tooltip="Percentage of traffic seeing the variant (50% = standard A/B)"
              error={errors.trafficSplit?.message}
              alignWithSuffix="days"
              ariaLabel="Variant allocation, percentage of traffic"
            />

            {/* Eligibility Fraction (pre-filled 100%) */}
            <PercentageInput
              name="eligibilityFraction"
              label="Eligible traffic"
              placeholder="100%"
              tooltip="What fraction of all traffic is eligible for this experiment?"
              error={errors.eligibilityFraction?.message}
              ariaLabel="Eligible traffic, percentage"
            />
          </div>

          {/* Advanced timing accordion (D-10) — default closed */}
          <div className="pt-4 border-t border-border/50 space-y-4">
            <button
              type="button"
              aria-expanded={advancedTimingOpen}
              aria-controls="advanced-timing-content"
              onClick={() => {
                const willOpen = !advancedTimingOpen;
                setAdvancedTimingOpen(willOpen);
                if (willOpen) onAdvancedTimingOpen?.();
              }}
              className="text-sm font-medium text-primary underline cursor-pointer"
            >
              I want to consider time lag of metrics or decision-making
            </button>

            {advancedTimingOpen && (
              <div id="advanced-timing-content" className="space-y-4">
                {/* conversionLatencyDays removed (ENG-07) — users should factor maturation into decisionLatencyDays */}
                {/* Decision Latency (default 0, de-emphasized, tooltip only) */}
                <div className="opacity-75">
                  <NumberInput
                    name="decisionLatencyDays"
                    label="Decision latency"
                    placeholder="0"
                    tooltip="Time needed for analysis, review, and deployment after the test concludes."
                    error={errors.decisionLatencyDays?.message}
                    suffix="days"
                    ariaLabel="Decision latency in days"
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      </FormProvider>
    );
  }
);
