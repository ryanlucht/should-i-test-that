# Phase 23: Homepage & Welcome Experience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 23-homepage-welcome-experience
**Areas discussed:** Logo design & visual hierarchy, Welcome dialogue content & flow, Start/skip interaction design

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Welcome dialogue content & flow | What does Learning Bits say, typewriter behavior, auto-start vs wait | Yes |
| Logo design & visual hierarchy | Bubbly Pill mockup, visual prominence, overall layout | Yes |
| Start/skip interaction design | How the two entry paths work, CTA visibility | Yes |
| Footer content & attribution | Exact wording, shared component | No |

---

## Logo Design & Visual Hierarchy

### Q1: Logo asset source

| Option | Description | Selected |
|--------|-------------|----------|
| I have a mockup/asset | Provide PNG/SVG or reference image | |
| Build it in code (Recommended) | CSS gradient + border-radius pill shape | Partial |
| Use Stitch MCP to design it | Generate via Stitch before implementation | |

**User's choice:** Build it in code, with mockup reference at `/Users/ryan.lucht/Downloads/LogoMockup.zip`
**Notes:** Mockup contains code.html (full CSS implementation), screen.png (visual reference), and DESIGN.md (Frutiger Aero design system)

### Q2: Design scope

| Option | Description | Selected |
|--------|-------------|----------|
| Pill logo only on existing design (Recommended) | Keep DRUIDS tokens, just add glossy pill + Noto Sans | Yes |
| Full Frutiger Aero homepage | Adopt tonal purple surfaces, Plus Jakarta Sans, glassmorphism | |

**User's choice:** Pill logo only on existing design
**Notes:** Avoids design system split between homepage and calculator

---

## Welcome Dialogue Content & Flow

### Q1: Dialogue placement

| Option | Description | Selected |
|--------|-------------|----------|
| Inline below logo (Recommended) | Part of page flow, below logo, above CTAs | |
| Fixed overlay (same as calculator) | Reuse bottom-right RPG dialog | |
| Centered dialogue card | Large centered card as main focal point | Yes |

**User's choice:** Centered dialogue card
**Notes:** Logo above, CTA below, dialogue card is the main focal point

### Q2: Welcome message content

| Option | Description | Selected |
|--------|-------------|----------|
| I'll write the copy | User provides exact text | Yes |
| Claude's discretion | Draft something for review | |

**User's choice:** Provided exact copy (verbatim welcome message about A/B testing value, ending with "Ready to start?")

### Q3: CTA timing

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible (Recommended) | Buttons visible from start, no waiting | Yes |
| Appear after typewriter completes | Buttons fade in after animation finishes | |

**User's choice:** Always visible
**Notes:** Less friction — users can click anytime

---

## Start/Skip Interaction Design

### Q1: CTA design

| Option | Description | Selected |
|--------|-------------|----------|
| Primary button + text link | Big purple button + smaller text link below | Partial |
| Two buttons side by side | Equal-weight primary + secondary buttons | |
| Single button + toggle | One button with checkbox/toggle | |

**User's choice:** Primary button + text link, with specific copy:
- Button: "Start (with Guidance)"
- Link: "I know what I'm doing, just let me use the calculator without Bits' guidance"

---

## Claude's Discretion

- Homepage layout spacing, padding, responsive breakpoints
- Footer exact wording and component extraction
- Animation/transition details
- Welcome dialogue card dismiss behavior

## Deferred Ideas

None — discussion stayed within phase scope
