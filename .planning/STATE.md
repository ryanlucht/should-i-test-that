# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Help users make better testing decisions by quantifying the value of information
**Current focus:** Phase 3 - Calculation Engine

## Current Position

Phase: 3 of 6 (Calculation Engine)
Plan: 1 of 3 in phase 3 complete
Status: In progress - calculation primitives complete
Last activity: 2026-01-30 - Completed 03-01-PLAN.md (calculation primitives)

Progress: [███████████░░░░░░░░░░] 52% (11/21 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 8 min
- Total execution time: 93 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 4/4 | 34 min | 9 min |
| 2 | 6/6 | 54 min | 9 min |
| 3 | 1/3 | 5 min | 5 min |

**Recent Trend:**
- Last 5 plans: 02-03 (18 min), 02-04 (8 min), 02-05 (4 min), 02-06 (4 min), 03-01 (5 min)
- Trend: Pure calculation/TDD plans are quick (~5 min)

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
| Action button for form presets | 02-05 | Use action buttons that fill values, not radio-style selectors |
| Derive priorType at validation time | 02-05 | Compare interval values to defaults, don't track as separate UI state |
| reValidateMode: 'onBlur' for all forms | 02-06 | Prevents validation errors updating while typing |
| Rounded integer for default prior display | 02-06 | Shows "8%" instead of "8.22%" for cleaner UI |
| Parse-on-blur for decimal input | 02-04 | Store raw string while focused, parse only on blur to prevent decimal stripping |
| Abramowitz-Stegun for CDF | 03-01 | Formula 7.1.26 for erfc, error < 7.5e-8, sufficient for EVPI |
| Edge case thresholds | 03-01 | nearZeroSigma < 0.1%, oneSided Phi > 0.9999, truncation P(L<-1) > 0.1% |

### Pending Todos

1. **Implement actual truncation for EVPI calculation** (calculations) — Explore Method B numerical integration for edge cases where prior has significant mass below L=-1

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-30
Stopped at: Completed 03-01-PLAN.md (calculation primitives)
Resume file: None
