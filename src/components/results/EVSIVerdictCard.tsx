/**
 * EVSI Verdict Card - Advanced mode primary verdict display
 *
 * Per 05-CONTEXT.md verdict wording:
 * "If you can test it for **up to** $[EVSI - CoD], test it"
 *
 * Note: "up to" instead of Basic mode's "less than" to emphasize
 * EVSI as acceptable ceiling, not just maximum.
 *
 * Requirements covered:
 * - ADV-OUT-01: Primary verdict with "up to" wording
 * - ADV-OUT-02: Y = max(0, EVSI - CoD)
 */

import { formatSmartCurrency } from '@/lib/formatting';
import { Loader2 } from 'lucide-react';

interface EVSIVerdictCardProps {
  /** Net value: EVSI - CoD (already clamped to non-negative) */
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
  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Calculating...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border bg-destructive/10 border-destructive/20 p-6 space-y-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  // No results yet
  if (netValueDollars === null) {
    return (
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <p className="text-muted-foreground">
          Complete all previous sections to see your results.
        </p>
      </div>
    );
  }

  // Ensure non-negative (should already be handled by hook)
  const displayValue = Math.max(0, netValueDollars);

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      {/* Primary verdict headline */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-foreground leading-relaxed">
          If you can run this test for{' '}
          <span className="text-primary">up to {formatSmartCurrency(displayValue)}</span>,
          test it.
        </h3>
      </div>

      {/* Explanation note - per 05-CONTEXT.md */}
      <div className="rounded-lg bg-muted/50 border border-muted px-4 py-3">
        <p className="text-sm text-muted-foreground">
          This is <strong>EVSI minus Cost of Delay</strong> — the realistic value
          of running this specific test. It accounts for the test being imperfect
          and the opportunity cost of waiting for results.
        </p>
      </div>
    </div>
  );
}
