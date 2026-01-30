# Phase 5: Advanced Mode - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable users to calculate realistic test value using EVSI (Expected Value of Sample Information) and Cost of Delay. Users can select alternative prior shapes beyond Normal and configure experiment design parameters. The verdict formula changes from EVPI to (EVSI - CoD).

**Not in scope:** Test Costs (hard costs, labor) — deferred to future phase.

</domain>

<decisions>
## Implementation Decisions

### Prior shape UX
- Radio cards for shape selection (Normal, Student-t, Uniform) — similar to threshold scenario cards
- No mini distribution preview in cards — main chart updates live on selection
- When switching Basic → Advanced: preserve existing 90% interval, default to Normal shape
- **Student-t:** Preset buttons for df values (e.g., df=3 "Heavy tails", df=5 "Moderate", df=10 "Near-normal")
- **Uniform:** Use same 90% interval input as Basic mode, interpret bounds as uniform distribution edges

### Experiment design inputs
- All fields in single section/card with clear labels
- **Defaults:**
  - 50/50 split (pre-filled)
  - 100% eligibility (pre-filled)
  - 0-day conversion latency (pre-filled)
  - Duration: blank — user must enter
- **Daily traffic:** Auto-derive from annual visitors (÷365), but editable if traffic varies
- **Conversion latency:** Optional field, default 0, free numeric input for days — visually de-emphasized (lower hierarchy than core fields)

### Cost of Delay
- Test Costs section removed from Phase 5 scope
- CoD auto-calculated from: duration × daily opportunity cost (derived from K and prior mean)
- Shown as derived value, with expandable breakdown on click
- Formula breakdown when expanded: "X days × $Y/day = $Z Cost of Delay"

### Results display
- **Verdict wording:** "If you can test it for **up to** $[EVSI - CoD], test it"
  - Changed from Basic mode's "less than" to "up to" — emphasizes EVSI as acceptable ceiling, not just maximum
- **EVSI only:** Don't show EVPI comparison in Advanced mode — EVSI is the relevant value
- **Chart:** Same structure as Basic mode, distribution shape reflects selected prior (Normal/Student-t/Uniform)
- **Supporting cards:** Adapt existing (prior, threshold, probability) + add new Cost of Delay card

### Claude's Discretion
- Exact df preset values and labels for Student-t
- Specific visual de-emphasis approach for conversion latency field
- CoD breakdown card layout and expand/collapse interaction
- Loading state during Monte Carlo EVSI calculation (<2s target)

</decisions>

<specifics>
## Specific Ideas

- Keep Advanced mode parallel to Basic in structure — same wizard flow, just more nuanced calculations
- Verdict should feel consistent between modes, just with different underlying math
- "Up to" wording is important — distinguishes EVSI (acceptable cost) from EVPI (theoretical maximum)

</specifics>

<deferred>
## Deferred Ideas

- **Test Costs inputs (hard costs, labor hours/rate)** — Would enable full Net Value = max(0, EVSI - CoD - Test Costs) calculation and potentially declarative "Test / Don't Test" verdict. Intentionally removed from v1 to keep Advanced mode parallel to Basic.

</deferred>

---

*Phase: 05-advanced-mode*
*Context gathered: 2026-01-30*
