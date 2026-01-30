# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Help users make better testing decisions by quantifying the value of information
**Current focus:** Phase 3 - Calculation Engine

## Current Position

Phase: 2 of 6 (Basic Mode Inputs) - COMPLETE
Plan: 3 of 3 in phase 2
Status: Phase 2 verified, ready for Phase 3
Last activity: 2026-01-30 - Phase 2 verified (15/15 must-haves passed)

Progress: [███████░░░░░░░░░░░░░░] 33% (7/21 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 10 min
- Total execution time: 72 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 4/4 | 34 min | 9 min |
| 2 | 3/3 | 38 min | 13 min |

**Recent Trend:**
- Last 5 plans: 01-03 (6 min), 01-04 (8 min), 02-01 (10 min), 02-02 (10 min), 02-03 (18 min)
- Trend: Slightly increasing (forms are more complex)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Decision | Phase | Rationale |
|----------|-------|-----------|
| Separate vitest.config.ts | 01-01 | Avoids TypeScript type conflicts with Vite config |
| Disable react-refresh rule for UI components | 01-01 | shadcn/ui components export variants alongside components |
| Pre-install zustand + react-intersection-observer | 01-01 | Required by later plans, simplifies dependency management |
| Subheadline can be paragraph-length | 01-02 | Allows fuller explanation of value proposition on welcome screen |
| Purely visual disabled state (no overlay text) | 01-02 | User found explanatory text cheesy; 40% opacity + grayscale is sufficient |
| scroll-margin-top: 128px | 01-02 | Compensates for sticky header (56px) + progress indicator (64px) + buffer |
| Arrays instead of Sets for completedSections | 01-03 | JSON serialization compatibility with Zustand persist middleware |
| State-based routing (no react-router) | 01-03 | Only 2 pages, simpler than adding another dependency |
| Selective persistence (partialize) | 01-03 | Only inputs and mode persisted; navigation state resets on refresh |
| fieldset disabled for section disabling | 01-04 | Native form control disabling propagates to all descendants |
| IntersectionObserver rootMargin top-biased | 01-04 | -10% 0px -50% 0px for scroll spy triggers in top 40% of viewport |
| Enter key advances except in textarea | 01-04 | Allows multiline input in textareas while supporting keyboard nav elsewhere |
| Zod v4 API (error instead of required_error) | 02-01 | Zod v4 breaking change requires new syntax |
| FormProvider + useFormContext pattern | 02-01 | Avoids complex generic type issues with input components |
| Format on blur, raw during editing | 02-01 | Better UX for numeric input editing |
| Default interval -8.22% to +8.22% | 02-02 | Produces N(0, 0.05) prior using z_0.95 = 1.6448536 |
| Asymmetry threshold 0.5% | 02-02 | Show explanation when implied mean > 0.5 percentage points |
| Auto-switch to custom prior | 02-02 | When interval values differ from defaults |
| RadioCard children outside button | 02-03 | Avoids nested buttons HTML validation errors with Radix |
| ResizeObserver mock for tests | 02-03 | Required for Radix UI components using @radix-ui/react-use-size |
| Sign convention: accept-loss stores negative | 02-03 | Per SPEC.md Section 7.3, T_$ = -Loss_$ for scenario 3 |

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-30
Stopped at: Phase 2 complete, verified, ready for Phase 3
Resume file: None
