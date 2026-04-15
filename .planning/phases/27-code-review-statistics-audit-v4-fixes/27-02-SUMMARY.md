---
phase: 27-code-review-statistics-audit-v4-fixes
plan: 02
subsystem: ui, state-management
tags: [zustand, react-hook-form, stale-state, invalidation, wizard]

# Dependency graph
requires:
  - phase: 01-foundation-wizard-infrastructure
    provides: Wizard store with completedSections, canAccessSection, markSectionComplete
provides:
  - invalidateSection store action that removes target + downstream sections from completedSections
  - Form-level dirty detection via RHF isDirty wired to CalculatorPage callbacks
  - Gated onSectionDirty callbacks that only fire when section was previously completed
affects: [results-display, share-urls, png-export]

# Tech tracking
tech-stack:
  added: []
  patterns: [onSectionDirty callback pattern for form-to-page invalidation signaling]

key-files:
  created: []
  modified:
    - src/stores/wizardStore.ts
    - src/types/wizard.ts
    - src/stores/wizardStore.test.ts
    - src/pages/CalculatorPage.tsx
    - src/components/forms/BaselineMetricsForm.tsx
    - src/components/forms/UncertaintyPriorForm.tsx
    - src/components/forms/ThresholdScenarioForm.tsx
    - src/components/forms/ExperimentDesignForm.tsx

key-decisions:
  - "Uniform invalidation on any field edit (including visitorUnitLabel) -- simpler, safer, and label IS in exports"
  - "Gate onSectionDirty in CalculatorPage (not form) so forms don't need section index knowledge"
  - "isDirty from RHF used as trigger -- fires on first edit after mount, idempotent on repeated calls"

patterns-established:
  - "onSectionDirty callback: forms signal dirty state to parent, parent decides whether to invalidate"
  - "invalidateSection(n): filter-based removal of sections >= n from completedSections array"

requirements-completed: [CR-1]

# Metrics
duration: 5min
completed: 2026-04-15
---

# Phase 27 Plan 02: Stale-Values Invalidation Summary

**invalidateSection store action with RHF dirty detection wired through CalculatorPage to prevent stale results after editing completed wizard sections (CR-1)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-15T13:58:20Z
- **Completed:** 2026-04-15T14:03:02Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added `invalidateSection` to Zustand store that removes target section and all downstream from completedSections
- Wired RHF `isDirty` detection in all four form components via `onSectionDirty` callback
- CalculatorPage gates callbacks on `completedSections.includes(n)` to avoid unnecessary calls during initial fill
- Added 7 new store tests including full integration test for invalidation + re-completion flow
- All 577 tests pass, build and lint clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Add invalidateSection to store with unit tests (TDD)**
   - `30d3cac` (test) - RED: failing tests for invalidateSection
   - `e2785c9` (feat) - GREEN: implement invalidateSection store action
2. **Task 2: Wire form-level dirty detection to invalidateSection** - `4c2f68c` (feat)

_Note: f486560 is a housekeeping commit restoring plan files after worktree rebase._

## Files Created/Modified
- `src/types/wizard.ts` - Added `invalidateSection` to WizardActions interface
- `src/stores/wizardStore.ts` - Implemented `invalidateSection` action with `filter(s < section)`
- `src/stores/wizardStore.test.ts` - Added 7 tests: 6 unit + 1 integration for invalidation flow
- `src/pages/CalculatorPage.tsx` - Added invalidateSection selector, 4 gated dirty handlers, wired to forms
- `src/components/forms/BaselineMetricsForm.tsx` - Added onSectionDirty prop + isDirty useEffect
- `src/components/forms/UncertaintyPriorForm.tsx` - Added onSectionDirty prop + isDirty useEffect
- `src/components/forms/ThresholdScenarioForm.tsx` - Added onSectionDirty prop + isDirty useEffect
- `src/components/forms/ExperimentDesignForm.tsx` - Added onSectionDirty prop + isDirty useEffect

## Decisions Made
- **Uniform invalidation on any field:** Including `visitorUnitLabel` despite being "presentational only" -- simpler, safer, and the label IS included in share URLs and exports
- **Gate in CalculatorPage, not forms:** Forms don't need to know their section index; CalculatorPage owns the mapping from form identity to section number
- **RHF isDirty as trigger:** Fires when user first edits any field after mount. After re-submit, isDirty remains true but invalidateSection is idempotent (already invalidated). When markSectionComplete is called on successful re-submit, section is re-added.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Worktree soft reset accidentally removed plan files from git index; restored from correct base commit (f486560)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CR-1 (stale-values bug) fully addressed at store and form levels
- Ready for manual testing: complete all sections, edit a field in section 0, verify Results becomes inaccessible
- Downstream plans (CR-2 through CR-5) can proceed independently

## Self-Check: PASSED

- All 8 modified files verified present on disk
- All 3 task commits (30d3cac, e2785c9, 4c2f68c) verified in git log
- invalidateSection present in wizard.ts, wizardStore.ts, CalculatorPage.tsx, wizardStore.test.ts
- onSectionDirty present in all 4 form components
- isDirty useEffect present in all 4 form components
- 577 tests pass, build succeeds, lint clean

---
*Phase: 27-code-review-statistics-audit-v4-fixes*
*Completed: 2026-04-15*
