---
phase: 25-polish-accessibility-export
plan: "02"
subsystem: forms, analytics
tags: [polish, ux, analytics, datadog, auto-derive, tdd]
dependency_graph:
  requires: [25-01]
  provides: [POL-03, DD-01]
  affects: [ExperimentDesignForm, analytics, main]
tech_stack:
  added: []
  patterns:
    - RHF watch() for reactive hint-clearing without store coupling
    - crypto.randomUUID() for CSPRNG anonymous IDs
    - localStorage persistence for cross-session Datadog user identity
key_files:
  created:
    - src/components/forms/ExperimentDesignForm.test.tsx
  modified:
    - src/components/forms/ExperimentDesignForm.tsx
    - src/lib/analytics.ts
    - src/main.tsx
decisions:
  - Watch RHF form value (not store) to detect manual edits for hint clearing — avoids mock store coupling in tests
  - setUser() called after init() per Datadog SDK requirement (active session needed)
  - crypto.randomUUID() with timestamp fallback for universal browser support
metrics:
  duration: "~4 minutes"
  completed: "2026-04-08"
  tasks_completed: 2
  files_modified: 4
---

# Phase 25 Plan 02: Daily Traffic Auto-Derivation and Datadog PA User ID Summary

Auto-derive daily traffic from annual visitors with "(derived from annual visitors)" hint, and set stable anonymous UUID as Datadog PA user ID so the Users view populates without PII.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Auto-derive daily traffic from annual visitors (POL-03) | 3994f9d | ExperimentDesignForm.tsx, ExperimentDesignForm.test.tsx |
| 2 | Anonymous Datadog PA user identification (DD-01) | 90fd2b5 | analytics.ts, main.tsx |

## What Was Built

### Task 1: Auto-derive daily traffic from annual visitors (POL-03)

Added automatic derivation of `dailyTraffic` from `annualVisitors` in `ExperimentDesignForm.tsx`:

- **D-01**: When `annualVisitors` is set and `dailyTraffic` is `null`, auto-fills `dailyTraffic = Math.round(annualVisitors / 365)` via `useEffect`
- **D-02**: Guard `advancedInputs.dailyTraffic === null` ensures the field is never overwritten once set (manually or auto-filled)
- **D-03**: Shows `"(derived from annual visitors)"` hint via the `helpText` prop on the dailyTraffic `NumberInput`; clears when the user manually edits the field (detected via `watch('dailyTraffic')` from react-hook-form)
- **D-04**: The existing manual derive button (`(derive: X/day)`) is retained for re-deriving after clearing

TDD approach: wrote 4 failing tests first (RED), then implemented until GREEN.

### Task 2: Anonymous Datadog PA user identification (DD-01)

- Added `getOrCreateAnonymousId()` to `src/lib/analytics.ts`:
  - Generates a cryptographically random UUID using `crypto.randomUUID()` on first visit
  - Persists the UUID in `localStorage` under `'dd_anonymous_id'`
  - Returns the same UUID on subsequent visits for stable user tracking
  - Falls back to timestamp-based ID if `crypto` API unavailable
- Updated `src/main.tsx` to call `datadogRum.setUser({ id: getOrCreateAnonymousId() })` immediately after `datadogRum.init()` in the `if (import.meta.env.PROD)` block

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Hint-clearing used store value instead of RHF form value**
- **Found during:** Task 1 GREEN phase (Test 4 failing)
- **Issue:** The hint-clearing `useEffect` watched `advancedInputs.dailyTraffic` (store value), but `mockSetAdvancedInput` in tests is a stub that doesn't update store state. In production the store update is async via `onBlur`, so the hint would also be slow to clear.
- **Fix:** Changed to watch `watch('dailyTraffic')` from react-hook-form — the RHF value updates immediately on blur, making hint clearing instant and testable without mock store updates.
- **Files modified:** `src/components/forms/ExperimentDesignForm.tsx`
- **Commit:** 3994f9d

## Decisions Made

1. **RHF watch() for hint clearing**: Using `watch('dailyTraffic')` (RHF form value) instead of `advancedInputs.dailyTraffic` (store value) to detect manual edits. The RHF value updates on blur without requiring a store update, and is testable with a static mock store.

2. **setUser() after init()**: Datadog SDK requires an active session before `setUser()` can associate a user context. Placement immediately after `init()` in the PROD guard satisfies this ordering requirement.

3. **crypto.randomUUID() with timestamp fallback**: Modern browsers all support `crypto.randomUUID()`, but the fallback (`anon-${Date.now()}-${random}`) protects old browser environments from runtime errors. The ASVS assessment confirmed LOW severity for predictability.

## Known Stubs

None — all features are fully wired. The auto-derivation reads live from `sharedInputs.annualVisitors` via the Zustand store, and the anonymous ID is generated from `localStorage` on first visit.

## Self-Check: PASSED

- `src/components/forms/ExperimentDesignForm.tsx` — FOUND (contains `Math.round` derivation, `derived from annual visitors` hint, `derivedHint` state, `dailyTraffic === null` guard)
- `src/components/forms/ExperimentDesignForm.test.tsx` — FOUND (4 tests, all passing)
- `src/lib/analytics.ts` — FOUND (contains `getOrCreateAnonymousId`, `ANONYMOUS_ID_KEY`, `crypto.randomUUID()`, `localStorage.getItem/setItem`)
- `src/main.tsx` — FOUND (contains `import { getOrCreateAnonymousId }`, `datadogRum.setUser({ id: getOrCreateAnonymousId() })`)
- Commits: `3994f9d` (feat Task 1), `90fd2b5` (feat Task 2), `f3e9731` (test RED) — all present in git log
