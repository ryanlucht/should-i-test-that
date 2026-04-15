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
 * Per D-01/D-02/D-03/D-04/D-05 (Phase 24 share button):
 * - Share button inside EVSIVerdictCard (D-01)
 * - Button only visible when results are computed (D-04)
 * - Uses outline variant (D-05)
 * - Shows "Share This Analysis (I'll explain it for you!)" with link icon (D-02)
 * - After click: checkmark + "Copied!" for 2 seconds, then reverts (D-03)
 * - Clipboard failure: shows "Unable to copy" error feedback (D-03)
 *
 * Requirements covered:
 * - ENG-08: Honest negative net value display
 * - SHARE-02: Share button with clipboard copy and feedback
 */

import { useState, useCallback } from 'react';
import { formatSmartCurrency } from '@/lib/formatting';
import { cn } from '@/lib/utils';
import { Loader2, Link2, Check, AlertCircle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWizardStore } from '@/stores/wizardStore';
import { encodeWizardState } from '@/lib/url-codec';
import { useSharedDiff } from '@/hooks/useSharedDiff';

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
  // Recipient mode: when arriving from a shared URL, use the hardcoded net value
  const sharedBaseline = useWizardStore((state) => state.sharedBaseline);
  const sharedNetValue = useWizardStore((state) => state.sharedNetValue);
  const setGuideEnabled = useWizardStore((state) => state.setGuideEnabled);

  // CR28-04: Exit recipient mode when inputs diverge from shared baseline.
  // Divergence is revert-aware: while any field differs from the shared baseline,
  // the live computed value is authoritative. If the recipient fully reverts all
  // edits (modifiedFields becomes empty), recipient mode restores and shows the
  // sender's value again. This is acceptable because exact revert is rare, and
  // if inputs truly match baseline the live value should match anyway.
  const { modifiedFields } = useSharedDiff();
  const hasEdited = modifiedFields.size > 0;
  const isRecipient = sharedBaseline !== null && !hasEdited;

  // Display the raw value - no clamping. Negative values are honest.
  // Recipients see the sender's exact value; regular users see the computed value.
  const displayValue = isRecipient && sharedNetValue !== null ? sharedNetValue : netValueDollars;

  // Clipboard copy state: 'idle' | 'copied' | 'error'
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  // Read current inputs from store to encode into the share URL
  const inputs = useWizardStore((state) => state.inputs);

  /**
   * Handle share button click: encode current inputs + net value into a URL
   * hash fragment, copy to clipboard, and show feedback for 2 seconds.
   */
  const handleShare = useCallback(async () => {
    try {
      // Encode wizard inputs AND the net value so recipients see the same dollar amount
      // Moved inside try/catch so encoding failures (e.g., unexpected input) are caught (CR-3)
      const encoded = encodeWizardState(inputs, {
        netValue: netValueDollars ?? undefined,
      });
      const url = `${window.location.origin}${window.location.pathname}#s=${encoded}`;

      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [inputs, netValueDollars]);

  /**
   * Handle "Explain" button for share URL recipients: scroll to top of
   * calculator and re-enable Learning Bits guided walkthrough.
   */
  const handleExplain = useCallback(() => {
    setGuideEnabled(true);
    const baseline = document.getElementById('baseline');
    if (baseline) {
      baseline.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [setGuideEnabled]);

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
                If the total cost of running this test is below{' '}
                <span className="text-primary">{formatSmartCurrency(displayValue)}</span>,
                it&apos;s worth doing.
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
                This is how much the test is worth after accounting for
                the time it takes to run and read out.
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

      {/* Action button - only visible when results are computed (D-04) */}
      {!isLoading && !error && displayValue !== null && (
        isRecipient ? (
          /* Recipients see "Explain" button that scrolls to top + enables Learning Bits */
          <Button
            variant="outline"
            size="sm"
            onClick={handleExplain}
            className="w-full"
          >
            <BookOpen className="h-4 w-4 mr-1.5" />
            Explain how this result was calculated
          </Button>
        ) : (
          /* Regular users see "Share" button with clipboard copy */
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="w-full"
          >
            {copyState === 'copied' ? (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Copied!
              </>
            ) : copyState === 'error' ? (
              <>
                <AlertCircle className="h-4 w-4 mr-1.5" />
                Unable to copy
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-1.5" />
                Share This Analysis (I&apos;ll explain it for you!)
              </>
            )}
          </Button>
        )
      )}
    </div>
  );
}
