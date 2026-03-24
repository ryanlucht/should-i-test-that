/**
 * EVSI Verdict Card - Primary verdict display
 *
 * Displays honest net value messaging:
 * - Positive: "If you can run this test for up to $X, test it"
 * - Negative: "This test would cost you ~$X more than the information is worth"
 *
 * Per D-06/D-07/D-08:
 * - Show actual negative dollar value (not clamped to $0) for headline
 * - When negative: max test budget is $0, delay/exposure costs outweigh learning
 * - When positive: keep existing "up to $X, test it" messaging
 *
 * Requirements covered:
 * - ENG-08: Honest negative net value display
 */

import { formatSmartCurrency } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface EVSIVerdictCardProps {
  /** Net value from integrated simulation (can be negative) */
  netValueDollars: number | null;
  /** True while calculation is in progress */
  isLoading: boolean;
  /** Error message if calculation failed */
  error?: string;
}

export function EVSIVerdictCard({
  netValueDollars,
  isLoading,
  error,
}: EVSIVerdictCardProps) {
  // Display the raw value - no clamping. Negative values are honest.
  const displayValue = netValueDollars;

  // Determine card styling based on state
  // Warning style for negative net value (amber border)
  const cardClasses = error
    ? 'rounded-xl border bg-destructive/10 border-destructive/20 p-6 space-y-4'
    : cn(
        'rounded-xl border p-6 space-y-4',
        displayValue !== null && displayValue < 0
          ? 'bg-amber-50/50 border-amber-200/50'
          : 'bg-card'
      );

  // Per RESEARCH.md pitfall #4: Live region must exist in DOM before content changes.
  // Always render the same container structure, updating content inside it.
  return (
    <div className={cardClasses}>
      {/* ARIA live region for screen reader announcements of verdict updates */}
      <div role="status" aria-live="polite" aria-busy={isLoading}>
        {/* Loading state */}
        {isLoading && (
          <>
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Calculating...</span>
            </div>
            {/* Screen reader announcement for loading state */}
            <span className="sr-only">Calculating result...</span>
          </>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* No results yet */}
        {!isLoading && !error && displayValue === null && (
          <p className="text-muted-foreground">
            Complete all previous sections to see your results.
          </p>
        )}

        {/* Primary verdict headline - conditional messaging per D-07/D-08 */}
        {!isLoading && !error && displayValue !== null && (
          <div className="space-y-2">
            {displayValue >= 0 ? (
              <h3 className="text-xl font-semibold text-foreground leading-relaxed">
                If you can run this test for{' '}
                <span className="text-primary">up to {formatSmartCurrency(displayValue)}</span>,
                test it.
              </h3>
            ) : (
              <h3 className="text-xl font-semibold text-foreground leading-relaxed">
                Under current assumptions, this test would{' '}
                <span className="text-destructive">cost you ~{formatSmartCurrency(Math.abs(displayValue))}</span>{' '}
                more than the information is worth.
              </h3>
            )}
          </div>
        )}
      </div>

      {/* Explanation note - conditional messaging for positive/negative */}
      {!isLoading && !error && displayValue !== null && (
        <div className="rounded-lg bg-muted/50 border border-muted px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {displayValue >= 0 ? (
              <>
                This is the <strong>net value of testing</strong> -- what the test
                information is worth after accounting for the cost of waiting for results.
              </>
            ) : (
              <>
                The delay and exposure costs outweigh the expected learning.
                The maximum you should pay to run this test is <strong>$0</strong>.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
