---
phase: 27-code-review-statistics-audit-v4-fixes
plan: 03
subsystem: url-codec
tags: [url-encoding, utf-8, validation, base64, share-urls, hydration]

# Dependency graph
requires:
  - phase: 24-shareable-walkthrough-urls
    provides: URL codec (encodeWizardState/decodeWizardState), App.tsx hydration logic
provides:
  - UTF-8 safe base64 encoding via TextEncoder/TextDecoder (CR-3)
  - Expanded v2+ decode validation aligned with form Zod schemas (CR-2)
  - Form-aware section completion validation during URL hydration
affects: [shareable-walkthrough-urls, url-codec]

# Tech tracking
tech-stack:
  added: []
  patterns: [TextEncoder/TextDecoder for UTF-8 safe base64, version-aware domain validation]

key-files:
  created: []
  modified:
    - src/lib/url-codec.ts
    - src/lib/url-codec.test.ts
    - src/components/results/EVSIVerdictCard.tsx
    - src/App.tsx
    - src/App.test.tsx

key-decisions:
  - "v2+ domain constraints only apply to v2 URLs; v1 links use original loose rules for backward compatibility"
  - "validateSectionFields replaces SECTION_REQUIRED_FIELDS for richer section completion logic during hydration"
  - "Prior interval width minimum checked as >= 0.1 (percentage form) matching form schema 0.1% minimum"

patterns-established:
  - "TextEncoder/TextDecoder pattern for UTF-8 safe base64url encoding"
  - "Version-aware validation: domain constraints added in v2 block with backward-compat guard"
  - "validateSectionFields switch pattern for form-schema-aligned hydration validation"

requirements-completed: [CR-2, CR-3]

# Metrics
duration: 4min
completed: 2026-04-15
---

# Phase 27 Plan 03: URL Codec Safety Summary

**UTF-8 safe share URL encoding via TextEncoder/TextDecoder, expanded v2+ decode validation for 7 domain constraints, and form-aware hydration section completion**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-15T13:58:49Z
- **Completed:** 2026-04-15T14:02:38Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Non-ASCII unit labels (Japanese, emoji) no longer crash share URL generation (CR-3)
- Tampered URLs with impossible inputs are now rejected: negative traffic, zero duration, invalid prior intervals, missing threshold fields, horizon > 365, invalid Student-t df (CR-2)
- encodeWizardState moved inside try/catch in handleShare so encoding failures show error UI instead of crashing
- App.tsx hydration now validates section fields against form-schema-level constraints, not just non-null checks

## Task Commits

Each task was committed atomically:

1. **Task 1: UTF-8 safe encoding, expanded decode validation, and encoder-throws test** - `cdab764` (feat)
2. **Task 2: Move encodeWizardState inside try/catch + fix App.tsx hydration section completion** - `345ca45` (fix)

_Note: Task 1 followed TDD (RED: 10 failing tests, GREEN: all 53 pass)_

## Files Created/Modified
- `src/lib/url-codec.ts` - UTF-8 safe toBase64Url/fromBase64Url, expanded validateDecodedPayload with v2+ domain constraints
- `src/lib/url-codec.test.ts` - 10 new tests: non-ASCII round-trip, impossible-input rejection, encoder safety
- `src/components/results/EVSIVerdictCard.tsx` - encodeWizardState call moved inside try/catch block
- `src/App.tsx` - SECTION_REQUIRED_FIELDS replaced with validateSectionFields function
- `src/App.test.tsx` - 3 new hydration tests: custom prior missing intervals, minimum-lift missing value, inverted intervals

## Decisions Made
- v2+ domain constraints only apply to v2 URLs; v1 links use original loose rules for backward compatibility (matches existing versioned validation pattern)
- validateSectionFields uses a switch statement rather than a data-driven map, allowing richer per-section logic (custom prior interval checks, threshold unit+value checks)
- Prior interval width minimum checked as >= 0.1 in percentage form matching form schema 0.1% minimum

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functionality is fully wired.

## Next Phase Readiness
- URL codec is now UTF-8 safe and validates decoded payloads against comprehensive form-aligned domain constraints
- Hydration logic validates section completeness with form-schema-level checks
- All 587 tests pass, build succeeds

---
*Phase: 27-code-review-statistics-audit-v4-fixes*
*Completed: 2026-04-15*
