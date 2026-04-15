---
phase: 27-code-review-statistics-audit-v4-fixes
plan: 04
subsystem: ui
tags: [evsi, infeasible-prior, tie-detection, waterfall, export, truncation, results-display]

# Dependency graph
requires:
  - phase: 27-code-review-statistics-audit-v4-fixes
    plan: 01
    provides: "Exact CDF/PDF effective-prior metrics, truncation-aware posterior mean"
provides:
  - "isInfeasiblePrior flag on EVSICalculationResults for UI suppression"
  - "effectiveProbClears and threshold_L exposed on hook results"
  - "Unit-consistent tie detection via threshold_L (handles dollar thresholds)"
  - "Waterfall step 1 shows effective prior mean when truncation is material"
  - "Export card distinguishes raw input from engine-used effective prior"
  - "Infeasible-prior UI suppression with explicit incompatibility message"
affects: [results-display, export, waterfall]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hook-level type ownership: isInfeasiblePrior on EVSICalculationResults, not EVSIResults"
    - "Lift-unit comparison for tie detection: threshold_L from engine normalizes all threshold units"
    - "Conditional waterfall text: effectivePriorMeanPercent prop gates adjusted-prior explanation"

key-files:
  created: []
  modified:
    - "src/hooks/useEVSICalculations.ts"
    - "src/components/results/AdvancedResultsSection.tsx"
    - "src/components/results/AdvancedResultsSection.test.tsx"
    - "src/components/results/WaterfallBlock.tsx"
    - "src/components/results/WaterfallBlock.test.tsx"
    - "src/components/export/ExportCard.tsx"

key-decisions:
  - "isInfeasiblePrior lives on EVSICalculationResults (hook level), not EVSIResults (engine level) -- hook is where effective metrics are computed"
  - "TIE_EPSILON changed from 0.01 (percentage points) to 0.0001 (decimal lift) for consistent units"
  - "Infeasible prior suppresses waterfall, supporting cards, export, and FAQ -- still shows verdict and warnings"
  - "ExportCard uses 'Prior input' label and 'Engine uses:' annotation when truncation is material"

patterns-established:
  - "Threshold comparison in lift units: always use threshold_L from engine, never compare raw user-facing units"
  - "Infeasible-prior gating: isInfeasiblePrior flag on hook results gates all interpretive UI"

requirements-completed: [SA-3, SA-4, SA-5, CR-4]

# Metrics
duration: 7min
completed: 2026-04-15
---

# Phase 27 Plan 04: Infeasible-Prior Propagation, Tie Detection, and Reporting Consistency Summary

**isInfeasiblePrior flag with UI suppression, lift-unit tie detection via threshold_L, and effective-prior waterfall/export reporting**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-15T14:12:43Z
- **Completed:** 2026-04-15T14:19:13Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- SA-3: Extended EVSICalculationResults with isInfeasiblePrior, effectiveProbClears, and threshold_L. UI suppresses waterfall, supporting cards, export, and FAQ when infeasible, showing explicit incompatibility message instead.
- SA-5: Rewrote computeIsTie to compare in decimal lift units using engine's threshold_L, fixing dollar-threshold tie detection (was comparing percentage points against dollar values).
- SA-4/CR-4: WaterfallBlock step 1 now shows "adjusted to X% after accounting for feasible outcomes" when truncation materially shifts the effective prior mean.
- SA-4: ExportCard distinguishes "Prior input" from "Engine uses: X% (adjusted for feasible conversion range)" when truncation is material.
- Added 8 new targeted tests: 3 for infeasible-prior suppression, 2 for dollar-threshold tie detection, 3 for effective-prior waterfall text.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend EVSICalculationResults with isInfeasiblePrior, effectiveProbClears, threshold_L** - `3b920f7` (feat)
2. **Task 2: Fix tie detection, waterfall prior mean, infeasible-prior display, targeted tests** - `6b0154f` (feat)

## Files Created/Modified

- `src/hooks/useEVSICalculations.ts` - Extended EVSICalculationResults interface with isInfeasiblePrior, effectiveProbClears, threshold_L; updated finalResults useMemo to detect infeasible prior from NaN metrics and populate new fields
- `src/components/results/AdvancedResultsSection.tsx` - Rewrote computeIsTie for lift-unit comparison; added infeasible-prior message and suppression guard; passes effectivePriorMeanPercent to WaterfallBlock
- `src/components/results/AdvancedResultsSection.test.tsx` - Updated sampleEVSIResults fixture with new fields; added 5 new tests for infeasible suppression and dollar-threshold tie detection; updated existing tie-break test for new signature
- `src/components/results/WaterfallBlock.tsx` - Added effectivePriorMeanPercent optional prop; step 1 shows adjusted prior text when truncation is material
- `src/components/results/WaterfallBlock.test.tsx` - Added 3 new tests for effective-prior waterfall text (adjusted, not provided, within threshold)
- `src/components/export/ExportCard.tsx` - Changed prior label to "Prior input" when truncation is material; updated effective mean annotation to "Engine uses: X% (adjusted for feasible conversion range)"

## Decisions Made

- isInfeasiblePrior placed on EVSICalculationResults (hook level) rather than EVSIResults (engine level). The hook is where effective-prior metrics are computed via effectiveMetricsRef. The engine already returns NaN metrics and a warning for infeasible priors -- adding a flag there would be redundant.
- TIE_EPSILON changed from 0.01 (which was in percentage-point space) to 0.0001 (in decimal lift space) to match the new unit convention. Both represent ~0.01 percentage points of tolerance.
- Infeasible prior suppresses all interpretive UI (waterfall, cards, export, FAQ) but still shows the verdict card ($0 value) and any warnings. This ensures users see the zero result and the infeasible_prior_support warning together.
- ExportCard now uses "Prior input" and "Engine uses:" phrasing (instead of just "(effective: X%)") to make the distinction between raw input and engine-computed values explicit for exported PNGs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing tie-break test for new computeIsTie signature**
- **Found during:** Task 2 (test execution)
- **Issue:** Existing test set priorMean=0 with any-positive scenario but sampleEVSIResults had threshold_L=0.02, so computeIsTie(0.0, 0.02) was not a tie
- **Fix:** Updated test to provide threshold_L=0.0 matching any-positive scenario
- **Files modified:** src/components/results/AdvancedResultsSection.test.tsx
- **Committed in:** 6b0154f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test fixture)
**Impact on plan:** Test fixture update necessary for correctness after signature change. No scope creep.

## Issues Encountered

- Pre-existing App.test.tsx failures (4 tests in URL hydration) unrelated to this plan's changes. Confirmed by running tests on clean base commit. Not addressed (out of scope).

## Known Stubs

None - all implementations are complete with no placeholder data or TODO markers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SA-3, SA-4, SA-5, CR-4 audit findings resolved
- Hook exposes full effective-prior metrics, infeasible-prior flag, and normalized threshold for consistent UI consumption
- Ready for Plan 05 (remaining audit findings)
- All 226 relevant tests pass, lint clean, build succeeds

## Self-Check: PASSED

---
*Phase: 27-code-review-statistics-audit-v4-fixes*
*Completed: 2026-04-15*
