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
 * Validate whether a section's decoded fields constitute a valid, complete section.
 * Goes beyond non-null checks to enforce the same constraints as form schemas (CR-2).
 *
 * Section 0 (Baseline): All three business inputs must be non-null
 * Section 1 (Uncertainty): priorType must be set. If 'custom', interval bounds must be valid.
 * Section 2 (Threshold): scenario must be set. If not 'any-positive', unit+value must be present.
 * Section 3 (Experiment): duration and traffic must be non-null
 */
function validateSectionFields(section: number, decoded: Record<string, unknown>): boolean {
  switch (section) {
    case 0:
      return (
        decoded.baselineConversionRate !== null &&
        decoded.annualVisitors !== null &&
        decoded.valuePerConversion !== null
      );
    case 1: {
      if (decoded.priorType === null) return false;
      if (decoded.priorType === 'custom') {
        // Custom prior requires valid interval bounds
        if (decoded.priorIntervalLow === null || decoded.priorIntervalHigh === null) return false;
        const low = decoded.priorIntervalLow as number;
        const high = decoded.priorIntervalHigh as number;
        if (low >= high) return false;
      }
      return true;
    }
    case 2: {
      if (decoded.thresholdScenario === null) return false;
      if (decoded.thresholdScenario !== 'any-positive') {
        // Non-default scenario requires unit and value
        if (decoded.thresholdUnit === null || decoded.thresholdValue === null) return false;
        if ((decoded.thresholdValue as number) <= 0) return false;
      }
      return true;
    }
    case 3:
      return (
        decoded.testDurationDays !== null &&
        decoded.dailyTraffic !== null
      );
    default:
      return false;
  }
}

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
    const result = decodeWizardState(encoded);

    // Invalid or malformed URL — do nothing, show welcome page normally
    if (!result) return;

    const { inputs: decoded, netValue } = result;

    hydrated.current = true;

    // Hydrate store imperatively (one-shot, no subscription needed)
    const store = useWizardStore.getState();

    // Set all decoded input values into the flat WizardInputs store
    for (const [key, value] of Object.entries(decoded)) {
      store.setInput(key as keyof WizardInputs, value as WizardInputs[keyof WizardInputs]);
    }

    // Store hardcoded net value so recipients see the exact same dollar amount
    if (netValue != null) {
      store.setSharedNetValue(netValue);
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
    for (let section = 0; section <= 3; section++) {
      if (validateSectionFields(section, decoded as Record<string, unknown>)) {
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
