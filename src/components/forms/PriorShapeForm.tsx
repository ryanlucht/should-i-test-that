/**
 * Prior Shape Form
 *
 * Allows users to select alternative prior shapes in Advanced mode.
 * Three options per 05-CONTEXT.md and ADV-IN-01, ADV-IN-02, ADV-IN-10:
 * 1. Normal distribution (default) - Standard bell curve
 * 2. Student-t (fat-tailed) - Heavy tails with preset df values
 * 3. Uniform (uninformed) - Equal probability across interval
 *
 * Design patterns:
 * - Uses RadioCard/RadioCardGroup like ThresholdScenarioForm
 * - Student-t shows df preset buttons via ToggleGroup when selected
 * - Store integration via setAdvancedInput
 */

import { useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  priorShapeSchema,
  type PriorShapeFormData,
} from '@/lib/validation';
import { useWizardStore } from '@/stores/wizardStore';
import { RadioCard, RadioCardGroup } from './inputs/RadioCard';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

/** Type for prior shape option */
type PriorShape = 'normal' | 'student-t' | 'uniform';

/** Type for Student-t degrees of freedom presets */
type StudentTDf = 3 | 5 | 10;

/**
 * Ref handle exposed by PriorShapeForm for parent validation trigger
 */
export interface PriorShapeFormHandle {
  /** Validate the form and return true if valid, triggering error display if not */
  validate: () => Promise<boolean>;
}

/**
 * Student-t degrees of freedom preset selector
 * Shows when Student-t shape is selected
 */
function DfPresetSelector({
  value,
  onChange,
}: {
  value: StudentTDf | null;
  onChange: (value: StudentTDf) => void;
}) {
  const handleValueChange = (newValue: string) => {
    // Only update if valid df value (prevents empty on same click)
    const parsed = parseInt(newValue, 10);
    if (parsed === 3 || parsed === 5 || parsed === 10) {
      onChange(parsed as StudentTDf);
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t border-border/50">
      <p className="text-sm font-medium text-foreground">
        How fat should the tails be?
      </p>
      <ToggleGroup
        type="single"
        value={value?.toString() ?? ''}
        onValueChange={handleValueChange}
        className="flex flex-wrap gap-2"
        aria-label="Student-t degrees of freedom"
      >
        <ToggleGroupItem
          value="3"
          aria-label="Heavy tails (df=3)"
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-all',
            'border border-border',
            'data-[state=on]:border-primary data-[state=on]:bg-selected data-[state=on]:text-foreground',
            'data-[state=off]:bg-card data-[state=off]:text-muted-foreground hover:data-[state=off]:bg-muted/50'
          )}
        >
          Heavy tails (df=3)
        </ToggleGroupItem>
        <ToggleGroupItem
          value="5"
          aria-label="Moderate (df=5)"
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-all',
            'border border-border',
            'data-[state=on]:border-primary data-[state=on]:bg-selected data-[state=on]:text-foreground',
            'data-[state=off]:bg-card data-[state=off]:text-muted-foreground hover:data-[state=off]:bg-muted/50'
          )}
        >
          Moderate (df=5)
        </ToggleGroupItem>
        <ToggleGroupItem
          value="10"
          aria-label="Near-normal (df=10)"
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-all',
            'border border-border',
            'data-[state=on]:border-primary data-[state=on]:bg-selected data-[state=on]:text-foreground',
            'data-[state=off]:bg-card data-[state=off]:text-muted-foreground hover:data-[state=off]:bg-muted/50'
          )}
        >
          Near-normal (df=10)
        </ToggleGroupItem>
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">
        Evidence suggests many experimentation programs&apos; outcomes appear fat-tailed:
        most tests are small, but rare outcomes are much larger than a normal curve predicts.
      </p>
    </div>
  );
}

/**
 * Prior shape form with three radio cards for shape selection
 * Only renders in Advanced mode
 */
