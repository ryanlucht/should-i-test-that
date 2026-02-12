# Roadmap: v1.2 Observability & Design Refresh

## Overview

Add Datadog observability instrumentation (RUM, Product Analytics, Error Tracking, Session Replay) and refresh UI to align with DRUIDS design system. Helper copy preserved where possible, moved to tooltips where space-constrained.

**Milestone:** v1.2
**Phases:** 15-17 (3 phases)
**Requirements:** 17 (8 OBS + 9 DES)
**Depth:** Standard

## Phases

### Phase 15: Datadog Observability

**Goal:** Application fully instrumented with Datadog for real-time monitoring, error tracking, and product analytics.

**Dependencies:** None (foundational)

**Requirements:**
- OBS-01: Datadog RUM SDK initialized with client token from env
- OBS-02: Error tracking captures unhandled JS errors
- OBS-03: Session replay records user sessions
- OBS-04: Page view events track calculator page visits
- OBS-05: Custom event tracks wizard step progression
- OBS-06: Custom event tracks mode selection (Basic/Advanced)
- OBS-07: Custom event tracks calculation completion (EVPI/EVSI)
- OBS-08: Custom event tracks PNG export usage

**Success Criteria:**
1. Datadog dashboard shows page view events when user visits calculator
2. Unhandled JS errors appear in Datadog Error Tracking within 30 seconds
3. Session replays are viewable in Datadog with user interactions visible
4. SDK initialization does not block or delay page load
5. Wizard step completion generates "step_completed" events with step name
6. Mode selection generates "mode_selected" event with mode value
7. Calculation completion generates "calculation_completed" event with type (EVPI/EVSI)
8. PNG export generates "export_png" event

**Plans:** 3 plans

Plans:
- [x] 15-01-PLAN.md — Install Datadog RUM SDK and initialize with error tracking + session replay
- [x] 15-02-PLAN.md — Create analytics module, add step and mode tracking
- [x] 15-03-PLAN.md — Add calculation completion and PNG export tracking

---

### Phase 16: DRUIDS Foundation + Helper Copy Audit

**Goal:** Base design tokens applied and helper copy audited for space constraints with user approval.

**Dependencies:** None (independent of observability)

**Requirements:**
- DES-01: DRUIDS color tokens applied (dd-grape, dd-text, etc.)
- DES-02: Inter font family with correct weights (400, 500, 600, 700)
- DES-09: Card shadows and input styling match DRUIDS patterns
- DES-08: Audit helper copy for space constraints; compile list and consult user on approach

**Success Criteria:**
1. Primary accent color is #7C3AED (dd-grape) across all interactive elements
2. Text colors follow DRUIDS hierarchy (dd-text: #111827, dd-textSecondary: #4B5563, dd-muted: #6B7280)
3. Inter font renders with correct weights for headings (600/700) and body (400/500)
4. Cards have consistent shadow-card styling with border-dd-border
5. Inputs have consistent focus states (border-dd-grape, ring-dd-grape)
6. Complete inventory of all helper copy with character counts delivered
7. Space-constrained areas identified with specific measurements
8. User approval received on copy approach before Phase 17 begins

**Plans:** 3 plans

Plans:
- [x] 16-01-PLAN.md — Apply DRUIDS color tokens and Inter font (DES-01, DES-02)
- [x] 16-02-PLAN.md — Add card shadows and verify input styling (DES-09)
- [x] 16-03-PLAN.md — Audit helper copy and get user approval (DES-08)

---

### Phase 17: Layout Updates

**Goal:** Section layouts updated to match DRUIDS mockup patterns.

**Dependencies:** Phase 16 (foundation + copy decisions inform layout)

**Requirements:**
- DES-03: Header updated with breadcrumb navigation
- DES-04: Baseline Metrics uses 3-column grid layout
- DES-05: Uncertainty Model uses side-by-side layout (options + chart)
- DES-06: Results section uses metrics grid layout
- DES-07: Statistical interpretation callout box added

**Success Criteria:**
1. Header shows "Experimentation > Tools > Decision Engine" breadcrumb pattern
2. Baseline Metrics section displays 3 inputs in responsive grid (3-col on desktop, 1-col on mobile)
3. Uncertainty Model shows prior options on left, distribution chart on right (side-by-side on desktop)
4. Results metrics display in 4-column grid with consistent padding and dividers
5. Statistical interpretation appears in blue callout box below metrics with info icon

**Plans:** 3 plans

Plans:
- [ ] 17-01-PLAN.md — Header breadcrumb + Baseline Metrics 3-column grid (DES-03, DES-04)
- [ ] 17-02-PLAN.md — Uncertainty Model side-by-side layout (DES-05)
- [ ] 17-03-PLAN.md — Results 4-column metrics grid + statistical callout (DES-06, DES-07)

---

## Progress

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 15 | Datadog Observability | OBS-01 through OBS-08 | Complete (2026-02-11) |
| 16 | DRUIDS Foundation + Copy Audit | DES-01, DES-02, DES-08, DES-09 | Complete (2026-02-12) |
| 17 | Layout Updates | DES-03, DES-04, DES-05, DES-06, DES-07 | Planned |

## Coverage Validation

| Requirement | Phase | Mapped |
|-------------|-------|--------|
| OBS-01 | 15 | Yes |
| OBS-02 | 15 | Yes |
| OBS-03 | 15 | Yes |
| OBS-04 | 15 | Yes |
| OBS-05 | 15 | Yes |
| OBS-06 | 15 | Yes |
| OBS-07 | 15 | Yes |
| OBS-08 | 15 | Yes |
| DES-01 | 16 | Yes |
| DES-02 | 16 | Yes |
| DES-03 | 17 | Yes |
| DES-04 | 17 | Yes |
| DES-05 | 17 | Yes |
| DES-06 | 17 | Yes |
| DES-07 | 17 | Yes |
| DES-08 | 16 | Yes |
| DES-09 | 16 | Yes |

**Coverage:** 17/17 requirements mapped (100%)

---
*Roadmap created: 2026-02-11*
