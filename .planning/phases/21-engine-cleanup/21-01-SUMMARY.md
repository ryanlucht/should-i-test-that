---
phase: 21-engine-cleanup
plan: 01
subsystem: calculations
tags: [normalPdf, warning-helpers, DRY, feasibility, evsi, net-value, types]

# Dependency graph
requires:
  - phase: 20-engine-accuracy-fixes
    provides: "feasibility.ts module, TRUNCATION_THRESHOLD, computeInfeasibleTailMass"
provides:
  - "Shared warning helpers: checkRareEventsWarning, checkLowAcceptanceWarning, checkHighRejectionWarning"
  - "normalPdf sd<=0 guard (returns 0 instead of NaN/Infinity)"
  - "CalculationWarning type includes low_acceptance code"
affects: [evsi, net-value, feasibility, types]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Shared warning helpers pattern in feasibility.ts for DRY warning generation"]

key-files:
  created: []
  modified:
    - "src/lib/calculations/feasibility.ts"
    - "src/lib/calculations/feasibility.test.ts"
    - "src/lib/calculations/abtest-math.ts"
    - "src/lib/calculations/abtest-math.test.ts"
    - "src/lib/calculations/types.ts"
    - "src/lib/calculations/evsi.ts"
    - "src/lib/calculations/net-value.ts"

key-decisions:
  - "Warning helpers return CalculationWarning | null pattern for composable push-into-array usage"
  - "ENG-17 confirmed already done: net-value.ts uses liftFeasibilityBounds, added comment"

patterns-established:
  - "Shared warning helper pattern: checkXWarning() in feasibility.ts returns warning or null"

requirements-completed: [ENG-14, ENG-17, ENG-18]

# Metrics
duration: 4min
completed: 2026-03-24
---

# Phase 21 Plan 01: Engine Cleanup Summary

**DRY warning helpers extracted to feasibility.ts, normalPdf hardened against sd<=0, CalculationWarning type completed with low_acceptance**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T18:28:48Z
- **Completed:** 2026-03-24T18:33:17Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extracted checkRareEventsWarning, checkLowAcceptanceWarning, checkHighRejectionWarning into feasibility.ts as shared helpers (ENG-14)
- Added sd<=0 guard to normalPdf preventing NaN/Infinity from division by zero (ENG-18)
- Added low_acceptance to CalculationWarning type union (was used in code but missing from type)
- Confirmed ENG-17 already addressed: net-value.ts uses shared liftFeasibilityBounds
- Removed ~60 lines of duplicated inline warning logic from evsi.ts and net-value.ts (5 call sites)
- Added 14 new tests (3 for normalPdf guard, 11 for warning helpers)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add normalPdf guard + CalculationWarning type fix + tests**
   - `bda2404` (test): add failing tests for normalPdf sd<=0 guard (TDD RED)
   - `40a16c0` (feat): add normalPdf sd<=0 guard and low_acceptance to CalculationWarning type (TDD GREEN)

2. **Task 2: Extract shared warning helpers into feasibility.ts and refactor consumers**
   - `d73cba4` (test): add failing tests for shared warning helpers (TDD RED)
   - `b64003a` (refactor): extract shared warning helpers into feasibility.ts, refactor consumers (TDD GREEN)

## Files Created/Modified
- `src/lib/calculations/abtest-math.ts` - Added sd<=0 guard to normalPdf
- `src/lib/calculations/abtest-math.test.ts` - Added 3 tests for normalPdf sd<=0 guard
- `src/lib/calculations/types.ts` - Added low_acceptance to CalculationWarning code union
- `src/lib/calculations/feasibility.ts` - Added checkRareEventsWarning, checkLowAcceptanceWarning, checkHighRejectionWarning helpers
- `src/lib/calculations/feasibility.test.ts` - Added 11 tests for shared warning helpers
- `src/lib/calculations/evsi.ts` - Replaced 3 inline warning blocks with shared helper calls
- `src/lib/calculations/net-value.ts` - Replaced 2 inline warning blocks with shared helper calls, added ENG-17 comment

## Decisions Made
- Warning helpers return `CalculationWarning | null` for composable push-into-array usage at call sites
- ENG-17 confirmed already complete (net-value.ts uses liftFeasibilityBounds); added explanatory comment only

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Calculation engine is now DRY: warning logic lives in one place (feasibility.ts)
- normalPdf is hardened against degenerate inputs
- CalculationWarning type is complete
- Ready for Plan 21-02 (remaining engine cleanup tasks)

---
*Phase: 21-engine-cleanup*
*Completed: 2026-03-24*
