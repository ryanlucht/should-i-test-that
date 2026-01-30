/**
 * SupportingCard - Reusable card for supporting metrics
 *
 * Per 04-CONTEXT.md: Supporting cards layout at Claude's discretion
 * Using stacked grid layout (2x2 for 4 cards)
 *
 * Per 06-03-PLAN.md and WCAG 1.4.1 (Use of Color):
 * The highlight variant includes a "Notable" text indicator to ensure
 * color is not the sole means of conveying the highlighted status.
 */

import { cn } from '@/lib/utils';

interface SupportingCardProps {
  title: string;
  value: string;
  description?: string;
  /** Variant style - 'highlight' adds visual emphasis with text redundancy */
  variant?: 'default' | 'highlight';
}

export function SupportingCard({
  title,
  value,
  description,
  variant = 'default',
}: SupportingCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-1',
        variant === 'default' && 'bg-card border-border',
        variant === 'highlight' && 'bg-primary/5 border-primary/20'
      )}
    >
      {/* Title row with optional "Notable" indicator for highlight variant */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        {/* Per WCAG 1.4.1: Text redundancy for color-based status indicator */}
        {variant === 'highlight' && (
          <span className="text-xs font-medium text-primary px-1.5 py-0.5 rounded bg-primary/10">
            Notable
          </span>
        )}
      </div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground pt-1">{description}</p>
      )}
    </div>
  );
}
