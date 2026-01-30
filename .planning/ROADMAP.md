# Roadmap: Should I Test That?

## Overview

This roadmap transforms the A/B test decision-value calculator from concept to deployable product across 6 phases. We start with foundation and wizard infrastructure, build Basic mode inputs and calculations, add visualization and results, then extend to Advanced mode with EVSI computation, and finish with export and polish. Each phase delivers a coherent, testable capability that builds toward the complete tool.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Wizard Infrastructure** - Project setup, design system, and wizard flow mechanics
- [x] **Phase 2: Basic Mode Inputs** - Steps 1-4 input forms with validation and help text
- [x] **Phase 3: Calculation Engine** - EVPI calculation, closed-form and Monte Carlo, Web Worker setup
- [ ] **Phase 4: Visualization & Results** - Live-updating charts and Basic mode results display
- [ ] **Phase 5: Advanced Mode** - EVSI calculation, Cost of Delay, advanced inputs and results
- [ ] **Phase 6: Export & Polish** - PNG export, final UX polish, accessibility audit

## Phase Details

### Phase 1: Foundation & Wizard Infrastructure
**Goal**: Users can navigate through a 5-step wizard with data persistence and session awareness
**Depends on**: Nothing (first phase)
**Requirements**: WIZARD-01, WIZARD-02, WIZARD-03, WIZARD-04, WIZARD-05, WIZARD-07, DESIGN-01, DESIGN-02, DESIGN-05 (WIZARD-06 — SKIPPED by user decision: no leave warning needed for a simple calculator)
**SPEC.md Reference**: Section 11 (UX flow), Section 12 (Design requirements)
**Success Criteria** (what must be TRUE):
  1. User sees a progress indicator with descriptive labels (Baseline, Uncertainty, Threshold, Results)
  2. User can navigate forward/back through steps without losing entered data
  3. User cannot skip ahead to later steps before completing current step
  4. User can toggle between Basic and Advanced modes from the wizard
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffolding (Vite + React 19 + TypeScript + Tailwind 4 + shadcn/ui)
- [x] 01-02-PLAN.md — Design system via Stitch MCP (Welcome + Calculator page designs)
- [x] 01-03-PLAN.md — Wizard state management (Zustand) + Welcome page with mode selection
- [x] 01-04-PLAN.md — Calculator page with sections, sticky indicator, and navigation

### Phase 2: Basic Mode Inputs
**Goal**: Users can enter all Basic mode inputs with clear guidance and validation
**Depends on**: Phase 1
**Requirements**: BASIC-IN-01, BASIC-IN-02, BASIC-IN-03, BASIC-IN-04, BASIC-IN-05, BASIC-IN-06, BASIC-IN-07, BASIC-IN-08, UX-01, UX-02, UX-03, UX-04, UX-05, UX-08
**SPEC.md Reference**: Section 5 (Business inputs), Section 6 (Prior inputs), Section 7 (Threshold)
**Success Criteria** (what must be TRUE):
  1. User can enter baseline conversion rate as percentage (0-100%) with validation
  2. User can enter annual visitors with editable unit label (visitors/sessions/leads)
  3. User can enter value per conversion with dollar formatting
  4. User can select default prior (N(0, 0.05)) or enter custom 90% interval
  5. User can select shipping threshold scenario and enter value in dollars or lift %
**Plans**: 6 plans (3 original + 3 gap closure)

Plans:
- [x] 02-01-PLAN.md — Dependencies, validation utilities, and Baseline Metrics form (CR0, N_year, V)
- [x] 02-02-PLAN.md — Uncertainty prior form (default vs. custom 90% interval)
- [x] 02-03-PLAN.md — Threshold scenario selection with radio cards and inline inputs
- [x] 02-04-PLAN.md — **GAP CLOSURE:** Fix decimal input blocking in numeric inputs
- [x] 02-05-PLAN.md — **GAP CLOSURE:** Fix default prior button UX (radio -> action button)
- [x] 02-06-PLAN.md — **GAP CLOSURE:** Fix validation timing + hardcoded prior display

