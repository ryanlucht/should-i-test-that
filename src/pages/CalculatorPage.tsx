/**
 * Calculator Page
 *
 * Main wizard page with 5 sections:
 * Baseline, Uncertainty, Threshold, Test Design, Results
 *
 * Implements progressive disclosure - future sections are dramatically disabled
 * until prior sections are completed.
 *
 * Page structure:
 * - Sticky header with title
 * - Sticky progress indicator with scroll tracking
 * - Dynamic sections
 *
 * Navigation:
 * - Back/Next buttons within each section
 * - Enter key advances to next section
 * - Clicking progress indicator jumps to accessible sections
 *
 * State management:
 * - Uses Zustand store for inputs and navigation
 * - Session persistence for inputs (not navigation)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator } from 'lucide-react';
import { LearningBitsOverlay } from '@/components/guide/LearningBitsOverlay';
import { LearningBitsBubble } from '@/components/guide/LearningBitsBubble';
import { useGuideMessages, GuideTrigger } from '@/hooks/useGuideMessages';
import { SectionWrapper } from '@/components/wizard/SectionWrapper';
import { NavigationButtons } from '@/components/wizard/NavigationButtons';
import { StickyProgressIndicator } from '@/components/wizard/StickyProgressIndicator';
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
import { trackStepCompleted } from '@/lib/analytics';

/**
 * Section configuration for the wizard
 * 5 sections: Baseline, Uncertainty, Threshold, Test Design, Results
 */
interface SectionConfig {
  id: string;
  label: string;
  title: string;
}

const SECTIONS: SectionConfig[] = [
  { id: 'baseline', label: 'Baseline', title: 'Baseline Metrics' },
  { id: 'uncertainty', label: 'Uncertainty', title: 'Uncertainty (Prior)' },
  { id: 'threshold', label: 'Threshold', title: 'Decision Threshold' },
  { id: 'test-design', label: 'Experiment', title: 'Experiment Design' },
  { id: 'results', label: 'Results', title: 'Results' },
];

interface CalculatorPageProps {
  /** Handler to navigate back to welcome page */
  onBack: () => void;
}

/**
 * Calculator wizard page with 5 sections for EVSI-based analysis
 */
