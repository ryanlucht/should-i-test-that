---
phase: 24-shareable-walkthrough-urls
plan: 03
subsystem: forms/inputs
tags: [shared-urls, accessibility, visual-diff, hooks, zustand]
dependency_graph:
  requires: [24-02]
  provides: [useSharedDiff hook, modified-field visual indicators]
  affects: [NumberInput, CurrencyInput, PercentageInput]
tech_stack:
  added: []
  patterns: [narrow Zustand selectors, useMemo memoization, sr-only a11y pattern]
key_files:
  created:
    - src/hooks/useSharedDiff.ts
    - src/hooks/useSharedDiff.test.ts
  modified:
    - src/components/forms/inputs/NumberInput.tsx
    - src/components/forms/inputs/CurrencyInput.tsx
    - src/components/forms/inputs/PercentageInput.tsx
decisions:
  - "Test setup fixed: tests set current inputs to match baseline values before snapshot, then modify specific fields — prevents false positives from null vs. non-null comparisons"
  - "useSharedDiff uses narrow Zustand selectors (inputs, sharedBaseline) to minimize re-renders — not a full state subscription"
  - "(edited) badge placed in label row after InfoTooltip to keep visual proximity to the field label"
metrics:
  duration: ~12 minutes
  completed: 2026-04-06
  tasks_completed: 2
  files_modified: 5
  files_created: 2
---

# Phase 24 Plan 03: useSharedDiff Hook and Visual Diff Indicators Summary

useSharedDiff hook with memoized Set comparison and accessible (edited) badges in all 3 typed-input components for shared URL modified-field tracking.

## What Was Built

### Task 1: useSharedDiff Hook (TDD)

Created `src/hooks/useSharedDiff.ts` — a custom React hook that reads `inputs` and `sharedBaseline` from the Zustand wizard store and returns:

- `modifiedFields`: `Set<keyof WizardInputs>` — keys where current value differs from shared baseline (empty Set when baseline is null or no modifications exist)
- `isFieldModified(field)`: convenience boolean function for per-field checks

Key implementation details:
- Uses narrow Zustand selectors (`state.inputs`, `state.sharedBaseline`) to avoid subscribing to the full store
- `useMemo` wraps both the Set computation and the `isFieldModified` function to prevent unnecessary recalculations
- Strict equality (`===`) comparison is sufficient for WizardInputs (all primitive/null values)
- Returns empty Set when `sharedBaseline` is null (normal session, no shared URL)

7 tests passing in `src/hooks/useSharedDiff.test.ts`:
1. Empty Set when no baseline
2. Empty Set when inputs match baseline exactly
3. Set containing changed key for single modified field
4. Set with multiple keys when multiple fields modified
5. Memoized Set reference stability (same reference returned when nothing changed)
6. isFieldModified returns true/false correctly
7. isFieldModified always false with no baseline

### Task 2: Visual Diff Indicators in Input Components

Updated all 3 typed-input components to show a visual indicator when a field has been modified from shared URL values:

**Visual indicator pattern (same in all 3 components):**
- Color cue: `border-l-2 border-l-primary/40 pl-2 rounded-sm` on the outer wrapper div
- Text cue: `(edited)` badge rendered inline with the label (in the `flex items-center gap-1.5` label row)
- Screen reader: `<span className="sr-only">This field has been modified from the shared analysis</span>` inside the badge

Files updated:
- `src/components/forms/inputs/NumberInput.tsx`
- `src/components/forms/inputs/CurrencyInput.tsx`
- `src/components/forms/inputs/PercentageInput.tsx`

Each component adds:
```tsx
import { useSharedDiff } from '@/hooks/useSharedDiff';
import type { WizardInputs } from '@/types/wizard';
// ...
const { isFieldModified } = useSharedDiff();
const isModified = isFieldModified(name as keyof WizardInputs);
```

## Deviations from Plan

### Test Logic Fix

**Found during:** Task 1 (TDD RED phase — test debugging)
**Issue:** Initial test setup for "single field modified" and "multiple fields modified" tests used `{ ...initialInputs, fieldA: value }` as baseline but left current store inputs at `initialInputs` defaults. Since `initialInputs.fieldA` is `null` but baseline had a non-null value, all those fields showed as "modified" even before calling `setInput`.
**Fix:** Rewrote those tests to first set the current store inputs, snapshot baseline with `{ ...useWizardStore.getState().inputs }`, then modify specific fields. This accurately simulates the real shared URL flow (baseline = snapshot at share time, modifications happen after arrival).
**Files modified:** `src/hooks/useSharedDiff.test.ts`
**Classification:** Rule 1 (bug in test logic, caught during TDD RED phase)

## Acceptance Criteria Verification

- [x] `src/hooks/useSharedDiff.ts` exists and exports `useSharedDiff`
- [x] `useMemo` used for both `modifiedFields` Set and `isFieldModified` function (2 useMemo calls)
- [x] `isFieldModified` exported from the hook
- [x] `src/hooks/useSharedDiff.test.ts` exists with 7 test cases (exceeds min 5)
- [x] `npx tsc --noEmit` passes with 0 errors
- [x] `npx vitest run src/hooks/useSharedDiff.test.ts` passes with 0 failures
- [x] `useSharedDiff` imported in all 3 input components
- [x] `(edited)` badge present in all 3 input components
- [x] `sr-only` screen reader text present in all 3 input components
- [x] `border-l-primary` class applied in all 3 input components
- [x] `npx vitest run` passes with 0 failures (1509 tests, no regressions)

## Commits

| Hash | Message |
|------|---------|
| 6708ee7 | test(24-03): add failing tests for useSharedDiff hook |
| f78dbd6 | feat(24-03): implement useSharedDiff hook with memoized comparison |
| c8619c3 | feat(24-03): add accessible visual diff indicators to typed-input components |

## Known Stubs

None. The visual indicators wire directly to the live store state (inputs + sharedBaseline). When sharedBaseline is null (non-shared session), indicators are invisible. When set by URL hydration, indicators render on modified fields.

RadioCard visual indicators are intentionally deferred (out of scope for this plan, documented in plan objective).

## Self-Check: PASSED
