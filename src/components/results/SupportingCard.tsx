/**
 * SupportingCard - Reusable card for supporting metrics
 *
 * Updated for DRUIDS mockup pattern:
 * - 4-column grid with dividers (parent provides dividers via divide-x)
 * - No individual borders/shadows (parent grid container has border)
 * - Compact typography: 10px uppercase labels, xl bold values, xs descriptions
 */

import { cn } from '@/lib/utils';

interface SupportingCardProps {
  title: string;
  value: string;
  description?: string;
  /** Variant style - 'highlight' adds visual emphasis */
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
        'p-4 hover:bg-muted/30 transition-colors',
        variant === 'highlight' && 'bg-primary/5'
      )}
    >
      {/* Label - DRUIDS mockup: uppercase, tracking-wider, bold */}
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
        {title}
      </span>
      {/* Value - DRUIDS mockup: xl bold */}
      <div className="text-xl font-bold text-foreground mb-1">
        {value}
      </div>
      {/* Description */}
      {description && (
        <div className="text-xs text-muted-foreground">
          {description}
        </div>
      )}
    </div>
  );
}
