---
phase: 28-address-final-code-review-findings
plan: 01
subsystem: url-codec, app-hydration, form-dirty-detection, verdict-card
tags: [bugfix, validation, url-codec, dirty-state, recipient-mode]
dependency_graph:
  requires: []
  provides: [validateThresholdSign-helper, ref-based-dirty-detection, recipient-divergence-detection]
  affects: [url-codec, App, CalculatorPage, form-components, EVSIVerdictCard]
tech_stack:
  added: []
  patterns: [ref-based-transition-detection, shared-validation-helper, one-way-divergence]
key_files:
  created:
    - src/pages/CalculatorPage.test.tsx
  modified:
    - src/lib/url-codec.ts
    - src/lib/url-codec.test.ts
    - src/App.tsx
    - src/App.test.tsx
    - src/components/forms/BaselineMetricsForm.tsx
    - src/components/forms/UncertaintyPriorForm.tsx
    - src/components/forms/ThresholdScenarioForm.tsx
    - src/components/forms/ExperimentDesignForm.tsx
    - src/components/results/EVSIVerdictCard.tsx
    - src/components/results/EVSIVerdictCard.test.tsx
decisions:
  - "validateThresholdSign exported from url-codec.ts as shared helper for both decode and hydration validation"
  - "wasDirtyRef pattern fires invalidation only on false-to-true isDirty transition, not on callback identity change"
  - "completedSectionsRef keeps dirty-callback identity stable across completedSections state changes"
  - "Recipient mode exits via useSharedDiff modifiedFields.size > 0 (practical one-way divergence)"
  - "App.test.tsx mock updated to use importOriginal to preserve validateThresholdSign"
metrics:
  duration: "10m 16s"
  completed: "2026-04-15"
  tasks_completed: 3
  tasks_total: 3
  tests_added: 23
  files_modified: 11
  files_created: 1
---

# Phase 28 Plan 01: Fix Code Review Findings Summary

Centralized threshold sign validation, fixed TS2352 build error, added integer constraints for v2+ URL decoder, fixed dirty-section re-invalidation loop with ref-based transition detection, and fixed stale shared net-value with divergence-aware recipient mode.

## Task Completion

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Fix build error, centralize threshold sign validation, add integer constraints (CR28-01, CR28-02, CR28-05) | 751ae4d | url-codec.ts, url-codec.test.ts, App.tsx, App.test.tsx |
| 2 | Fix dirty-section re-invalidation loop with multi-cycle coverage (CR28-03) | dacd662, edd31ca | CalculatorPage.tsx, BaselineMetricsForm.tsx, UncertaintyPriorForm.tsx, ThresholdScenarioForm.tsx, ExperimentDesignForm.tsx, CalculatorPage.test.tsx |
| 3 | Fix stale shared net-value with one-way divergence (CR28-04) | df06d07 | EVSIVerdictCard.tsx, EVSIVerdictCard.test.tsx |

## Changes Made

### Task 1: Build Error + Threshold Validation + Integer Constraints

**CR28-01 (TS2352 build error):** Changed `validateSectionFields` in `App.tsx` from accepting `Record<string, unknown>` to `WizardInputs` directly. Removed the `as Record<string, unknown>` cast at the call site. This eliminates the TS2352 error while maintaining the same validation logic with better type safety.

**CR28-02 (Centralized threshold sign validation):** Created `validateThresholdSign()` exported from `url-codec.ts` -- a single shared helper that enforces the sign convention (minimum-lift: positive, accept-loss: negative, any-positive: skip). Both `validateDecodedPayload` in `url-codec.ts` and `validateSectionFields` case 2 in `App.tsx` now call this helper instead of inline sign checks. This prevents sign-rule drift between decode and hydration paths.

**CR28-05 (Integer constraints):** Added `Number.isInteger()` checks for `annualVisitors`, `testDurationDays`, and `decisionLatencyDays` in the v2+ URL decoder validation. These align with form Zod schemas that require `.int()`.

**Tests added (14):** Accept-loss round-trip (3), integer constraint rejection (3), validateThresholdSign unit tests (7), App H12 accept-loss hydration (1).

