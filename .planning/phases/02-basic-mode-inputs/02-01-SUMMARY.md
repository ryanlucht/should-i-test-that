---
phase: 02-basic-mode-inputs
plan: 01
subsystem: ui
tags: [react-hook-form, zod, validation, forms, tooltip, radix]

# Dependency graph
requires:
  - phase: 01-foundation-wizard-infrastructure
    provides: Calculator page skeleton, wizard store, section navigation
provides:
  - Form validation infrastructure (react-hook-form + zod)
  - Baseline metrics form with 3 validated inputs
  - Reusable input components (PercentageInput, CurrencyInput, NumberInput)
  - InfoTooltip component for contextual help
  - visitorUnitLabel field in shared inputs
affects: [02-basic-mode-inputs, prior-selection, threshold-scenario, results]

# Tech tracking
tech-stack:
  added: [react-hook-form, zod, @hookform/resolvers, @radix-ui/react-tooltip]
  patterns: [FormProvider with useFormContext, Controller for custom inputs, format-on-blur]

key-files:
  created:
    - src/lib/validation.ts
    - src/lib/formatting.ts
    - src/components/ui/tooltip.tsx
    - src/components/forms/inputs/InfoTooltip.tsx
    - src/components/forms/inputs/PercentageInput.tsx
    - src/components/forms/inputs/CurrencyInput.tsx
    - src/components/forms/inputs/NumberInput.tsx
    - src/components/forms/BaselineMetricsForm.tsx
  modified:
    - src/types/wizard.ts
    - src/pages/CalculatorPage.tsx

key-decisions:
  - "Zod v4 API: use { error: '...' } instead of { required_error: '...' }"
  - "FormProvider + useFormContext pattern for input components (avoids generic type complexity)"
  - "Format on blur, raw during editing for all numeric inputs"

patterns-established:
  - "Input components use useFormContext, not passed control prop"
  - "Validation on blur, errors display after blur (mode: 'onBlur')"
  - "Form exposes validate() via ref for parent-triggered validation"
  - "Continue button always enabled; validation triggers on click"

# Metrics
duration: 10min
completed: 2026-01-30
---

# Phase 02 Plan 01: Baseline Metrics Form Summary

**Baseline metrics form with conversion rate, annual visitors, and value per conversion inputs using react-hook-form + Zod validation**

## Performance

- **Duration:** 10 min
- **Started:** 2026-01-30T03:29:06Z
- **Completed:** 2026-01-30T03:38:52Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Installed form validation infrastructure (react-hook-form, zod, @hookform/resolvers)
- Built reusable formatted input components (PercentageInput, CurrencyInput, NumberInput)
- Created BaselineMetricsForm with SPEC.md-compliant labels and help text
- Integrated form into CalculatorPage with validation-gated navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and add tooltip component** - `a873213` (feat)
2. **Task 2: Create validation schemas and formatting utilities** - `4e56bf5` (feat)
3. **Task 3: Build BaselineMetricsForm and integrate into CalculatorPage** - `7fdd030` (feat)

## Files Created/Modified
- `src/lib/validation.ts` - Zod schema for baseline metrics (CR0, N_year, V)
- `src/lib/formatting.ts` - Currency/percentage/number formatting utilities
- `src/components/ui/tooltip.tsx` - shadcn tooltip component
- `src/components/forms/inputs/InfoTooltip.tsx` - Info icon with tooltip wrapper
- `src/components/forms/inputs/PercentageInput.tsx` - Percentage input with % formatting
- `src/components/forms/inputs/CurrencyInput.tsx` - Currency input with $ formatting
- `src/components/forms/inputs/NumberInput.tsx` - Number input with comma formatting and unit label
- `src/components/forms/BaselineMetricsForm.tsx` - Complete baseline metrics form
- `src/types/wizard.ts` - Added visitorUnitLabel to SharedInputs
- `src/pages/CalculatorPage.tsx` - Integrated form into baseline section

## Decisions Made
- **Zod v4 API:** Used `{ error: 'message' }` instead of `{ required_error: 'message' }` per Zod v4 breaking change
- **FormProvider pattern:** Input components use useFormContext() instead of passed control prop to avoid complex generic type issues
- **Format timing:** Format on blur (show raw number during editing) per CONTEXT.md decision

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Zod v4 API incompatibility**
- **Found during:** Task 3 (build failing)
- **Issue:** Zod v4 changed `required_error` to `error` option
- **Fix:** Updated validation schema to use `{ error: '...' }` and `{ message: '...' }` for constraints
- **Files modified:** src/lib/validation.ts
- **Verification:** Build passes
- **Committed in:** 7fdd030 (Task 3 commit)

**2. [Rule 3 - Blocking] Fixed type-only imports for verbatimModuleSyntax**
- **Found during:** Task 3 (build failing)
- **Issue:** Control, FieldValues, Path types needed type-only import
- **Fix:** Simplified to use useFormContext instead of passed control
- **Files modified:** All input components
- **Verification:** Build passes
- **Committed in:** 7fdd030 (Task 3 commit)

**3. [Rule 1 - Bug] Fixed test setup unused variables**
- **Found during:** Task 3 (lint errors)
- **Issue:** Test setup mock had unused parameters triggering lint errors
- **Fix:** Added void statements to acknowledge intentionally unused params
- **Files modified:** src/test/setup.ts
- **Verification:** Lint passes
- **Committed in:** 7fdd030 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All auto-fixes necessary for successful build. No scope creep.

## Issues Encountered
- Zod v4 has breaking API changes not documented in plan - resolved by updating to new API
- react-hook-form generic types complex with zodResolver - resolved by using FormProvider pattern

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Baseline metrics form complete and functional
- Ready for Plan 02-02 (Prior Selection) and 02-03 (Threshold Scenario)
- Input components reusable for future forms
- Store integration pattern established for remaining forms

---
*Phase: 02-basic-mode-inputs*
*Plan: 01*
*Completed: 2026-01-30*
