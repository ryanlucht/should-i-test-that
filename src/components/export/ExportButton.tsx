/**
 * ExportButton - Export trigger with title input and loading state
 *
 * Contains the hidden ExportCard render target and provides UI for:
 * - Optional custom title input for the export
 * - Export button with loading state
 *
 * Requirements:
 * - EXPORT-04: User can add custom title before export
 * - EXPORT-02: Download triggers on button click
 *
 * Per 06-01-PLAN.md: Button styling is secondary/outline to not compete
 * with primary wizard actions.
 */

import { useState, useMemo } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExportCard } from './ExportCard';
import { useExportPng } from '@/hooks/useExportPng';
import { DEFAULT_INTERVAL } from '@/lib/prior';
import { deriveK, normalizeThresholdToLift } from '@/lib/calculations';
import type { PriorDistribution } from '@/lib/calculations/types';
import type { EVSICalculationResults } from '@/hooks/useEVSICalculations';

/**
 * Input values needed for display in export card
 */
interface ExportSharedInputs {
  /** Baseline conversion rate as a decimal (e.g., 0.05 for 5%) */
  baselineConversionRate: number | null;
  /** Annual visitors/traffic */
  annualVisitors: number | null;
  /** User-editable label for visitors (visitors/sessions/leads/etc.) */
  visitorUnitLabel: string;
  /** Revenue or value per conversion in dollars */
  valuePerConversion: number | null;
  priorIntervalLow: number | null;
  priorIntervalHigh: number | null;
  thresholdScenario: 'any-positive' | 'minimum-lift' | 'accept-loss' | null;
  thresholdValue: number | null;
  /** Unit of the threshold value -- 'dollars', 'lift' (percentage), or null if not set */
  thresholdUnit: 'dollars' | 'lift' | null;
}

/**
 * Props for EVSI export
 */
interface ExportButtonProps {
  evsiResults: EVSICalculationResults;
  sharedInputs: ExportSharedInputs;
  /** Prior distribution object for chart (includes shape) */
  prior: PriorDistribution;
  /** Test duration in days for CoD explanation */
  testDurationDays?: number;
}

/**
 * Export button component with title input
 *
 * Renders:
 * 1. Text input for custom title (optional)
 * 2. Export button with download icon
 * 3. Hidden ExportCard for png capture
 *
 * The ExportCard is positioned absolutely off-screen but still rendered
 * in the DOM for html-to-image to capture.
 */
export function ExportButton(props: ExportButtonProps) {
  const { sharedInputs, evsiResults, prior, testDurationDays } = props;

  // Custom title state
  const [customTitle, setCustomTitle] = useState('');

  // Export hook
  const { exportRef, exportPng, isExporting } = useExportPng();

  // Derive prior parameters for display and chart
  const priorDisplay = useMemo(() => {
    const low = sharedInputs.priorIntervalLow ?? DEFAULT_INTERVAL.low;
    const high = sharedInputs.priorIntervalHigh ?? DEFAULT_INTERVAL.high;
    const mean = (low + high) / 2;

    return {
      meanPercent: mean,
      lowPercent: low,
      highPercent: high,
    };
  }, [sharedInputs.priorIntervalLow, sharedInputs.priorIntervalHigh]);

  // Derive threshold display values
  const thresholdDisplay = useMemo(() => {
    return {
      scenario: sharedInputs.thresholdScenario === 'any-positive'
        ? 'any-positive'
        : sharedInputs.thresholdScenario || 'minimum-lift',
      valuePercent: sharedInputs.thresholdValue ?? undefined,
    };
  }, [sharedInputs.thresholdScenario, sharedInputs.thresholdValue]);

  // Derive K: annual dollars per unit lift = N * p * V
  const chartK = deriveK(
    sharedInputs.annualVisitors ?? 0,
    sharedInputs.baselineConversionRate ?? 0,
    sharedInputs.valuePerConversion ?? 0
  );

  // Derive threshold_L: threshold as decimal lift
  const threshold_L =
    sharedInputs.thresholdScenario === 'any-positive'
      ? 0
      : normalizeThresholdToLift(
          sharedInputs.thresholdValue ?? 0,
          sharedInputs.thresholdUnit ?? 'lift',
          chartK
        );

  // Derive verdict value (net value, clamped to 0)
  const verdictValue = Math.max(0, evsiResults.netValueDollars);

  // Derive prior shape description
  const priorShapeDescription = useMemo(() => {
    const priorType = prior.type;
    switch (priorType) {
      case 'normal':
        return 'Normal';
      case 'student-t':
        return `Student-t (df=${(prior as { df: number }).df})`;
      case 'uniform':
        return 'Uniform';
      default:
        return undefined;
    }
  }, [prior]);

  // Handle export click
  const handleExport = async () => {
    try {
      await exportPng(customTitle || undefined);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Custom title input */}
      <Input
        type="text"
        placeholder="Add a title for your export..."
        value={customTitle}
        onChange={(e) => setCustomTitle(e.target.value)}
        className="text-sm"
      />

      {/* Export button */}
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={isExporting}
        className="w-full"
      >
        {isExporting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="size-4" />
            Export as PNG
          </>
        )}
      </Button>

      {/* Hidden export card - positioned off-screen but rendered for capture */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <ExportCard
          ref={exportRef}
          title={customTitle || 'Should I Test That?'}
          verdictValue={verdictValue}
          baselineConversionRate={sharedInputs.baselineConversionRate ?? 0}
          annualVisitors={sharedInputs.annualVisitors ?? 0}
          visitorUnitLabel={sharedInputs.visitorUnitLabel}
          valuePerConversion={sharedInputs.valuePerConversion ?? 0}
          prior={priorDisplay}
          threshold={thresholdDisplay}
          miniChartPrior={prior}
          miniChartThreshold_L={threshold_L}
          miniChartK={chartK}
          priorShapeDescription={priorShapeDescription}
          evsi={evsiResults.evsi.evsiDollars}
          cod={evsiResults.cod.codDollars}
          netValue={evsiResults.netValueDollars}
          testDurationDays={testDurationDays}
        />
      </div>
    </div>
  );
}