### Task 2: Dirty-Section Re-invalidation Loop

**Root cause:** Dirty callbacks in CalculatorPage closed over `completedSections`, causing callback identity to change when sections were marked complete. This triggered React to re-run the form `useEffect([isDirty, onSectionDirty])`, and since RHF does not reset `isDirty` after submit, the effect re-fired `onSectionDirty()` on the just-completed section.

**Fix (two-pronged):**
1. **Form-side:** Added `wasDirtyRef` to all four form components (BaselineMetricsForm, UncertaintyPriorForm, ThresholdScenarioForm, ExperimentDesignForm). The effect now only fires `onSectionDirty` on the false-to-true transition of `isDirty`, not when the callback identity changes while `isDirty` remains true.
2. **Page-side:** The parallel agent already applied `completedSectionsRef` to CalculatorPage (reading completedSections from ref keeps callback identity stable).

**Tests added (6):** Transition detection (2), multi-cycle lifecycle complete->edit->re-complete->edit (2), ref-based callback stability (2).

### Task 3: Stale Shared Net-Value

**Root cause:** `EVSIVerdictCard` always preferred `sharedNetValue` when `sharedBaseline !== null`, even after the recipient edited inputs and the live computed value diverged.

**Fix:** Import `useSharedDiff` in EVSIVerdictCard. When `modifiedFields.size > 0` (any field differs from shared baseline), set `hasEdited = true` and exit recipient mode (`isRecipient = sharedBaseline !== null && !hasEdited`). The existing `displayValue` logic then falls through to the live `netValueDollars`.

**Design decision:** Divergence is practically one-way for the session. Once any field is edited, recipient mode exits. If the user reverts all fields to exactly match the baseline, `modifiedFields` becomes empty and recipient mode technically restores -- but this is acceptable because exact revert is rare and if inputs truly match, the live value should match too.

**Tests added (3):** Unmodified recipient sees sender value, edited recipient sees live value, divergence behavior documented.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] App.test.tsx mock did not include validateThresholdSign**
- **Found during:** Task 1 GREEN phase
- **Issue:** The url-codec mock in App.test.tsx replaced the entire module, so the real `validateThresholdSign` was not available when App.tsx called it during hydration.
- **Fix:** Changed the mock to use `importOriginal` pattern, preserving the real `validateThresholdSign` while still mocking `decodeWizardState` and `encodeWizardState`.
- **Files modified:** src/App.test.tsx
- **Commit:** 751ae4d

**2. [Rule 3 - Blocking] CalculatorPage.tsx already modified by parallel agent**
- **Found during:** Task 2
- **Issue:** The `completedSectionsRef` pattern was already applied to CalculatorPage.tsx by the parallel agent (28-02 plan).
- **Fix:** Skipped the CalculatorPage.tsx edit since the parallel agent already made identical changes. Only committed the form-side wasDirtyRef changes.
- **Files affected:** src/pages/CalculatorPage.tsx (no change needed)
- **Commit:** dacd662

**3. [Rule 1 - Bug] TS2322 in EVSIVerdictCard.test.tsx store state type**
- **Found during:** Task 3 build verification
- **Issue:** `defaultStoreState` had `sharedBaseline: null` and `sharedNetValue: null` typed as literal `null`, causing TS2322 when test overrides assigned non-null values.
- **Fix:** Added explicit type annotation widening `sharedBaseline` to `typeof mockInputs | null` and `sharedNetValue` to `number | null`.
- **Files modified:** src/components/results/EVSIVerdictCard.test.tsx
- **Commit:** df06d07

## Known Stubs

None. All implementations are complete and wired.

## Threat Flags

None. The changes tighten validation (T-28-01 mitigated via centralized `validateThresholdSign` and integer constraints) without introducing new trust boundaries.

## Self-Check: PASSED

All 12 modified/created files verified present. All 4 task commits (751ae4d, dacd662, edd31ca, df06d07) verified in git log. 653 tests pass (full suite). Build succeeds. Lint clean.
