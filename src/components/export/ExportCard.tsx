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

  /** Cost of Delay (only for advanced mode) */
  cod?: number;

  /** Net value (only for advanced mode) */
  netValue?: number;

  /** Test duration in days (only for advanced mode) */
  testDurationDays?: number;
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
      cod,
      testDurationDays,
    },
    ref
  ) {
    // Mode badge display text
    const modeBadge = mode === 'basic' ? 'Basic Mode' : 'Advanced Mode';

    // Format the primary verdict value
    const formattedValue = formatSmartCurrency(verdictValue);

    // Format prior display with shape for Advanced mode
    const priorShapeText = priorShapeDescription ? ` (${priorShapeDescription})` : '';
    const priorDisplay = `${prior.meanPercent > 0 ? '+' : ''}${prior.meanPercent.toFixed(1)}% expected lift${priorShapeText}`;
    const priorInterval = `90% confident: ${formatPercentage(prior.lowPercent)} to ${formatPercentage(prior.highPercent)}`;

    // Format threshold display
    const thresholdDisplay =
      threshold.scenario === 'any-positive'
        ? 'Any positive impact'
        : `${threshold.valuePercent !== undefined && threshold.valuePercent > 0 ? '+' : ''}${threshold.valuePercent?.toFixed(1)}% lift`;

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
        {/* Header: Title + Mode Badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '32px',
          }}
        >
          <h1
            style={{
              fontSize: '36px',
              fontWeight: '700',
              color: '#111827', // text-foreground
              margin: 0,
              maxWidth: '800px',
              lineHeight: '1.2',
            }}
          >
            {title}
          </h1>
          <span
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#7C3AED', // Purple accent
              backgroundColor: '#F3E8FF', // Purple-50
              padding: '6px 12px',
              borderRadius: '9999px',
              whiteSpace: 'nowrap',
            }}
          >
            {modeBadge}
          </span>
        </div>

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
            ) : (
              <>
                If you can run this test for up to{' '}
                <span style={{ color: '#7C3AED' }}>{formattedValue}</span>,
                test it.
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
                This is <strong>EVSI minus Cost of Delay</strong> — the realistic value of running
                this specific test. EVSI (Expected Value of Sample Information) is{' '}
                {evsi !== undefined ? formatSmartCurrency(evsi) : 'N/A'}, accounting for the test
                being imperfect.
                {cod !== undefined && cod > 0 && testDurationDays !== undefined && (
                  <>
                    {' '}Running the test for {testDurationDays} days delays rollout, costing{' '}
                    {formatSmartCurrency(cod)} in expected opportunity cost.
                  </>
                )}
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
              Shipping threshold
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
                Test value (EVSI)
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

          {/* Cost of Delay (Advanced mode only) */}
          {mode === 'advanced' && cod !== undefined && (
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
                Cost of Delay
              </p>
              <p
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0,
                }}
              >
                {formatSmartCurrency(cod)}
              </p>
            </div>
          )}
        </div>

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
