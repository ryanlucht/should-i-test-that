---
phase: 03-calculation-engine
plan: 01
subsystem: calculations
tags: [evpi, statistics, normal-distribution, pdf, cdf, formatting]

# Dependency graph
requires:
  - phase: 02-basic-mode-inputs
    provides: Form input infrastructure and wizard store
provides:
  - EVPIInputs, EVPIResults, EdgeCaseFlags type definitions
  - standardNormalPDF and standardNormalCDF statistical functions
  - deriveK, normalizeThresholdToLift, determineDefaultDecision functions
  - detectEdgeCases for truncation, near-zero sigma, one-sided prior
  - formatSmartCurrency for output display
affects: [03-02 EVPI core calculation, results display, debugging panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure functions for calculations (no side effects)"
    - "Abramowitz-Stegun approximation for normal CDF"
    - "Intl.NumberFormat compact notation for currency"

key-files:
  created:
    - src/lib/calculations/types.ts
    - src/lib/calculations/statistics.ts
    - src/lib/calculations/statistics.test.ts
    - src/lib/calculations/derived.ts
    - src/lib/calculations/derived.test.ts
    - src/lib/formatting.test.ts
  modified:
    - src/lib/formatting.ts

key-decisions:
  - "Abramowitz-Stegun approximation for CDF (error < 7.5e-8)"
  - "Hand-rolled PDF using standard formula"
  - "Truncation threshold at P(L < -1) > 0.1%"
  - "Near-zero sigma threshold at 0.1%"
  - "One-sided prior threshold at Phi(z) > 0.9999 or < 0.0001"

patterns-established:
  - "Pure functions pattern: All calculation functions are pure with explicit types"
  - "JSDoc math comments: All statistical functions document their formulas"
  - "TDD for calculations: Tests verify against known statistical table values"

# Metrics
duration: 5min
completed: 2026-01-30
---

# Phase 3 Plan 1: Calculation Primitives Summary

**Standard normal PDF/CDF with Abramowitz-Stegun approximation, K derivation, threshold conversion, edge case detection, and smart currency formatting**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-30T14:37:40Z
- **Completed:** 2026-01-30T14:42:25Z
- **Tasks:** 3
- **Files created:** 6
- **Files modified:** 1

## Accomplishments

- Implemented standardNormalPDF (phi) and standardNormalCDF (Phi) with high accuracy (< 7.5e-8 error)
- Created deriveK, normalizeThresholdToLift, determineDefaultDecision for input conversion
- Added detectEdgeCases to identify truncation, near-zero sigma, and one-sided prior conditions
- Implemented formatSmartCurrency with magnitude-based compact notation ($127, $12.7K, $1.27M)
- 75 new tests covering all calculation primitives

## Task Commits

Each task was committed atomically:

1. **Task 1: Create types and statistics functions with TDD** - `2dc76cb` (feat)
2. **Task 2: Create derived value functions with TDD** - `d1f740d` (feat)
3. **Task 3: Add smart currency formatting with TDD** - `7839d77` (feat)

## Files Created/Modified

- `src/lib/calculations/types.ts` - EVPIInputs, EVPIResults, EdgeCaseFlags interfaces
- `src/lib/calculations/statistics.ts` - standardNormalPDF, standardNormalCDF functions
- `src/lib/calculations/statistics.test.ts` - 22 tests for statistical functions
- `src/lib/calculations/derived.ts` - deriveK, normalizeThresholdToLift, determineDefaultDecision, detectEdgeCases
- `src/lib/calculations/derived.test.ts` - 30 tests for derived value functions
- `src/lib/formatting.ts` - Added formatSmartCurrency function
- `src/lib/formatting.test.ts` - 23 tests for formatting utilities

## Decisions Made

1. **Abramowitz-Stegun for CDF** - Used formula 7.1.26 for erfc with conversion to standard normal CDF. Maximum error < 7.5e-8, sufficient for EVPI calculations.

2. **Edge case thresholds** - Set near-zero sigma at 0.1% (< 0.001), one-sided prior at Phi > 0.9999 or < 0.0001, truncation at P(L < -1) > 0.1%. These thresholds balance sensitivity with avoiding false positives.

3. **Lift stored as percentage, converted to decimal** - normalizeThresholdToLift divides lift by 100 to get decimal form (e.g., 5 -> 0.05).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

1. **Initial CDF implementation incorrect** - First implementation used wrong conversion between erfc and Phi. Fixed by properly applying Phi(z) = 0.5 * erfc(-z / sqrt(2)) and handling the sign correction. Tests immediately caught this (RED phase worked as intended).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All calculation primitives ready for EVPI core calculation (03-02)
- Types defined for inputs and results
- Statistical functions tested against known table values
- Edge case detection ready to drive UI messaging

---
*Phase: 03-calculation-engine*
*Completed: 2026-01-30*
