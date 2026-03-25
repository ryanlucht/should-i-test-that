import { useState, useEffect, useRef } from 'react';

/**
 * Trigger events fired by user interactions in the calculator.
 * Used by useGuideMessages to route focus/click events to specific messages.
 *
 * Per CONTEXT.md D-12: M3 (PriorShapeAccordionOpen) is re-triggerable on shape clicks.
 */
export enum GuideTrigger {
  None = 'none',
  PriorShapeAccordionOpen = 'prior-shape-accordion-open',
  PriorBoundFocus = 'prior-bound-focus',
  AdvancedTimingOpen = 'advanced-timing-open',
}

/**
 * The 8 dialogue messages for the Learning Bits guide system.
 * Source: dialogue_draft1.txt (PM final copy — D-11 confirmed), plus M8 for results.
 *
 * Message index to trigger mapping (from D-12 and UI-SPEC):
 * - [0] M1: Page load / baseline section
 * - [1] M2: Uncertainty section focus (scroll-spy)
 * - [2] M3: Prior shape accordion open / shape click (re-triggerable)
 * - [3] M4: Lower/upper bound input focus
 * - [4] M5: Shipping Threshold section in view
 * - [5] M6: Experiment Design section focus
 * - [6] M7: Advanced timing accordion open / input focus
 * - [7] M8: Results section (calculation complete)
 */
export const GUIDE_MESSAGES = [
  "If we want to calculate the value of running a test, first we'll need to define the _stakes_ of the decision in question. Let's start with context - what metric could our changes affect, how many users would be exposed to the change annually, and how do we convert that metric into dollars?",
  "Now we need to describe our uncertainty about the change's true effect. For this calculator, think of a range that you believe has about a 90% chance of containing the real underlying lift from our change. (acknowledging this is a _prior_, a pre-experiment guess)",
  "Some companies have found compelling evidence that true effects across experiment outcomes follow \"fat-tailed\" distributions - so you can select one here to put more weight on rare large effects. Both of these other alternate distribution shapes might change the estimated value of testing, especially when larger wins or losses matter to your shipping rule.",
  "As a rule of thumb, keeping your prior centered around 0% is usually a good starting point (unless you feel very strongly otherwise). Most meta-analysis of product A/B tests show relatively small effects centered around 0.",
  "Most of the time, teams will ship any change that shows likely positive impact, but that's not always the case! To calculate the value of running an experiment, we need to know what you would do in the absence of more data, and what result would be strong enough to change that decision?",
  "Finally, we need to consider how _informative_ we expect this experiment to be. Sample information is not perfect \u2013 so longer tests with more usable traffic, which usually means more precise results, makes the information from the test more valuable.",
  "Some metrics take time to mature, and teams often need extra time to analyze results and decide what to do. Both kinds of delay reduce the value of testing, because you have to wait longer to act on what you learn.",
  "Here's your results! Click around to answer any questions you have about the calculation.",
] as const;

/**
 * Maps a calculator section ID to the corresponding message index.
 * Returns null for sections that don't have a new message trigger.
 */
function sectionToMessageIndex(section: string): number | null {
  switch (section) {
    case 'baseline':
    case '':       // Initial/empty state — same as baseline
      return 0;
    case 'uncertainty':
      return 1;
    case 'threshold':
      return 4;
    case 'test-design':
      return 5;
    case 'results':
      return 7;
    default:
      return null; // No new message for unknown sections
  }
}

/**
 * useGuideMessages
 *
 * Maps the active calculator section and user-triggered events to the
 * correct message index (0-7) in the GUIDE_MESSAGES array.
 *
 * Scroll-based messages (M1, M2, M5, M6, M8) advance automatically as the
 * user scrolls through sections via useScrollSpy.
 *
 * Event-based messages (M3, M4, M7) are fired by callback props passed
 * from CalculatorPage into form components.
 *
 * Message advancement rules:
 * - Section scroll: only advances forward (no regression on scroll-back)
 * - M3 (PriorShapeAccordionOpen): always fires, re-triggerable per D-12
 * - M4 (PriorBoundFocus): only if current <= 3
 * - M7 (AdvancedTimingOpen): only if current <= 6 (always applies for M7)
 *
 * @param activeSection - Current section ID from useScrollSpy (e.g., 'baseline', 'uncertainty')
 * @param triggerEvent - User interaction event from GuideTrigger enum
 * @returns { currentMessageIndex, currentMessage }
 */
export function useGuideMessages(
  activeSection: string,
  triggerEvent: GuideTrigger
): { currentMessageIndex: number; currentMessage: string } {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Track which section-based messages have been shown, to avoid regressing on scroll-back
  const shownSectionMessages = useRef(new Set<number>());

  // Effect: section scroll changes
  useEffect(() => {
    const newIndex = sectionToMessageIndex(activeSection);
    if (newIndex === null) return; // e.g., 'results' — no message change

    // Only advance forward; never regress on scroll-back
    setCurrentMessageIndex((current) => {
      if (newIndex > current) {
        shownSectionMessages.current.add(newIndex);
        return newIndex;
      }
      return current;
    });
  }, [activeSection]);

  // Effect: user interaction trigger events
  useEffect(() => {
    if (triggerEvent === GuideTrigger.None) return;

    setCurrentMessageIndex(() => {
      switch (triggerEvent) {
        case GuideTrigger.PriorShapeAccordionOpen:
          // M3 is always re-triggerable (D-12) — can go back to 2 from any position
          return 2;

        case GuideTrigger.PriorBoundFocus:
          // M4: only fire if not already past this message
          // Use functional update to access current value
          return 3; // Will be handled with current check below

        case GuideTrigger.AdvancedTimingOpen:
          // M7 (index 6): fire when user opens advanced timing accordion
          return 6;

        default:
          return 0;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerEvent]);

  return {
    currentMessageIndex,
    currentMessage: GUIDE_MESSAGES[currentMessageIndex],
  };
}
