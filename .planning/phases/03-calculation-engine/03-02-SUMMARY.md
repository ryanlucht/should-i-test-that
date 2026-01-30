---
phase: 03-calculation-engine
plan: 02
subsystem: calculations
tags: [evpi, normal-distribution, decision-theory, closed-form]

# Dependency graph
requires:
  - phase: 03-01
    provides: statistics primitives (standardNormalPDF, standardNormalCDF), derived functions (deriveK, determineDefaultDecision, detectEdgeCases)
provides:
  - calculateEVPI function with closed-form Normal formula
  - Complete EVPI calculation engine for Basic mode
affects: [03-results-display, 04-results-screen, 05-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Closed-form Normal EVPI formula per SPEC.md Section 8.4
    - Ship vs Dont-Ship branching for EVPI formula selection

key-files:
  created:
    - src/lib/calculations/evpi.ts
    - src/lib/calculations/evpi.test.ts
    - src/lib/calculations/index.ts
  modified: []

key-decisions:
  - "Non-negative clamp on EVPI for floating point safety"

patterns-established:
  - "EVPI formula selection based on default decision"
  - "Barrel export pattern for calculations module"

# Metrics
duration: 3min
completed: 2026-01-30
---

# Phase 03 Plan 02: EVPI Calculation Summary

**Closed-form EVPI calculation using Normal distribution formula from SPEC.md Section 8.4**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-30T14:44:35Z
- **Completed:** 2026-01-30T14:47:53Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Implemented `calculateEVPI` function with SPEC.md Section 8.4 formulas
- Full TDD cycle: 24 comprehensive tests covering formulas, edge cases, probabilities
- Returns complete results: EVPI dollars, default decision, probabilities, K, z-score, phi, Phi, edge case flags

## Task Commits

Each task was committed atomically:

1. **Task 1: Write EVPI tests (RED)** - `4f94d85` (test)
2. **Task 2: Implement EVPI calculation (GREEN)** - `2a0431d` (feat)
3. **Task 3: Verify and refactor** - No separate commit (refactoring done in Task 2)

_Note: TDD Task 3 refinements were incorporated into Task 2 implementation_

## Files Created/Modified

- `src/lib/calculations/evpi.ts` - EVPI calculation engine with closed-form Normal formula
- `src/lib/calculations/evpi.test.ts` - 24 comprehensive tests for EVPI calculation
- `src/lib/calculations/index.ts` - Barrel export for calculations module

## Decisions Made

1. **Non-negative clamp on EVPI** - Added `Math.max(0, evpiDollars)` as defensive measure against floating point errors, though EVPI is mathematically always non-negative

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **Hand calculation precision** - Initial hand-calculated EVPI estimate (38,200) differed from computed value (38,135) by ~65. Updated test to use more precise calculation. Root cause: used approximate lookup values for Phi(-1/3) instead of exact Abramowitz-Stegun computation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EVPI calculation complete and ready for results display integration
- All calculation functions now available via barrel export: `import { calculateEVPI } from '@/lib/calculations'`
- Plan 03-03 (Results Integration) can use calculateEVPI to compute and display results

---
*Phase: 03-calculation-engine*
*Completed: 2026-01-30*
