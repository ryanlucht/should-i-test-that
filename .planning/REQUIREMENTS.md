# Requirements: Should I Test That?

**Defined:** 2026-01-29
**Core Value:** Help users make better testing decisions by quantifying the value of information

> **IMPORTANT:** This document provides requirement IDs and categories. For exact specifications (formulas, UI copy, validation rules, edge cases), always reference **SPEC.md** as the source of truth. The mathematical approach and decision theory are already defined there — do not deviate.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Wizard Flow (WIZARD)

- [ ] **WIZARD-01**: 5-step wizard flow: Welcome → Baseline → Uncertainty → Threshold → Results
- [ ] **WIZARD-02**: Progress indicator with numbered steps and descriptive labels
- [ ] **WIZARD-03**: Back/Next navigation with validation before advancing
- [ ] **WIZARD-04**: Linear flow enforcement (cannot skip ahead)
- [ ] **WIZARD-05**: Data persistence within session (back navigation preserves data)
- [ ] **WIZARD-06**: Leave warning modal on browser back/close with unsaved data
- [ ] **WIZARD-07**: Mode toggle (Basic ↔ Advanced) accessible from wizard

### Basic Mode Inputs (BASIC-IN)

- [ ] **BASIC-IN-01**: Baseline conversion rate input (percent, 0-100%, stored as decimal)
- [ ] **BASIC-IN-02**: Annual visitors input with editable label (visitors/sessions/leads/etc.)
- [ ] **BASIC-IN-03**: Value per conversion input (dollar amount)
- [ ] **BASIC-IN-04**: Uncertainty prior: default option (N(0, 0.05))
- [ ] **BASIC-IN-05**: Uncertainty prior: custom 90% interval option (L_low, L_high)
- [ ] **BASIC-IN-06**: Shipping threshold: 3 scenarios (any positive / minimum lift / accept small loss)
- [ ] **BASIC-IN-07**: Threshold unit selector (dollars/year or relative lift %)
- [ ] **BASIC-IN-08**: Helper text for all inputs as specified in SPEC.md

### Basic Mode Calculations (BASIC-CALC)

