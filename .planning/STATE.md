---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: Ready to plan
stopped_at: Phase 26 context gathered
last_updated: "2026-04-14T15:34:07.503Z"
progress:
  total_phases: 11
  completed_phases: 9
  total_plans: 31
  completed_plans: 30
  percent: 97
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Help users make better testing decisions by quantifying the value of information
**Current focus:** Phase 24 — shareable-walkthrough-urls

## Current Position

Phase: 26
Plan: Not started

## Milestone History

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1.0 MVP | 1-6 + 4.1, 6.1 | Complete | 2026-02-02 |
| v1.1 Refine Stats Engine | 7-14 | Complete | 2026-02-03 |
| v1.2 Observability & Design | 15-18 | Complete | 2026-02-20 |
| v2.0 Learning Bits | 19-26 | In Progress | -- |

## v2.0 Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|-------------|--------|
| 19 | Basic Mode Deprecation | DEPR-01, DEPR-02, DEPR-03 | Not started |
| 20 | Engine Accuracy Fixes | ENG-01 through ENG-13 | Not started |
| 21 | Engine Cleanup | ENG-14 through ENG-19 | Not started |
| 22 | Learning Bits Guide Infrastructure | GUIDE-01, GUIDE-02, GUIDE-03 | Not started |
| 23 | Homepage & Welcome Experience | HOME-01 through HOME-04 | Not started |
| 24 | Shareable Walkthrough URLs | SHARE-01 through SHARE-04 | Not started |
| 25 | Polish, Accessibility & Export | POL-01-04, A11Y-01-02, EXPORT-01-02, DD-01 | Not started |
| 26 | AWS Deployment | DEPLOY-01 | Not started |

## Performance Metrics

**v1.0 Velocity:** 31 plans, ~6 min/plan, ~3 hours total
**v1.1 Velocity:** 16 plans + 5 quick tasks, ~4 min/plan, ~1 hour total
**v1.2 Velocity:** 11 plans, 4 phases, ~2 min/plan

**v2.0 Velocity:** Not yet started

## Accumulated Context

### Decisions

