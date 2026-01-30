/**
 * SupportingCard - Reusable card for supporting metrics
 *
 * Per 04-CONTEXT.md: Supporting cards layout at Claude's discretion
 * Using stacked grid layout (2x2 for 4 cards)
 */

import { cn } from '@/lib/utils';

interface SupportingCardProps {
  title: string;
  value: string;
  description?: string;
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
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground pt-1">{description}</p>
      )}
    </div>
  );
}
