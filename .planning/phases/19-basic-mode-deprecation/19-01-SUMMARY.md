---
phase: 19-basic-mode-deprecation
plan: 01
subsystem: calculations, ui
tags: [evpi, cost-of-delay, basic-mode, deprecation, cleanup]

requires:
  - phase: 14-accuracy-audit
    provides: "EVPI calculation engine, accuracy tests, truncation support"
provides:
  - "EVPI calculation code fully removed from codebase"
  - "Basic mode results components (VerdictCard, CostOfDelayCard, ResultsSection) deleted"
  - "Barrel exports updated to exclude deleted modules"
  - "Types file retains only EVSI-related types"
  - "CoD calculation inlined in useEVSICalculations hook"
affects: [19-02, 19-03, ExportButton, CalculatorPage]

tech-stack:
  added: []
  patterns:
    - "Inline small utility functions when removing their parent module"

key-files:
  created: []
  modified:
    - src/lib/calculations/index.ts
    - src/lib/calculations/types.ts
    - src/components/results/index.ts
    - src/hooks/useEVSICalculations.ts
    - src/components/forms/UncertaintyPriorForm.tsx
    - src/pages/CalculatorPage.tsx
    - src/lib/calculations/accuracy.test.ts
    - src/lib/calculations/evsi.test.ts
    - src/components/results/AdvancedResultsSection.test.tsx

key-decisions:
  - "Inlined calculateCostOfDelay into useEVSICalculations hook rather than keeping standalone module"
  - "Removed EVPI-dependent accuracy and EVSI-bound tests since EVPI engine is gone"
  - "Replaced useEVPICalculations in UncertaintyPriorForm with direct K/threshold derivation"

patterns-established:
  - "Inline small utility functions when their standalone module is deprecated"

requirements-completed: [DEPR-02]

duration: 11min
completed: 2026-03-23
---

# Phase 19 Plan 01: EVPI & Basic Mode Results Removal Summary

**Deleted EVPI calculation engine, standalone CoD module, Basic mode results components, and all EVPI-related types and tests -- 3,100+ lines removed**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-23T23:14:57Z
- **Completed:** 2026-03-23T23:26:33Z
- **Tasks:** 2
- **Files modified:** 19 (10 deleted, 9 modified)

## Accomplishments
- Removed all EVPI calculation code (evpi.ts, evpi.test.ts, cost-of-delay.ts, cost-of-delay.test.ts) -- 1,160+ lines
- Removed EVPI React hook and tests (useEVPICalculations.ts, useEVPICalculations.test.ts) -- 570+ lines
- Removed Basic mode results components (ResultsSection, VerdictCard, CostOfDelayCard) and tests -- 300+ lines
- Removed EVPIInputs, EVPIResults, TruncatedDiagnostics, EdgeCaseFlags from types.ts -- 125+ lines
- Removed EVPI-dependent accuracy tests (Accuracy-13.1, 13.2, 13.3, EVPI monotonicity, EVSI-EVPI bound) -- 150+ lines
- Updated all barrel exports and downstream imports to exclude deleted modules
- 379 tests passing, 0 failures, lint clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete EVPI calculation files, hook, and their tests** - `7a64a9b` (feat)
2. **Task 2: Delete Basic mode results components and update results barrel** - `4d604e3` (feat)

## Files Deleted
- `src/lib/calculations/evpi.ts` - EVPI calculation engine (380 lines)
- `src/lib/calculations/evpi.test.ts` - EVPI calculation tests (903 lines)
- `src/lib/calculations/cost-of-delay.ts` - Standalone CoD calculation (147 lines)
- `src/lib/calculations/cost-of-delay.test.ts` - CoD tests (259 lines)
- `src/hooks/useEVPICalculations.ts` - EVPI React hook (146 lines)
- `src/hooks/useEVPICalculations.test.ts` - EVPI hook tests (425 lines)
- `src/components/results/ResultsSection.tsx` - Basic mode results display (212 lines)
- `src/components/results/ResultsSection.test.tsx` - ResultsSection accessibility tests
- `src/components/results/VerdictCard.tsx` - EVPI verdict card (51 lines)
- `src/components/results/CostOfDelayCard.tsx` - Standalone CoD card (94 lines)

## Files Modified
- `src/lib/calculations/index.ts` - Removed evpi and cost-of-delay barrel exports
- `src/lib/calculations/types.ts` - Removed EVPIInputs, EVPIResults, TruncatedDiagnostics, EdgeCaseFlags
- `src/components/results/index.ts` - Removed VerdictCard, ResultsSection, CostOfDelayCard exports
- `src/hooks/useEVSICalculations.ts` - Inlined calculateCostOfDelay and CoDResults type
- `src/components/forms/UncertaintyPriorForm.tsx` - Replaced useEVPICalculations with direct K/threshold derivation
- `src/pages/CalculatorPage.tsx` - Removed ResultsSection import and Basic mode rendering
- `src/lib/calculations/accuracy.test.ts` - Removed EVPI-dependent test blocks
- `src/lib/calculations/evsi.test.ts` - Removed EVSI-EVPI bound test
- `src/components/results/AdvancedResultsSection.test.tsx` - Fixed CoDResults import path

