/**
 * PercentageInput Component
 *
 * Controlled input for percentage values with react-hook-form integration.
 * Shows raw number while editing, formatted with % suffix on blur.
 *
 * Per CONTEXT.md: "Validation errors appear on blur only (not while typing)"
 */

import { useState, useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from './InfoTooltip';
import { formatPercentage, parsePercentage } from '@/lib/formatting';
import { cn } from '@/lib/utils';

export interface PercentageInputProps {
  /** Field name for react-hook-form */
  name: string;
  /** Input label text */
  label: string;
  /** Placeholder text (e.g., "3.2%") */
  placeholder?: string;
  /** Helper text shown below input */
  helpText?: string;
  /** Tooltip content for info icon */
  tooltip?: React.ReactNode;
  /** Error message to display */
  error?: string;
}

/**
 * Percentage input with format on blur behavior
 * Must be used inside a FormProvider/form with react-hook-form
 */
export function PercentageInput({
  name,
  label,
  placeholder = '0%',
  helpText,
  tooltip,
  error,
}: PercentageInputProps) {
  // Track whether input is focused for formatting behavior
  const [isFocused, setIsFocused] = useState(false);
  const { control } = useFormContext();

  /**
   * Format value for display based on focus state
   * - Focused: show raw number for easier editing
   * - Blurred: show formatted with % suffix
   */
  const formatDisplayValue = useCallback(
    (value: number | null | undefined): string => {
      if (value === null || value === undefined || value === 0) return '';
      if (isFocused) {
        return String(value);
      }
      return formatPercentage(value);
    },
    [isFocused]
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const parsed = parsePercentage(e.target.value);
          field.onChange(parsed);
        };

        const handleBlur = () => {
          setIsFocused(false);
          field.onBlur();
        };

        const handleFocus = () => {
          setIsFocused(true);
        };

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={name}>{label}</Label>
              {tooltip && <InfoTooltip content={tooltip} />}
            </div>

            <div className="relative">
              <Input
                id={name}
                type="text"
                inputMode="decimal"
                placeholder={placeholder}
                value={formatDisplayValue(field.value as number | null | undefined)}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                aria-invalid={!!error}
                aria-describedby={error ? `${name}-error` : helpText ? `${name}-help` : undefined}
                className={cn(
                  error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                )}
              />
            </div>

            {helpText && !error && (
              <p id={`${name}-help`} className="text-sm text-muted-foreground">
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
