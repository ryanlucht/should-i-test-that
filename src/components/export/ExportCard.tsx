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

  /** Formatted verdict headline text */
  verdict: string;

  /** Primary value to display (EVPI for basic, Net Value for advanced) */
  verdictValue: number;

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

  /** EVSI value (only for advanced mode) */
  evsi?: number;

  /** Cost of Delay (only for advanced mode) */
  cod?: number;

  /** Net value (only for advanced mode) */
  netValue?: number;
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
      verdict,
      verdictValue,
      prior,
      threshold,
      miniChartPrior,
      miniChartThreshold_L,
      miniChartK,
      evsi,
      cod,
    },
    ref
  ) {
    // Mode badge display text
    const modeBadge = mode === 'basic' ? 'Basic Mode' : 'Advanced Mode';

    // Format the primary verdict value
    const formattedValue = formatSmartCurrency(verdictValue);

    // Format prior display
    const priorDisplay = `${prior.meanPercent > 0 ? '+' : ''}${prior.meanPercent.toFixed(1)}% expected lift`;
    const priorInterval = `90% confident: ${formatPercentage(prior.lowPercent)} to ${formatPercentage(prior.highPercent)}`;

    // Format threshold display
    const thresholdDisplay =
      threshold.scenario === 'any-positive'
        ? 'Any positive impact'
        : `${threshold.valuePercent !== undefined && threshold.valuePercent > 0 ? '+' : ''}${threshold.valuePercent?.toFixed(1)}% lift`;

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
          <p
            style={{
              fontSize: '18px',
              color: '#6B7280', // text-muted-foreground
              margin: '0 0 12px 0',
            }}
          >
            {verdict}
          </p>
          <p
            style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#7C3AED', // Purple accent
              margin: 0,
            }}
          >
            {formattedValue}
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

          {/* EVSI (Advanced mode only) */}
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
                EVSI (test value)
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
