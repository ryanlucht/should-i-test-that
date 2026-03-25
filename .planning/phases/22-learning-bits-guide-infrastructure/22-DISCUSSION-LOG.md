# Phase 22: Learning Bits Guide Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 22-learning-bits-guide-infrastructure
**Areas discussed:** Dialogue overlay design, Broader UI changes scope, Toggle placement & behavior, Content finality & triggers

---

## Dialogue Overlay Design

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom-right floating | Like a chat widget / Intercom-style. Stays fixed in the corner, doesn't interfere with form content. | ✓ |
| Top sidebar / right rail | Persistent column alongside the calculator. More prominent, but reduces horizontal space. | |
| Inline below progress indicator | Sits between the progress bar and the form content. Integrated into page flow. | |
| You decide | Claude picks the best approach given layout constraints. | |

**User's choice:** Bottom-right floating. Big enough to be legible, not so big that it meaningfully obfuscates calculator content.

**Follow-up — Visual treatment:**

| Option | Description | Selected |
|--------|-------------|----------|
| Speech bubble with avatar outside | Small circular avatar to the left/above a speech-bubble container. Conversational. | |
| Card with avatar inset | Rounded card with avatar tucked into top-left, text alongside. Integrated with design system. | ✓ |
| Minimal floating pill | Compact pill shape with tiny avatar, text beside it. Least intrusive. | |

**User's choice:** Card with avatar and name tucked inside. Provided design mockup zip (`LearningBitsMockup.zip`) with HTML prototype, screenshots, and mascot avatar asset.

**Follow-up — Font:**
- Mockup used Space Grotesk; app uses Inter. User confirmed: Space Grotesk intentional for Learning Bits dialogue (distinct character voice).

**Notes:** User also raised that the sticky header should be consolidated into a single row with logo + progress indicator now that mode toggle is gone — deferred to Phase 25.

---

## Broader UI Changes Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Bundle with Phase 22 | Accordion collapses and highlight pulse are tightly coupled to dialogue triggers (Messages 3, 7). Build together for end-to-end trigger accuracy. | ✓ |
| Defer to Phase 25 (Polish) | Keep Phase 22 focused on dialogue infrastructure only. Triggers reference section IDs that get accordion treatment later. | |

**User's choice:** Bundle with Phase 22. Agreed the accordion interactions are trigger points for specific dialogue messages and need to be built together.

**Notes:** Three specific UI changes bundled: (1) prior shape accordion, (2) implied lift highlight pulse, (3) advanced timing accordion. All specified in dialogue draft.

---

## Toggle Placement & Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Small floating icon button | After dismissal, avatar shrinks to small circular button in bottom-right. Click to reopen. Familiar chat widget pattern. | ✓ |
| Header/progress bar toggle | Toggle switch or icon in sticky header area. Always visible. | |
| No re-open in session | Once dismissed, gone for the session. Next session starts fresh. Simplest. | |

**User's choice:** Small floating icon button.

**Notes:** X-to-close = dismiss for session (sessionStorage). After dismissal, dialogue collapses to small circular avatar button in same position. Click to reopen. New sessions default to guidance ON.

---

## Content Finality & Triggers

| Option | Description | Selected |
|--------|-------------|----------|
| Content is final — build with actual text | Wire up the 7 dialogue messages with real copy now. | ✓ |
| Content is draft — use placeholders | Build infrastructure with placeholder text, swap later. | |

**User's choice:** Content is final/locked, as are trigger conditions. No discussion needed.

**Notes:** This resolves the PM content blocker flagged in ROADMAP.md. All 7 messages and their trigger conditions from `dialogue_draft1.txt` are locked.

---

## Claude's Discretion

- Typewriter animation speed and character reveal pacing
- Exact dimensions of collapsed avatar button
- Transition animations between dialogue messages
- Z-index layering relative to sticky header/progress indicator
- prefers-reduced-motion implementation
- Screen reader support approach

## Deferred Ideas

- **Consolidate sticky header into single row** — Combine logo + progress indicator, remove separate header bar (~56px savings). Target: Phase 25 (Polish).
