---
phase: 27-code-review-statistics-audit-v4-fixes
plan: 01
subsystem: calculations
tags: [student-t, cdf, pdf, truncation, posterior, evsi, jstat, statistics]

# Dependency graph
requires:
  - phase: 22.1-stats-engine-correctness
    provides: "Student-t calibration fix, centralized prior construction, truncated Normal posterior mean"
provides:
  - "Exact CDF/PDF Student-t effective-prior metrics (replaces broken Simpson integration)"
  - "Truncation-aware Normal posterior mean in MC path"
  - "Quantile-bounded Student-t posterior grid (replaces hardcoded 6*sigma)"
  - "df<=1 (Cauchy) guard on Student-t truncated mean"
affects: [evsi-calculations, net-value, worker-routing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exact CDF/PDF formulas for truncated Student-t metrics instead of numerical integration"
    - "Truncation materiality check using standardized Normal CDF in posterior mean"
    - "Quantile-based grid bounds via studentTQuantileBounds for adaptive tail coverage"

key-files:
  created: []
  modified:
    - "src/lib/calculations/evsi.ts"
    - "src/lib/calculations/evsi.test.ts"

key-decisions:
  - "Replaced 200-point Simpson integration with exact jStat.studentt.cdf/pdf formulas for Student-t effective prior"
  - "Used truncation materiality threshold of 0.001 (matching TRUNCATION_THRESHOLD) for Normal posterior"
  - "Used quantile bounds at 0.0001/0.9999 for Student-t posterior grid (captures 99.98% of mass)"
  - "df<=1 guard returns clamped mu as safe fallback (product constrains df to {3,5,10})"

patterns-established:
  - "Exact CDF/PDF over numerical integration: prefer closed-form when distribution supports it"

requirements-completed: [SA-1, SA-2, SA-7]

# Metrics
duration: 8min
completed: 2026-04-15
---

# Phase 27 Plan 01: EVSI Statistics Engine Fixes Summary

**Exact CDF/PDF Student-t effective-prior metrics, truncation-aware Normal posterior mean, and quantile-bounded Student-t posterior grid**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-15T13:59:37Z
- **Completed:** 2026-04-15T14:07:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- SA-1 (HIGH): Replaced catastrophically wrong 200-point Simpson integration with exact CDF/PDF formulas for Student-t effective-prior metrics. Symmetric priors now correctly return ~0.5 probability at threshold=0 for all CR0 values (was 0.86+ for CR0=0.05, 0.99993 for CR0=0.01).
- SA-2 (HIGH): Restored truncation-aware Normal posterior mean in computePosteriorMean(). The MC path now checks truncation materiality and uses truncatedNormalMeanTwoSided when more than 0.1% of posterior mass is outside feasibility bounds. Fixes decision flip for high CR0 cases.
- SA-7 (MEDIUM): Replaced hardcoded mu+/-6*sigma bounds with studentTQuantileBounds(0.0001, 0.9999) for Student-t posterior grid. Regression test proves quantile bounds are 2x+ wider for df=3.
- Added df<=1 (Cauchy) guard with safe fallback to prevent undefined truncated mean.
- 16 new regression tests covering all three findings plus edge cases.

## Task Commits

Each task was committed atomically (TDD: test then feat):

1. **Task 1: Replace Student-t Simpson integration with exact CDF/PDF formulas (SA-1)**
   - `f1454ab` (test: add failing tests for Student-t exact CDF/PDF formulas)
   - `fa60ddb` (feat: replace Simpson with exact CDF/PDF, implement df<=1 guard)

2. **Task 2: Restore truncation-aware Normal posterior mean + quantile-bounded Student-t grid (SA-2 + SA-7)**
   - `28618c3` (test: add failing tests for Normal posterior truncation and Student-t grid bounds)
   - `f0d5cbf` (feat: restore truncation-aware Normal posterior, replace 6*sigma with quantile bounds)

## Files Created/Modified
- `src/lib/calculations/evsi.ts` - Replaced Student-t Simpson integration with exact CDF/PDF formulas in computeEffectivePriorMetrics(); added truncation-aware Normal posterior mean in computePosteriorMean(); replaced hardcoded 6*sigma with studentTQuantileBounds in computePosteriorMeanGrid(); added import for studentTQuantileBounds
- `src/lib/calculations/evsi.test.ts` - 16 new regression tests: 12 for SA-1 (symmetric/asymmetric priors across CR0 values, sigma=0 guard, NaN pair, df<=1 guard), 2 for SA-2 (truncation-sensitive and negligible cases), 2 for SA-7 (quantile bounds wider than 6*sigma, posterior integration with quantile bounds)

## Decisions Made
- Used exact CDF/PDF formulas instead of any form of numerical integration for Student-t effective-prior metrics. The exact formulas are simpler, faster, and provably correct.
- Truncation materiality threshold set to 0.001 (matching TRUNCATION_THRESHOLD from feasibility.ts) for consistency with the hook/worker routing decision.
- Quantile bounds at p=0.0001/0.9999 chosen to capture 99.98% of Student-t mass while avoiding extreme tail values that could cause numerical issues.
- df<=1 guard uses clamped mu (median) as fallback since Cauchy has no finite mean. This is a safety guard only -- the product UI constrains df to {3, 5, 10}.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Git commits initially went to wrong branch (main instead of worktree branch) due to CWD changes when running vitest. Resolved by cherry-picking commits to worktree branch and resetting main.

## Known Stubs

None - all implementations are complete with no placeholder data or TODO markers.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EVSI statistics engine SA-1, SA-2, SA-7 fixes complete
- Ready for Plan 02 (impossible-prior state propagation fix) and remaining audit findings
- All 587 existing tests pass, lint clean, build succeeds

## Self-Check: PASSED

---
*Phase: 27-code-review-statistics-audit-v4-fixes*
*Completed: 2026-04-15*
