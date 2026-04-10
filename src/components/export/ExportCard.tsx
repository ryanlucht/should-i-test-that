/**
 * ExportCard - Hidden render target for PNG export
 *
 * Renders a composed card specifically designed for PNG export (NOT a screenshot
 * of the live UI). Fixed 1080x1080 dimensions for square social sharing format.
 *
 * Requirements:
 * - EXPORT-01: PNG is 1080x1080 square format
 * - EXPORT-02: Contains verdict, key inputs summary
 * - EXPORT-03: Contains mini distribution chart
 * - EXPORT-04: User can add custom title
 *
 * Design per 06-CONTEXT.md:
 * - Uses existing design tokens for consistency
 * - White background for PNG export reliability
 * - No branding for v1 (deferred per 06-CONTEXT.md deferred list)
 *
 * Per 06-RESEARCH.md: This component is visually hidden in DOM but rendered
 * for html-to-image to capture.
 */

import { forwardRef } from 'react';
import { PriorDistributionChart } from '@/components/charts/PriorDistributionChart';
import {
  formatSmartCurrency,
  formatPercentage,
  formatThreshold,
} from '@/lib/formatting';
import type { PriorDistribution } from '@/lib/calculations';

/**
 * Props for ExportCard component
 *
 * Receives pre-computed display values from the parent component
 * to avoid duplicating business logic in the export card.
 */
interface ExportCardProps {
  /** Basic or Advanced mode */
  mode: 'basic' | 'advanced';

  /** Custom title from user input, defaults to "Should I Test That?" */
  title?: string;

  /** Primary value to display (EVPI for basic, Net Value for advanced) */
  verdictValue: number;

  /** Baseline conversion rate as a decimal (e.g., 0.025 for 2.5%) */
  baselineConversionRate: number;

  /** Annual visitors count */
  annualVisitors: number;

  /** Label for visitor unit (e.g., "visitors", "sessions") */
  visitorUnitLabel: string;

  /** Value per conversion in dollars */
  valuePerConversion: number;

  /** Prior interval summary for display */
  prior: {
    meanPercent: number;
    lowPercent: number;
    highPercent: number;
  };

  /** Threshold scenario summary for display */
  threshold: {
    scenario: string;
    /** Original unit of the threshold value ('dollars' or 'lift') — used by formatThreshold (audit P5) */
    unit?: 'dollars' | 'lift' | null;
    /** Raw threshold value — used by formatThreshold (audit P5) */
    value?: number | null;
    valuePercent?: number;
    valueDollars?: number;
  };

  /** Prior distribution object for mini chart rendering */
  miniChartPrior: PriorDistribution;

  /** Threshold in lift units for chart overlay */
  miniChartThreshold_L: number;

  /** K value (dollars per unit lift) for chart tooltip */
  miniChartK: number;

  /** Prior shape name for Advanced mode (e.g., "Normal", "Student-t (df=5)", "Uniform") */
  priorShapeDescription?: string;

  /** EVSI value (only for advanced mode) */
  evsi?: number;

  /** Net value (only for advanced mode) */
  netValue?: number;

  /** Test duration in days (only for advanced mode) */
  testDurationDays?: number;

  /** Effective prior mean under feasibility truncation (for truncation annotation) */
  effectivePriorMean?: number;
}

/**
 * Render target for PNG export
 *
 * This component is hidden in the DOM using absolute positioning off-screen.
 * html-to-image captures it at its fixed 1080x1080 dimensions.
 *
 * Uses forwardRef to allow parent to attach exportRef for capture.
 */
