/**
 * Threshold Scenario Form
 *
 * Collects the user's shipping threshold via guided scenarios.
 * Three options per SPEC.md Section 7.3:
 * 1. Ship any positive impact (T = 0)
 * 2. Needs minimum lift (T > 0)
 * 3. Worth it even with small loss (T < 0)
 *
 * Per CONTEXT.md:
 * - Horizontal radio cards for scenario selection
 * - Default pre-selected: "Ship if any lift"
 * - Inline input when scenario requires threshold value
 * - Toggle between $ and % for threshold unit
 *
 * Sign convention (CRITICAL per SPEC.md Section 7.3):
 * For scenario 3, user enters "acceptable loss magnitude" as positive.
 * We store as negative threshold internally:
 *   T_$ = -Loss_$ (user enters 5, we store -5)
 */

import { useEffect, useImperativeHandle, forwardRef, useCallback, useState, useRef } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  thresholdScenarioSchema,
  type ThresholdScenarioFormData,
} from '@/lib/validation';
import { useWizardStore } from '@/stores/wizardStore';
import { RadioCard, RadioCardGroup } from './inputs/RadioCard';
import { InfoTooltip } from './inputs/InfoTooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatPercentage, parseCurrency, parsePercentage } from '@/lib/formatting';
import { cn } from '@/lib/utils';

/** Type for threshold scenario option */
type ThresholdScenario = 'any-positive' | 'minimum-lift' | 'accept-loss';

/** Type for threshold unit */
type ThresholdUnit = 'dollars' | 'lift';

/**
 * Ref handle exposed by ThresholdScenarioForm for parent validation trigger
 */
export interface ThresholdScenarioFormHandle {
  /** Validate the form and return true if valid, triggering error display if not */
  validate: () => Promise<boolean>;
}

/**
 * Unit toggle component for switching between $ and % units
 */
