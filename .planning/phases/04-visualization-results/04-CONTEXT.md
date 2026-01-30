# Phase 4: Visualization & Results - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Show the user their prior distribution as a live chart with threshold and regret visualization, and display the EVPI verdict with supporting explanation cards. Export functionality is a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Chart Design
- **Visualization type:** Smooth density curve (continuous PDF), not histogram bins
- **X-axis:** Lift % only (no dollar equivalents on axis)
- **Y-axis:** Hidden — users don't need to interpret probability density values
- **Color:** Accent purple (#7C3AED) with gradient fill under the curve, Datadog-style
- **Fill style:** Gradient from purple to transparent as area under the curve (not gradient stroke)

### Overlays & Annotations
- **Mean indicator:** Dot/marker on the curve at the mean position (no vertical line)
- **Zero reference:** No separate 0% reference line — threshold line serves this purpose when threshold is 0%
- **90% interval:** Shaded region between 5th and 95th percentile bounds
- **Threshold line:** Dashed vertical line at threshold position
- **Threshold tooltip:** Contextual label explaining the decision rule: "Ship if lift exceeds +X%"
- **Curve hover:** Show tooltip with lift value AND dollar equivalent: "+5% lift ≈ $25,000/year"

### Regret Shading
- Claude's discretion on prominence (subtle vs bold) and color choice

### Results Presentation
- **Primary verdict:** Verdict sentence as headline + EVPI optimism warning as context block below
- **Supporting cards:** Claude decides between stacked list or tabbed sections based on content density
- **Tone:** Educational AND conversational simultaneously — always friendly
- **Advanced mode CTA:** Subtle — link in the EVPI warning text: "For a more realistic estimate, try Advanced mode"
- **Chart location:** Integrated into the Uncertainty/Prior input section (not in results section)

### Claude's Discretion
- Regret shading prominence and color
- Supporting cards layout (stacked vs tabbed)
- Specific gradient implementation details
- Responsive behavior for chart on mobile

</decisions>

<specifics>
## Specific Ideas

- Datadog-inspired gradient aesthetic — clean, modern data visualization feel
- The threshold tooltip should explain the decision rule, not just show the value
- Chart lives in the prior section because it visualizes the user's uncertainty input, not the result
- Keep the friendly tone throughout — this is for non-technical PMs who might be intimidated by statistics

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-visualization-results*
*Context gathered: 2026-01-30*
