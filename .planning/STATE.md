# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Help users make better testing decisions by quantifying the value of information
**Current focus:** Phase 5 Advanced Mode - Plan 01 Complete (Foundation)

## Current Position

Phase: 5 of 6 (Advanced Mode)
Plan: 3 of 6 in phase 5 complete (01, 02, 03)
Status: In progress - Foundation, Prior Shape, Experiment Design complete
Last activity: 2026-01-30 - Completed 05-01-PLAN.md (Foundation)

Progress: [██████████████████░░░] 87% (20/23 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 20
- Average duration: 7 min
- Total execution time: 144 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 4/4 | 34 min | 9 min |
| 2 | 6/6 | 54 min | 9 min |
| 3 | 3/3 | 14 min | 5 min |
| 4 | 3/3 | 18 min | 6 min |
| 4.1 | 1/1 | 4 min | 4 min |
| 5 | 3/6 | 20 min | 7 min |

**Recent Trend:**
- Last 5 plans: 04-03 (8 min), 04.1-01 (4 min), 05-01 (8 min), 05-02 (6 min), 05-03 (6 min)
- Trend: Phase 5 foundation work executing at average pace

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
| Non-negative EVPI clamp | 03-02 | Math.max(0, evpiDollars) for floating point safety |
| Hook returns null when incomplete | 03-03 | Results section hidden until all inputs valid |
| Default prior when interval null OR matches defaults | 03-03 | Handles both initial state and "Use Recommended Default" action |
| Explicit useMemo dependency array | 03-03 | All 8 input fields listed to avoid stale calculations |
| 4 sigma range for density curve | 04-01 | Covers 99.99% of distribution for proper tail rendering |
| Animation disabled for chart | 04-01 | Per 04-RESEARCH.md, animation off for live form updates |
| Derive threshold_L from threshold_dollars / K | 04-02 | EVPIResults doesn't expose threshold_L directly |
| 12% opacity for regret shading | 04-02 | Per 04-CONTEXT.md Claude discretion - chose subtle approach |
| Fallback K=100000 | 04-02 | When baseline inputs not complete, use reasonable placeholder |
| 2x2 grid layout for supporting cards | 04-03 | Per 04-CONTEXT.md allowing Claude's discretion |
| Highlight variant threshold >20% | 04-03 | Regret card highlights when chance of being wrong exceeds 20% |
| formatProbabilityPercent edge cases | 04-03 | Shows "<1%" and ">99%" to avoid misleading precision |
| NaN check before infinity | 04.1-01 | Number.isNaN() placed before isFinite() to propagate NaN correctly |
| Infinity z-score for degenerate sigma | 04.1-01 | sigma=0 yields +/-Infinity z, causing EVPI=0 (no uncertainty) |
| Percentage values in form UI | 05-03 | Schema validates percentage values (10-90, 1-100), converted to decimals on submit |
| Latency fields de-emphasized | 05-03 | Opacity-75 wrapper and border separator per 05-CONTEXT.md |
| Section-ID based validation | 05-03 | Validation uses section ID not index for correct mode handling |
| jStat studentt location-scale transform | 05-01 | jStat uses standardized Student-t; z=(L-mu)/sigma, scale PDF by 1/sigma |
| Comlink plugin order | 05-01 | Must be before react() in Vite plugins array |
| jStat type declarations | 05-01 | Custom declarations in vite-env.d.ts (no @types/jstat available) |

### Roadmap Evolution

- Phase 4.1 inserted after Phase 4: Calculation Engine Fixes (COMPLETE) - Fixed degenerate sigma handling, NaN propagation in CDF, added statistics test coverage

### Pending Todos

1. **Implement actual truncation for EVPI calculation** (calculations) - Explore Method B numerical integration for edge cases where prior has significant mass below L=-1
2. **Add Test Costs for declarative verdict** (calculations) - Hard costs + labor inputs, Net Value = max(0, EVSI - CoD - Test Costs), verdict "Test this!" or "Don't test this!"

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Improve EVPI intuition explanation clarity | 2026-01-30 | 4ca6c81 | [001-improve-evpi-intuition-explanation](./quick/001-improve-evpi-intuition-explanation/) |
| 002 | Fix threshold equals lift explanation copy | 2026-01-30 | 233cacc | [002-fix-threshold-equals-lift-copy](./quick/002-fix-threshold-equals-lift-copy/) |

## Session Continuity

Last session: 2026-01-30
Stopped at: Completed 05-01-PLAN.md (Advanced Mode Foundation)
Resume file: None
