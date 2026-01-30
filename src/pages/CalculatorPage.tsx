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
import {
  BaselineMetricsForm,
  type BaselineMetricsFormHandle,
} from '@/components/forms/BaselineMetricsForm';
import {
  UncertaintyPriorForm,
  type UncertaintyPriorFormHandle,
} from '@/components/forms/UncertaintyPriorForm';
import {
  ThresholdScenarioForm,
  type ThresholdScenarioFormHandle,
} from '@/components/forms/ThresholdScenarioForm';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { useWizardStore } from '@/stores/wizardStore';
import {
  formatCurrency,
  formatPercentage,
  decimalToPercent,
} from '@/lib/formatting';

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

  // Refs for form validation
  const baselineFormRef = useRef<BaselineMetricsFormHandle>(null);
  const uncertaintyFormRef = useRef<UncertaintyPriorFormHandle>(null);
  const thresholdFormRef = useRef<ThresholdScenarioFormHandle>(null);

  // Get shared inputs for results summary display
  const sharedInputs = useWizardStore((state) => state.inputs.shared);

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
   * Advance to next section after marking current complete
   */
  const advanceToNextSection = useCallback(
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
   * Navigate to next section (with validation for form sections)
   * Per CONTEXT.md: Continue button always enabled; clicking with invalid inputs shows errors
   */
  const handleNext = useCallback(
    async (sectionIndex: number) => {
      // Validate baseline section (index 0) before proceeding
      if (sectionIndex === 0 && baselineFormRef.current) {
        const isValid = await baselineFormRef.current.validate();
        if (!isValid) {
          // Validation failed, errors are displayed by the form
          return;
        }
      }

      // Validate uncertainty section (index 1) before proceeding
      if (sectionIndex === 1 && uncertaintyFormRef.current) {
        const isValid = await uncertaintyFormRef.current.validate();
        if (!isValid) {
          // Validation failed, errors are displayed by the form
          return;
        }
      }

      // Validate threshold section (index 2) before proceeding
      if (sectionIndex === 2 && thresholdFormRef.current) {
        const isValid = await thresholdFormRef.current.validate();
        if (!isValid) {
          // Validation failed, errors are displayed by the form
          return;
        }
      }

      // For other sections (placeholder), just advance
      advanceToNextSection(sectionIndex);
    },
    [advanceToNextSection]
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
          void handleNext(sectionIndex);
        }
      }
    },
    [canAccessSection, handleNext]
  );

  return (
    <div className="min-h-screen bg-surface">
      {/*
       * Sticky Header
       * Design spec: height 56px, white bg, border-bottom, shadow when scrolled
       */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-card px-4 md:px-6 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
        >
          Should I Test That?
        </button>
        <ModeToggle />
      </header>

      {/* Sticky Progress Indicator - positioned below header */}
      <StickyProgressIndicator
        steps={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
        activeStepId={activeSection}
        completedStepIds={completedStepIds}
        onStepClick={handleStepClick}
      />

      {/*
       * Sections Container
       * Design spec: max-width 800px, 24px padding desktop
       */}
      <main className="mx-auto max-w-[800px] space-y-6 p-4 md:p-6">
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
              {/* Section content */}
              <div
                ref={(el) => {
                  sectionRefs.current[section.id] = el;
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="min-h-32"
              >
                {/* Baseline section - actual form */}
                {section.id === 'baseline' && (
                  <BaselineMetricsForm ref={baselineFormRef} />
                )}

                {/* Uncertainty section - prior selection form */}
                {section.id === 'uncertainty' && (
                  <UncertaintyPriorForm ref={uncertaintyFormRef} />
                )}

                {/* Threshold section - shipping threshold form */}
                {section.id === 'threshold' && (
                  <ThresholdScenarioForm ref={thresholdFormRef} />
                )}

                {/* Results section - placeholder with input summary */}
                {section.id === 'results' && (
                  <div className="space-y-6">
                    <p className="text-muted-foreground">
                      Results will be calculated in Phase 3.
                    </p>

                    {/* Input summary for verification */}
                    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
                      <h4 className="font-medium text-foreground">Input Summary</h4>

                      <div className="grid gap-3 text-sm">
                        {/* Baseline metrics */}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Conversion rate:</span>
                          <span className="font-medium">
                            {sharedInputs.baselineConversionRate !== null
                              ? formatPercentage(
                                  decimalToPercent(sharedInputs.baselineConversionRate)
                                )
                              : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Annual {sharedInputs.visitorUnitLabel}:
                          </span>
                          <span className="font-medium">
                            {sharedInputs.annualVisitors !== null
                              ? sharedInputs.annualVisitors.toLocaleString()
                              : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Value per conversion:</span>
                          <span className="font-medium">
                            {sharedInputs.valuePerConversion !== null
                              ? formatCurrency(sharedInputs.valuePerConversion)
                              : '—'}
                          </span>
                        </div>

                        {/* Separator */}
                        <div className="my-1 border-t border-border" />

                        {/* Prior */}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prior:</span>
                          <span className="font-medium">
                            {sharedInputs.priorType === 'default'
                              ? 'Default (0% +/- 5%)'
                              : sharedInputs.priorType === 'custom' &&
                                  sharedInputs.priorIntervalLow !== null &&
                                  sharedInputs.priorIntervalHigh !== null
                                ? `Custom (${formatPercentage(sharedInputs.priorIntervalLow)} to ${formatPercentage(sharedInputs.priorIntervalHigh)})`
                                : '—'}
                          </span>
                        </div>

                        {/* Separator */}
                        <div className="my-1 border-t border-border" />

                        {/* Threshold */}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Threshold scenario:</span>
                          <span className="font-medium">
                            {sharedInputs.thresholdScenario === 'any-positive'
                              ? 'Ship if any lift'
                              : sharedInputs.thresholdScenario === 'minimum-lift'
                                ? 'Minimum lift required'
                                : sharedInputs.thresholdScenario === 'accept-loss'
                                  ? 'Accept small loss'
                                  : '—'}
                          </span>
                        </div>
                        {(sharedInputs.thresholdScenario === 'minimum-lift' ||
                          sharedInputs.thresholdScenario === 'accept-loss') &&
                          sharedInputs.thresholdValue !== null && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Threshold value:</span>
                              <span className="font-medium">
                                {sharedInputs.thresholdUnit === 'dollars'
                                  ? formatCurrency(Math.abs(sharedInputs.thresholdValue)) +
                                    (sharedInputs.thresholdValue < 0 ? ' (loss)' : '')
                                  : formatPercentage(Math.abs(sharedInputs.thresholdValue)) +
                                    (sharedInputs.thresholdValue < 0 ? ' (loss)' : '')}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <NavigationButtons
                onBack={() => handleBack(index)}
                onNext={() => void handleNext(index)}
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
