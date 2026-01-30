---
phase: 05-advanced-mode
plan: 03
subsystem: ui
tags: [react, react-hook-form, zod, wizard, forms]

# Dependency graph
requires:
  - phase: 05-advanced-mode
    plan: 01
    provides: Distribution abstraction layer and AdvancedInputs type structure
  - phase: 02-forms-validation
    provides: Form input components (NumberInput, PercentageInput)
provides:
  - ExperimentDesignForm component for collecting test parameters
  - experimentDesignSchema Zod validation for experiment design
  - Dynamic sections in CalculatorPage based on mode (Basic: 4, Advanced: 5)
affects: [05-04, 05-05, 05-06, evsi-calculation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - forwardRef with imperative handle for form validation
    - Dynamic section arrays based on mode
    - Section-ID based validation (not index-based)

key-files:
  created:
    - src/components/forms/ExperimentDesignForm.tsx
  modified:
    - src/lib/validation.ts
    - src/types/wizard.ts
    - src/components/forms/inputs/NumberInput.tsx
    - src/pages/CalculatorPage.tsx

key-decisions:
  - "Percentage values in form UI, converted to decimal on submit"
  - "Latency fields visually de-emphasized with opacity and border separator"
  - "Section validation uses section ID (not index) for correct mode handling"
  - "Auto-derive daily traffic from annual visitors / 365"

patterns-established:
  - "Mode-based dynamic sections: BASIC_SECTIONS vs ADVANCED_SECTIONS arrays"
  - "Static suffix prop on NumberInput for unit display (e.g., 'days')"

# Metrics
duration: 5min
completed: 2026-01-30
---

# Phase 5 Plan 3: Experiment Design Form Summary

**Experiment design form with duration, traffic, split, eligibility, and latency inputs for Advanced mode EVSI calculation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-30T14:28:00Z
- **Completed:** 2026-01-30T14:33:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Created ExperimentDesignForm component with all 6 input fields
- Added experimentDesignSchema Zod validation with appropriate constraints
- Made CalculatorPage sections dynamic based on mode (4 vs 5 sections)
- Integrated auto-derive daily traffic from annual visitors feature
- Visually de-emphasized latency fields per 05-CONTEXT.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Add experiment design validation schema** - `d18abf0` (feat)
2. **Task 2: Create ExperimentDesignForm component** - `ee09a15` (feat)
3. **Task 3: Integrate ExperimentDesignForm into CalculatorPage** - `441cad7` (feat)

## Files Created/Modified
- `src/lib/validation.ts` - Added experimentDesignSchema for test parameters
- `src/types/wizard.ts` - Updated AdvancedInputs type with correct field names and defaults
- `src/components/forms/ExperimentDesignForm.tsx` - New form component with 6 inputs
- `src/components/forms/inputs/NumberInput.tsx` - Added suffix prop for "days" display
- `src/pages/CalculatorPage.tsx` - Dynamic sections based on mode, validation wiring

## Decisions Made
- **Percentage values in form UI:** The schema validates percentage values (10-90 for split, 1-100 for eligibility) which are converted to decimals (0.1-0.9, 0.01-1.0) on form submit
- **Latency fields de-emphasized:** Used opacity-75 wrapper and border separator to visually de-emphasize optional latency fields per 05-CONTEXT.md
- **Section-ID based validation:** Changed validation logic from index-based to section-ID based to correctly handle mode switching

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added suffix prop to NumberInput**
- **Found during:** Task 2 (Create ExperimentDesignForm)
- **Issue:** NumberInput had no way to show static suffix like "days"
- **Fix:** Added optional suffix prop that renders text after input
- **Files modified:** src/components/forms/inputs/NumberInput.tsx
- **Verification:** Duration and latency fields display "days" suffix
- **Committed in:** ee09a15 (Task 2 commit)

**2. [Rule 3 - Blocking] Updated AdvancedInputs type**
- **Found during:** Task 1 (Add validation schema)
- **Issue:** Existing AdvancedInputs type had different field names than plan specified
- **Fix:** Updated type and initial values to match schema field names
- **Files modified:** src/types/wizard.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** d18abf0 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for form to function. No scope creep.

## Issues Encountered
None - plan executed smoothly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Experiment design form ready for EVSI calculation integration
- Form validation ensures valid inputs for sample size calculation
- Ready for plan 05-04 (Results display updates for Advanced mode)

---
*Phase: 05-advanced-mode*
*Completed: 2026-01-30*
