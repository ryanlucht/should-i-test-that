---
phase: 22-learning-bits-guide-infrastructure
plan: 01
subsystem: ui
tags: [zustand, react-hooks, css, animations, guide, typewriter]

# Dependency graph
requires:
  - phase: 15-18 (DRUIDS design system)
    provides: Design tokens (primary #7C3AED, fonts, color palette) used by guide CSS
provides:
  - guideEnabled boolean persisted in sessionStorage via Zustand (defaults true per D-06)
  - useTypewriter hook: character-by-character text reveal at 30ms/char with reduced-motion support
  - useGuideMessages hook: 7-message routing system with section scroll + trigger event support
  - RPG dialog box CSS (.rpg-dialog-box), bouncing dots (@keyframes dot-bounce), highlight pulse
  - Space Grotesk font imported in index.html for dialogue box typography
  - Learning Bits mascot avatar PNG in public/learning-bits.png
affects:
  - 22-02 (guide UI components — LearningBitsOverlay, LearningBitsAvatar, BouncingDots)
  - Any future phase modifying wizardStore or guide system

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: RED tests first (failing imports), GREEN minimal implementation, verify all pass"
    - "Zustand top-level persist: extend partialize + merge() to handle non-inputs fields (guideEnabled)"
    - "useTypewriter: fake timers advanced per-character in tests (advanceChars helper)"
    - "useGuideMessages: forward-only message advancement with re-triggerable M3 exception"

key-files:
  created:
    - src/hooks/useTypewriter.ts
    - src/hooks/useTypewriter.test.ts
    - src/hooks/useGuideMessages.ts
    - src/hooks/useGuideMessages.test.ts
    - public/learning-bits.png
  modified:
    - src/types/wizard.ts
    - src/stores/wizardStore.ts
    - src/stores/wizardStore.test.ts
    - index.html
    - src/index.css

key-decisions:
  - "Added guideEnabled to v1.2 mode-based WizardState (not flat WizardInputs) since worktree is on v1.2 codebase — works correctly with the existing persist/merge infrastructure"
  - "useTypewriter: reads matchMedia via useRef on mount to avoid per-render calls"
  - "useGuideMessages: M3 (PriorShapeAccordionOpen) always re-triggers to index 2 per D-12; all other triggers are forward-only"
  - "Fake timer tests: advance per-character (advanceChars helper) not in bulk, since React re-renders between setTimeout callbacks"

patterns-established:
  - "Pattern 1: Per-character timer advancement — use a helper that calls act(() => vi.advanceTimersByTime(30)) N times, not once with N*30ms"
  - "Pattern 2: Zustand merge() update — when persisting top-level fields outside inputs, update merge() to handle them with defaults for old snapshots"

requirements-completed: [GUIDE-01, GUIDE-02, GUIDE-03]

# Metrics
duration: 8min
completed: 2026-03-25
---

# Phase 22 Plan 01: Learning Bits Guide Infrastructure Summary

**guideEnabled Zustand persistence, useTypewriter character-reveal hook (30ms/char, reduced-motion), and useGuideMessages 7-message routing with section scroll and trigger events; RPG dialog CSS, Space Grotesk font, and mascot PNG asset**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-25T19:11:41Z
- **Completed:** 2026-03-25T19:19:59Z
- **Tasks:** 3
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments

- Extended Zustand wizardStore with `guideEnabled: boolean` — defaults true, persisted in sessionStorage, resetWizard resets to true, merge() defaults to true for old snapshots
- Created `useTypewriter` hook with 30ms character delay, reduced-motion bypass, reset on text change — 5 tests all pass
- Created `useGuideMessages` hook with 7 locked dialogue messages (D-11 confirmed), section-to-index routing, forward-only advancement, re-triggerable M3 — 13 tests all pass
- Added CSS infrastructure: `.rpg-dialog-box`, `@keyframes dot-bounce`, `.animate-dot-bounce`, `@keyframes highlight-pulse`, `.highlight-pulse-container`, `.lb-font` with prefers-reduced-motion overrides
- Added Space Grotesk font import to `index.html` alongside Inter
- Extracted `Learning Bits.png` (324KB) from LearningBitsMockup.zip to `public/learning-bits.png`
- Full test suite: 492 tests, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Zustand store with guideEnabled** - `5f4a0ee` (feat)
2. **Task 2: Create useTypewriter and useGuideMessages hooks** - `c6b2a0c` (feat)
3. **Task 3: CSS infrastructure, Space Grotesk font, and Learning Bits asset** - `5ab4d6a` (feat)

## Files Created/Modified

- `src/types/wizard.ts` - Added `guideEnabled: boolean` to WizardState, `setGuideEnabled` to WizardActions
- `src/stores/wizardStore.ts` - Added guideEnabled initial state, action, partialize entry, and merge() logic
- `src/stores/wizardStore.test.ts` - Added `describe('guideEnabled')` block with 6 behavioral tests; updated `beforeEach` to include `guideEnabled: true`
- `src/hooks/useTypewriter.ts` - New hook: character-by-character reveal at 30ms, reduced-motion bypass, text reset
- `src/hooks/useTypewriter.test.ts` - 5 tests: initial state, char reveal, full text, reset on change, reduced-motion
- `src/hooks/useGuideMessages.ts` - New hook: GuideTrigger enum, GUIDE_MESSAGES[7], section/trigger-to-index routing
- `src/hooks/useGuideMessages.test.ts` - 13 tests: all 7 message indices, no-regress, re-triggerable M3
- `index.html` - Added Space Grotesk Google Fonts link (weights 400/700)
- `src/index.css` - Added Learning Bits CSS classes after existing reduced-motion block
- `public/learning-bits.png` - Mascot avatar asset extracted from LearningBitsMockup.zip

## Decisions Made

- **guideEnabled added to v1.2 store**: The worktree is on the v1.2 codebase (mode-based WizardState), while the plan was written for the post-phase-19 flat WizardInputs structure. Applied the plan's goal to the existing v1.2 structure instead — fully compatible.
- **merge() rewrite**: The existing v1.2 merge() returned early on `!persisted?.inputs`. Replaced with a full merge that handles `inputs`, `mode`, and `guideEnabled` — more robust for future additions.
- **Per-character timer advancement**: `vi.advanceTimersByTime(n * 30)` in a single call does not work for the typewriter hook because React needs to re-render between each `setTimeout` callback. Created an `advanceChars(n)` helper that wraps each 30ms advance in `act()`.
- **M3 re-triggerability**: `PriorShapeAccordionOpen` always sets message index to 2 regardless of current position (D-12 says re-triggerable). All other triggers use functional updates but only advance forward.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Per-character timer advancement in useTypewriter tests**
- **Found during:** Task 2 (useTypewriter tests)
- **Issue:** Test `shows full text after sufficient time` used `vi.advanceTimersByTime(text.length * 30)` in one call. This revealed only 1 character because React needs to re-render between each setTimeout to schedule the next one.
- **Fix:** Created `advanceChars(n)` helper function that calls `act(() => vi.advanceTimersByTime(30))` N times, allowing React to process state updates between each timer tick.
- **Files modified:** src/hooks/useTypewriter.test.ts
- **Committed in:** c6b2a0c (Task 2 commit)

**2. [Rule 1 - Bug] Improved merge() to handle persisted.inputs.shared/advanced separately**
- **Found during:** Task 1 (wizardStore merge implementation)
- **Issue:** The v1.2 InputsState has nested `{ shared, advanced }` structure. A naive spread of `persisted.inputs` onto `currentState.inputs` would not correctly merge nested objects.
- **Fix:** Updated merge() to spread `shared` and `advanced` separately: `{ shared: {...current.inputs.shared, ...persisted.inputs.shared}, advanced: {...} }`.
- **Files modified:** src/stores/wizardStore.ts
- **Committed in:** 5f4a0ee (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs in test/implementation details)
**Impact on plan:** Both fixes were for correctness. No scope creep.

## Issues Encountered

- **Worktree codebase mismatch**: The worktree is on the v1.2 codebase (mode-based WizardState with SharedInputs/AdvancedInputs), while the plan was written for the post-phase-19 flat WizardInputs structure. Adapted implementation to work with the existing v1.2 types — all plan goals were achieved.

## Known Stubs

None. All exports are implemented with real logic. GUIDE_MESSAGES contains the 7 final dialogue messages (D-11 confirmed). No placeholder text or hardcoded empty values in the code paths.

## Next Phase Readiness

- All hooks and types are ready for Phase 22-02 to build the guide UI components
- `useTypewriter` and `useGuideMessages` are ready for import by `LearningBitsOverlay`
- `guideEnabled` state is available in `useWizardStore` for the overlay toggle logic
- CSS classes (`.rpg-dialog-box`, `.animate-dot-bounce`, `.lb-font`) are ready for use in JSX
- `public/learning-bits.png` is ready for `<img src="/learning-bits.png" />`

---
*Phase: 22-learning-bits-guide-infrastructure*
*Completed: 2026-03-25*
