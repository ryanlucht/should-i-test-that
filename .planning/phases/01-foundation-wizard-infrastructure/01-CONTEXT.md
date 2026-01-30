# Phase 1: Foundation & Wizard Infrastructure - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up project scaffolding (Vite + React 19 + TypeScript + Tailwind + shadcn/ui), establish the design system via Stitch MCP, and implement wizard navigation mechanics. Users can navigate through the calculator with visible progress, mode selection, and data persistence within session.

**SPEC.md Reference:** Section 11 (UX flow), Section 12 (Design requirements)

</domain>

<decisions>
## Implementation Decisions

### Page Structure
- **Two-page architecture:** Welcome screen (mode selection) → Calculator page (all sections visible)
- **Single scrollable page for calculator:** All sections visible on one scrollable page (not discrete hidden steps)
- **Future sections visible but dramatically disabled:** Heavy muting/fading on sections user hasn't reached yet — shows what's ahead without overwhelming
- **Rationale:** Prevents user anxiety about "how much work is ahead" — they can preview all required inputs upfront

### Progress Indicator
- **Style:** Sticky mini-indicator (small numbered dots or circles) that follows scroll
- **Position:** Sticky at top or side, minimal footprint since sections themselves show progress via styling
- **Completed steps:** Checkmark replaces number in the indicator
- **Mobile adaptation:** Keep horizontal layout with abbreviated/smaller labels (shrink, don't hide)

### Navigation
- **Button labels:** Generic "Back" / "Next" on all sections
- **Validation timing:** Only on Next click (no inline validation on blur)
- **Keyboard:** Tab through inputs, Enter advances to next section
- **"Can't skip ahead":** Future sections are visible but inputs are disabled until user completes prior section

### Leave Warning
- **Decision:** Skip entirely (WIZARD-06 not implemented)
- **Rationale:** It's just a calculator — if user closes tab, they re-enter values. No account system, no saved state to protect.

### Mode Toggle
- **Welcome screen:** Two side-by-side cards for "Basic Mode" and "Advanced Mode" with brief descriptions; click to select and proceed to calculator
- **Calculator page header:** Segmented buttons [Basic] [Advanced] always visible — user can switch modes anytime
- **Results section (Basic mode):** Subtle prompt/link to "Try Advanced mode for more precision"
- **Mode switch behavior:** Preserve shared inputs (CR, traffic, value carry over); Advanced-only fields start empty

### Claude's Discretion
- Exact design system tokens (colors, spacing, typography) — will be established via Stitch MCP
- Loading states and transitions between sections
- Exact mini-indicator positioning and animation
- Welcome screen card content/copy beyond mode descriptions

</decisions>

<specifics>
## Specific Ideas

- The dramatic disabled state for future sections is key — should clearly communicate "not yet" without being ugly or inaccessible
- Welcome screen cards should help users self-select: Basic = "Quick estimate, fewer inputs" vs Advanced = "Precise value, more inputs"
- Mini-indicator should feel like it belongs to Datadog's design language — clean, modern, high-contrast

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-wizard-infrastructure*
*Context gathered: 2026-01-29*
