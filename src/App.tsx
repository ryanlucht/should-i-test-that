/**
 * App Component
 *
 * Root component handling page routing between Welcome and Calculator pages.
 * Uses simple state-based routing (no react-router needed for 2 pages).
 *
 * Routing decisions (D-10, D-11, D-12):
 *   - onStartWithGuidance: sets guideEnabled=true, navigates to calculator
 *   - onSkipGuidance: sets guideEnabled=false, navigates to calculator
 *
 * URL hydration (Phase 24, D-06/D-07/D-08):
 *   - On mount, detects "#s=" hash fragment
 *   - Decodes and hydrates the store with encoded wizard inputs
 *   - Skips welcome page and lands directly on calculator
 *   - Enables Learning Bits guide for recipients (D-07)
 *   - Marks sections complete based on field validity (not blanket — per review)
 *   - Stores sharedBaseline for modified-field diff tracking (D-08)
 *   - Cleans URL hash after successful hydration
 */

import { useState, useEffect, useRef } from 'react';
import { WelcomePage } from '@/pages/WelcomePage';
import { CalculatorPage } from '@/pages/CalculatorPage';
import { useWizardStore } from '@/stores/wizardStore';
import { decodeWizardState } from '@/lib/url-codec';
import type { WizardInputs } from '@/types/wizard';

/**
 * Page identifiers for routing
 */
type Page = 'welcome' | 'calculator';

/**
 * Maps calculator section indices to the WizardInputs fields that must be
 * non-null for that section to be considered "complete" during URL hydration.
 *
 * This prevents blanket section completion when some inputs are missing from
 * the shared URL. Only marks section N complete if ALL its required fields
 * are non-null in the decoded payload.
 *
 * Section mapping (matches CalculatorPage section order):
 *   0 = Baseline Metrics
 *   1 = Uncertainty / Prior
 *   2 = Threshold
 *   3 = Test Design (Experiment Design)
 */
const SECTION_REQUIRED_FIELDS: Record<number, (keyof WizardInputs)[]> = {
  // Section 0 — Baseline Metrics: must have all three business inputs
  0: ['baselineConversionRate', 'annualVisitors', 'valuePerConversion'],
  // Section 1 — Uncertainty: must have prior type selected
  1: ['priorType'],
  // Section 2 — Threshold: must have a threshold scenario selected
  2: ['thresholdScenario'],
  // Section 3 — Test Design: must have duration and traffic inputs
  3: ['testDurationDays', 'dailyTraffic'],
};

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('welcome');
  const setGuideEnabled = useWizardStore((state) => state.setGuideEnabled);

  /**
   * Guard against double-hydration on React StrictMode re-renders.
   * useRef persists across renders without causing re-renders itself.
   */
  const hydrated = useRef<boolean>(false);

  /**
   * URL hydration effect: runs once on mount.
   *
   * Detects "#s=" hash fragment, decodes wizard inputs, hydrates the store,
   * and bypasses the welcome page. Cleans the hash only after successful
   * hydration commit to preserve recoverability during partial failure.
   */
  useEffect(() => {
    // Skip if already hydrated (StrictMode double-invoke guard)
    if (hydrated.current) return;

    const hash = window.location.hash;
    // Only process URLs with our known share prefix
    if (!hash.startsWith('#s=')) return;

    const encoded = hash.slice(3); // Remove "#s=" prefix
    const decoded = decodeWizardState(encoded);

    // Invalid or malformed URL — do nothing, show welcome page normally
    if (!decoded) return;

    hydrated.current = true;

    // Hydrate store imperatively (one-shot, no subscription needed)
    const store = useWizardStore.getState();

    // Set all decoded input values into the flat WizardInputs store
    for (const [key, value] of Object.entries(decoded)) {
      store.setInput(key as keyof WizardInputs, value as WizardInputs[keyof WizardInputs]);
    }

    // Enable Learning Bits guide for URL recipients (D-07)
    // Recipients get the guided walkthrough by default so the sender's
    // analysis is explained to them via the Learning Bits mascot.
    store.setGuideEnabled(true);

    /**
     * Mark sections completed based on hydrated field validity.
     * Only marks section N complete if ALL its required fields are non-null
     * in the decoded inputs. This avoids blanket all-complete when the
     * sender only filled in some sections.
     */
    for (const [sectionStr, requiredFields] of Object.entries(SECTION_REQUIRED_FIELDS)) {
      const section = Number(sectionStr);
      const allPresent = requiredFields.every((field) => decoded[field] !== null);
      if (allPresent) {
        store.markSectionComplete(section);
      }
    }

    // Store the shared baseline for modified-field diff tracking (D-08)
    // Recipients can freely edit the pre-filled inputs; Plan 03 uses this
    // baseline to highlight which fields have been changed from the original.
    store.setSharedBaseline({ ...decoded });

    // Skip welcome page — recipients land directly on the calculator (D-06)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: one-time URL hydration on mount
    setCurrentPage('calculator');

    // Clean the URL hash AFTER successful hydration commit.
    // Done last to preserve recoverability: if any step above fails,
    // the hash is still in the URL and can be retried.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  return (
    <>
      {currentPage === 'welcome' && (
        <WelcomePage
          onStartWithGuidance={() => {
            setGuideEnabled(true);
            setCurrentPage('calculator');
          }}
          onSkipGuidance={() => {
            setGuideEnabled(false);
            setCurrentPage('calculator');
          }}
        />
      )}
      {currentPage === 'calculator' && (
        <CalculatorPage onBack={() => setCurrentPage('welcome')} />
      )}
    </>
  );
}

export default App;
