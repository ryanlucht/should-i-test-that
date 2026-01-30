---
phase: 05-advanced-mode
plan: 04
subsystem: calculations
tags: [evsi, monte-carlo, bayesian, cost-of-delay, sample-size, conjugate-update]

# Dependency graph
requires:
  - phase: 05-01
    provides: Distribution abstraction layer (Normal, Student-t, Uniform)
provides:
  - deriveSampleSizes function for experiment design
  - calculateCostOfDelay function per SPEC.md A6
  - calculateEVSIMonteCarlo for all prior shapes
  - calculateEVSINormalFastPath O(1) closed-form for Normal
affects: [05-05, 05-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feasibility bounds: reject samples where CR1 outside [0,1]"
    - "Pre-posterior analysis via Monte Carlo simulation"
    - "Conjugate Normal-Normal update for fast path"

key-files:
  created:
    - src/lib/calculations/sample-size.ts
    - src/lib/calculations/sample-size.test.ts
    - src/lib/calculations/cost-of-delay.ts
    - src/lib/calculations/cost-of-delay.test.ts
    - src/lib/calculations/evsi.ts
    - src/lib/calculations/evsi.test.ts
  modified:
    - src/lib/calculations/types.ts
    - src/lib/calculations/index.ts

key-decisions:
  - "EVSI Monte Carlo uses rejection sampling for feasibility bounds"
  - "Normal fast path uses pre-posterior sigma from conjugate update"
  - "Sample sizes floored to integers, n_control = n_total - n_variant for exact sum"

patterns-established:
  - "Monte Carlo EVSI: sample L, simulate test, average value improvement"
  - "CoD only applies when default decision is Ship"

# Metrics
duration: 6min
completed: 2026-01-30
---

# Phase 5 Plan 04: EVSI Calculation Engine Summary

**Monte Carlo and closed-form EVSI calculation with sample size derivation and Cost of Delay per SPEC.md A3-A6**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-30T14:38:00Z
- **Completed:** 2026-01-30T14:46:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Sample size derivation from experiment design (daily traffic, duration, eligibility, split)
- Cost of Delay calculation that correctly returns 0 when default is Don't Ship
- Monte Carlo EVSI supporting Normal, Student-t, and Uniform priors with feasibility bounds
- O(1) Normal fast path using conjugate update for pre-posterior sigma
- 39 new calculation tests (159 total in calculations/)

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD Sample Size Derivation** - `fbd9e9d` (feat)
2. **Task 2: TDD Cost of Delay** - `d51a7eb` (feat)
3. **Task 3: TDD EVSI Calculation** - `e34de58` (feat)

## Files Created/Modified
- `src/lib/calculations/sample-size.ts` - deriveSampleSizes(inputs) -> {n_total, n_control, n_variant}
- `src/lib/calculations/sample-size.test.ts` - 9 tests for sample size derivation
- `src/lib/calculations/cost-of-delay.ts` - calculateCostOfDelay per SPEC.md A6
- `src/lib/calculations/cost-of-delay.test.ts` - 10 tests for CoD calculation
- `src/lib/calculations/evsi.ts` - Monte Carlo and Normal fast path EVSI
- `src/lib/calculations/evsi.test.ts` - 20 tests for EVSI calculations
- `src/lib/calculations/types.ts` - Added EVSIInputs and EVSIResults interfaces
- `src/lib/calculations/index.ts` - Exported new modules

## Decisions Made
- **Rejection sampling for feasibility:** CR1 = CR0*(1+L) must be in [0,1]; samples violating this are rejected and resampled rather than clamped, preserving distribution shape
- **Pre-posterior sigma calculation:** Uses conjugate update formula sigma_preposterior = sigma_prior * sqrt(data_precision / posterior_precision)
- **n_control = n_total - n_variant:** Ensures exact summation after flooring, avoiding rounding errors
- **Default 5000 Monte Carlo samples:** Balances accuracy (~5% tolerance) with performance (<100ms)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Monte Carlo test variance:** Initial tests comparing Monte Carlo to fast path used inputs where EVSI was near zero (asymmetric threshold far from mean), causing 0/0 = NaN. Fixed by using inputs with meaningful uncertainty.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- EVSI calculation engine complete and tested
- Ready for Web Worker integration (Plan 05)
- Ready for Results UI (Plan 06)
- All functions exported from calculations/index.ts

---
*Phase: 05-advanced-mode*
*Completed: 2026-01-30*
