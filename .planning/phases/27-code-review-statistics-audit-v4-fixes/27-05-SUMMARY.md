---
phase: 27-code-review-statistics-audit-v4-fixes
plan: 05
subsystem: calculations
tags: [box-muller, rng, monte-carlo, feasibility, student-t, documentation, code-cleanup]

# Dependency graph
requires:
  - phase: 27-code-review-statistics-audit-v4-fixes
    plan: 01
    provides: "EVSI statistics engine fixes (SA-1, SA-2, SA-7)"
provides:
  - "Cached Box-Muller transform halving RNG calls in MC loops"
  - "Deduplicated feasibility bounds in net-value.ts via shared helper"
  - "Accurate timing-cost copy (no per-iteration overclaim)"
  - "Removed unreachable both-directions branch"
  - "Correct README testing instructions"
affects: [evsi-calculations, net-value, mc-performance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Box-Muller spare-cache pattern: cache sine component, return on alternating calls"
    - "Test-only reset helper exported with @internal jsdoc for deterministic testing"

key-files:
  created: []
  modified:
    - "src/lib/calculations/abtest-math.ts"
    - "src/lib/calculations/abtest-math.test.ts"
    - "src/lib/calculations/net-value.ts"
    - "src/lib/calculations/evsi.ts"
    - "src/lib/calculations/derived.ts"
    - "src/components/results/ValueBreakdownCard.tsx"
    - "src/components/results/AdvancedResultsSection.tsx"
    - "README.md"

key-decisions:
  - "Box-Muller spare cache uses module-level let with null sentinel for simplicity"
  - "Exported _resetBoxMullerSpare with @internal tag for test-only cache reset"
  - "Student-t locals renamed to 'scale' only in Student-t branches; Normal branches keep 'sigma_prior' naming"
  - "ExportCard timing-cost comment already accurate; no change needed"

patterns-established:
  - "Box-Muller spare-cache: always cache both components from a single pair of random draws"

requirements-completed: [SA-6, SA-10a, SA-10b, SA-10d, SA-10e, SA-11, CR-5]

# Metrics
duration: 6min
completed: 2026-04-15
---

# Phase 27 Plan 05: Code Cleanup and Simplifications Summary

**Cached Box-Muller transform halving MC RNG calls, deduplicated feasibility bounds, accurate timing-cost copy, and cleaned stale documentation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-15T14:22:23Z
- **Completed:** 2026-04-15T14:28:34Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- SA-11: Cached Box-Muller sine component in sampleStandardNormal, halving Math.random() calls in 5000+ iteration MC loops. Unit test confirms spare-cache behavior via Math.random spy.
- SA-10b: Replaced hardcoded L_min/L_max in net-value.ts with shared liftFeasibilityBounds helper, eliminating duplication with evsi.ts.
- SA-10e: Renamed Student-t local variables from `sigma` to `scale` in evsi.ts for clarity (field name `sigma_L` unchanged for compatibility).
- SA-6: Fixed timing-cost copy in ValueBreakdownCard to say "derived decomposition (difference of two MC summaries)" instead of claiming per-iteration computation.
- SA-10d: Removed unreachable both-directions interpretation branch in AdvancedResultsSection (under current model, only one directional flip probability is non-zero).
- CR-5: Updated README testing instructions from npm test/npm run test:watch to npx vitest run/npx vitest, updated test count from 463 to 570+.
- Fixed stale EVPI-specific header comment in derived.ts and stale clamping comment in net-value.ts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Box-Muller cache, feasibility bounds dedup, Student-t rename, stale comments** - `01db572` (feat)
2. **Task 2: Timing-cost copy fix, unreachable branch removal, README update** - `cadadda` (fix)

## Files Created/Modified
- `src/lib/calculations/abtest-math.ts` - Cached Box-Muller spare value with _resetBoxMullerSpare test helper
- `src/lib/calculations/abtest-math.test.ts` - Added 3 new tests for spare-cache behavior (RNG call count, finite output, zero mean)
- `src/lib/calculations/net-value.ts` - Replaced hardcoded L_min/L_max with liftFeasibilityBounds import; fixed stale clamping comment
- `src/lib/calculations/evsi.ts` - Renamed Student-t locals from sigma to scale in computeEffectivePriorMetrics and computePosteriorMeanGrid
- `src/lib/calculations/derived.ts` - Updated file header from EVPI-specific to EVSI-based analysis
- `src/components/results/ValueBreakdownCard.tsx` - Fixed timing-cost comment and expanded explanation copy
- `src/components/results/AdvancedResultsSection.tsx` - Removed unreachable both-directions branch and unused locals
- `README.md` - Updated testing instructions to npx vitest, updated test count to 570+

## Decisions Made
- Box-Muller spare cache uses a module-level `let _boxMullerSpare: number | null = null` with null sentinel. Simple, zero overhead when cache is empty.
- Exported `_resetBoxMullerSpare` with `@internal` jsdoc tag so tests can reset state between runs without exposing implementation details in public API.
- Student-t locals renamed to `scale` only in Student-t branches of evsi.ts. Normal branches retain `sigma_prior` naming since sigma genuinely means standard deviation for Normal distributions.
- ExportCard.tsx timing-cost text already says "computed as EVSI - Net Value" (accurate), so no change was needed there despite the plan suggesting one.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused pStopsShip/pConvincesShip locals**
- **Found during:** Task 2 (unreachable branch removal)
- **Issue:** After removing the both-directions branch, the pStopsShip and pConvincesShip locals became unused, causing lint errors
- **Fix:** Removed the two unused const declarations
- **Files modified:** src/components/results/AdvancedResultsSection.tsx
- **Verification:** `npx eslint src/components/results/AdvancedResultsSection.tsx` passes clean
- **Committed in:** cadadda (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary consequence of removing the unreachable branch. No scope creep.

## Issues Encountered
- 2 pre-existing test failures in ExportCard.tsx (ReferenceError: showEffectiveMeanAnnotation). Confirmed pre-existing on base commit. Out of scope for this plan.

## Known Stubs

None - all implementations are complete with no placeholder data or TODO markers.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All SA-6, SA-10a-e, SA-11, and CR-5 audit findings addressed
- Code cleanup complete: fewer RNG calls, no duplication, accurate documentation
- All 619 passing tests still pass (2 pre-existing failures in ExportCard unrelated to this plan)
- Build succeeds, lint clean on modified files

## Self-Check: PASSED

---
*Phase: 27-code-review-statistics-audit-v4-fixes*
*Completed: 2026-04-15*
