/**
 * VerdictCard - Primary EVPI verdict display
 *
 * Per BASIC-OUT-01: "If you can A/B test this idea for less than $EVPI, it's worth testing"
 * Per BASIC-OUT-02: Subtext warning that EVPI is optimistic ceiling with Advanced mode CTA
 * Per 04-CONTEXT.md: Educational AND conversational tone, subtle Advanced mode link
 */

import { formatSmartCurrency } from '@/lib/formatting';

interface VerdictCardProps {
  evpiDollars: number;
  onAdvancedModeClick?: () => void;
}

export function VerdictCard({ evpiDollars, onAdvancedModeClick }: VerdictCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      {/* Primary verdict headline - ARIA live region for screen reader announcements */}
      <div role="status" aria-live="polite" className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground leading-relaxed">
          If you can A/B test this idea for less than{' '}
          <span className="text-primary">{formatSmartCurrency(evpiDollars)}</span>,
          it's worth testing.
        </h3>
      </div>

      {/* EVPI optimism warning - per BASIC-OUT-02 */}
      <div className="rounded-lg bg-muted/50 border border-muted px-4 py-3">
        <p className="text-sm text-muted-foreground">
          This is <strong>EVPI</strong> — the value of <em>perfect</em> information. Real A/B tests are imperfect,
          so this is an optimistic ceiling on what testing is worth.{' '}
          {onAdvancedModeClick ? (
            <button
              type="button"
              onClick={onAdvancedModeClick}
              className="text-primary hover:underline font-medium"
            >
              For a more realistic estimate, try Advanced mode.
            </button>
          ) : (
            <span className="text-primary font-medium">
              Advanced mode gives a more realistic estimate.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
