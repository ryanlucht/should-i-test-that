# Phase 22: Learning Bits Guide Infrastructure - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Learning Bits guided dialogue overlay component, typewriter animation hook, section-aware message state, on/off toggle with sessionStorage persistence, and the broader UI changes (accordion collapses, highlight pulse) that serve as dialogue trigger points. Wire up final dialogue content (7 messages with specific trigger conditions). Requirements: GUIDE-01, GUIDE-02, GUIDE-03.

</domain>

<decisions>
## Implementation Decisions

### Dialogue Overlay Design
- **D-01:** Bottom-right floating card, fixed position. RPG dialog box style — 3px solid purple (#7C3AED) border with offset shadow (6px 6px 0 rgba(124, 58, 237, 0.2)). White background, max-width ~448px (max-w-md), rounded-lg.
- **D-02:** 64px circular avatar (w-16 h-16) with 2px purple border, purple background, showing the Learning Bits dog mascot image (`Learning Bits.png` from mockup zip).
- **D-03:** "Learning Bits" name displayed in bold purple above dialogue text. Font: Space Grotesk for the dialogue box only — rest of the app stays on Inter.
- **D-04:** Animated bouncing dots (ellipsis) after text completes as the "waiting for input" indicator. Three dots with staggered animation delays (0s, 0.2s, 0.4s), 1.4s cycle.
- **D-05:** Close button (X icon) in top-right corner of the dialogue card.

### Toggle Behavior
- **D-06:** X-to-close dismisses the dialogue for the current session. State persisted in sessionStorage via Zustand. New sessions default to guidance ON.
- **D-07:** After dismissal, the dialogue box collapses to a small circular Learning Bits avatar button in the same bottom-right position. Clicking the avatar reopens the full dialogue box.

### Broader UI Changes (Bundled)
- **D-08:** Prior shape selection ("What shape describes your uncertainty?") collapsed into an accordion, default closed. Toggle link text: "I want to define the shape of the prior distribution (advanced)". Affects UncertaintyPriorForm/PriorShapeForm.
- **D-09:** When prior is not centered around 0% (implied expected lift exceeds +1% or -1%), add a rectangular outline/highlight pulse around the "Implied expected lift: X%" display. Pulse animates once on trigger, does not repeat. Removed when inputs return closer to 0%.
- **D-10:** "Advanced timing (optional)" section collapsed into an accordion, default closed. Toggle link text: "I want to consider time lag of metrics or decision-making". Affects ExperimentDesignForm.

### Content & Triggers (Locked)
- **D-11:** All 7 dialogue messages are final copy — build with actual text, not placeholders. The PM content blocker from the roadmap is resolved.
- **D-12:** Trigger conditions are locked as specified in the dialogue draft:
  - Message 1: Initial page load, stays until Baseline Metrics complete
  - Message 2: Focus on Uncertainty (Prior) section
  - Message 3: Click to open prior shape accordion (re-triggerable on shape option click)
  - Message 4: Focus in lower/upper bound input boxes in Uncertainty section
  - Message 5: Shipping Threshold section comes into focus
  - Message 6: Experiment Design section focus or input focus
  - Message 7: Open Advanced Timing accordion or focus inside its inputs

### Claude's Discretion
- Typewriter animation speed and character reveal pacing
- Exact dimensions of the collapsed avatar button
- Transition animations between dialogue messages (fade, instant, etc.)
- Z-index layering relative to existing sticky elements
- Implementation of prefers-reduced-motion (show full text immediately per GUIDE-01/A11Y-02)
- Screen reader support approach (aria-label + sr-only for typewriter text)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Mockups
- `/Users/ryan.lucht/Downloads/LearningBitsMockup.zip` — Contains mockup HTML (`code.html`), full-page screenshot (`screen.png`), cropped dialogue component (`cropped screen.png`), and Learning Bits avatar asset (`Learning Bits.png`)

### Dialogue Content
- `/Users/ryan.lucht/Downloads/dialogue_draft1.txt` — Final dialogue text (7 messages) with trigger conditions and broader UI change specifications

### Project Specs
- `.planning/REQUIREMENTS.md` — GUIDE-01, GUIDE-02, GUIDE-03 requirement definitions
- `.planning/ROADMAP.md` — Phase 22 success criteria and dependency chain

### Existing Code (Integration Points)
- `src/stores/wizardStore.ts` — Zustand store with sessionStorage persistence pattern (extend for guide state)
- `src/hooks/useScrollSpy.ts` — Section visibility tracking via IntersectionObserver (reuse for section-aware triggers)
- `src/components/wizard/StickyProgressIndicator.tsx` — Sticky positioning and z-index reference
- `src/components/wizard/SectionWrapper.tsx` — Section container pattern
- `src/pages/CalculatorPage.tsx` — SECTIONS config, section refs, and form component orchestration
- `src/components/forms/UncertaintyPriorForm.tsx` — Target for prior shape accordion (D-08)
- `src/components/forms/PriorShapeForm.tsx` — Prior shape selection component (D-08)
- `src/components/forms/ExperimentDesignForm.tsx` — Target for advanced timing accordion (D-10)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Zustand store pattern** (`wizardStore.ts`): sessionStorage persistence via `persist` middleware with `partialize()` — same pattern for guide on/off state
- **useScrollSpy hook**: IntersectionObserver-based section tracking with 128px offset — can drive section-aware message triggers
- **Card primitives** (`src/components/ui/card.tsx`): Card/CardHeader/CardContent — base for dialogue box styling
- **tw-animate-css** (v1.4.0): Already imported, provides keyframe animations for typewriter and dot-bounce effects
- **Lucide React icons**: X icon for close button available from existing dependency

### Established Patterns
- **Progressive disclosure**: SectionWrapper uses fieldset disabled + opacity — accordion pattern is a natural extension
- **Sticky positioning**: Header at top-0, progress indicator at top-14 with z-100 — dialogue box z-index must layer above content but consider relationship to these
- **Form validation**: useRef-based `.current.validate()` pattern — accordion contents still need validation when expanded
- **Analytics tracking**: `trackStepCompleted(sectionId, index)` in `src/lib/analytics.ts` — may want guide interaction events

### Integration Points
- **CalculatorPage.tsx**: Main orchestrator where the dialogue overlay will be rendered and section refs exist
- **wizardStore.ts**: Extend with `guideEnabled` boolean and `currentMessage` state
- **useScrollSpy**: Section change events can trigger message updates
- **index.css**: Add Space Grotesk import, RPG dialog box styles, dot-bounce animation keyframes

</code_context>

<specifics>
## Specific Ideas

- **RPG dialog box aesthetic**: Inspired by Brain Age — 3px solid border with offset shadow gives a retro-game dialogue feel while staying modern. See mockup `code.html` for exact CSS.
- **Learning Bits mascot**: White dog with glasses and pencil behind ear, sitting at laptop with lightbulb/gear icon. Purple background. Asset provided as `Learning Bits.png`.
- **Space Grotesk font**: Only for the dialogue box text — creates a distinct "character voice" separate from the app's Inter font.
- **Bouncing dots**: Three-dot ellipsis with staggered bounce animation — signals "I'm here, waiting for you to continue" after typewriter text completes.

</specifics>

<deferred>
## Deferred Ideas

- **Consolidate sticky header into single row** — Remove the separate 56px header bar; combine logo + progress indicator into one row. Saves vertical space now that Basic/Advanced mode toggle is gone. Target: Phase 25 (Polish).

</deferred>

---

*Phase: 22-learning-bits-guide-infrastructure*
*Context gathered: 2026-03-25*
