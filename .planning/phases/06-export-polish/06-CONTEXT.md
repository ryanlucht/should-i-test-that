# Phase 6: Export & Polish - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can export results as shareable PNG and experience polished, accessible interface. Includes accessibility audit to WCAG 2.1 AA, keyboard navigation verification, and design consistency fixes. Does not include new features, calculations, or major redesign work.

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

### Design Consistency
- Fix inconsistency: purple accent (#7C3AED) only appears in chart, buttons/accents are currently blue
- Apply purple accent consistently across: buttons, focus rings, selected states, links, toggles
- Keep current layout and structure — no major redesign
- Reference existing design specs in `.planning/phases/01-foundation-wizard-infrastructure/designs/`

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

- User is happy with layout and structure — just needs color consistency
- Purple (#7C3AED) should be the primary accent everywhere, not blue

</specifics>

<deferred>
## Deferred Ideas

- PNG branding/attribution — add "Created with Should I Test That?" footer in future version
- Full design exploration via Stitch MCP — 3 design directions (current spec, Datadog+Y2K, minimal/clean)
- Compact inline input layouts — input fields too wide for content
- Component-level visual polish — "design is a little plain"

</deferred>

---

*Phase: 06-export-polish*
*Context gathered: 2026-01-30*
*Updated: 2026-01-30 — Scoped down design polish to consistency only, deferred redesign exploration*
