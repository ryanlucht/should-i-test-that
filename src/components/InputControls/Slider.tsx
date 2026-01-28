import { useState, useEffect } from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
  tooltip?: string;
}

/**
 * Reusable slider component with label and formatted display
 */
export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue = (v) => v.toString(),
  tooltip,
}: SliderProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-slate-700">
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
        <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
          {formatValue(localValue)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={handleChange}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}
