/**
 * Radio Card Component
 *
 * Styled card variant of RadioGroup using Radix primitives.
 * Cards have a selected state with purple border and light background.
 * Can contain inline content (inputs) that shows when selected.
 *
 * Design tokens from design system:
 * - Primary accent: #7C3AED (purple) for selected border
 * - bg-selected for selected background
 * - Cards: rounded-xl (12px)
 */

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '@/lib/utils';

interface RadioCardProps {
  /** Radio value for this card */
  value: string;
  /** Card title text */
  title: string;
  /** Card description text */
  description: string;
  /** Inline content shown when this card is selected */
  children?: React.ReactNode;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Whether this card is currently selected (for conditional children rendering) */
  isSelected?: boolean;
}

/**
 * RadioCard - A styled card that acts as a radio button
 *
 * Uses Radix RadioGroup.Item with custom card styling.
 * When selected, shows purple border and light purple background.
 * Children (inline inputs) are only visible when selected.
 */
export function RadioCard({
  value,
  title,
  description,
  children,
  disabled,
  isSelected,
}: RadioCardProps) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        // Base card styles
        'relative flex cursor-pointer flex-col rounded-xl border-2 p-4 text-left',
        'transition-all duration-200',
        // Default state
        'border-border bg-card hover:border-border/80 hover:shadow-sm',
        // Selected state (Radix data attribute)
        'data-[state=checked]:border-primary data-[state=checked]:bg-selected',
        // Focus state
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        // Disabled state
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Custom radio indicator */}
        <div
          className={cn(
            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
            'border-muted-foreground transition-colors',
            // Selected state uses Radix's data attribute on parent
            'group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary'
          )}
        >
          <RadioGroupPrimitive.Indicator>
            <div className="h-2 w-2 rounded-full bg-primary" />
          </RadioGroupPrimitive.Indicator>
        </div>
        <div className="flex-1 space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {/* Inline content when selected - smooth transition */}
      {children && (
        <div
          className={cn(
            'mt-4 overflow-hidden transition-all duration-200',
            isSelected ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          {children}
        </div>
      )}
    </RadioGroupPrimitive.Item>
  );
}

interface RadioCardGroupProps {
  /** Currently selected value */
  value: string;
  /** Callback when value changes */
  onValueChange: (value: string) => void;
  /** RadioCard children */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * RadioCardGroup - Container for RadioCard items
 *
 * Wraps Radix RadioGroup.Root with default vertical spacing.
 */
export function RadioCardGroup({
  value,
  onValueChange,
  children,
  className,
}: RadioCardGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      className={cn('space-y-3', className)}
    >
      {children}
    </RadioGroupPrimitive.Root>
  );
}
