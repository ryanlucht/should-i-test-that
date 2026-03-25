---
phase: 22-learning-bits-guide-infrastructure
plan: 02
subsystem: ui
tags: [react, typescript, zustand, lucide-react, typewriter, guide, accordion, animation]

# Dependency graph
requires:
  - phase: 22-01
    provides: useTypewriter hook, useGuideMessages hook, guideEnabled Zustand state, RPG dialog CSS classes, learning-bits.png asset

provides:
  - LearningBitsOverlay: fixed bottom-right RPG-style dialogue card with typewriter text, avatar, close button
  - LearningBitsAvatar: 64px circular mascot avatar component
  - LearningBitsBubble: collapsed avatar button (reopen dialogue)
  - BouncingDots: three-dot animated ellipsis waiting indicator
  - UncertaintyPriorForm: prior shape section collapsed by accordion (D-08), onPriorShapeAccordionOpen + onPriorBoundFocus callbacks, highlight-pulse on implied lift
  - ExperimentDesignForm: advanced timing section collapsed by accordion (D-10), onAdvancedTimingOpen callback
  - PriorShapeForm: onShapeOptionClick callback for re-triggerable M3 (D-12)
  - CalculatorPage: fully wired guide system — overlay/bubble toggle, trigger callbacks, useGuideMessages routing
affects:
  - Any future phase modifying CalculatorPage, form components, or guide system

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RPG dialog box: fixed bottom-right with rpg-dialog-box CSS class (3px border, 6px offset shadow)"
    - "Accordion progressive disclosure: useState + aria-expanded + aria-controls, default closed"
    - "Highlight pulse: key-counter remount pattern forces CSS animation replay on false→true threshold crossing"
    - "useTypewriter guard: typeof window.matchMedia === 'function' for jsdom test compatibility"
    - "Guide wiring: trigger callbacks flow from form events → CalculatorPage state → useGuideMessages hook"

key-files:
  created:
    - src/components/guide/LearningBitsAvatar.tsx
    - src/components/guide/BouncingDots.tsx
    - src/components/guide/LearningBitsOverlay.tsx
    - src/components/guide/LearningBitsBubble.tsx
  modified:
    - src/components/forms/UncertaintyPriorForm.tsx
    - src/components/forms/ExperimentDesignForm.tsx
    - src/components/forms/PriorShapeForm.tsx
    - src/pages/CalculatorPage.tsx
    - src/hooks/useTypewriter.ts

key-decisions:
  - "renderDialogueText helper: splits on /_([^_]+)_/g pattern inside LearningBitsOverlay to convert _word_ to <em> elements; processes displayed (sliced) text not full message to avoid typewriter reset"
  - "highlight-pulse remount: key={shouldHighlight ? pulseKey : 'no-pulse'} forces DOM remount only on false→true transitions so animation replays each time the threshold is crossed"
  - "useTypewriter matchMedia guard: added typeof window.matchMedia === 'function' check — jsdom provides window but not matchMedia, causing TypeError in App.test.tsx when CalculatorPage now renders the overlay"
  - "Accordion validation: UncertaintyPriorForm already uses priorShapeFormRef.current?.validate() with optional chaining — when accordion is closed, null ref causes validation to skip (correct behavior since priorShape defaults to normal)"

patterns-established:
  - "Pattern: Guide trigger callbacks — CalculatorPage owns trigger state, passes useCallback handlers to form components as optional props"
  - "Pattern: accordion progressive disclosure — useState(false) + aria-expanded + aria-controls='id', fires guide callback only when willOpen is true"

requirements-completed: [GUIDE-01, GUIDE-02, GUIDE-03]

# Metrics
duration: 6min
completed: 2026-03-25
---

# Phase 22 Plan 02: Learning Bits Guide UI Components Summary

**Four guide components (Overlay, Avatar, Bubble, BouncingDots) built and wired into CalculatorPage with section-aware dialogue, accordion progressive disclosure, and highlight-pulse on off-center prior**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-25T19:26:37Z
- **Completed:** 2026-03-25T19:32:38Z (Tasks 1-3 complete; paused at Task 4 checkpoint)
- **Tasks:** 3 of 4 complete (Task 4 is human-verify checkpoint)
- **Files modified:** 9 (4 created, 5 modified)

## Accomplishments

