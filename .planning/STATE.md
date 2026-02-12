# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-03)

**Core value:** Help users make better testing decisions by quantifying the value of information
**Current focus:** v1.2 Observability & Design Refresh

## Current Position

Phase: 17 - Layout Updates (in progress)
Plan: 01 of 3 complete
Status: Executing Phase 17
Last activity: 2026-02-12 -- Completed 17-01 (Header + Baseline Grid)

Progress: v1.0 [DONE] | v1.1 [DONE] | v1.2 [===============------] 78%

## Milestone History

| Milestone | Phases | Status | Shipped |
|-----------|--------|--------|---------|
| v1.0 MVP | 1-6 + 4.1, 6.1 | Complete | 2026-02-02 |
| v1.1 Refine Stats Engine | 7-14 | Complete | 2026-02-03 |
| v1.2 Observability & Design | 15-17 | In Progress | -- |

## v1.2 Phase Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 15 | Datadog Observability | 8 | Complete (3/3 plans) |
| 16 | DRUIDS Foundation + Copy Audit | 4 | Complete (3/3 plans) |
| 17 | Layout Updates | 5 | In Progress (1/3 plans) |

## Performance Metrics

**v1.0 Velocity:**
- Total plans completed: 31
- Average duration: 6 min/plan
- Total execution time: ~190 min (~3 hours)

**v1.1 Velocity:**
- Total plans completed: 16 + 5 quick tasks
- Average duration: 4 min/plan
- Total execution time: ~68 min (~1 hour)

**v1.2 Velocity:**
- Total plans completed: 7
- Phases completed: 2/3

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 15-01 | Datadog RUM SDK | 1 min | 2 | 3 |
| 15-02 | Wizard Navigation Tracking | 2 min | 3 | 3 |
| 15-03 | Event Instrumentation | 2 min | 3 | 3 |
| 16-01 | DRUIDS Color Tokens & Inter Font | 2 min | 3 | 2 |
| 16-02 | Card Shadows + Input Styling | 2 min | 3 | 3 |
| 16-03 | Copy Audit | 2 min | 2 | 1 |
| 17-01 | Header + Baseline Grid | 2 min | 3 | 2 |

## Accumulated Context

### Decisions

Key decisions logged in PROJECT.md Key Decisions table.

Summary of v1.1 decisions:
- Bayesian posterior-mean decision rule for EVSI Monte Carlo
- Truncated EVPI (Method B) with P(L<-1) > 0.001 threshold
- Integrated Cost of Delay simulation (not subtraction)
- 10% rejection warning threshold
- Monte Carlo for effective prior metrics

v1.2 decisions (15-01):
- 100% session sampling for full user visibility
- 20% session replay sampling (balance insight vs cost)
- mask-user-input privacy level for form data in replays

v1.2 decisions (15-02):
- Centralized analytics module isolates Datadog dependency from feature code
- Track mode changes only on actual switches (skip redundant selections)

v1.2 decisions (15-03):
- useRef deduplication for idempotent event firing on re-renders
- Track export after toPng() success, before link.click() to ensure capture

v1.2 decisions (16-01):
- Exact hex values for DRUIDS tokens instead of oklch approximations
- Inter font via Google Fonts CDN with preconnect for performance
- text-secondary class (#4B5563) distinct from muted-foreground (#6B7280)

v1.2 decisions (16-02):
- shadow-card over shadow-sm: custom class provides exact DRUIDS mockup values
- Input focus states verified to use dd-grape via --ring token

v1.2 decisions (16-03):
- Hybrid tooltip approach: move Baseline (3) and Experiment Design (5) helpText to tooltips
- Student-t df helper requires special handling - keep visible or add "What's this?" cue for discoverability

v1.2 decisions (17-01):
- Keep h-14 (56px) header height rather than mockup's h-16 for consistency
- Shorten "Baseline conversion rate" to "Conversion rate" for compact grid fit
- Tooltip infrastructure already existed in input components - no changes needed

### Pending Todos

1. **Add Test Costs for declarative verdict** (calculations) - Backlog for v1.2+
2. **Add branding to PNG export** (ui) - Deferred to future version
3. **Design exploration via Stitch MCP** (ui) - Deferred to v2
4. **Improve EVPI intuition explanation clarity** (ui) - Explain WHY default decision is Ship/Don't ship
5. **Implement binomial simulation (Exact) mode** (calculations) - For low-count/rare-event scenarios
6. **EVPI ceiling comparison display** (ui) - Backlog for v1.2+
7. **Shareable URL with encoded state** (ui) - Backlog for v1.2+
8. **Extract rare-events warning helper** (calculations) - DRY up duplicated logic in evsi.ts/net-value.ts

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-12
Stopped at: Completed 17-01 (Header + Baseline Grid)
Next action: `/gsd:execute-phase 17-02` to continue Layout Updates

## Archive Reference

For v1.1 details, see:
- `.planning/milestones/v1.1-ROADMAP.md`
- `.planning/milestones/v1.1-REQUIREMENTS.md`
- `.planning/milestones/v1.1-MILESTONE-AUDIT.md`

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
- Shadows: shadow-sm, shadow-card, shadow-floating

---
*Updated: 2026-02-12 (17-01 complete)*
