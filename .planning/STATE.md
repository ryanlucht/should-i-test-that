# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Help users make better testing decisions by quantifying the value of information
**Current focus:** Phase 3 - Calculation Engine

## Current Position

Phase: 2 of 6 (Basic Mode Inputs) - COMPLETE
Plan: 6 of 6 in phase 2 (including gap closure)
Status: Gap closure complete, ready for Phase 3
Last activity: 2026-01-30 - Completed 02-04-PLAN.md (decimal input blocking fix)

Progress: [████████░░░░░░░░░░░░░] 38% (8/21 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 10 min
- Total execution time: 76 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 4/4 | 34 min | 9 min |
| 2 | 4/4 | 42 min | 11 min |

**Recent Trend:**
- Last 5 plans: 01-04 (8 min), 02-01 (10 min), 02-02 (10 min), 02-03 (18 min), 02-06 (4 min)
- Trend: Gap closure plans are quick

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

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-30
Stopped at: 02-04 gap closure complete (decimal input fix)
Resume file: None