export const PriorShapeForm = forwardRef<PriorShapeFormHandle>(
  function PriorShapeForm(_props, ref) {
    // Get store values and setters
    const mode = useWizardStore((state) => state.mode);
    const advancedInputs = useWizardStore((state) => state.inputs.advanced);
    const setAdvancedInput = useWizardStore((state) => state.setAdvancedInput);

    // Initialize form with react-hook-form and Zod validation
    const methods = useForm<PriorShapeFormData>({
      resolver: zodResolver(priorShapeSchema),
      mode: 'onBlur',
      reValidateMode: 'onBlur',
      defaultValues: getDefaultValues(advancedInputs),
    });

    const {
      handleSubmit,
      trigger,
      setValue,
      watch,
      formState: { errors },
    } = methods;

    // Watch the shape to show/hide df selector
    const selectedShape = watch('shape') as PriorShape | undefined;
    // Watch df for Student-t
    const selectedDf = watch('df') as StudentTDf | undefined;

    /**
     * Handle shape change - update store and reset df when switching away from Student-t
     */
    const handleShapeChange = useCallback(
      (newShape: string) => {
        const shape = newShape as PriorShape;
        setValue('shape', shape);

        // Update store immediately
        setAdvancedInput('priorShape', shape);

        // Clear df when switching away from Student-t
        if (shape !== 'student-t') {
          setAdvancedInput('studentTDf', null);
          // Clear form df value (though it won't be used for validation)
        } else {
          // When switching to Student-t, set default df if none selected
          if (!advancedInputs.studentTDf) {
            setValue('df', 5); // Default to moderate
            setAdvancedInput('studentTDf', 5);
          }
        }
      },
      [setValue, setAdvancedInput, advancedInputs.studentTDf]
    );

    /**
     * Handle df preset change for Student-t
     */
    const handleDfChange = useCallback(
      (df: StudentTDf) => {
        setValue('df', df);
        setAdvancedInput('studentTDf', df);
      },
      [setValue, setAdvancedInput]
    );

    /**
     * Handle successful form submission - store values in Zustand
     */
    const onSubmit = useCallback(
      (data: PriorShapeFormData) => {
        setAdvancedInput('priorShape', data.shape);
        if (data.shape === 'student-t') {
          setAdvancedInput('studentTDf', data.df);
        } else {
          setAdvancedInput('studentTDf', null);
        }
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

    // Sync form with store changes (e.g., if store is reset)
    useEffect(() => {
      if (advancedInputs.priorShape) {
        setValue('shape', advancedInputs.priorShape);
      }
      if (advancedInputs.priorShape === 'student-t' && advancedInputs.studentTDf) {
        setValue('df', advancedInputs.studentTDf);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [advancedInputs.priorShape, advancedInputs.studentTDf]);

    // Don't render in Basic mode
    if (mode !== 'advanced') {
      return null;
    }

    // Get df error if Student-t selected but no df
    // TypeScript doesn't narrow discriminated union errors automatically,
    // so we use type assertion after runtime check
    const dfError =
      selectedShape === 'student-t' && 'df' in errors
        ? (errors as { df?: { message?: string } }).df?.message
        : undefined;

    return (
      <FormProvider {...methods}>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Section intro */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-foreground">
              What shape describes your uncertainty?
            </h4>
            <p className="text-sm text-muted-foreground">
              Choose the distribution that best matches how you think about possible outcomes.
            </p>
          </div>

          {/* Shape Radio Cards */}
          <RadioCardGroup
            value={selectedShape ?? 'normal'}
            onValueChange={handleShapeChange}
          >
            {/* Normal (default) */}
            <RadioCard
              value="normal"
              title="Normal distribution"
              description="Standard bell curve - a solid default for most experiments."
              isSelected={selectedShape === 'normal'}
            />

            {/* Student-t (fat-tailed) */}
            <RadioCard
              value="student-t"
              title="Fat-tailed (Student-t)"
              description="Heavy tails for when rare large effects are plausible."
              isSelected={selectedShape === 'student-t'}
            >
              <Controller
                name="df"
                control={methods.control}
                render={() => (
                  <DfPresetSelector
                    value={selectedDf ?? advancedInputs.studentTDf}
                    onChange={handleDfChange}
                  />
                )}
              />
              {dfError && (
                <p className="text-sm text-destructive mt-2" role="alert">
                  {dfError}
                </p>
              )}
            </RadioCard>

            {/* Uniform (uninformed) */}
            <RadioCard
              value="uniform"
              title="Uniform (uninformed)"
              description="Equal probability across the entire interval."
              isSelected={selectedShape === 'uniform'}
            >
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-amber-600">
                  Uniform priors should rarely be used; pretending we know nothing is often misleading.
                </p>
              </div>
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
  advancedInputs: ReturnType<typeof useWizardStore.getState>['inputs']['advanced']
): PriorShapeFormData {
  const shape = advancedInputs.priorShape ?? 'normal';

  if (shape === 'student-t') {
    return {
      shape: 'student-t',
      df: advancedInputs.studentTDf ?? 5, // Default to moderate if not set
    };
  }

  if (shape === 'uniform') {
    return { shape: 'uniform' };
  }

  // Default: normal
  return { shape: 'normal' };
}
