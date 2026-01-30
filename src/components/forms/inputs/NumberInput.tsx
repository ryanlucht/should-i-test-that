/**
 * NumberInput Component
 *
 * Controlled input for numeric values with react-hook-form integration.
 * Shows raw number while editing, formatted with commas on blur.
 * Includes optional editable unit label (e.g., "visitors", "sessions").
 *
 * Per SPEC.md Section 5.1: "label text is editable ('visitors', 'sessions', 'leads', etc.)"
 * Per CONTEXT.md: "Validation errors appear on blur only (not while typing)"
 */

import { useState, useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from './InfoTooltip';
import { formatNumber, parseNumber } from '@/lib/formatting';
import { cn } from '@/lib/utils';

export interface NumberInputProps {
  /** Field name for react-hook-form */
  name: string;
  /** Input label text */
  label: string;
  /** Placeholder text (e.g., "1,000,000") */
  placeholder?: string;
  /** Helper text shown below input */
  helpText?: string;
  /** Tooltip content for info icon */
  tooltip?: React.ReactNode;
  /** Error message to display */
  error?: string;
  /** Current unit label value (for editable unit) */
  unitLabelValue?: string;
  /** Callback when unit label changes */
  onUnitLabelChange?: (value: string) => void;
}

/**
 * Number input with format on blur behavior and optional editable unit label
 * Must be used inside a FormProvider/form with react-hook-form
 */
export function NumberInput({
  name,
  label,
  placeholder = '0',
  helpText,
  tooltip,
  error,
  unitLabelValue,
  onUnitLabelChange,
}: NumberInputProps) {
  // Track whether input is focused for formatting behavior
  const [isFocused, setIsFocused] = useState(false);
  const { control } = useFormContext();

  /**
   * Format value for display based on focus state
   * - Focused: show raw number for easier editing
   * - Blurred: show formatted with commas
   */
  const formatDisplayValue = useCallback(
    (value: number | null | undefined): string => {
      if (value === null || value === undefined) return '';
      if (isFocused) {
        return String(value);
      }
      return formatNumber(value);
    },
    [isFocused]
  );

  // Check if we have a unit label feature enabled
  const hasUnitLabel = unitLabelValue !== undefined && onUnitLabelChange !== undefined;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const parsed = parseNumber(e.target.value);
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

            <div className="flex gap-2 items-center">
              <Input
                id={name}
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                value={formatDisplayValue(field.value as number | null | undefined)}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                aria-invalid={!!error}
                aria-describedby={error ? `${name}-error` : helpText ? `${name}-help` : undefined}
                className={cn(
                  hasUnitLabel && 'flex-1',
                  error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                )}
              />

              {hasUnitLabel && (
                <Input
                  type="text"
                  value={unitLabelValue}
                  onChange={(e) => onUnitLabelChange(e.target.value)}
                  aria-label="Unit label"
                  className="w-24 text-sm"
                  placeholder="visitors"
                />
              )}
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