export const ExportCard = forwardRef<HTMLDivElement, ExportCardProps>(
  function ExportCard(
    {
      mode,
      title = 'Should I Test That?',
      verdictValue,
      baselineConversionRate,
      annualVisitors,
      visitorUnitLabel,
      valuePerConversion,
      prior,
      threshold,
      miniChartPrior,
      miniChartThreshold_L,
      miniChartK,
      priorShapeDescription,
      evsi,
      netValue,
      testDurationDays: _testDurationDays,
      effectivePriorMean,
    },
    ref
  ) {
    // Format the primary verdict value
    const formattedValue = formatSmartCurrency(verdictValue);

    // Format prior display with shape for Advanced mode
    const priorShapeText = priorShapeDescription ? ` (${priorShapeDescription})` : '';
    const priorDisplay = `${prior.meanPercent > 0 ? '+' : ''}${prior.meanPercent.toFixed(1)}% expected lift${priorShapeText}`;
    const priorInterval = `90% confident: ${formatPercentage(prior.lowPercent)} to ${formatPercentage(prior.highPercent)}`;

    // Effective prior mean annotation (NaN guard, same as AdvancedResultsSection)
    // Threshold: 0.001 lift units = 0.1 percentage points
    const TRUNCATION_DISPLAY_THRESHOLD = 0.001;
    const safeEffectiveMean = (effectivePriorMean != null && !isNaN(effectivePriorMean))
      ? effectivePriorMean
      : undefined;
    const rawPriorMean = (prior.lowPercent + prior.highPercent) / 2; // midpoint in % form
    // effectivePriorMean is in lift-unit form (decimal), rawPriorMean is in % form
    // Convert raw to decimal for comparison
    const rawPriorMeanDecimal = rawPriorMean / 100;
    const showEffectiveMeanAnnotation = safeEffectiveMean !== undefined &&
      Math.abs(safeEffectiveMean - rawPriorMeanDecimal) > TRUNCATION_DISPLAY_THRESHOLD;

    // Format threshold display — unit-aware via formatThreshold (audit P5)
    const thresholdDisplay = formatThreshold({
      scenario: threshold.scenario as 'any-positive' | 'minimum-lift' | 'accept-loss',
      unit: threshold.unit,
      value: threshold.value ?? threshold.valuePercent,
    });

    // Format baseline metrics for display
    // Conversion rate: decimal to percentage (e.g., 0.025 -> "2.50%")
    const conversionRateDisplay = `${(baselineConversionRate * 100).toFixed(2)}% conversion rate`;

    // Annual visitors: use compact notation for large numbers (e.g., 1000000 -> "1M")
    const visitorsCompact = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumSignificantDigits: 3,
    }).format(annualVisitors);
    const annualVisitorsDisplay = `${visitorsCompact} ${visitorUnitLabel}/year`;

    // Value per conversion: formatted as currency
    const valuePerConversionDisplay = `${formatSmartCurrency(valuePerConversion)}/conversion`;

    return (
      <div
        ref={ref}
        style={{
          // Fixed dimensions per EXPORT-01 requirement
          width: '1080px',
          height: '1080px',
          // White background for consistent PNG output
          backgroundColor: '#FFFFFF',
          // Padding for content breathing room
          padding: '48px',
          // Flex layout for vertical content distribution
          display: 'flex',
          flexDirection: 'column',
          // Standard font family
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Logo branding — EXPORT-01 (D-05)
          * Recreated with inline styles for html-to-image compatibility.
          * CSS pseudo-elements and Tailwind classes don't reliably capture
          * in html-to-image, so all styling is inline. */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: '12px',
          marginBottom: '16px',
        }}>
          {/* "Should I" text */}
          <span style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#7C3AED',
            fontFamily: '"Noto Sans", sans-serif',
            letterSpacing: '-0.02em',
          }}>
            Should I
          </span>

          {/* Purple pill with "Test" */}
          <span style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#FFFFFF',
            fontFamily: '"Noto Sans", sans-serif',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #9333EA 0%, #7C3AED 50%, #6D28D9 100%)',
            padding: '4px 20px',
            borderRadius: '9999px',
            display: 'inline-block',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
          }}>
            Test
          </span>

          {/* "That?" text */}
          <span style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#7C3AED',
            fontFamily: '"Noto Sans", sans-serif',
            letterSpacing: '-0.02em',
          }}>
            That?
          </span>
        </div>

        {/* Analysis title — only shown when user provides a custom name */}
        {title !== 'Should I Test That?' && (
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 24px 0',
            lineHeight: '1.2',
          }}>
            {title}
          </h1>
        )}

        {/* Verdict Section */}
        <div
          style={{
            backgroundColor: '#F9FAFB', // bg-surface
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
          }}
        >
          {/* Full verdict headline with value inline */}
          <p
            style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827', // text-foreground
              margin: '0 0 16px 0',
              lineHeight: '1.4',
            }}
          >
            {mode === 'basic' ? (
              <>
                If you can A/B test this idea for less than{' '}
                <span style={{ color: '#7C3AED' }}>{formattedValue}</span>,
                it's worth testing.
              </>
            ) : verdictValue >= 0 ? (
              <>
                If you can run this test for up to{' '}
                <span style={{ color: '#7C3AED' }}>{formattedValue}</span>,
                test it.
              </>
            ) : (
              <>
                Under current assumptions, this test would{' '}
                <span style={{ color: '#DC2626' }}>cost you ~{formatSmartCurrency(Math.abs(verdictValue))}</span>{' '}
                more than the information is worth.
              </>
            )}
          </p>
          {/* Explanation text */}
          <p
            style={{
              fontSize: '14px',
              color: '#6B7280', // text-muted-foreground
              margin: 0,
              lineHeight: '1.6',
            }}
          >
            {mode === 'basic' ? (
              <>
                This is <strong>EVPI</strong> (Expected Value of Perfect Information) — the value
                of having perfect foresight about whether this change helps. Real A/B tests are
                imperfect, so this is an optimistic ceiling on what testing is worth.
              </>
            ) : (
              <>
                This is the <strong>net value of testing</strong> -- what the test
                information is worth after accounting for the cost of waiting for results.
                EVSI (Expected Value of Sample Information) is{' '}
                {evsi !== undefined ? formatSmartCurrency(evsi) : 'N/A'}, accounting for the test
                being imperfect.
              </>
            )}
          </p>
        </div>

        {/* Key Inputs Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mode === 'advanced' ? '1fr 1fr 1fr 1fr' : '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Baseline Metrics */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <p
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#6B7280',
                margin: '0 0 8px 0',
              }}
            >
              Baseline Metrics
            </p>
            <p
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 4px 0',
              }}
            >
              {conversionRateDisplay}
            </p>
            <p
              style={{
                fontSize: '13px',
                color: '#6B7280',
                margin: '0 0 2px 0',
              }}
            >
              {annualVisitorsDisplay}
            </p>
            <p
              style={{
                fontSize: '13px',
                color: '#6B7280',
                margin: 0,
              }}
            >
              {valuePerConversionDisplay}
            </p>
          </div>

          {/* Prior Summary */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <p
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#6B7280',
                margin: '0 0 8px 0',
              }}
            >
              Your belief (prior)
            </p>
            <p
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 4px 0',
              }}
            >
              {priorDisplay}
            </p>
            <p
              style={{
                fontSize: '13px',
                color: '#9CA3AF',
                margin: 0,
              }}
            >
              {priorInterval}
            </p>
            {showEffectiveMeanAnnotation && safeEffectiveMean !== undefined && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#9CA3AF',
                  fontStyle: 'italic',
                  margin: '4px 0 0 0',
                }}
              >
                (effective: {safeEffectiveMean > 0 ? '+' : ''}{(safeEffectiveMean * 100).toFixed(1)}%)
              </p>
            )}
          </div>

          {/* Threshold Summary */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <p
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#6B7280',
                margin: '0 0 8px 0',
              }}
            >
              Decision threshold
            </p>
            <p
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 4px 0',
              }}
            >
              {thresholdDisplay}
            </p>
            {threshold.valueDollars !== undefined && (
              <p
                style={{
                  fontSize: '13px',
                  color: '#9CA3AF',
                  margin: 0,
                }}
              >
                ~{formatSmartCurrency(threshold.valueDollars)}/year
              </p>
            )}
          </div>

          {/* EVSI (Advanced mode only) - spell out full name */}
          {mode === 'advanced' && evsi !== undefined && (
            <div
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6B7280',
                  margin: '0 0 8px 0',
                }}
              >
                Test value (EVSI — Expected Value of Sample Information)
              </p>
              <p
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0,
                }}
              >
                {formatSmartCurrency(evsi)}
              </p>
            </div>
          )}

          {/* Timing costs (Advanced mode only) - computed as EVSI - Net Value */}
          {mode === 'advanced' && evsi !== undefined && netValue !== undefined && (
            <div
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#6B7280',
                  margin: '0 0 8px 0',
                }}
              >
                Timing costs (est.)
              </p>
              <p
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0,
                }}
              >
                {(() => {
                  const tc = evsi - netValue;
                  return `${tc > 0 ? '-' : tc < 0 ? '+' : ''}${formatSmartCurrency(Math.abs(tc))}`;
                })()}
              </p>
            </div>
          )}
        </div>

        {/* Assumption note per D-04: value scaled to annual visitors */}
        {mode === 'advanced' && (
          <p style={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic', margin: '8px 0 0 0' }}>
            Value scaled to all annual visitors (assumes full rollout after test).
          </p>
        )}

        {/* Mini Chart */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#F9FAFB',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#6B7280',
              margin: '0 0 16px 0',
            }}
          >
            Prior Distribution
          </p>
          <div style={{ flex: 1, minHeight: '200px' }}>
            <PriorDistributionChart
              prior={miniChartPrior}
              threshold_L={miniChartThreshold_L}
              K={miniChartK}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: '#9CA3AF',
              margin: 0,
            }}
          >
            Created with Should I Test That?
          </p>
        </div>
      </div>
    );
  }
);
