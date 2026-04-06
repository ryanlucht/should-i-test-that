---
phase: 24-shareable-walkthrough-urls
plan: "01"
subsystem: url-codec
tags: [url-encoding, base64url, schema-versioning, validation, tdd]
dependency_graph:
  requires: []
  provides: [encodeWizardState, decodeWizardState, SCHEMA_VERSION, WizardInputs, initialInputs]
  affects: [24-02, 24-03]
tech_stack:
  added: []
  patterns: [base64url-encoding, short-key-mapping, migration-chain, decode-validation]
key_files:
  created:
    - src/lib/url-codec.ts
    - src/lib/url-codec.test.ts
  modified: []
decisions:
  - "WizardInputs and initialInputs defined in url-codec.ts (self-contained) because worktree is on Phase 19-era old wizard.ts with nested types; url-codec.ts is independent of the store's type evolution"
  - "base64url padding formula: (4 - (length % 4)) % 4 gives correct padding for all lengths; test helper fixed to use same formula"
  - "Migration MIGRATIONS[0]: v0->v1 is identity transform (same short keys, version bump only); scaffolds the chain for future schema changes"
  - "decodeWizardState returns null (not throws) for all error cases; caller-friendly graceful degradation"
metrics:
  duration_seconds: 249
  completed_date: "2026-04-06"
  tasks_completed: 1
  files_created: 2
  files_modified: 0
---

# Phase 24 Plan 01: URL Codec Summary

URL codec module implementing compact base64url encoding/decoding of WizardInputs with schema versioning, migration chain, and strict decode validation.

## What Was Built

`src/lib/url-codec.ts` — A self-contained URL codec module with:

- **`encodeWizardState(inputs)`** — Encodes WizardInputs to a compact base64url string by mapping 17 fields to 1-2 char short keys, omitting null and default-value fields, and embedding schema version `v:1`. Caller prepends `#s=` to form the URL fragment.
- **`decodeWizardState(encoded)`** — Decodes and validates a base64url string: handles malformed input, unknown versions, and strict type/enum/range validation. Returns `null` (not throw) on any failure.
- **`SCHEMA_VERSION = 1`** — Integer version embedded in every payload for forward compatibility.
- **`SHORT_KEY_MAP`** — Maps all 17 WizardInputs fields to 1-2 char short keys with inline comment table for maintainability.
- **`validateDecodedPayload`** — Internal helper rejecting NaN, non-finite numbers, invalid enum values, and out-of-range domain values.
- **Migration chain** — `MIGRATIONS` record keyed by version; `MIGRATIONS[0]` (v0→v1) scaffolds the chain with a tested identity transform.

`src/lib/url-codec.test.ts` — 32 tests covering:
- Round-trip fidelity (typical scenario + all-fields scenario)
- Compactness assertions: typical < 400 chars, all-fields < 500 chars
- Schema version embedding, short key usage, null/default omission
- Error handling: malformed base64, invalid JSON, unknown version, missing version
- Payload validation: NaN, invalid enums, out-of-range values for all constrained fields
- Migration chain: v0 payload successfully migrates to v1

## Compactness Results

- Typical scenario (10 non-default fields): well under 400 chars including `#s=` prefix
- All-fields scenario (17 fields): well under 500 chars including `#s=` prefix

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed base64url padding formula**
- **Found during:** Task 1 (GREEN phase — tests failing)
- **Issue:** Original test helpers used `'=='.slice((length * 3) % 4)` which produces incorrect padding for many string lengths, causing `atob()` to throw `InvalidCharacterError`
- **Fix:** Correct formula is `'='.repeat((4 - (length % 4)) % 4)` — same fix applied in both `url-codec.ts` (fromBase64Url) and test helpers
- **Files modified:** `src/lib/url-codec.ts`, `src/lib/url-codec.test.ts`
- **Commit:** e54754a

**2. [Rule 3 - Blocking] WizardInputs defined in url-codec.ts instead of imported from wizard.ts**
- **Found during:** Task 1 setup
- **Issue:** The worktree's `src/types/wizard.ts` has the old Phase 19 nested structure (`SharedInputs`/`AdvancedInputs`/`InputsState`) without the flat `WizardInputs` type that the plan expects. Importing from wizard.ts would cause type errors.
- **Fix:** Defined `WizardInputs` and `initialInputs` directly in `url-codec.ts` matching the plan's `<interfaces>` spec exactly. Module is self-contained. Tests import from `./url-codec`.
- **Files modified:** `src/lib/url-codec.ts`
- **Commit:** e54754a

## Known Stubs

None — all codec logic is fully implemented. No placeholder data or TODO stubs.

## Self-Check: PASSED

- [x] `src/lib/url-codec.ts` created
- [x] `src/lib/url-codec.test.ts` created
- [x] `encodeWizardState` exported
- [x] `decodeWizardState` exported
- [x] `SCHEMA_VERSION` exported (= 1) — line 150
- [x] `SHORT_KEY_MAP` exported — line 114
- [x] `validateDecodedPayload` function exists — line 226
- [x] RED commit 3dafe62 exists
- [x] GREEN commit e54754a exists
- [x] 32 tests pass
- [x] TypeScript compiles cleanly (0 errors)
