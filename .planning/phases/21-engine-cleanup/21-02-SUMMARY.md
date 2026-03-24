---
phase: 21-engine-cleanup
plan: 02
subsystem: testing
tags: [edge-cases, ENG-19, ENG-15, ENG-16, netValueDollars, EVSI, NaN-safety, degenerate-inputs]

# Dependency graph
requires:
  - phase: 21-engine-cleanup
    provides: "normalPdf sd<=0 guard, shared warning helpers, CalculationWarning type"
provides:
  - "Corrected hook test assertion: netValueDollars is finite, not >= 0"
  - "ENG-19 edge-case safety tests for MC EVSI and net value with degenerate inputs"
  - "Confirmed CostOfDelayCard dead code fully removed (ENG-16)"
affects: [calculations, hooks]

# Tech tracking
tech-stack:
  added: []
  patterns: ["ENG-19 edge-case safety test pattern: describe block per module verifying no NaN/Infinity"]

key-files:
  created: []
  modified:
    - "src/hooks/useEVSICalculations.test.ts"
    - "src/lib/calculations/evsi.test.ts"
    - "src/lib/calculations/net-value.test.ts"

key-decisions:
  - "Tests pass immediately since guards already exist from 21-01 and prior phases; TDD GREEN is inherent"
  - "ENG-16 confirmed: CostOfDelayCard removed, remaining CoDResults/calculateCostOfDelay actively used"

patterns-established:
  - "ENG-19 safety test pattern: consolidated describe blocks verifying degenerate inputs produce valid numeric output"

requirements-completed: [ENG-15, ENG-16, ENG-19]

# Metrics
duration: 4min
completed: 2026-03-24
---

# Phase 21 Plan 02: Test Fixes + Edge-Case Safety Summary

**Fixed incorrect netValueDollars >= 0 assertion in hook test, confirmed dead CostOfDelayCard removal, added 8 ENG-19 edge-case safety tests for degenerate MC EVSI and net value inputs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T18:35:51Z
- **Completed:** 2026-03-24T18:39:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed outdated hook test assertion that incorrectly asserted netValueDollars >= 0 (ENG-15); net value CAN be negative per ENG-08
- Confirmed CostOfDelayCard component fully removed from codebase (ENG-16); remaining CoDResults/calculateCostOfDelay are actively used
- Added 4 new ENG-19 edge-case safety tests to evsi.test.ts: MC EVSI with Normal sigma_L=0, Student-t sigma_L=0, invalid Uniform (low >= high), and equal-bounds Uniform
- Added 4 new ENG-19 edge-case safety tests to net-value.test.ts: net value with Normal sigma_L=0, Student-t sigma_L=0, invalid Uniform (low >= high), and equal-bounds Uniform
- All 8 new tests verify no NaN, no Infinity from degenerate inputs; all pass (guards already exist from 21-01)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix outdated hook test assertion + verify dead CostOfDelayCard removal (ENG-15, ENG-16)**
   - `6b98ccd` (fix): correct outdated netValueDollars >= 0 assertion

2. **Task 2: Add comprehensive edge-case safety tests (ENG-19)**
   - `bdadb48` (test): add ENG-19 edge-case safety tests for degenerate inputs

## Files Created/Modified
- `src/hooks/useEVSICalculations.test.ts` - Replaced incorrect `toBeGreaterThanOrEqual(0)` with `Number.isFinite()` check for netValueDollars
- `src/lib/calculations/evsi.test.ts` - Added `ENG-19: edge-case safety` describe block with 4 tests for MC EVSI degenerate inputs
- `src/lib/calculations/net-value.test.ts` - Added `ENG-19: NetValue edge-case safety` describe block with 4 tests for net value degenerate inputs

## Decisions Made
- Tests pass immediately (TDD GREEN inherent) since guards were already implemented in 21-01 and prior phases; the tests document and verify existing behavior
- ENG-16 confirmed complete: CostOfDelayCard component removed by Phase 19; remaining CoDResults interface and calculateCostOfDelay function are actively used in hook

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing test failures (19 tests in useEVSICalculations.test.ts "when mode is advanced" block) caused by parallel agent removing `setMode` function during Basic Mode Deprecation (Phase 19). These failures are out of scope for this plan and do not affect the tests modified here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All engine cleanup requirements complete (ENG-14 through ENG-19)
- Phase 21 fully done: warning helpers DRY, normalPdf hardened, assertions corrected, dead code confirmed removed, edge-case safety verified
- Ready for Phase 22 (Learning Bits Guide Infrastructure)

---
*Phase: 21-engine-cleanup*
*Completed: 2026-03-24*
