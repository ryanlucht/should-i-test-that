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
import { computePriorFromInterval, DEFAULT_PRIOR, DEFAULT_INTERVAL } from '@/lib/prior';
import type { EVPIResults, PriorDistribution } from '@/lib/calculations/types';
import type { EVSICalculationResults } from '@/hooks/useEVSICalculations';

/**
 * Shared input values needed for display in export card
 */
interface SharedInputs {
  priorIntervalLow: number | null;
  priorIntervalHigh: number | null;
  thresholdScenario: 'any-positive' | 'minimum-lift' | 'accept-loss' | null;
  thresholdValue: number | null;
}

/**
 * Props for Basic mode export
 */
interface BasicModeProps {
  mode: 'basic';
  evpiResults: EVPIResults;
  sharedInputs: SharedInputs;
  /** Prior distribution for chart (constructed from interval in Basic mode) */
  prior?: never;
}

/**
 * Props for Advanced mode export
 */
interface AdvancedModeProps {
  mode: 'advanced';
  evsiResults: EVSICalculationResults;
  sharedInputs: SharedInputs;
  /** Prior distribution object for chart (includes shape for Advanced mode) */
  prior: PriorDistribution;
}

type ExportButtonProps = BasicModeProps | AdvancedModeProps;

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
  const { mode, sharedInputs } = props;

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

  // Build prior distribution for chart
  const chartPrior: PriorDistribution = useMemo(() => {
    if (mode === 'advanced') {
      // Advanced mode: use the passed prior (includes shape)
      return props.prior;
    }

    // Basic mode: construct Normal prior from interval
    const isDefaultPrior =
      sharedInputs.priorIntervalLow !== null &&
      sharedInputs.priorIntervalHigh !== null &&
      Math.abs(sharedInputs.priorIntervalLow - DEFAULT_INTERVAL.low) < 0.01 &&
      Math.abs(sharedInputs.priorIntervalHigh - DEFAULT_INTERVAL.high) < 0.01;

    if (
      isDefaultPrior ||
      sharedInputs.priorIntervalLow === null ||
      sharedInputs.priorIntervalHigh === null
    ) {
      return { type: 'normal' as const, ...DEFAULT_PRIOR };
    }

    const { mu_L, sigma_L } = computePriorFromInterval(
      sharedInputs.priorIntervalLow,
      sharedInputs.priorIntervalHigh
    );
    return { type: 'normal' as const, mu_L, sigma_L };
  }, [mode, sharedInputs.priorIntervalLow, sharedInputs.priorIntervalHigh, props]);

  // Get K and threshold_L for chart
  const chartK = mode === 'basic' ? props.evpiResults.K : props.evsiResults.evsi.evsiDollars > 0
    // For Advanced mode, we need K - derive from net value and prior
    // Use a reasonable fallback K since EVSI results don't expose K directly
    ? 100000 // Fallback K value
    : 100000;

  const threshold_L = mode === 'basic'
    ? props.evpiResults.threshold_L
    : sharedInputs.thresholdScenario === 'any-positive'
      ? 0
      : (sharedInputs.thresholdValue ?? 0) / 100; // Convert percent to decimal

  // Get K from EVPI results in basic mode, or derive in advanced mode
  const actualK = mode === 'basic' ? props.evpiResults.K : chartK;

  // Derive export card props based on mode
  const verdictText = mode === 'basic'
    ? 'If you can test for less than'
    : 'The test is worth up to';

  const verdictValue = mode === 'basic'
    ? props.evpiResults.evpiDollars
    : Math.max(0, props.evsiResults.netValueDollars);

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
          mode={mode}
          title={customTitle || 'Should I Test That?'}
          verdict={verdictText}
          verdictValue={verdictValue}
          prior={priorDisplay}
          threshold={{
            ...thresholdDisplay,
            valueDollars: mode === 'basic' ? props.evpiResults.threshold_dollars : undefined,
          }}
          miniChartPrior={chartPrior}
          miniChartThreshold_L={threshold_L}
          miniChartK={actualK}
          evsi={mode === 'advanced' ? props.evsiResults.evsi.evsiDollars : undefined}
          cod={mode === 'advanced' ? props.evsiResults.cod.codDollars : undefined}
          netValue={mode === 'advanced' ? props.evsiResults.netValueDollars : undefined}
        />
      </div>
    </div>
  );
}