### Phase 3: Calculation Engine
**Goal**: System correctly calculates EVPI and supporting metrics for Basic mode
**Depends on**: Phase 2
**Requirements**: BASIC-CALC-01, BASIC-CALC-02, BASIC-CALC-03, BASIC-CALC-04, BASIC-CALC-05, BASIC-CALC-06, BASIC-CALC-07, BASIC-CALC-08, UX-06
**SPEC.md Reference**: Section 4 (Notation/units), Section 8 (Calculations)
**Success Criteria** (what must be TRUE):
  1. System derives K (annual dollars per unit lift) correctly from inputs
  2. System determines default decision (Ship/Don't ship) based on prior mean vs. threshold
  3. System calculates EVPI using closed-form Normal formula with truncation at L >= -1
  4. System calculates probability of clearing threshold P(L >= T_L)
  5. Results update live as user changes inputs (no submit button needed)
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — TDD: Statistics primitives (phi/Phi), derived values (K, threshold), smart formatting
- [x] 03-02-PLAN.md — TDD: EVPI calculation (closed-form Normal formula, edge case detection)
- [x] 03-03-PLAN.md — React hook connecting store to EVPI calculation (useEVPICalculations)

### Phase 4: Visualization & Results
**Goal**: Users see their inputs visualized and receive clear Basic mode results
**Depends on**: Phase 3
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, VIZ-06, VIZ-07, VIZ-08, BASIC-OUT-01, BASIC-OUT-02, BASIC-OUT-03, BASIC-OUT-04, BASIC-OUT-05, BASIC-OUT-06, BASIC-OUT-07, DESIGN-03
**SPEC.md Reference**: Section 6.3 (Visualization), Section 8.6 (Chart shading), Section 9 (Results)
**Success Criteria** (what must be TRUE):
  1. User sees live-updating distribution chart with lift on x-axis
  2. Chart shows mean indicator, 90% interval, and threshold line with tooltip
  3. Regret region is shaded based on default decision (below threshold if Ship, above if Don't)
  4. User sees primary verdict: "If you can A/B test this idea for less than $EVPI, it's worth testing"
  5. User sees supporting cards: prior summary, threshold summary, probability, regret intuition
**Plans**: TBD

Plans:
- [ ] 04-01: Distribution chart component (Recharts, responsive, accessible)
- [ ] 04-02: Chart overlays (mean, interval, threshold, regret shading)
- [ ] 04-03: Results page with verdict and supporting explanation cards

### Phase 5: Advanced Mode
**Goal**: Users can calculate realistic test value using EVSI and Cost of Delay
**Depends on**: Phase 4
**Requirements**: ADV-IN-01, ADV-IN-02, ADV-IN-03, ADV-IN-04, ADV-IN-05, ADV-IN-06, ADV-IN-07, ADV-IN-08, ADV-IN-09, ADV-IN-10, ADV-CALC-01, ADV-CALC-02, ADV-CALC-03, ADV-CALC-04, ADV-CALC-05, ADV-CALC-06, ADV-CALC-07, ADV-OUT-01, ADV-OUT-02, ADV-OUT-03, ADV-OUT-04, ADV-OUT-05, ADV-OUT-06, ADV-OUT-07, DESIGN-04
**SPEC.md Reference**: Section A1-A7 (Advanced mode)
**Success Criteria** (what must be TRUE):
  1. User can select prior shape (Normal, Student-t with df presets, Uniform)
  2. User can enter experiment design (split, duration, daily traffic, eligibility, latency)
  3. User can enter test costs (hard costs, labor hours/rate)
  4. System calculates EVSI via Monte Carlo in <2s without blocking UI
  5. User sees verdict with EVSI, Cost of Delay, and Net Value = max(0, EVSI - CoD)
**Plans**: TBD

Plans:
- [ ] 05-01: Advanced prior inputs (shape selector, Student-t, Uniform)
- [ ] 05-02: Experiment design inputs (split, duration, traffic, eligibility)
- [ ] 05-03: Cost inputs (hard costs, labor)
- [ ] 05-04: EVSI calculation (Monte Carlo pre-posterior analysis)
- [ ] 05-05: Advanced results display

### Phase 6: Export & Polish
**Goal**: Users can export results and experience polished, accessible interface
**Depends on**: Phase 5
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04, UX-07
**SPEC.md Reference**: Section 10 (Export/sharing), Section 14 (Validation & QA)
**Success Criteria** (what must be TRUE):
  1. User can export shareable PNG image card with verdict, inputs, and optional mini chart
  2. PNG includes title, idea name, verdict line, and key inputs summary
  3. Color is never sole indicator of status (text redundancy for accessibility)
  4. Keyboard navigation works end-to-end (Tab, Enter, Escape)
**Plans**: TBD

Plans:
- [ ] 06-01: PNG export functionality (html-to-image or similar)
- [ ] 06-02: Final accessibility audit and fixes
- [ ] 06-03: Cross-browser testing and polish

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Wizard Infrastructure | 4/4 | Complete | 2026-01-30 |
| 2. Basic Mode Inputs | 6/6 | Complete | 2026-01-30 |
| 3. Calculation Engine | 3/3 | Complete | 2026-01-30 |
| 4. Visualization & Results | 0/3 | Not started | - |
| 5. Advanced Mode | 0/5 | Not started | - |
| 6. Export & Polish | 0/3 | Not started | - |

---
*Roadmap created: 2026-01-29*
*Phase 1 planned: 2026-01-29*
*Phase 1 completed: 2026-01-30*
*Phase 2 planned: 2026-01-30*
*Phase 2 UAT: 5 issues found, 3 gap closure plans created: 2026-01-30*
*Phase 2 gap closure completed: 2026-01-30*
*Phase 3 planned: 2026-01-30*
*Phase 3 completed: 2026-01-30*
*Total requirements mapped: 67/67*
