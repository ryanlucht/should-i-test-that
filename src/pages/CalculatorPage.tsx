/**
 * Calculator Page
 *
 * Main wizard page with dynamic sections based on mode:
 * - Basic mode: 4 sections (Baseline, Uncertainty, Threshold, Results)
 * - Advanced mode: 5 sections (adds Test Design between Threshold and Results)
 *
 * Implements progressive disclosure - future sections are dramatically disabled
 * until prior sections are completed.
 *
 * Page structure:
 * - Sticky header with title and mode toggle
 * - Sticky progress indicator with scroll tracking
 * - Dynamic sections based on mode
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
import {
  ExperimentDesignForm,
  type ExperimentDesignFormHandle,
} from '@/components/forms/ExperimentDesignForm';
import { ResultsSection } from '@/components/results';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { useWizardStore } from '@/stores/wizardStore';

/**
 * Section configuration for the wizard
 * Basic mode: 4 sections (Baseline, Uncertainty, Threshold, Results)
 * Advanced mode: 5 sections (adds Test Design between Threshold and Results)
 */
interface SectionConfig {
  id: string;
  label: string;
  title: string;
}

const BASIC_SECTIONS: SectionConfig[] = [
  { id: 'baseline', label: 'Baseline', title: 'Baseline Metrics' },
  { id: 'uncertainty', label: 'Uncertainty', title: 'Uncertainty (Prior)' },
  { id: 'threshold', label: 'Threshold', title: 'Shipping Threshold' },
  { id: 'results', label: 'Results', title: 'Results' },
];

const ADVANCED_SECTIONS: SectionConfig[] = [
  { id: 'baseline', label: 'Baseline', title: 'Baseline Metrics' },
  { id: 'uncertainty', label: 'Uncertainty', title: 'Uncertainty (Prior)' },
  { id: 'threshold', label: 'Threshold', title: 'Shipping Threshold' },
  { id: 'test-design', label: 'Test Design', title: 'Experiment Design' },
  { id: 'results', label: 'Results', title: 'Results' },
];

interface CalculatorPageProps {
  /** Handler to navigate back to welcome page */
  onBack: () => void;
}

/**
 * Calculator wizard page with dynamic sections based on mode
 * Basic mode: 4 sections, Advanced mode: 5 sections
 */
export function CalculatorPage({ onBack }: CalculatorPageProps) {
  // Store state and actions
  const mode = useWizardStore((state) => state.mode);
  const currentSection = useWizardStore((state) => state.currentSection);
  const completedSections = useWizardStore((state) => state.completedSections);
  const setCurrentSection = useWizardStore((state) => state.setCurrentSection);
  const markSectionComplete = useWizardStore(
    (state) => state.markSectionComplete
  );
  const canAccessSection = useWizardStore((state) => state.canAccessSection);

  // Determine sections based on mode
  const sections = useMemo(
    () => (mode === 'advanced' ? ADVANCED_SECTIONS : BASIC_SECTIONS),
    [mode]
  );
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  // Scroll spy tracks which section is visible
  const activeSection = useScrollSpy(sectionIds);

  // Refs for section elements (for keyboard navigation)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Refs for form validation
  const baselineFormRef = useRef<BaselineMetricsFormHandle>(null);
  const uncertaintyFormRef = useRef<UncertaintyPriorFormHandle>(null);
  const thresholdFormRef = useRef<ThresholdScenarioFormHandle>(null);
  const experimentDesignFormRef = useRef<ExperimentDesignFormHandle>(null);

  // Memoized completed section IDs for progress indicator
  const completedStepIds = useMemo(
    () => completedSections.map((index) => sections[index]?.id).filter(Boolean),
    [completedSections, sections]
  );

  // Update current section based on scroll spy
  useEffect(() => {
    const sectionIndex = sectionIds.indexOf(activeSection);
    if (sectionIndex >= 0 && sectionIndex !== currentSection) {
      setCurrentSection(sectionIndex);
    }
  }, [activeSection, currentSection, setCurrentSection, sectionIds]);

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
      const stepIndex = sectionIds.indexOf(stepId);
      if (stepIndex >= 0 && canAccessSection(stepIndex)) {
        scrollToSection(stepId);
      }
    },
    [canAccessSection, scrollToSection, sectionIds]
  );

  /**
   * Navigate to previous section
   */
  const handleBack = useCallback(
    (sectionIndex: number) => {
      if (sectionIndex > 0) {
        const prevSectionId = sections[sectionIndex - 1].id;
        scrollToSection(prevSectionId);
      } else {
        // First section - go back to welcome
        onBack();
      }
    },
    [onBack, scrollToSection, sections]
  );

  /**
   * Advance to next section after marking current complete
   */
  const advanceToNextSection = useCallback(
    (sectionIndex: number) => {
      // Mark current section complete
      markSectionComplete(sectionIndex);

      // If not last section, scroll to next
      if (sectionIndex < sections.length - 1) {
        const nextSectionId = sections[sectionIndex + 1].id;
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
    [markSectionComplete, scrollToSection, sections]
  );

  /**
   * Navigate to next section (with validation for form sections)
   * Per CONTEXT.md: Continue button always enabled; clicking with invalid inputs shows errors
   *
   * Validation is section-ID based (not index based) to handle mode switching correctly:
   * - baseline: index 0 in both modes
   * - uncertainty: index 1 in both modes
   * - threshold: index 2 in both modes
   * - test-design: index 3 in Advanced only
   * - results: index 3 in Basic, index 4 in Advanced
   */
  const handleNext = useCallback(
    async (sectionIndex: number) => {
      const sectionId = sections[sectionIndex]?.id;

      // Validate baseline section before proceeding
      if (sectionId === 'baseline' && baselineFormRef.current) {
        const isValid = await baselineFormRef.current.validate();
        if (!isValid) {
          return;
        }
      }

      // Validate uncertainty section before proceeding
      if (sectionId === 'uncertainty' && uncertaintyFormRef.current) {
        const isValid = await uncertaintyFormRef.current.validate();
        if (!isValid) {
          return;
        }
      }

      // Validate threshold section before proceeding
      if (sectionId === 'threshold' && thresholdFormRef.current) {
        const isValid = await thresholdFormRef.current.validate();
        if (!isValid) {
          return;
        }
      }

      // Validate experiment design section before proceeding (Advanced mode only)
      if (sectionId === 'test-design' && experimentDesignFormRef.current) {
        const isValid = await experimentDesignFormRef.current.validate();
        if (!isValid) {
          return;
        }
      }

      advanceToNextSection(sectionIndex);
    },
    [advanceToNextSection, sections]
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
        steps={sections.map((s) => ({ id: s.id, label: s.label }))}
        activeStepId={activeSection}
        completedStepIds={completedStepIds}
        onStepClick={handleStepClick}
      />

      {/*
       * Sections Container
       * Design spec: max-width 800px, 24px padding desktop
       */}
      <main className="mx-auto max-w-[800px] space-y-6 p-4 md:p-6">
        {sections.map((section, index) => {
          const isEnabled = canAccessSection(index);
          const isCompleted = completedSections.includes(index);
          const isLastSection = index === sections.length - 1;

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

                {/* Test Design section - experiment parameters (Advanced mode only) */}
                {section.id === 'test-design' && (
                  <ExperimentDesignForm ref={experimentDesignFormRef} />
                )}

                {/* Results section - EVPI verdict and supporting cards */}
                {section.id === 'results' && (
                  <ResultsSection
                    onAdvancedModeClick={() => {
                      // Switch to advanced mode
                      useWizardStore.getState().setMode('advanced');
                    }}
                  />
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
