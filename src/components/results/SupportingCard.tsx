/**
 * SupportingCard - Reusable card for supporting metrics
 *
 * Updated for DRUIDS mockup pattern:
 * - 4-column grid with dividers (parent provides dividers via divide-x)
 * - No individual borders/shadows (parent grid container has border)
 * - Compact typography: 10px uppercase labels, xl bold values, xs descriptions
 *
 * Supports an optional `children` prop for custom value content (e.g. two-row
 * Decision Impact layout). When children is provided, it replaces the default
 * single-value div. When neither value nor children is provided, the value
 * area is omitted.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SupportingCardProps {
  title: string;
  value?: string;
  description?: string;
  /** Variant style - 'highlight' adds visual emphasis */
  variant?: 'default' | 'highlight';
  /** Optional custom value content — replaces the single value div when provided */
  children?: ReactNode;
}

export function SupportingCard({
  title,
  value,
  description,
  variant = 'default',
  children,
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
      {/* Value area: children takes priority over single value string */}
      {children ? (
        <div className="mb-1">{children}</div>
      ) : value ? (
        <div className="text-xl font-bold text-foreground mb-1">
          {value}
        </div>
      ) : null}
      {/* Description */}
      {description && (
        <div className="text-xs text-muted-foreground">
          {description}
        </div>
      )}
    </div>
  );
}