- [ ] **BASIC-CALC-01**: Derive K (annual dollars per unit lift) = N_year × CR0 × V
- [ ] **BASIC-CALC-02**: Derive threshold in both units (T_$ = K × T_L)
- [ ] **BASIC-CALC-03**: Determine default decision (Ship if mu_L ≥ T_L, else Don't ship)
- [ ] **BASIC-CALC-04**: Calculate EVPI via closed-form Normal formula (primary method)
- [ ] **BASIC-CALC-05**: Truncate prior at L ≥ -1 and re-normalize
- [ ] **BASIC-CALC-06**: Calculate probability of clearing threshold P(L ≥ T_L)
- [ ] **BASIC-CALC-07**: Calculate "chance of being wrong" based on default decision
- [ ] **BASIC-CALC-08**: Handle edge cases: EVPI ≈ 0 when sigma_L → 0 or threshold far from distribution

### Basic Mode Results (BASIC-OUT)

- [ ] **BASIC-OUT-01**: Primary verdict: "If you can A/B test this idea for less than $EVPI, it's worth testing"
- [ ] **BASIC-OUT-02**: Subtext warning that EVPI is optimistic ceiling (nudge to Advanced mode)
- [ ] **BASIC-OUT-03**: Prior summary card (mean + 90% interval)
- [ ] **BASIC-OUT-04**: Threshold summary card (both units)
- [ ] **BASIC-OUT-05**: Probability of clearing threshold display
- [ ] **BASIC-OUT-06**: Chance of regret intuition display
- [ ] **BASIC-OUT-07**: EVPI intuition display (expected regret)

### Advanced Mode Inputs (ADV-IN)

- [ ] **ADV-IN-01**: Prior shape selector (Normal, Student-t, Uniform)
- [ ] **ADV-IN-02**: Student-t degrees of freedom presets (3, 5, 10, 30)
- [ ] **ADV-IN-03**: Traffic split control/variant (default 50/50)
- [ ] **ADV-IN-04**: Planned test duration (days/weeks)
- [ ] **ADV-IN-05**: Daily traffic input (or derive from N_year/365 option)
- [ ] **ADV-IN-06**: Eligibility/ramp fraction (default 100%)
- [ ] **ADV-IN-07**: Decision latency (default 0 days)
- [ ] **ADV-IN-08**: Hard costs input (tools/vendor fees)
- [ ] **ADV-IN-09**: Labor costs input (hours + hourly rate OR direct cost)
- [ ] **ADV-IN-10**: Helper text for prior shapes (fat-tailed evidence, uniform warning)

### Advanced Mode Calculations (ADV-CALC)

- [ ] **ADV-CALC-01**: Derive sample sizes (n_total, n_control, n_variant)
- [ ] **ADV-CALC-02**: Calculate EVSI via Monte Carlo pre-posterior analysis
- [ ] **ADV-CALC-03**: Monte Carlo performance target: ~500ms-2s, no UI blocking
- [ ] **ADV-CALC-04**: Calculate Cost of Delay per spec formula
- [ ] **ADV-CALC-05**: Calculate Net value = EVSI − CoD
- [ ] **ADV-CALC-06**: Enforce feasibility bounds (CR must stay in [0,1])
- [ ] **ADV-CALC-07**: Handle Normal-Normal approximation fast path for Normal priors

### Advanced Mode Results (ADV-OUT)

- [ ] **ADV-OUT-01**: Primary verdict: "If you can run this test for less than $Y, it's worth testing"
- [ ] **ADV-OUT-02**: Y = max(0, EVSI − CoD) calculation
- [ ] **ADV-OUT-03**: EVSI display (gross value of test information)
- [ ] **ADV-OUT-04**: Cost of Delay display
- [ ] **ADV-OUT-05**: Net value of testing display
- [ ] **ADV-OUT-06**: EVPI ceiling display with "EVSI ≤ EVPI" teaching point
- [ ] **ADV-OUT-07**: Probability test changes decision (or decision sensitivity metric)

### Visualization (VIZ)

- [ ] **VIZ-01**: Live-updating distribution chart (x-axis: relative lift %)
- [ ] **VIZ-02**: Show mean indicator on chart
- [ ] **VIZ-03**: Show 90% interval indicators on chart
- [ ] **VIZ-04**: Threshold vertical line with tooltip showing both units
- [ ] **VIZ-05**: Regret shading: shade L < T_L if default Ship, L > T_L if default Don't
- [ ] **VIZ-06**: Dollar values as hover/callouts via Δ$ = K × L
- [ ] **VIZ-07**: Clear axis labels with units
- [ ] **VIZ-08**: Responsive chart sizing

### UI/UX Polish (UX)

- [ ] **UX-01**: Input formatting (currency with $, percentages with %)
- [ ] **UX-02**: Inline validation with clear, specific error messages
- [ ] **UX-03**: Contextual help text visible (not hidden in tooltips)
- [ ] **UX-04**: Keyboard navigation (Tab through inputs, Enter to advance)
- [ ] **UX-05**: Focus indicators (visible focus rings)
- [ ] **UX-06**: Live result preview (updates as inputs change)
- [ ] **UX-07**: Color + text redundancy for status (not color alone)
- [ ] **UX-08**: Reasonable defaults/placeholders for all inputs

### Export (EXPORT)

- [ ] **EXPORT-01**: Export shareable PNG image card
- [ ] **EXPORT-02**: PNG includes: title, idea name (if provided), verdict line
- [ ] **EXPORT-03**: PNG includes: key inputs summary
- [ ] **EXPORT-04**: PNG includes: mini chart (optional)

### Design (DESIGN)

- [ ] **DESIGN-01**: Datadog-inspired visual language (clean, modern, high-contrast)
- [ ] **DESIGN-02**: Subtle gradients, rounded cards, crisp typography
- [ ] **DESIGN-03**: Charts match UI styling (consistent font, spacing, tooltips)
- [ ] **DESIGN-04**: Restrained palette with one bright accent for CTAs
- [ ] **DESIGN-05**: Use Stitch MCP for design before implementation

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Collaboration

- **COLLAB-01**: Shareable URL with encoded state
- **COLLAB-02**: Copy results to clipboard

### Enhanced Features

- **ENH-01**: Interactive sliders synced with text inputs
- **ENH-02**: Save & resume with LocalStorage
- **ENH-03**: Comparison mode (side-by-side scenarios)
- **ENH-04**: Smart industry defaults

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts / authentication | Client-side only, no backend |
| Server-side computation | All math runs in browser |
| Mobile-optimized design | Desktop-first; mobile can be rough |
| Real-time collaboration | Would require backend |
| Multilingual support | English only for v1 |
| PDF export | PNG covers sharing needs |
| Advanced chart interactions (zoom, drill-down) | High complexity, low value for this use case |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WIZARD-01 | Phase 1 | Pending |
| WIZARD-02 | Phase 1 | Pending |
| WIZARD-03 | Phase 1 | Pending |
| WIZARD-04 | Phase 1 | Pending |
| WIZARD-05 | Phase 1 | Pending |
| WIZARD-06 | Phase 1 | Pending |
| WIZARD-07 | Phase 1 | Pending |
| BASIC-IN-01 | Phase 2 | Pending |
| BASIC-IN-02 | Phase 2 | Pending |
| BASIC-IN-03 | Phase 2 | Pending |
| BASIC-IN-04 | Phase 2 | Pending |
| BASIC-IN-05 | Phase 2 | Pending |
| BASIC-IN-06 | Phase 2 | Pending |
| BASIC-IN-07 | Phase 2 | Pending |
| BASIC-IN-08 | Phase 2 | Pending |
| BASIC-CALC-01 | Phase 3 | Pending |
| BASIC-CALC-02 | Phase 3 | Pending |
| BASIC-CALC-03 | Phase 3 | Pending |
| BASIC-CALC-04 | Phase 3 | Pending |
| BASIC-CALC-05 | Phase 3 | Pending |
| BASIC-CALC-06 | Phase 3 | Pending |
| BASIC-CALC-07 | Phase 3 | Pending |
| BASIC-CALC-08 | Phase 3 | Pending |
| BASIC-OUT-01 | Phase 4 | Pending |
| BASIC-OUT-02 | Phase 4 | Pending |
| BASIC-OUT-03 | Phase 4 | Pending |
| BASIC-OUT-04 | Phase 4 | Pending |
| BASIC-OUT-05 | Phase 4 | Pending |
| BASIC-OUT-06 | Phase 4 | Pending |
| BASIC-OUT-07 | Phase 4 | Pending |
| ADV-IN-01 | Phase 5 | Pending |
| ADV-IN-02 | Phase 5 | Pending |
| ADV-IN-03 | Phase 5 | Pending |
| ADV-IN-04 | Phase 5 | Pending |
| ADV-IN-05 | Phase 5 | Pending |
| ADV-IN-06 | Phase 5 | Pending |
| ADV-IN-07 | Phase 5 | Pending |
| ADV-IN-08 | Phase 5 | Pending |
| ADV-IN-09 | Phase 5 | Pending |
| ADV-IN-10 | Phase 5 | Pending |
| ADV-CALC-01 | Phase 5 | Pending |
| ADV-CALC-02 | Phase 5 | Pending |
| ADV-CALC-03 | Phase 5 | Pending |
| ADV-CALC-04 | Phase 5 | Pending |
| ADV-CALC-05 | Phase 5 | Pending |
| ADV-CALC-06 | Phase 5 | Pending |
| ADV-CALC-07 | Phase 5 | Pending |
| ADV-OUT-01 | Phase 5 | Pending |
| ADV-OUT-02 | Phase 5 | Pending |
| ADV-OUT-03 | Phase 5 | Pending |
| ADV-OUT-04 | Phase 5 | Pending |
| ADV-OUT-05 | Phase 5 | Pending |
| ADV-OUT-06 | Phase 5 | Pending |
| ADV-OUT-07 | Phase 5 | Pending |
| VIZ-01 | Phase 4 | Pending |
| VIZ-02 | Phase 4 | Pending |
| VIZ-03 | Phase 4 | Pending |
| VIZ-04 | Phase 4 | Pending |
| VIZ-05 | Phase 4 | Pending |
| VIZ-06 | Phase 4 | Pending |
| VIZ-07 | Phase 4 | Pending |
| VIZ-08 | Phase 4 | Pending |
| UX-01 | Phase 2 | Pending |
| UX-02 | Phase 2 | Pending |
| UX-03 | Phase 2 | Pending |
| UX-04 | Phase 2 | Pending |
| UX-05 | Phase 2 | Pending |
| UX-06 | Phase 3 | Pending |
| UX-07 | Phase 6 | Pending |
| UX-08 | Phase 2 | Pending |
| EXPORT-01 | Phase 6 | Pending |
| EXPORT-02 | Phase 6 | Pending |
| EXPORT-03 | Phase 6 | Pending |
| EXPORT-04 | Phase 6 | Pending |
| DESIGN-01 | Phase 1 | Pending |
| DESIGN-02 | Phase 1 | Pending |
| DESIGN-03 | Phase 4 | Pending |
| DESIGN-04 | Phase 5 | Pending |
| DESIGN-05 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 67 total
- Mapped to phases: 67
- Unmapped: 0

---
*Requirements defined: 2026-01-29*
*Last updated: 2026-01-29 after roadmap creation*
