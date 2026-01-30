/**
 * Sticky Progress Indicator Component
 *
 * Mini-indicator that sticks below the header and tracks wizard progress.
 * Shows numbered dots for each section with checkmarks for completed sections.
 *
 * Design spec:
 * - Position: sticky at top 56px (below header)
 * - Height: 64px with labels, 48px dots only (mobile)
 * - Dots: 28px circles with number or checkmark
 * - Connector lines between dots
 *
 * States:
 * - Future: Gray, muted (cannot interact)
 * - Available: Purple border (current or can access)
 * - Active: Purple fill (currently viewing)
 * - Completed: Green fill with checkmark
 */

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  /** Unique identifier matching section ID */
  id: string;
  /** Display label for the step */
  label: string;
}

interface StickyProgressIndicatorProps {
  /** Array of steps in order */
  steps: Step[];
  /** ID of the currently active/viewing step */
  activeStepId: string;
  /** Array of completed step IDs */
  completedStepIds: string[];
  /** Optional click handler for jumping to a step */
  onStepClick?: (stepId: string) => void;
}

/**
 * Sticky progress indicator showing wizard steps with completion status
 *
 * Visual encoding:
 * - Number in circle: not yet completed
 * - Checkmark in circle: completed
 * - Purple fill: currently viewing
 * - Green fill: completed
 * - Gray: future/locked
 */
export function StickyProgressIndicator({
  steps,
  activeStepId,
  completedStepIds,
  onStepClick,
}: StickyProgressIndicatorProps) {
  return (
    <nav
      aria-label="Form progress"
      className={cn(
        'sticky top-14 z-40', // top-14 = 56px (below header)
        'bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80',
        'border-b py-4' // py-4 = 16px padding, bringing height to ~64px with content
      )}
    >
      <ol className="flex items-center justify-center gap-2 md:gap-4">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = step.id === activeStepId;
          const isCompleted = completedStepIds.includes(step.id);

          // Can access if: completed, active, or all previous completed
          const canAccess =
            isCompleted ||
            isActive ||
            completedStepIds.length >= index;

          // Determine visual state
          const isFuture = !isCompleted && !isActive && !canAccess;

          return (
            <li key={step.id} className="flex items-center">
              {/* Connector line (not before first step) */}
              {index > 0 && (
                <div
                  className={cn(
                    'h-0.5 w-6 md:w-10',
                    // Completed connector (previous step completed)
                    completedStepIds.includes(steps[index - 1].id)
                      ? 'bg-green-600'
                      : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Step button/indicator */}
              <button
                type="button"
                onClick={() => canAccess && onStepClick?.(step.id)}
                disabled={isFuture}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2 py-1 text-sm transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  // Disabled cursor
                  isFuture && 'cursor-not-allowed'
                )}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`Step ${stepNumber}: ${step.label}${isCompleted ? ' (completed)' : ''}`}
              >
                {/* Number/checkmark circle */}
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-medium transition-all',
                    // Active: purple fill
                    isActive && 'border-primary bg-primary text-primary-foreground',
                    // Completed (not active): green fill
                    isCompleted && !isActive && 'border-green-600 bg-green-600 text-white',
                    // Available (can access, not active/completed): purple border
                    canAccess && !isActive && !isCompleted && 'border-primary text-primary',
                    // Future: gray
                    isFuture && 'border-muted-foreground/40 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    stepNumber
                  )}
                </span>

                {/* Label (hidden on small screens) */}
                <span
                  className={cn(
                    'hidden md:inline',
                    isActive && 'text-foreground font-medium',
                    isCompleted && !isActive && 'text-foreground',
                    canAccess && !isActive && !isCompleted && 'text-muted-foreground',
                    isFuture && 'text-muted-foreground/60'
                  )}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