function UnitToggle({
  value,
  onChange,
}: {
  value: ThresholdUnit;
  onChange: (value: ThresholdUnit) => void;
}) {
  const handleValueChange = (newValue: string) => {
    // Only update if valid unit (prevents empty on same click)
    if (newValue === 'dollars' || newValue === 'lift') {
      onChange(newValue);
    }
  };

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={handleValueChange}
      className="rounded-lg bg-surface p-1"
      aria-label="Threshold unit"
    >
      <ToggleGroupItem
        value="dollars"
        aria-label="Dollars per year"
        className="rounded-md px-3 py-1.5 text-sm font-medium data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground"
      >
        $ per year
      </ToggleGroupItem>
      <ToggleGroupItem
        value="lift"
        aria-label="Percentage lift"
        className="rounded-md px-3 py-1.5 text-sm font-medium data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground"
      >
        % lift
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/**
 * Inline input for threshold value (used in scenarios 2 and 3)
 */
function ThresholdInlineInput({
  name,
  label,
  unit,
  onUnitChange,
  placeholder,
  helpText,
  error,
}: {
  name: string;
  label: string;
  unit: ThresholdUnit;
  onUnitChange: (unit: ThresholdUnit) => void;
  placeholder: { dollars: string; lift: string };
  helpText?: string;
  error?: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  // Local string state while focused to allow typing decimals without stripping
  const [displayValue, setDisplayValue] = useState<string>('');

  /**
   * Format value for display when NOT focused (blurred state)
   */
  const formatDisplayValue = useCallback(
    (value: number | null | undefined): string => {
      if (value === null || value === undefined) return '';
      return unit === 'dollars' ? formatCurrency(value) : formatPercentage(value);
    },
    [unit]
  );

  return (
    <Controller
      name={name}
      render={({ field }) => {
        /**
         * On change: store raw string in local state (no parsing)
         * This allows typing decimals without them being stripped mid-keystroke
         */
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setDisplayValue(e.target.value);
        };

        /**
         * On blur: parse the local string and propagate to react-hook-form
         */
        const handleBlur = () => {
          setIsFocused(false);
          const parsed =
            unit === 'dollars'
              ? parseCurrency(displayValue)
              : parsePercentage(displayValue);
          field.onChange(parsed);
          field.onBlur();
        };

        /**
         * On focus: initialize local displayValue from the current field value
         */
        const handleFocus = () => {
          setIsFocused(true);
          const val = field.value as number | null | undefined;
          setDisplayValue(val !== null && val !== undefined ? String(val) : '');
        };

        return (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-medium">{label}</Label>
              <UnitToggle value={unit} onChange={onUnitChange} />
            </div>

            <Input
              id={name}
              type="text"
              inputMode="decimal"
              placeholder={unit === 'dollars' ? placeholder.dollars : placeholder.lift}
              value={isFocused ? displayValue : formatDisplayValue(field.value as number | null | undefined)}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              aria-invalid={!!error}
              aria-describedby={error ? `${name}-error` : helpText ? `${name}-help` : undefined}
              className={cn(
                'max-w-[200px]',
                error &&
                  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
              )}
            />

            {helpText && !error && (
              <p id={`${name}-help`} className="text-xs text-muted-foreground">
                {helpText}
              </p>
            )}

            {error && (
              <p id={`${name}-error`} className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

/**
 * Threshold scenario form with three radio cards, conditional inline inputs, and unit toggle
 */
/**
 * Props for ThresholdScenarioForm
 */
interface ThresholdScenarioFormProps {
  /** CR-1: Callback fired when this completed section becomes dirty (user edits a field) */
  onSectionDirty?: () => void;
}

export const ThresholdScenarioForm = forwardRef<ThresholdScenarioFormHandle, ThresholdScenarioFormProps>(
  function ThresholdScenarioForm({ onSectionDirty }, ref) {
    // Get store values and setters
    const inputs = useWizardStore((state) => state.inputs);
    const setInput = useWizardStore((state) => state.setInput);

    // Local state for unit selection (needed for conditional rendering)
    const [minimumLiftUnit, setMinimumLiftUnit] = useState<ThresholdUnit>(
      inputs.thresholdScenario === 'minimum-lift' && inputs.thresholdUnit
        ? inputs.thresholdUnit
        : 'dollars'
    );
    const [acceptLossUnit, setAcceptLossUnit] = useState<ThresholdUnit>(
      inputs.thresholdScenario === 'accept-loss' && inputs.thresholdUnit
        ? inputs.thresholdUnit
        : 'dollars'
    );

    // Initialize form with react-hook-form and Zod validation
    const methods = useForm<ThresholdScenarioFormData>({
      resolver: zodResolver(thresholdScenarioSchema),
      mode: 'onBlur', // Validate on blur per CONTEXT.md
      reValidateMode: 'onBlur', // Re-validate on blur, not while typing
      defaultValues: getDefaultValues(inputs),
    });

    const {
      handleSubmit,
      trigger,
      setValue,
      watch,
      formState: { errors, isDirty },
    } = methods;

    // CR28-03: Fire invalidation only on the false-to-true transition of isDirty.
    // A stable ref tracks previous dirty state so that callback identity changes
    // (from completedSections updates) do not re-fire the invalidation.
    const wasDirtyRef = useRef(isDirty);

    useEffect(() => {
      // Only fire on the clean-to-dirty transition (false -> true)
      if (isDirty && !wasDirtyRef.current && onSectionDirty) {
        onSectionDirty();
      }
      wasDirtyRef.current = isDirty;
    }, [isDirty, onSectionDirty]);

    // Watch the scenario to show/hide inline inputs
    // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() is the intended API
    const selectedScenario = watch('scenario') as ThresholdScenario | undefined;

    /**
     * Handle scenario change - reset related fields when switching
     */
    const handleScenarioChange = useCallback(
      (newScenario: string) => {
        const scenario = newScenario as ThresholdScenario;
        setValue('scenario', scenario);

        // Clear value fields when switching scenarios
        if (scenario === 'any-positive') {
          // No extra fields needed
        } else if (scenario === 'minimum-lift') {
          setValue('thresholdUnit', minimumLiftUnit);
          setValue('thresholdValue', undefined as unknown as number);
        } else if (scenario === 'accept-loss') {
          setValue('thresholdUnit', acceptLossUnit);
          setValue('acceptableLoss', undefined as unknown as number);
        }
      },
      [setValue, minimumLiftUnit, acceptLossUnit]
    );

    /**
     * Handle unit change for minimum-lift scenario
     */
    const handleMinimumLiftUnitChange = useCallback(
      (unit: ThresholdUnit) => {
        setMinimumLiftUnit(unit);
        setValue('thresholdUnit', unit);
        // Clear value when switching units (no auto-conversion)
        setValue('thresholdValue', undefined as unknown as number);
      },
      [setValue]
    );

    /**
     * Handle unit change for accept-loss scenario
     */
    const handleAcceptLossUnitChange = useCallback(
      (unit: ThresholdUnit) => {
        setAcceptLossUnit(unit);
        setValue('thresholdUnit', unit);
        // Clear value when switching units (no auto-conversion)
        setValue('acceptableLoss', undefined as unknown as number);
      },
      [setValue]
    );

    /**
     * Handle successful form submission - store values in Zustand
     */
    const onSubmit = useCallback(
      (data: ThresholdScenarioFormData) => {
        setInput('thresholdScenario', data.scenario);

        if (data.scenario === 'any-positive') {
          // T = 0 for "ship any positive"
          setInput('thresholdUnit', null);
          setInput('thresholdValue', 0);
        } else if (data.scenario === 'minimum-lift') {
          // T > 0, store as-is
          setInput('thresholdUnit', data.thresholdUnit);
          setInput('thresholdValue', data.thresholdValue);
        } else if (data.scenario === 'accept-loss') {
          // Per SPEC.md Section 7.3: set T_$ = -Loss_$ for scenario 3
          // User enters positive "5", we store as -5 (negative threshold)
          setInput('thresholdUnit', data.thresholdUnit);
          setInput('thresholdValue', -data.acceptableLoss);
        }
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

    // Sync form with store changes (e.g., if store is reset)
    useEffect(() => {
      if (inputs.thresholdScenario) {
        setValue('scenario', inputs.thresholdScenario);
      }
      if (inputs.thresholdScenario === 'minimum-lift' && inputs.thresholdValue !== null) {
        setValue('thresholdUnit', inputs.thresholdUnit ?? 'dollars');
        setValue('thresholdValue', inputs.thresholdValue);
        if (inputs.thresholdUnit) {
          setMinimumLiftUnit(inputs.thresholdUnit);
        }
      }
      if (inputs.thresholdScenario === 'accept-loss' && inputs.thresholdValue !== null) {
        setValue('thresholdUnit', inputs.thresholdUnit ?? 'dollars');
        // Convert stored negative back to positive for display
        setValue('acceptableLoss', Math.abs(inputs.thresholdValue));
        if (inputs.thresholdUnit) {
          setAcceptLossUnit(inputs.thresholdUnit);
        }
      }
    }, [
      inputs.thresholdScenario,
      inputs.thresholdUnit,
      inputs.thresholdValue,
      setValue,
    ]);

    // Get appropriate error message based on scenario
    const getInlineInputError = () => {
      if (selectedScenario === 'minimum-lift') {
        const thresholdError = errors as { thresholdValue?: { message?: string } };
        return thresholdError.thresholdValue?.message;
      }
      if (selectedScenario === 'accept-loss') {
        const lossError = errors as { acceptableLoss?: { message?: string } };
        return lossError.acceptableLoss?.message;
      }
      return undefined;
    };

    return (
      <FormProvider {...methods}>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          {/* Section intro */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-medium text-foreground">
                What counts as "worth shipping"?
              </h3>
              <InfoTooltip
                content="The threshold is the break-even point: below it, shipping is a mistake; above it, not shipping is a mistake."
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This helps determine whether the uncertainty about your change is costly.
            </p>
          </div>

          {/* Scenario Radio Cards */}
          <RadioCardGroup
            value={selectedScenario ?? 'any-positive'}
            onValueChange={handleScenarioChange}
          >
            {/* Scenario 1: Ship any positive (DEFAULT) */}
            <RadioCard
              value="any-positive"
              title="Ship if it helps at all"
              description="Any positive impact is worth shipping."
              isSelected={selectedScenario === 'any-positive'}
            />

            {/* Scenario 2: Minimum lift required */}
            <RadioCard
              value="minimum-lift"
              title="Needs a minimum lift"
              description="Implementation cost, maintenance, or other trade-offs mean it needs at least some upside."
              isSelected={selectedScenario === 'minimum-lift'}
            >
              <ThresholdInlineInput
                name="thresholdValue"
                label="Minimum required impact:"
                unit={minimumLiftUnit}
                onUnitChange={handleMinimumLiftUnitChange}
                placeholder={{ dollars: '$10,000', lift: '2%' }}
                error={selectedScenario === 'minimum-lift' ? getInlineInputError() : undefined}
              />
            </RadioCard>

            {/* Scenario 3: Accept small loss */}
            <RadioCard
              value="accept-loss"
              title="Worth it even with a small loss"
              description="Strategic importance or long-term benefits justify shipping even if short-term metrics dip slightly."
              isSelected={selectedScenario === 'accept-loss'}
            >
              <ThresholdInlineInput
                name="acceptableLoss"
                label="Maximum acceptable loss:"
                unit={acceptLossUnit}
                onUnitChange={handleAcceptLossUnitChange}
                placeholder={{ dollars: '$5,000', lift: '1%' }}
                helpText="Enter as a positive number (we'll treat it as a loss)"
                error={selectedScenario === 'accept-loss' ? getInlineInputError() : undefined}
              />
            </RadioCard>
          </RadioCardGroup>
        </form>
      </FormProvider>
    );
  }
);

/**
 * Get default form values from store state
 */
function getDefaultValues(
  inputs: ReturnType<typeof useWizardStore.getState>['inputs']
): ThresholdScenarioFormData {
  const scenario = inputs.thresholdScenario ?? 'any-positive';

  if (scenario === 'any-positive') {
    return { scenario: 'any-positive' };
  }

  if (scenario === 'minimum-lift') {
    return {
      scenario: 'minimum-lift',
      thresholdUnit: inputs.thresholdUnit ?? 'dollars',
      thresholdValue: inputs.thresholdValue ?? undefined,
    } as ThresholdScenarioFormData;
  }

  if (scenario === 'accept-loss') {
    // Convert stored negative back to positive for display
    const displayValue =
      inputs.thresholdValue !== null ? Math.abs(inputs.thresholdValue) : undefined;
    return {
      scenario: 'accept-loss',
      thresholdUnit: inputs.thresholdUnit ?? 'dollars',
      acceptableLoss: displayValue,
    } as ThresholdScenarioFormData;
  }

  // Default fallback
  return { scenario: 'any-positive' };
}
