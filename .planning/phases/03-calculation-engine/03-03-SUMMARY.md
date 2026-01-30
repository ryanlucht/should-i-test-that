---
phase: 03-calculation-engine
plan: 03
subsystem: calculations
tags: [react, hooks, zustand, evpi, memoization]

# Dependency graph
requires:
  - phase: 03-02
    provides: calculateEVPI, normalizeThresholdToLift, deriveK functions
  - phase: 02-03
    provides: wizard store with shared inputs and threshold scenarios
provides:
  - useEVPICalculations hook connecting store to calculation engine
  - Barrel export for all calculation modules
affects: [04-visualization-results]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useMemo with explicit dependencies for EVPI calculation"
    - "Zustand selector for state subscription"
    - "Input validation returning null for incomplete data"

key-files:
  created:
    - src/hooks/useEVPICalculations.ts
    - src/hooks/useEVPICalculations.test.ts
  modified:
    - src/lib/calculations/index.ts (verified exists)

key-decisions:
  - "Hook returns null when inputs incomplete (not partial results)"
  - "Default prior used when interval is null OR matches DEFAULT_INTERVAL"
  - "Explicit useMemo dependency array listing all 8 input fields"

patterns-established:
  - "Store-to-calculation hook pattern: read state, validate, derive, calculate"
  - "renderHook testing with act() for store state changes"

# Metrics
duration: 6min
completed: 2026-01-30
---

# Phase 3 Plan 3: Store-to-Calculation Hook Summary

**React hook connecting wizard store to EVPI calculation engine with input validation, prior derivation, and threshold conversion**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-30T09:50:00Z
- **Completed:** 2026-01-30T09:56:00Z
- **Tasks:** 3
- **Files modified:** 2 (hook created, test created)

## Accomplishments
- Created useEVPICalculations hook that bridges user inputs to EVPI calculation
- Implemented input validation returning null for incomplete data
- Added prior derivation (default N(0, 0.05) vs custom from interval)
- Added threshold conversion for all scenarios (any-positive, minimum-lift, accept-loss)
- 21 comprehensive tests covering all validation, calculation, and reactivity cases

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useEVPICalculations hook** - `95f2e6a` (feat)
2. **Task 2: Create hook tests** - `a9ea490` (test)
3. **Task 3: Final verification and cleanup** - `2db72d4` (fix - vitest imports)

## Files Created/Modified
- `src/hooks/useEVPICalculations.ts` - React hook connecting store to EVPI calculations
- `src/hooks/useEVPICalculations.test.ts` - 21 tests for validation, calculation, and reactivity
- `src/lib/calculations/index.ts` - Verified barrel export already exists

## Decisions Made

1. **Hook returns null for incomplete inputs** - Per 03-CONTEXT.md, results section hidden until all inputs valid. Returning null signals "not ready" to consuming components.

2. **Default prior when interval is null OR matches defaults** - If user hasn't touched interval inputs OR they match DEFAULT_INTERVAL values within 0.01 tolerance, use DEFAULT_PRIOR. This handles both initial state and "Use Recommended Default" action.

3. **Explicit dependency array** - Listed all 8 input fields in useMemo dependencies per 03-RESEARCH.md pitfall #6 to avoid stale calculation results.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added vitest imports to test file**
- **Found during:** Task 3 (Final verification)
- **Issue:** Build failed because test file used Jest globals (describe, it, expect) without importing from vitest
- **Fix:** Added `import { describe, it, expect, beforeEach } from 'vitest';`
- **Files modified:** src/hooks/useEVPICalculations.test.ts
- **Verification:** Build passes, all 137 tests pass
- **Committed in:** `2db72d4`

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** Minor fix for project consistency. Other test files use explicit vitest imports.

## Issues Encountered
None - plan executed smoothly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

**Phase 3 (Calculation Engine) is now complete:**
- Statistics module (PDF/CDF) ready
- Derived values module (K, threshold, decision) ready
- EVPI calculation engine ready
- Store-to-calculation hook ready

**Ready for Phase 4 (Visualization & Results):**
- `useEVPICalculations()` hook can be used in results components
- Returns null until inputs are complete (results section should be hidden)
- Returns full EVPIResults object including evpiDollars, defaultDecision, edgeCases, etc.
- All calculation logic tested with 137 total test cases

---
*Phase: 03-calculation-engine*
*Completed: 2026-01-30*