export function CalculatorPage({ onBack }: CalculatorPageProps) {
  // Store state and actions
  const currentSection = useWizardStore((state) => state.currentSection);
  const completedSections = useWizardStore((state) => state.completedSections);
  const setCurrentSection = useWizardStore((state) => state.setCurrentSection);
  const markSectionComplete = useWizardStore(
    (state) => state.markSectionComplete
  );
  const canAccessSection = useWizardStore((state) => state.canAccessSection);
  // CR-1: invalidateSection removes a section and all downstream from completedSections
  const invalidateSection = useWizardStore((state) => state.invalidateSection);

  // Shared URL state — non-null when recipient arrived via shared URL
  const sharedBaseline = useWizardStore((state) => state.sharedBaseline);

  // Guide overlay state (GUIDE-01, GUIDE-02, GUIDE-03)
  const guideEnabled = useWizardStore((state) => state.guideEnabled);
  const setGuideEnabled = useWizardStore((state) => state.setGuideEnabled);

  // Trigger event state for guide messages (wired from form accordion/focus events)
  const [guideTrigger, setGuideTrigger] = useState<GuideTrigger>(GuideTrigger.None);

  // Single section list
  const sections = SECTIONS;
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  // Scroll spy tracks which section is visible
  const activeSection = useScrollSpy(sectionIds);

  // Enabled sections: only sections the user can currently access (prior sections completed).
  // Prevents guide dialogue from advancing when scrolling past disabled/grayed-out sections.
  const enabledSections = useMemo(
    () => new Set(sections.filter((_, i) => canAccessSection(i)).map((s) => s.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sections, completedSections]
  );

  // Guide message routing: maps active section + trigger events to dialogue text
  const { currentMessage } = useGuideMessages(activeSection, guideTrigger, enabledSections);

  // Trigger callbacks wired from form components to guide message system.
  // Reset to None after firing so the same trigger can re-fire (D-12 re-triggerability).
  const fireGuideTrigger = useCallback((trigger: GuideTrigger) => {
    setGuideTrigger(trigger);
    // Reset on next microtask so React processes the trigger before clearing it
    queueMicrotask(() => setGuideTrigger(GuideTrigger.None));
  }, []);

  const handlePriorShapeAccordionOpen = useCallback(() => {
    fireGuideTrigger(GuideTrigger.PriorShapeAccordionOpen);
  }, [fireGuideTrigger]);

  const handlePriorBoundFocus = useCallback(() => {
    fireGuideTrigger(GuideTrigger.PriorBoundFocus);
  }, [fireGuideTrigger]);

  const handleAdvancedTimingOpen = useCallback(() => {
    fireGuideTrigger(GuideTrigger.AdvancedTimingOpen);
  }, [fireGuideTrigger]);

  // CR-1: Stable callbacks for section dirty detection.
  // When a user edits a field in an already-completed section, the form fires
  // onSectionDirty which calls invalidateSection to remove that section and all
  // downstream sections from completedSections, preventing stale results.
  // Gated on completedSections to avoid unnecessary calls during initial fill.
  const handleBaselineDirty = useCallback(() => {
    if (completedSections.includes(0)) {
      invalidateSection(0);
    }
  }, [invalidateSection, completedSections]);

  const handleUncertaintyDirty = useCallback(() => {
    if (completedSections.includes(1)) {
      invalidateSection(1);
    }
  }, [invalidateSection, completedSections]);

  const handleThresholdDirty = useCallback(() => {
    if (completedSections.includes(2)) {
      invalidateSection(2);
    }
  }, [invalidateSection, completedSections]);

  const handleExperimentDirty = useCallback(() => {
    if (completedSections.includes(3)) {
      invalidateSection(3);
    }
  }, [invalidateSection, completedSections]);

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

  // Shared URL recipients: scroll to Results section on mount so they
  // see the verdict first. They can click "Explain" to start the walkthrough.
  const hasScrolledToResults = useRef(false);
  useEffect(() => {
    if (sharedBaseline && !hasScrolledToResults.current) {
      hasScrolledToResults.current = true;
      // Small delay to ensure DOM is rendered before scrolling
      requestAnimationFrame(() => {
        const resultsEl = document.getElementById('results');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      });
    }
  }, [sharedBaseline]);

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

      // Track step completion for analytics (OBS-05)
      const sectionId = sections[sectionIndex]?.id;
      if (sectionId) {
        trackStepCompleted(sectionId, sectionIndex);
      }

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
   * Validation is section-ID based:
   * - baseline: index 0
   * - uncertainty: index 1
   * - threshold: index 2
   * - test-design: index 3
   * - results: index 4
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

      // Validate experiment design section before proceeding
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
       * DRUIDS pattern: Logo icon + "Experimentation" title
       */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="max-w-[800px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo icon */}
            <div className="bg-primary h-9 w-9 rounded-md flex items-center justify-center shadow-md">
              <Calculator className="h-5 w-5 text-primary-foreground" />
            </div>
            {/* Title */}
            <button
              type="button"
              onClick={onBack}
              className="text-base font-bold text-foreground leading-tight hover:text-primary transition-colors text-left"
            >
              Should We Test That?
            </button>
          </div>
        </div>
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
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="min-h-32"
              >
                {/* Baseline section - actual form */}
                {section.id === 'baseline' && (
                  <BaselineMetricsForm ref={baselineFormRef} onSectionDirty={handleBaselineDirty} />
                )}

                {/* Uncertainty section - prior selection form */}
                {section.id === 'uncertainty' && (
                  <UncertaintyPriorForm
                    ref={uncertaintyFormRef}
                    onPriorShapeAccordionOpen={handlePriorShapeAccordionOpen}
                    onPriorBoundFocus={handlePriorBoundFocus}
                    onSectionDirty={handleUncertaintyDirty}
                  />
                )}

                {/* Threshold section - shipping threshold form */}
                {section.id === 'threshold' && (
                  <ThresholdScenarioForm ref={thresholdFormRef} onSectionDirty={handleThresholdDirty} />
                )}

                {/* Test Design section - experiment parameters */}
                {section.id === 'test-design' && (
                  <ExperimentDesignForm
                    ref={experimentDesignFormRef}
                    onAdvancedTimingOpen={handleAdvancedTimingOpen}
                    onSectionDirty={handleExperimentDirty}
                  />
                )}

                {/* Results section - EVSI verdict with CoD breakdown */}
                {section.id === 'results' && <ResultsSection />}
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

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground space-y-2 max-w-[800px] mx-auto px-4 md:px-6">
        <p>
          Created by{' '}
          <a
            href="https://ryanlucht.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Ryan Lucht
          </a>
          {' '}and 100% vibe-coded by Claude Opus 4.5, GPT-5.2 Pro, GPT-Codex-5.2, and Gemini 3 Pro.
        </p>
      </footer>

      {/* Learning Bits Guide Overlay (GUIDE-01, GUIDE-02, GUIDE-03)
          Rendered at end of DOM for z-50 stacking above page content.
          guideEnabled=true → expanded dialogue; false → collapsed bubble avatar. */}
      {guideEnabled ? (
        <LearningBitsOverlay
          messageText={currentMessage}
          onClose={() => setGuideEnabled(false)}
        />
      ) : (
        <LearningBitsBubble
          onOpen={() => setGuideEnabled(true)}
        />
      )}
    </div>
  );
}
