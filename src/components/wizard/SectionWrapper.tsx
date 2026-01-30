/**
 * Section Wrapper Component
 *
 * Container component for wizard sections that implements the
 * progressive disclosure pattern. Future sections are visible but
 * dramatically disabled (40% opacity + grayscale) until prior
 * sections are completed.
 *
 * Uses <fieldset disabled> for native form control disabling,
 * which propagates to ALL descendant form controls automatically.
 *
 * Key visual states:
 * - Enabled: Full contrast, interactive
 * - Disabled: 40% opacity, grayscale, pointer-events-none
 * - Completed: Shows checkmark in header
 *
 * NO overlay text on disabled sections - purely visual disabled state
 * per user feedback that explanatory text is "cheesy".
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface SectionWrapperProps {
  /** Unique identifier for the section (used for scroll targeting) */
  id: string;
  /** Section title displayed in header */
  title: string;
  /** Section number (1-indexed for display) */
  sectionNumber: number;
  /** Whether this section is currently accessible/interactive */
  isEnabled: boolean;
  /** Whether this section has been completed */
  isCompleted: boolean;
  /** Section content (form fields, charts, etc.) */
  children: ReactNode;
}

/**
 * Wrapper component for calculator wizard sections
 *
 * Implements dramatic disabled state for future sections:
 * - 40% opacity reduction
 * - Full grayscale filter
 * - pointer-events-none (cannot interact)
 * - fieldset disabled (native form control disabling)
 */
export function SectionWrapper({
  id,
  title,
  sectionNumber,
  isEnabled,
  isCompleted,
  children,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={cn(
        /*
         * Design spec: scroll-margin-top 128px = header (56px) + indicator (64px) + buffer (8px)
         * Border radius: 12px, Padding: 24px
         */
        'scroll-mt-32',
        'rounded-xl border p-6 transition-all duration-300',
        // Enabled: white bg, subtle shadow
        // Disabled: same bg but no shadow (opacity applied to content)
        isEnabled
          ? 'border-border bg-card shadow-sm'
          : 'border-border/50 bg-card shadow-none'
      )}
      aria-labelledby={`${id}-heading`}
    >
      {/*
       * Section Header
       * Design spec: number circle 32px (h-8 w-8), gap 12px, border-bottom
       */}
      <div
        className={cn(
          'mb-6 flex items-center gap-3 border-b pb-4',
          !isEnabled && 'opacity-40 grayscale'
        )}
      >
        {/* Number circle (32px) or completed checkmark */}
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
            isCompleted
              ? 'bg-success text-white'
              : isEnabled
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            sectionNumber
          )}
        </span>

        {/* Section title - 18px font */}
        <h2
          id={`${id}-heading`}
          className={cn(
            'text-lg font-semibold',
            !isEnabled && 'text-muted-foreground'
          )}
        >
          {title}
        </h2>
      </div>

      {/*
       * Content area wrapped in fieldset for native disabling
       * fieldset disabled propagates to ALL descendant form controls
       */}
      <fieldset
        disabled={!isEnabled}
        className={cn(
          'space-y-4',
          !isEnabled && 'opacity-40 grayscale pointer-events-none'
        )}
        aria-disabled={!isEnabled}
      >
        {children}
      </fieldset>
    </section>
  );
}