- Created `src/components/guide/` directory with 4 components: LearningBitsOverlay (RPG dialog box with typewriter, sr-only accessibility, aria-live), LearningBitsAvatar (64px circular mascot), LearningBitsBubble (collapsed reopen button), BouncingDots (animated ellipsis)
- Modified UncertaintyPriorForm: prior shape section wrapped in accordion (default closed, D-08), onPriorShapeAccordionOpen + onPriorBoundFocus callbacks added, highlight-pulse-container applied on implied lift when |mean| > 1% (D-09)
- Modified ExperimentDesignForm: advanced timing wrapped in accordion (default closed, D-10), onAdvancedTimingOpen callback added
- Modified PriorShapeForm: onShapeOptionClick prop for re-triggerable M3 on shape option clicks (D-12)
- Modified CalculatorPage: guide state, trigger state, useGuideMessages hook, trigger callbacks, overlay/bubble conditional rendering
- Auto-fixed: useTypewriter matchMedia guard for jsdom test environments

## Task Commits

1. **Task 1: Create guide components** - `4902516` (feat)
2. **Task 2: Add accordion collapses and highlight pulse** - `c834dcb` (feat)
3. **Task 3: Wire guide system in CalculatorPage** - `5faf165` (feat)

Task 4 (human-verify) — awaiting checkpoint approval.

## Files Created/Modified

- `src/components/guide/LearningBitsAvatar.tsx` - 64px circular mascot avatar component
- `src/components/guide/BouncingDots.tsx` - Three-dot animated ellipsis with animate-dot-bounce class
- `src/components/guide/LearningBitsOverlay.tsx` - RPG dialog card: rpg-dialog-box, lb-font, useTypewriter, aria-live, sr-only, close button
- `src/components/guide/LearningBitsBubble.tsx` - Collapsed avatar button, aria-label "Open Learning Bits guidance"
- `src/components/forms/UncertaintyPriorForm.tsx` - Prior shape accordion (D-08), onPriorShapeAccordionOpen, onPriorBoundFocus, highlight-pulse
- `src/components/forms/ExperimentDesignForm.tsx` - Advanced timing accordion (D-10), onAdvancedTimingOpen
- `src/components/forms/PriorShapeForm.tsx` - onShapeOptionClick for re-triggerable M3 shape clicks
- `src/pages/CalculatorPage.tsx` - Guide system orchestration: state, hooks, callbacks, overlay/bubble rendering
- `src/hooks/useTypewriter.ts` - Added matchMedia existence guard for jsdom compatibility

## Decisions Made

- **renderDialogueText helper**: splits on `/_([^_]+)_/g` inside LearningBitsOverlay to convert `_word_` to `<em>` elements; processes the `displayed` (sliced) text not the full message, preventing typewriter reset on parent re-renders (Pitfall 4)
- **Highlight-pulse remount**: `key={shouldHighlight ? pulseKey : 'no-pulse'}` forces DOM remount only on false→true transitions so the CSS animation replays on each threshold crossing
- **useTypewriter matchMedia guard**: added `typeof window.matchMedia === 'function'` — jsdom provides a window object but not matchMedia, causing TypeError when App.test.tsx renders CalculatorPage with the overlay
- **Accordion optional chaining retained**: UncertaintyPriorForm already uses `priorShapeFormRef.current?.validate()` — when accordion is closed and ref is null, validation correctly skips (priorShape defaults to 'normal' which is valid)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useTypewriter matchMedia TypeError in jsdom test environment**
- **Found during:** Task 3 (CalculatorPage wiring, running tests)
- **Issue:** `useTypewriter` called `window.matchMedia(...)` without checking if `matchMedia` exists. jsdom (vitest test environment) provides a `window` object but no `matchMedia`, causing `TypeError: window.matchMedia is not a function` when App.test.tsx rendered CalculatorPage (which now includes the overlay).
- **Fix:** Added `typeof window.matchMedia === 'function'` guard in the `useRef` initializer — gracefully falls back to `false` (no reduced motion) in environments without matchMedia.
- **Files modified:** src/hooks/useTypewriter.ts
- **Committed in:** 5faf165 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** Fix required for correctness in test environments. No scope creep.

## Issues Encountered

None beyond the auto-fixed matchMedia issue above.

## Known Stubs

None. All guide components use real data sources:
- `LearningBitsOverlay` receives `messageText` from `useGuideMessages` which returns real dialogue content from `GUIDE_MESSAGES`
- `guideEnabled` state is real Zustand state persisted in sessionStorage
- All callbacks wire real trigger events to the guide message hook

## Next Phase Readiness

- Task 4 (human-verify) checkpoint pending — user needs to visually verify the guide overlay, close/reopen, section navigation, highlight pulse, accordion, and reduced-motion behavior
- After Task 4 approval, plan 22-02 is complete and phase 22 is done
- The Learning Bits guide system is fully operational and ready for phase 23 (Homepage & Welcome Experience)

---
*Phase: 22-learning-bits-guide-infrastructure*
*Paused at checkpoint: Task 4 (human-verify)*
*Completed tasks: 1-3 of 4*
