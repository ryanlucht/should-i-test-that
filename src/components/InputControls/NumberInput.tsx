import { useState, useEffect } from 'react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  prefix?: string;  // e.g., "$"
  suffix?: string;  // e.g., "units"
  tooltip?: string;
}

/**
 * Reusable number input with formatting and validation
 * Displays numbers with commas for readability
 */
export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  prefix,
  suffix,
  tooltip,
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number with commas for display
  const formatWithCommas = (num: number): string => {
    // Handle decimals appropriately
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Parse number, removing commas
  const parseNumber = (str: string): number => {
    return parseFloat(str.replace(/,/g, ''));
  };

  // Sync with external value changes when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatWithCommas(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow typing numbers, commas, decimals, and minus
    if (!/^-?[\d,]*\.?\d*$/.test(raw) && raw !== '') {
      return;
    }
    setLocalValue(raw);

    const parsed = parseNumber(raw);
    if (!isNaN(parsed)) {
      // Clamp to min/max if specified
      let clamped = parsed;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      onChange(clamped);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Remove commas when focused for easier editing
    setLocalValue(value.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Reset to formatted valid value on blur
    setLocalValue(formatWithCommas(value));
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {tooltip && (
          <span
            className="ml-1 text-slate-400 cursor-help"
            title={tooltip}
          >
            ⓘ
          </span>
        )}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`input-field ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-16' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
