/**
 * Calculator Page
 *
 * Main wizard page containing all 4 sections on a single scrollable page.
 * Implements progressive disclosure - future sections are dramatically disabled
 * until prior sections are completed.
 *
 * Page structure:
 * - Sticky header with title and mode toggle
 * - Sticky progress indicator with scroll tracking
 * - Four sections: Baseline, Uncertainty, Threshold, Results
 *
 * Navigation:
 * - Back/Next buttons within each section
 * - Enter key advances to next section
 * - Clicking progress indicator jumps to accessible sections
 *
 * State management:
 * - Uses Zustand store for mode, inputs, and navigation
 * - Session persistence for inputs and mode (not navigation)
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { SectionWrapper } from '@/components/wizard/SectionWrapper';
import { NavigationButtons } from '@/components/wizard/NavigationButtons';
import { StickyProgressIndicator } from '@/components/wizard/StickyProgressIndicator';
import { ModeToggle } from '@/components/wizard/ModeToggle';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { useWizardStore } from '@/stores/wizardStore';

/**
 * Section configuration for the wizard
 * Basic mode: 4 sections
 * Advanced mode: would add test-design and costs sections (future implementation)
 */
const SECTIONS = [
  { id: 'baseline', label: 'Baseline', title: 'Baseline Metrics' },
  { id: 'uncertainty', label: 'Uncertainty', title: 'Uncertainty (Prior)' },
  { id: 'threshold', label: 'Threshold', title: 'Shipping Threshold' },
  { id: 'results', label: 'Results', title: 'Results' },
] as const;

/** Section IDs for scroll spy */
const SECTION_IDS = SECTIONS.map((s) => s.id);

interface CalculatorPageProps {
  /** Handler to navigate back to welcome page */
  onBack: () => void;
}

/**
 * Calculator wizard page with 4 sections and progressive disclosure
 */
export function CalculatorPage({ onBack }: CalculatorPageProps) {
  // Store state and actions
  const currentSection = useWizardStore((state) => state.currentSection);
  const completedSections = useWizardStore((state) => state.completedSections);
  const setCurrentSection = useWizardStore((state) => state.setCurrentSection);
  const markSectionComplete = useWizardStore((state) => state.markSectionComplete);
  const canAccessSection = useWizardStore((state) => state.canAccessSection);

  // Scroll spy tracks which section is visible
  const activeSection = useScrollSpy(SECTION_IDS);

  // Refs for section elements (for keyboard navigation)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Memoized completed section IDs for progress indicator
  const completedStepIds = useMemo(
    () => completedSections.map((index) => SECTIONS[index]?.id).filter(Boolean),
    [completedSections]
  );

  // Update current section based on scroll spy
  useEffect(() => {
    const sectionIndex = SECTION_IDS.indexOf(activeSection as typeof SECTION_IDS[number]);
    if (sectionIndex >= 0 && sectionIndex !== currentSection) {
      setCurrentSection(sectionIndex);
    }
  }, [activeSection, currentSection, setCurrentSection]);

  /**
   * Scroll to a section smoothly
   */
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  /**
   * Handle clicking on a step in the progress indicator
   */
  const handleStepClick = useCallback(
    (stepId: string) => {
      const stepIndex = SECTION_IDS.indexOf(stepId as typeof SECTION_IDS[number]);
      if (stepIndex >= 0 && canAccessSection(stepIndex)) {
        scrollToSection(stepId);
      }
    },
    [canAccessSection, scrollToSection]
  );

  /**
   * Navigate to previous section
   */
  const handleBack = useCallback(
    (sectionIndex: number) => {
      if (sectionIndex > 0) {
        const prevSectionId = SECTIONS[sectionIndex - 1].id;
        scrollToSection(prevSectionId);
      } else {
        // First section - go back to welcome
        onBack();
      }
    },
    [onBack, scrollToSection]
  );

  /**
   * Navigate to next section (marks current as complete)
   * For now, always allows proceeding (no validation in placeholder sections)
   */
  const handleNext = useCallback(
    (sectionIndex: number) => {
      // Mark current section complete
      markSectionComplete(sectionIndex);

      // If not last section, scroll to next
      if (sectionIndex < SECTIONS.length - 1) {
        const nextSectionId = SECTIONS[sectionIndex + 1].id;
        scrollToSection(nextSectionId);

        // Focus first focusable element in next section (after scroll)
        setTimeout(() => {
          const nextSection = document.getElementById(nextSectionId);
          const firstFocusable = nextSection?.querySelector<HTMLElement>(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }, 500); // After scroll animation
      }
    },
    [markSectionComplete, scrollToSection]
  );

  /**
   * Handle keyboard navigation
   * Enter key advances to next section when focus is within a section
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, sectionIndex: number) => {
      // Enter advances (unless on a button which should handle its own click)
      if (
        event.key === 'Enter' &&
        !event.shiftKey &&
        event.target instanceof HTMLInputElement
      ) {
        event.preventDefault();
        // Only advance if this section is enabled
        if (canAccessSection(sectionIndex)) {
          handleNext(sectionIndex);
        }
      }
    },
    [canAccessSection, handleNext]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
        >
          Should I Test That?
        </button>
        <ModeToggle />
      </header>

      {/* Sticky Progress Indicator */}
      <StickyProgressIndicator
        steps={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        activeStepId={activeSection}
        completedStepIds={completedStepIds}
        onStepClick={handleStepClick}
      />

      {/* Sections Container */}
      <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        {SECTIONS.map((section, index) => {
          const isEnabled = canAccessSection(index);
          const isCompleted = completedSections.includes(index);
          const isLastSection = index === SECTIONS.length - 1;

          return (
            <SectionWrapper
              key={section.id}
              id={section.id}
              title={section.title}
              sectionNumber={index + 1}
              isEnabled={isEnabled}
              isCompleted={isCompleted}
            >
              {/* Section content - placeholder for now */}
              <div
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="min-h-32"
              >
                {/* Placeholder content - will be replaced with actual forms in future plans */}
                <p className="text-muted-foreground">
                  {section.title} section content will be implemented in Phase 2.
                </p>

                {/* Placeholder input for Enter key testing */}
                <input
                  type="text"
                  placeholder={`${section.title} placeholder input`}
                  className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Navigation buttons */}
              <NavigationButtons
                onBack={() => handleBack(index)}
                onNext={() => handleNext(index)}
                showBack={index > 0}
                canGoNext={isEnabled}
                isLastSection={isLastSection}
              />
            </SectionWrapper>
          );
        })}
      </main>
    </div>
  );
}
