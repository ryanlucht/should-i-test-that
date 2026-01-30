# Phase 6: Export & Polish - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can export results as shareable PNG and experience polished, accessible interface. Includes accessibility audit to WCAG 2.1 AA, keyboard navigation verification, and visual design polish. Does not include new features or calculations.

</domain>

<decisions>
## Implementation Decisions

### PNG Export Content
- Include: verdict headline, key inputs summary, AND mini distribution chart
- Square format: 1080x1080 pixels
- User can add custom title/idea name before exporting (editable field)
- No branding for v1 (deferred to later version)

### Export Trigger & Flow
- Claude's discretion on button placement and preview flow
- Claude decides filename conventions

### Accessibility Audit
- Target: WCAG 2.1 AA conformance
- Claude's discretion on specific priorities within AA scope
- Claude decides whether to add ARIA live regions for dynamic result updates
- Claude decides on automated accessibility tooling (axe-core or similar)

### Keyboard Navigation
- Keep current Enter key behavior (advances to next section, except in textareas)
- No special Escape key behavior (standard browser behavior only)
- No skip link — sequential Tab navigation only
- Claude decides Tab order through sections vs. interactive elements only

### Design Polish
- Current design inconsistency: purple accent (#7C3AED) only appears in chart, buttons/accents are blue
- Need Stitch MCP design exploration BEFORE implementation
- Generate 3 design options:
  1. Current spec style (apply purple consistently)
  2. "Datadog + Y2K" — bolder, more distinctive
  3. Minimal/clean — whitespace-forward, monochrome accents
- Scope: component-level polish (buttons, cards, inputs, colors) — keep overall layout
- Explore inline labels with compact inputs (currently full-width for 1-10 char fields)

### Claude's Discretion
- Export button placement and preview UX
- Filename conventions for downloaded PNG
- Tab order implementation
- ARIA live region decisions
- Automated accessibility tooling choice
- Loading states and error handling

</decisions>

<specifics>
## Specific Ideas

- "I'm happy with the layout and structure of the page, everything is clear, but the design is a little plain"
- Want to see design mockups from Stitch BEFORE committing to implementation approach
- Use Stitch's different models (like Nano Banana Pro) for higher-fidelity exploration
- Input fields are too wide for their content — explore inline/compact layouts

</specifics>

<deferred>
## Deferred Ideas

- PNG branding/attribution — add "Created with Should I Test That?" footer in future version

</deferred>

---

*Phase: 06-export-polish*
*Context gathered: 2026-01-30*
