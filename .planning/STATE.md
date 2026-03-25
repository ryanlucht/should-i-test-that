---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: Ready to execute
stopped_at: Completed 22-01-PLAN.md
last_updated: "2026-03-25T19:22:03.766Z"
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 15
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Help users make better testing decisions by quantifying the value of information
**Current focus:** Phase 22 — learning-bits-guide-infrastructure

## Current Position

Phase: 22 (learning-bits-guide-infrastructure) — EXECUTING
Plan: 2 of 2

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

### Pending Todos

1. **Add Test Costs for declarative verdict** (calculations) -- Backlog v2.1+
2. **Implement binomial simulation (Exact) mode** (calculations) -- Deferred v2.1+

### Roadmap Evolution

- Phase 22.1 inserted after Phase 22: Stats engine correctness fixes (URGENT)

### Blockers/Concerns

- **GUIDE content blocker**: Phase 22 (Learning Bits Guide Infrastructure) can build component shell, hooks, and toggle, but actual dialogue text content requires PM input before content integration.

## Session Continuity

Last session: 2026-03-25T19:22:03.763Z
Stopped at: Completed 22-01-PLAN.md
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
