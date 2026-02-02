# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Help users make better testing decisions by quantifying the value of information
**Current focus:** Phase 6.1 Calculation Bugs & Polish - IN PROGRESS

## Current Position

Phase: 6.1 (Calculation Bugs & Polish) - IN PROGRESS
Plan: 3/5 in phase 6.1
Status: Completed 06.1-03 Default prior option & sigma display
Last activity: 2026-02-02 - Completed 06.1-03-PLAN.md

Progress: [█████████████████████████░░░] 93% (29/31 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 26
- Average duration: 7 min
- Total execution time: 175 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 4/4 | 34 min | 9 min |
| 2 | 6/6 | 54 min | 9 min |
| 3 | 3/3 | 14 min | 5 min |
| 4 | 3/3 | 18 min | 6 min |
| 4.1 | 1/1 | 4 min | 4 min |
| 5 | 6/6 | 39 min | 7 min |
| 6 | 3/3 | 17 min | 6 min |

**Recent Trend:**
- Last 5 plans: 05-05 (5 min), 05-06 (8 min), 06-01 (5 min), 06-02 (5 min), 06-03 (7 min)
- Trend: PROJECT COMPLETE - All 26 plans executed successfully

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
| Rejection sampling for EVSI feasibility | 05-04 | Samples where CR1 outside [0,1] rejected and resampled |
| Pre-posterior sigma via conjugate update | 05-04 | sigma_preposterior = sigma_prior * sqrt(data_precision / posterior_precision) |
| n_control = n_total - n_variant | 05-04 | Ensures exact sum after flooring, avoids rounding errors |
| Normal priors use synchronous fast path | 05-05 | No Worker needed for O(1) closed-form calculation |
| Request ID tracking for async Worker | 05-05 | Prevents stale async results from updating state |
| Combined hook results type | 05-05 | Hook returns evsi, cod, netValueDollars, sampleSizes together |
| Backward-compatible component wrappers | 05-06 | Legacy suffix for old-API-compatible wrappers (PriorDistributionChartLegacy) |
| Skip 90% interval for Uniform | 05-06 | Entire distribution bounds ARE the interval, shading would be redundant |
| stepAfter for Uniform chart | 05-06 | Rectangle shape for Uniform distribution rendering |
| Native <a download> for export | 06-01 | No file-saver dependency needed, simpler implementation |
| Inline styles in ExportCard | 06-01 | Ensures html-to-image captures styling correctly |
| 60% placeholder opacity | 06-02 | placeholder:text-muted-foreground/60 for clear distinction from entered values |
| Theme is already purple | 06-02 | Audit confirmed --primary and --ring use oklch(0.55 0.2 260), no blue overrides |
| vitest-axe matchers require extend | 06-03 | Must import matchers and call expect.extend(), not just import extend-expect |
| ARIA live region restructuring | 06-03 | EVSIVerdictCard refactored so live region container always exists in DOM |
| Notable badge for text redundancy | 06-03 | Highlight variant shows visible "Notable" badge per WCAG 1.4.1 |
| Worker finally block cleanup | 06.1-02 | Terminate in finally block covers success + error paths |
| Worker effect cleanup | 06.1-02 | Effect cleanup terminates worker on unmount |
| Eppo attribution in default button | 06.1-03 | Credit Eppo for using their prior in Bayesian analysis |
| Sigma hidden in Basic mode | 06.1-03 | Reduces cognitive load for most users |
| Sigma renamed to std dev | 06.1-03 | More familiar term for Advanced mode users |

### Roadmap Evolution

- Phase 4.1 inserted after Phase 4: Calculation Engine Fixes (COMPLETE) - Fixed degenerate sigma handling, NaN propagation in CDF, added statistics test coverage
- Phase 6.1 inserted after Phase 6: Calculation Bugs & Polish (URGENT) - Fix EVSI threshold bug, worker cleanup, UX improvements

### Pending Todos

1. **Implement actual truncation for EVPI calculation** (calculations) - Explore Method B numerical integration for edge cases where prior has significant mass below L=-1
2. **Add Test Costs for declarative verdict** (calculations) - Hard costs + labor inputs, Net Value = max(0, EVSI - CoD - Test Costs), verdict "Test this!" or "Don't test this!"
3. **Add branding to PNG export** (ui) - Deferred: add "Created with Should I Test That?" footer in future version
4. **Design exploration via Stitch MCP** (ui) - Deferred to v2: 3 design directions, compact inputs, visual polish

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Improve EVPI intuition explanation clarity | 2026-01-30 | 4ca6c81 | [001-improve-evpi-intuition-explanation](./quick/001-improve-evpi-intuition-explanation/) |
| 002 | Fix threshold equals lift explanation copy | 2026-01-30 | 233cacc | [002-fix-threshold-equals-lift-copy](./quick/002-fix-threshold-equals-lift-copy/) |
| 003 | Round daily traffic placeholder to 5,000 | 2026-01-30 | 349d4ea | [003-round-daily-traffic-placeholder](./quick/003-round-daily-traffic-placeholder/) |
| 003b | Add baseline inputs to PNG export | 2026-01-30 | 6aefc6c | [003-add-baseline-inputs-to-png-export](./quick/003-add-baseline-inputs-to-png-export/) |
| 004 | Remove Notable badge from SupportingCard | 2026-01-30 | 6b9002f | [004-remove-notable-badge](./quick/004-remove-notable-badge/) |

## Session Continuity

Last session: 2026-02-02
Stopped at: Completed 06.1-03-PLAN.md
Resume file: None

## Project Completion Summary

**v1.0 Feature Complete**
- 6 phases, 26 plans executed
- Total execution time: 175 minutes (~3 hours)
- 262 tests passing
- WCAG 2.1 AA accessibility testing in place
- PNG export functional
- Basic and Advanced calculation modes working
