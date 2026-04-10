/**
 * Prior Shape Form
 *
 * Allows users to select alternative prior shapes.
 * Three options per 05-CONTEXT.md and ADV-IN-01, ADV-IN-02, ADV-IN-10:
 * 1. Normal distribution (default) - Standard bell curve
 * 2. Student-t (fat-tailed) - Heavy tails with preset df values
 * 3. Uniform (uninformed) - Equal probability across interval
 *
 * Design patterns:
 * - Uses RadioCard/RadioCardGroup like ThresholdScenarioForm
 * - Student-t shows df preset buttons via ToggleGroup when selected
 * - Store integration via setInput
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
 * Props for PriorShapeForm component
 */
interface PriorShapeFormProps {
  /** Callback to fill recommended default values (triggers parent's handleUseDefault) */
  onUseDefaultPrior?: () => void;
  /** Fires when user clicks a shape option (re-triggers guide M3 per D-12) */
  onShapeOptionClick?: () => void;
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
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">
          How fat should the tails be?
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-xs text-primary hover:text-primary/80 underline"
            >
              What&apos;s this?
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px]" sideOffset={4}>
            Degrees of freedom (df) controls how heavy the tails are. Lower df = fatter tails = more probability of extreme outcomes. This matters when you believe rare large effects are possible but unlikely.
          </TooltipContent>
        </Tooltip>
      </div>
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
 * Prior shape selector with radio cards
 */
export const PriorShapeForm = forwardRef<PriorShapeFormHandle, PriorShapeFormProps>(
  function PriorShapeForm({ onUseDefaultPrior: _onUseDefaultPrior, onShapeOptionClick }, ref) {
    // Get store values and setters
    const inputs = useWizardStore((state) => state.inputs);
    const setInput = useWizardStore((state) => state.setInput);

    // Initialize form with react-hook-form and Zod validation
    const methods = useForm<PriorShapeFormData>({
      resolver: zodResolver(priorShapeSchema),
      mode: 'onBlur',
      reValidateMode: 'onBlur',
      defaultValues: getDefaultValues(inputs),
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
     * Handle shape change - update store and reset df when switching away from Student-t.
     * Also fires onShapeOptionClick to re-trigger guide M3 per D-12.
     */
    const handleShapeChange = useCallback(
      (newShape: string) => {
        const shape = newShape as PriorShape;
        setValue('shape', shape);

        // Update store immediately
        setInput('priorShape', shape);

        // Clear df when switching away from Student-t
        if (shape !== 'student-t') {
          setInput('studentTDf', null);
          // Clear form df value (though it won't be used for validation)
        } else {
          // When switching to Student-t, set default df if none selected
          if (!inputs.studentTDf) {
            setValue('df', 5); // Default to moderate
            setInput('studentTDf', 5);
          }
        }

        // Re-trigger guide M3 on any shape option click (D-12: re-triggerable)
        onShapeOptionClick?.();
      },
      [setValue, setInput, inputs.studentTDf, onShapeOptionClick]
    );

    /**
     * Handle df preset change for Student-t
     */
    const handleDfChange = useCallback(
      (df: StudentTDf) => {
        setValue('df', df);
        setInput('studentTDf', df);
      },
      [setValue, setInput]
    );

    /**
     * Handle successful form submission - store values in Zustand
     */
    const onSubmit = useCallback(
      (data: PriorShapeFormData) => {
        setInput('priorShape', data.shape);
        if (data.shape === 'student-t') {
          setInput('studentTDf', data.df);
        } else {
          setInput('studentTDf', null);
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
      if (inputs.priorShape) {
        setValue('shape', inputs.priorShape);
      }
      if (inputs.priorShape === 'student-t' && inputs.studentTDf) {
        setValue('df', inputs.studentTDf);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputs.priorShape, inputs.studentTDf]);

    // Get df error if Student-t selected but no df
    // TypeScript doesn't narrow discriminated union errors automatically,
    // so we use type assertion after runtime check
    const dfError =
      selectedShape === 'student-t' && 'df' in errors
        ? (errors as { df?: { message?: string } }).df?.message
        : undefined;

    // Note: No <form> wrapper here - this component is rendered inside
    // UncertaintyPriorForm which already has a <form> tag.
    // Nested forms are invalid HTML and cause React hydration errors.
    return (
      <FormProvider {...methods}>
        <div className="space-y-4">
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
                    value={selectedDf ?? inputs.studentTDf}
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
        </div>
      </FormProvider>
    );
  }
);

/**
 * Get default form values from store state
 */
function getDefaultValues(
  inputs: ReturnType<typeof useWizardStore.getState>['inputs']
): PriorShapeFormData {
  const shape = inputs.priorShape ?? 'normal';

  if (shape === 'student-t') {
    return {
      shape: 'student-t',
      df: inputs.studentTDf ?? 5, // Default to moderate if not set
    };
  }

  if (shape === 'uniform') {
    return { shape: 'uniform' };
  }

  // Default: normal
  return { shape: 'normal' };
}
