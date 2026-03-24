---
phase: 20-engine-accuracy-fixes
plan: 03
subsystem: calculations
tags: [feasibility, truncation, evsi, net-value, monte-carlo, rejection-sampling]

# Dependency graph
requires:
  - phase: 20-01
    provides: Student-t calibration and display fixes
provides:
  - Shared feasibility module (computeInfeasibleTailMass, TRUNCATION_THRESHOLD)
  - Consistent truncation handling across EVSI, net value, and fast-path routing
  - Default decision uses effective truncated mean when truncation is material
  - Normal fast path gated by infeasible tail mass
  - Adaptive rejection sampling (50x cap with low_acceptance warning)
affects: [20-04, calculations, results-display]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared feasibility module pattern: all truncation logic centralized in feasibility.ts"
    - "Tail-mass detection: computeInfeasibleTailMass checks both L_min and L_max bounds"

key-files:
  created:
    - src/lib/calculations/feasibility.ts
    - src/lib/calculations/feasibility.test.ts
  modified:
    - src/lib/calculations/evsi.ts
    - src/lib/calculations/net-value.ts
    - src/hooks/useEVSICalculations.ts
    - src/hooks/useEVSICalculations.test.ts

key-decisions:
  - "Extracted feasibility logic to shared module to eliminate cross-module coupling (Codex HIGH concern)"
  - "TRUNCATION_THRESHOLD = 0.001 (0.1% tail mass) balances precision vs detection of meaningful truncation"
  - "Rejection sampling cap increased from 10x to 50x with early-exit guard for performance"
  - "Warning text uses actionable advice (narrowing prior interval) instead of unrealistic suggestion (reducing baseline rate)"
  - "Early-return guards for degenerate inputs intentionally exempt from truncation fix"

patterns-established:
  - "All truncation detection via computeInfeasibleTailMass from feasibility.ts -- no inline heuristics"
  - "TRUNCATION_THRESHOLD as single named constant shared across evsi.ts, net-value.ts, useEVSICalculations.ts"

requirements-completed: [ENG-03, ENG-04, ENG-05, ENG-12]

# Metrics
duration: 8min
completed: 2026-03-24
---

# Phase 20 Plan 03: Feasibility Truncation Consistency Summary

**Shared feasibility module with tail-mass detection (both bounds), truncated-mean default decision, gated Normal fast path, and adaptive 50x rejection sampling**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-24T14:29:17Z
- **Completed:** 2026-03-24T14:37:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created shared feasibility.ts module eliminating cross-module coupling between evsi.ts and net-value.ts
- Replaced lower-bound-only truncation heuristic with actual tail-mass check covering both L_min and L_max bounds
- Default decision now uses effective truncated mean when truncation is material (fixes ENG-03 for high-CR0 cases)
- Normal fast path in useEVSICalculations hook gated by infeasible tail mass, falling back to MC when truncation is material
- Rejection sampling cap increased from 10x to 50x with low_acceptance warning using actionable advice

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared feasibility module and fix truncation detection + default decision** - `15554e3` (test: RED), `612aeb9` (feat: GREEN)
2. **Task 2: Gate Normal fast path by infeasible tail mass in hook** - `a987d2c` (feat)

## Files Created/Modified

- `src/lib/calculations/feasibility.ts` - Shared module: computeInfeasibleTailMass, TRUNCATION_THRESHOLD constant
- `src/lib/calculations/feasibility.test.ts` - Tests for tail-mass detection, threshold constant, default decision, rejection cap
- `src/lib/calculations/evsi.ts` - Imports from feasibility, tail-mass heuristic, truncated-mean default, 50x cap, low_acceptance warning
- `src/lib/calculations/net-value.ts` - Same changes as evsi.ts plus liftFeasibilityBounds (replaces manual bounds)
- `src/hooks/useEVSICalculations.ts` - Import feasibility module, gate Normal fast path by tail mass
- `src/hooks/useEVSICalculations.test.ts` - Remove nonneg net value assertion, add high-CR0 Normal MC test

## Decisions Made

- Extracted computeInfeasibleTailMass to shared feasibility.ts to address Codex HIGH concern about cross-module coupling
- TRUNCATION_THRESHOLD = 0.001 chosen as balance between ignoring negligible truncation and catching material cases
- Early-return guards for degenerate inputs (n<=0, CR0 invalid) intentionally exempt from truncation fix per plan scope note
- Warning text says "narrowing the prior interval or verifying the baseline conversion rate" (actionable) per Codex review

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Shared feasibility module ready for any future truncation-related work
- All four code paths (EVSI MC, Net Value MC, Normal fast path, hook routing) now use consistent truncation handling
- Ready for plan 20-04 (remaining engine accuracy fixes)

## Self-Check: PASSED

- All created files exist on disk
- All commit hashes found in git log
- All 137 tests pass across feasibility, evsi, net-value, and hook test files
- No stubs or placeholders found in modified files

---
*Phase: 20-engine-accuracy-fixes*
*Completed: 2026-03-24*
