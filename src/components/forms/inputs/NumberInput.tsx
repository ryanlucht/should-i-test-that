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
  /** Static suffix text shown after the input (e.g., "days") */
  suffix?: string;
  /** Extra content rendered inline with the label (e.g., action buttons) */
  labelSuffix?: React.ReactNode;
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
  suffix,
  labelSuffix,
}: NumberInputProps) {
  // Track whether input is focused for formatting behavior
  const [isFocused, setIsFocused] = useState(false);
  // Local string state while focused to allow typing decimals without stripping
  const [displayValue, setDisplayValue] = useState<string>('');
  const { control } = useFormContext();

  /**
   * Format value for display when NOT focused (blurred state)
   * Shows formatted with commas
   */
  const formatDisplayValue = useCallback(
    (value: number | null | undefined): string => {
      if (value === null || value === undefined) return '';
      return formatNumber(value);
    },
    []
  );

  // Check if we have a unit label feature enabled
  const hasUnitLabel = unitLabelValue !== undefined && onUnitLabelChange !== undefined;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        /**
         * On change: store raw string in local state (no parsing)
         * This prevents decimal stripping during typing
         */
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setDisplayValue(e.target.value);
        };

        /**
         * On blur: parse the local string and propagate to react-hook-form
         */
        const handleBlur = () => {
          setIsFocused(false);
          const parsed = parseNumber(displayValue);
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
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor={name}>{label}</Label>
              {tooltip && <InfoTooltip content={tooltip} />}
              {labelSuffix}
            </div>

            <div className="flex gap-2 items-center">
              <Input
                id={name}
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                value={isFocused ? displayValue : formatDisplayValue(field.value as number | null | undefined)}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                aria-invalid={!!error}
                aria-describedby={error ? `${name}-error` : helpText ? `${name}-help` : undefined}
                className={cn(
                  (hasUnitLabel || suffix) && 'flex-1',
                  error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                )}
              />

              {/* Static suffix text (e.g., "days") */}
              {suffix && !hasUnitLabel && (
                <span className="text-sm text-muted-foreground">{suffix}</span>
              )}

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
