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
 *
 * Note: The inline content (children) is rendered OUTSIDE the button element
 * to avoid nested button issues when using ToggleGroup or other button-based
 * components inside the card.
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
 *
 * IMPORTANT: Children (inline inputs) are rendered in a separate div
 * OUTSIDE the button to avoid nested button HTML validation errors.
 * The visual card styling wraps both the button and the children.
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
    <div
      className={cn(
        // Card wrapper - provides visual styling
        'relative rounded-xl border-2 transition-all duration-200',
        // Default state
        'border-border bg-card',
        // Selected state - check isSelected prop since we can't use data attributes on wrapper
        isSelected && 'border-primary bg-selected',
        // Disabled state
        disabled && 'opacity-50'
      )}
    >
      {/* Clickable radio button area */}
      <RadioGroupPrimitive.Item
        value={value}
        disabled={disabled}
        className={cn(
          // Make the button fill the clickable area
          'flex w-full cursor-pointer flex-col p-4 text-left',
          'hover:shadow-sm',
          // Focus state
          'rounded-t-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // If no children or not selected, round all corners
          (!children || !isSelected) && 'rounded-b-xl',
          // Disabled state
          disabled && 'cursor-not-allowed'
        )}
      >
        <div className="flex items-start gap-3">
          {/* Custom radio indicator */}
          <div
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
              'transition-colors',
              // Default state
              'border-muted-foreground',
              // Selected state
              isSelected && 'border-primary bg-primary'
            )}
          >
            <RadioGroupPrimitive.Indicator>
              <div className="h-2 w-2 rounded-full bg-primary-foreground" />
            </RadioGroupPrimitive.Indicator>
          </div>
          <div className="flex-1 space-y-1">
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </RadioGroupPrimitive.Item>

      {/* Inline content when selected - OUTSIDE the button to avoid nested buttons */}
      {children && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            isSelected ? 'max-h-96 px-4 pb-4 pt-0 opacity-100' : 'max-h-0 opacity-0'
          )}
          // Stop click from propagating to parent/radio - this area has its own inputs
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
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
