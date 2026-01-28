import { NumberInput } from './NumberInput';
import type { RevenueCalculatorInputs } from '../../types';
import { calculateRevenuePerPercentagePoint } from '../../utils/revenueCalculator';

interface RevenueCalculatorProps {
  inputs: RevenueCalculatorInputs;
  onChange: (inputs: RevenueCalculatorInputs) => void;
}

/**
 * Calculator mode for revenue impact
 * Computes revenue per percentage point from business metrics
 */
export function RevenueCalculator({ inputs, onChange }: RevenueCalculatorProps) {
  const revenuePerPoint = calculateRevenuePerPercentagePoint(inputs);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    if (Math.abs(value) >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  return (
    <div className="space-y-4">
      <NumberInput
        label="Baseline Conversion Rate"
        value={inputs.baselineConversionRate * 100}
        onChange={(value) => onChange({ ...inputs, baselineConversionRate: value / 100 })}
        min={0.01}
        max={100}
        suffix="%"
      />

      <NumberInput
        label="Average Order Value"
        value={inputs.averageOrderValue}
        onChange={(value) => onChange({ ...inputs, averageOrderValue: value })}
        min={1}
        prefix="$"
      />

      <NumberInput
        label="Annual Traffic"
        value={inputs.annualTraffic}
        onChange={(value) => onChange({ ...inputs, annualTraffic: value })}
        min={100}
        suffix=" visitors/year"
      />

      {/* Computed result */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm text-blue-700 mb-1">Revenue per 1 percentage point:</div>
        <div className="text-xl font-bold text-blue-900">
          {formatCurrency(revenuePerPoint)}/year
        </div>
        <div className="text-xs text-blue-600 mt-1">
          = {formatNumber(inputs.annualTraffic)} visitors × 1% × ${inputs.averageOrderValue.toFixed(0)}
        </div>
      </div>
    </div>
  );
}