Key decisions logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- localStorage backup for mode switches (v1.2) -- will be removed in Phase 19 deprecation
- Centralized analytics module (v1.2) -- Datadog dependency isolated, DD-01 extends it
- [Phase 19]: Inlined calculateCostOfDelay into useEVSICalculations hook after removing standalone cost-of-delay.ts
- [Phase 19]: Flat WizardInputs type replaces SharedInputs/AdvancedInputs/InputsState; priorShape defaults to normal
- [Phase 20]: Used zustand persist merge() for schema migration to strip obsolete keys from sessionStorage
- [Phase 20]: Used zod superRefine for cross-field horizon validation (errors on both testDurationDays and decisionLatencyDays)
- [Phase 20]: Centralized Student-t quantile logic in student-t-helpers.ts to prevent drift across files
- [Phase 20]: Student-t scale uses t-quantile calibration (jStat.studentt.inv) instead of Normal Z_95
- [Phase 20]: Extracted feasibility logic to shared module to eliminate cross-module coupling (Codex HIGH)
- [Phase 20]: TRUNCATION_THRESHOLD=0.001 as shared constant; tail-mass detection replaces lower-bound-only heuristic
- [Phase 20]: No Math.max(0) clamps in UI display; raw net value flows from hook through to verdict, breakdown, and export cards
- [Phase 20]: Export 'Timing costs' computed as evsi - netValue to match live UI ValueBreakdownCard formula
- [Phase 21]: Warning helpers return CalculationWarning | null for composable push-into-array usage
- [Phase 21]: ENG-17 confirmed already done: net-value.ts uses liftFeasibilityBounds
- [Phase 21]: ENG-19 edge-case tests pass immediately since guards exist from 21-01; tests document and verify existing behavior
- [Phase 21]: ENG-16 confirmed: CostOfDelayCard removed, remaining CoDResults/calculateCostOfDelay actively used
- [Phase 22]: guideEnabled added to v1.2 Zustand WizardState — persisted in sessionStorage via partialize/merge, defaults true per D-06
- [Phase 22]: useTypewriter test: advance timers per-character via advanceChars(n) helper, not bulk advanceTimersByTime(n*30)
- [Phase 22]: renderDialogueText helper processes displayed (sliced) text not full message to prevent typewriter reset on parent re-renders
- [Phase 22]: useTypewriter matchMedia guard: typeof window.matchMedia === 'function' added for jsdom test environment compatibility
- [Phase 22.1]: Student-t scale uses jStat.studentt.inv(0.95, df) t-quantile calibration; buildPriorFromInputs is single source of truth for all prior construction
- [Phase 22.1]: Worker uses <= (not <) for truncation gate boundary to match hook exactly
- [Phase 22.1]: formatThreshold uses strict union type for scenario with safe runtime fallback (no | string)
- [Phase 22.1]: Test 1 adjusted from plan: mu_L=0.05/L_hat=0.10 for >5% truncation effect (posterior near L_max)
- [Phase 22.1]: Warning merging uses CalculationWarning.code as dedup key (sufficient for existing warning taxonomy)
- [Phase 22.1]: Legacy CoD computation fully removed (not deprecated) per audit P7: stale math using raw prior mean
- [Phase 23]: WelcomePage props changed from onGetStarted to onStartWithGuidance + onSkipGuidance — App.tsx wiring deferred to Plan 02
- [Phase 23]: BubblyPillLogo uses CSS/HTML Frutiger Aero glass effect — frutiger-glass CSS class with gradient + ::before/::after pseudo-elements, Noto Sans font
- [Phase 23]: App.tsx onStartWithGuidance calls setGuideEnabled(true) before setCurrentPage, onSkipGuidance calls setGuideEnabled(false) — explicit true/false on both paths for clarity
- [Phase 24]: WizardInputs defined in url-codec.ts (self-contained) — worktree on Phase 19-era nested types; url-codec.ts stays independent of store type evolution
- [Phase 24]: decodeWizardState returns null (not throws) for all error cases — migration chain MIGRATIONS[0] is v0->v1 identity transform scaffolding forward compatibility
- [Phase 24]: vi.runAllMicrotasksAsync not available in vitest v4; use Promise.resolve() to flush microtask queue in async clipboard tests
- [Phase 24]: SECTION_REQUIRED_FIELDS map drives smart section completion during URL hydration; sections marked complete only when all required fields non-null
- [Phase 24]: useWizardStore.getState() imperative access inside useEffect for one-shot URL hydration; no store subscription needed
- [Phase 24]: useSharedDiff uses narrow Zustand selectors (inputs, sharedBaseline) to minimize re-renders with two useMemo calls for memoized Set and isFieldModified function

### Pending Todos

1. **Add Test Costs for declarative verdict** (calculations) -- Backlog v2.1+
2. **Implement binomial simulation (Exact) mode** (calculations) -- Deferred v2.1+

### Roadmap Evolution

- Phase 22.1 inserted after Phase 22: Stats engine correctness fixes (URGENT)
- Phase 25.1 inserted after Phase 25: Results Card Improvements (URGENT) — plain-English waterfall, directional decision impact, accordion explainers

### Blockers/Concerns

- **GUIDE content blocker**: Phase 22 (Learning Bits Guide Infrastructure) can build component shell, hooks, and toggle, but actual dialogue text content requires PM input before content integration.

## Session Continuity

Last session: 2026-04-14T15:34:07.498Z
Stopped at: Phase 26 context gathered
Next action: `/gsd:plan-phase 19` to plan Basic Mode Deprecation

## Archive Reference

For v1.2 details, see:

- `.planning/milestones/v1.2-ROADMAP.md`
- `.planning/milestones/v1.2-REQUIREMENTS.md`

For v1.1 details, see:

- `.planning/milestones/v1.1-ROADMAP.md`
- `.planning/milestones/v1.1-REQUIREMENTS.md`

For v1.0 details, see:

- `.planning/milestones/v1.0-ROADMAP.md`

## Design Reference

DRUIDS mockup tokens (from `.planning/mockups/code.html`):

- Primary: dd-grape (#7C3AED), dd-grapeDark (#6D28D9), dd-grapeLight (#F3E8FF)
- Background: dd-bg (#F9FAFB), dd-card (#FFFFFF)
- Borders: dd-border (#E5E7EB), dd-borderHover (#D1D5DB)
- Text: dd-text (#111827), dd-textSecondary (#4B5563), dd-muted (#6B7280)
- Status: dd-success (#10B981), dd-info (#3B82F6)
- Font: Inter (400, 500, 600, 700)

---
*Updated: 2026-03-23 (v2.0 roadmap created)*
