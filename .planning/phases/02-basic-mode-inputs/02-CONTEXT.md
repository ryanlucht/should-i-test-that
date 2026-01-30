# Phase 2: Basic Mode Inputs - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can enter all Basic mode inputs with clear guidance and validation. This includes:
- Baseline conversion rate (percentage)
- Annual visitors with editable unit label
- Value per conversion (dollar formatting)
- Prior selection (default vs custom 90% interval)
- Shipping threshold scenario and value

This phase delivers input forms only. Calculation engine, visualization, and results display are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Input Formatting & Feedback
- Validation errors appear on blur only (not while typing)
- Error display: red border + error message text below the field
- Continue button always enabled — clicking with invalid inputs shows errors (prevents "why is this disabled?" confusion)
- Claude's discretion: formatting timing (on blur vs live) per field type

### Help & Guidance
- Info icon (i) with tooltip for unfamiliar terms (prior, 90% interval, etc.)
- Tooltips appear on hover/click of info icon
- Placeholder examples with realistic values (e.g., "2.5%", "$10,000")
- No walkthrough or guided tour — users learn from labels, placeholders, and tooltips
- Claude's discretion: tooltip depth varies by concept complexity

### Prior Selection UX
- Custom interval inputs always visible (not hidden behind toggle/tabs)
- Default prior values pre-populated in the interval fields
- "Use Default Prior" button to reset to defaults
- Two separate input fields: low bound and high bound
- Show implied mean (calculated from low + high / 2)
- When mean ≠ 0: explain that user is encoding a prediction (slightly/very/extremely likely to win or lose based on distance from zero)
- Asymmetric intervals allowed — highlight that this implies a directional prediction

### Threshold Scenario Flow
- Horizontal radio cards for scenario selection (not dropdown)
- Default pre-selected: "Ship if any lift" (T=0)
- When scenario requires a threshold value: input embedded inline within the selected card
- Toggle to switch between $ value and lift % formats

### Claude's Discretion
- Exact formatting timing per field type (blur vs live)
- Tooltip content depth based on concept complexity
- Exact wording for win/lose likelihood interpretations
- Visual design of radio cards and inline inputs

</decisions>

<specifics>
## Specific Ideas

- Prior interval should feel like a core input, not an advanced option — always visible
- The implied mean interpretation helps users understand they're making a prediction, not just entering numbers
- Threshold inline input keeps context tight — user doesn't lose sight of which scenario they selected

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-basic-mode-inputs*
*Context gathered: 2026-01-29*
