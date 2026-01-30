/**
 * Navigation Buttons Component
 *
 * Back/Next navigation controls for wizard sections.
 * Generic labels ("Back" / "Next") on all sections.
 *
 * Design spec:
 * - Back: Secondary/outline style, hidden on first section
 * - Next: Primary style, shows "See Results" on last section
 */

import { Button } from '@/components/ui/button';

interface NavigationButtonsProps {
  /** Handler for Back button click */
  onBack: () => void;
  /** Handler for Next button click */
  onNext: () => void;
  /** Whether Back button should be visible */
  showBack: boolean;
  /** Whether Next button is enabled (validation passed) */
  canGoNext: boolean;
  /** Whether this is the final section before results */
  isLastSection: boolean;
}

/**
 * Navigation controls displayed at bottom of each section
 *
 * Follows design spec:
 * - Section 1: [hidden Back] [Next]
 * - Section 2-3: [Back] [Next]
 * - Last section: [Back] [Calculate] or [See Results]
 */
export function NavigationButtons({
  onBack,
  onNext,
  showBack,
  canGoNext,
  isLastSection,
}: NavigationButtonsProps) {
  return (
    <div className="mt-6 flex items-center justify-between border-t pt-6">
      {/* Back button - hidden on first section */}
      {showBack ? (
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
      ) : (
        // Spacer to maintain layout when Back is hidden
        <div />
      )}

      {/* Next button - primary action */}
      <Button type="button" onClick={onNext} disabled={!canGoNext}>
        {isLastSection ? 'See Results' : 'Next'}
      </Button>
    </div>
  );
}
