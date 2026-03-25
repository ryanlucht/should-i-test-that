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
    - src/hooks/useTypewriter.test.ts
    - src/hooks/useGuideMessages.ts
    - src/hooks/useGuideMessages.test.ts

key-decisions:
  - "Default prior button moved outside PriorShapeForm accordion into UncertaintyPriorForm — always visible above toggle link per PM feedback"
  - "Typewriter speed reduced from 30ms to 12ms per character per PM feedback (faster, more fluid pacing)"
  - "Added M8 results message at index 7 per PM request — triggers on results section scroll"
  - "renderDialogueText helper: splits on /_([^_]+)_/g pattern inside LearningBitsOverlay to convert _word_ to <em> elements"
  - "highlight-pulse remount: key={shouldHighlight ? pulseKey : 'no-pulse'} forces DOM remount only on false→true transitions"

patterns-established:
  - "Pattern: Guide trigger callbacks — CalculatorPage owns trigger state, passes useCallback handlers to form components as optional props"
  - "Pattern: accordion progressive disclosure — useState(false) + aria-expanded + aria-controls='id', fires guide callback only when willOpen is true"

requirements-completed: [GUIDE-01, GUIDE-02, GUIDE-03]

# Metrics
duration: 12min
completed: 2026-03-25
---

# Phase 22 Plan 02: Learning Bits Guide UI Components Summary

**Four guide components (Overlay, Avatar, Bubble, BouncingDots) built and wired into CalculatorPage with 8-message section-aware dialogue, accordion progressive disclosure, and highlight-pulse on off-center prior**

## Performance

- **Duration:** ~12 min
- **Tasks:** 4 (3 auto + 1 human checkpoint with fixes)
- **Files modified:** 12 (4 created, 8 modified)

## Accomplishments

- Created `src/components/guide/` directory with 4 components: LearningBitsOverlay (RPG dialog box with typewriter, sr-only accessibility, aria-live), LearningBitsAvatar (64px circular mascot), LearningBitsBubble (collapsed reopen button), BouncingDots (animated ellipsis)
- Modified UncertaintyPriorForm: prior shape section wrapped in accordion (default closed, D-08), "Fill with Recommended Default" button always visible above accordion, highlight-pulse on implied lift when |mean| > 1% (D-09)
- Modified ExperimentDesignForm: advanced timing wrapped in accordion (default closed, D-10), onAdvancedTimingOpen callback
- Modified PriorShapeForm: removed "Fill with Recommended Default" button (moved to parent), added onShapeOptionClick for re-triggerable M3
- Modified CalculatorPage: guide state, trigger state, useGuideMessages hook, trigger callbacks, overlay/bubble conditional rendering
- Sped up typewriter from 30ms to 12ms per PM feedback
- Added M8 results dialogue message per PM request
- 472 tests pass, TypeScript clean

## Task Commits

1. **Task 1: Create guide components** - `4902516` (feat)
2. **Task 2: Add accordion collapses and highlight pulse** - `c834dcb` (feat)
3. **Task 3: Wire guide system in CalculatorPage** - `5faf165` (feat)
4. **Task 4: Human verification** - Approved with 2 fixes + 1 addition:
   - `79a1536` — Moved default prior button above accordion, reduced typewriter to 12ms
   - `77b5480` — Added M8 results dialogue message (8th message at index 7)

## Issues Encountered

- Worktree merge conflicts due to v1.2 vs flat-store divergence — resolved by keeping HEAD structure
- Default prior button inside accordion — PM caught it, moved to UncertaintyPriorForm above accordion
- useTypewriter matchMedia TypeError in jsdom — auto-fixed with typeof guard

---
*Phase: 22-learning-bits-guide-infrastructure*
*Completed: 2026-03-25*