## Decisions Made
- **Inlined CoD into EVSI hook:** The standalone `cost-of-delay.ts` was used by both the deleted CostOfDelayCard AND the active useEVSICalculations hook. Since the hook is the sole remaining consumer, the ~30-line calculation was inlined directly rather than keeping a separate module.
- **Removed EVPI accuracy tests:** Accuracy-13.1 (EVPI vs MC regret), 13.2 (degenerate sigma), 13.3 (truncated bounds), EVPI monotonicity, and EVSI-EVPI bound tests were removed since the EVPI engine they test no longer exists. The EVSI and NetValue accuracy tests remain.
- **Direct threshold derivation:** UncertaintyPriorForm was using useEVPICalculations solely to get threshold_L and K for the chart. Replaced with direct derivation from store inputs using normalizeThresholdToLift.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inlined calculateCostOfDelay into useEVSICalculations**
- **Found during:** Task 2 (after deleting cost-of-delay.ts)
- **Issue:** useEVSICalculations.ts imported calculateCostOfDelay from the barrel (which re-exported from cost-of-delay.ts). Plan overlooked this dependency.
- **Fix:** Inlined the CoD function and CoDResults interface directly into the hook file
- **Files modified:** src/hooks/useEVSICalculations.ts
- **Verification:** All 379 tests pass, lint clean
- **Committed in:** 4d604e3

**2. [Rule 3 - Blocking] Fixed AdvancedResultsSection.test.tsx CoDResults import**
- **Found during:** Task 2
- **Issue:** Test file imported CoDResults from deleted '@/lib/calculations/cost-of-delay'
- **Fix:** Updated import to use '@/hooks/useEVSICalculations' where CoDResults is now exported
- **Files modified:** src/components/results/AdvancedResultsSection.test.tsx
- **Committed in:** 4d604e3

**3. [Rule 3 - Blocking] Removed EVPI-dependent tests from accuracy.test.ts and evsi.test.ts**
- **Found during:** Task 2
- **Issue:** accuracy.test.ts imported calculateEVPI (deleted), evsi.test.ts had EVSI-EVPI bound test
- **Fix:** Removed EVPI import, removed 5 EVPI test blocks, removed EVSI-EVPI bound test
- **Files modified:** src/lib/calculations/accuracy.test.ts, src/lib/calculations/evsi.test.ts
- **Committed in:** 4d604e3

**4. [Rule 3 - Blocking] Replaced useEVPICalculations in UncertaintyPriorForm**
- **Found during:** Task 2
- **Issue:** Form used deleted EVPI hook to get threshold_L and K for chart display
- **Fix:** Replaced with direct derivation using normalizeThresholdToLift and deriveK
- **Files modified:** src/components/forms/UncertaintyPriorForm.tsx
- **Committed in:** 4d604e3

**5. [Rule 3 - Blocking] Removed ResultsSection from CalculatorPage**
- **Found during:** Task 2
- **Issue:** CalculatorPage imported deleted ResultsSection, causing App tests to fail
- **Fix:** Removed import and Basic mode ResultsSection rendering block
- **Files modified:** src/pages/CalculatorPage.tsx
- **Committed in:** 4d604e3

---

**Total deviations:** 5 auto-fixed (all Rule 3 blocking)
**Impact on plan:** All auto-fixes were necessary to maintain a working codebase after EVPI removal. Plan had identified some downstream consumers (ExportButton, CalculatorPage) for Plan 02 cleanup but underestimated the scope -- several additional files imported from deleted modules. No scope creep; all fixes are direct consequences of the planned deletions.

## Known Downstream References (for Plan 02)

The following files still reference EVPI types that will be cleaned up in Plan 02:
- `src/components/export/ExportButton.tsx` - imports `EVPIResults` type (type-only, doesn't cause runtime errors)

## Issues Encountered
None beyond the deviation auto-fixes above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All EVPI calculation code is removed
- All Basic mode results components are deleted
- Barrel exports are clean
- Plan 02 (Mode Infrastructure Removal) can proceed to remove mode selection, mode-aware routing, and remaining Basic mode references
- ExportButton.tsx still has an EVPIResults type reference that Plan 02 should clean up

---
*Phase: 19-basic-mode-deprecation*
*Completed: 2026-03-23*
