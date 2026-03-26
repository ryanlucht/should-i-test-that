# Phase 23: Homepage & Welcome Experience - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesign the WelcomePage with the Learning Bits mascot welcome dialogue, a new "Bubbly Pill" Frutiger Aero logo, dual start/skip entry paths into the calculator, and an updated footer. The calculator page itself is not modified (guide system already built in Phase 22).

</domain>

<decisions>
## Implementation Decisions

### Logo (HOME-02)
- **D-01:** Build the "Bubbly Pill" logo in CSS/HTML code (not a static image). Reference implementation in `/tmp/LogoMockup/code.html` extracted from `/Users/ryan.lucht/Downloads/LogoMockup.zip`.
- **D-02:** Logo uses Noto Sans (extrabold) for the title text. "Test" sits inside a glossy purple pill with Frutiger Aero glass effect (CSS gradient `#8b5cf6` -> `#7c3aed` -> `#6d28d9`, specular highlight via `::before`, bottom reflection via `::after`).
- **D-03:** Adopt the pill logo on the existing DRUIDS design system. Do NOT adopt the broader Frutiger Aero aesthetic (tonal purple surfaces, Plus Jakarta Sans, glassmorphism) beyond the logo itself. Homepage keeps DRUIDS tokens (Inter, `#7C3AED`, `bg-surface`).
- **D-04:** Add Noto Sans font import to index.html (weights 400, 700, 800) alongside existing Inter and Space Grotesk.

### Welcome Dialogue (HOME-01)
- **D-05:** Learning Bits welcome appears as a centered dialogue card on the homepage — avatar + typewriter text as the main focal point. Logo above, CTA buttons below.
- **D-06:** Welcome text (exact copy, verbatim):
  > "You have a new idea to try, or some code that needs to be deployed. Should you go through the effort of A/B testing it first? Don't answer that question with _vibes_! We can make that determination empirically, by calculating the actual dollar value of the information we'd gain with a test. All we have to do is define the stakes of the decision, and come up with a plausible range of possible outcomes. I'll walk you through the entire calculation. Ready to start?"
- **D-07:** Welcome dialogue uses the same RPG dialog box styling from Phase 22 (`.rpg-dialog-box`, `.lb-font`, avatar, bouncing dots) but rendered inline/centered rather than fixed bottom-right.
- **D-08:** Typewriter animation uses the existing `useTypewriter` hook at 12ms/char. With `prefers-reduced-motion`, full text shows immediately.

### Start/Skip Flow (HOME-03)
- **D-09:** CTA buttons are always visible from the start — users can click anytime without waiting for the typewriter to finish.
- **D-10:** Primary CTA: big purple button reading **"Start (with Guidance)"**. Clicking navigates to calculator with `guideEnabled: true` (default behavior).
- **D-11:** Secondary CTA: smaller text link below the button reading **"I know what I'm doing, just let me use the calculator without Bits' guidance"**. Clicking sets `guideEnabled: false` and navigates to calculator.
- **D-12:** Both paths use the existing `setGuideEnabled()` from the Zustand store before navigation.

### Footer (HOME-04)
- **D-13:** Footer credits Ryan Lucht and lists "frontier Claude Opus, GPT-Pro, Codex, and Gemini Pro models". Remove any Hubbard attribution. Claude's discretion on exact wording and whether to extract a shared Footer component.

### Claude's Discretion
- Homepage layout spacing, padding, and responsive breakpoints
- Whether to extract a shared Footer component or keep inline
- Animation/transition details for page entry (fade-in, etc.)
- Whether the welcome dialogue card needs a close/dismiss button (probably not — the CTA buttons serve that purpose)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Logo Design
- `/tmp/LogoMockup/code.html` -- Full CSS/HTML implementation of the Bubbly Pill logo (extracted from `/Users/ryan.lucht/Downloads/LogoMockup.zip`)
- `/tmp/LogoMockup/DESIGN.md` -- Frutiger Aero design system document (reference only for logo styling, NOT for broader homepage design)
- `/tmp/LogoMockup/screen.png` -- Visual reference screenshot of the logo

### Phase 22 Guide System (reuse)
- `.planning/phases/22-learning-bits-guide-infrastructure/22-CONTEXT.md` -- Decisions for the guide system this phase reuses
- `.planning/phases/22-learning-bits-guide-infrastructure/22-UI-SPEC.md` -- UI design contract for guide components

### Project Design Tokens
- `.planning/phases/01-foundation-wizard-infrastructure/designs/welcome-screen.md` -- Original welcome screen design (superseded by this phase's decisions, but useful for spacing/layout reference)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/guide/LearningBitsOverlay.tsx` -- RPG dialog box with typewriter, avatar, bouncing dots. Reuse the rendering pattern but inline/centered instead of fixed bottom-right.
- `src/components/guide/LearningBitsAvatar.tsx` -- 64px circular mascot avatar
- `src/components/guide/BouncingDots.tsx` -- Three-dot animated ellipsis
- `src/hooks/useTypewriter.ts` -- Character-by-character text reveal at 12ms with reduced-motion support
- `src/stores/wizardStore.ts` -- `guideEnabled` boolean + `setGuideEnabled()` for start/skip flow

### Established Patterns
- State-based routing in `src/App.tsx` (`currentPage: 'welcome' | 'calculator'`)
- DRUIDS design tokens in `src/index.css` (purple primary, Inter font, bg-surface)
- RPG dialog box CSS classes (`.rpg-dialog-box`, `.lb-font`, `.animate-dot-bounce`)

### Integration Points
- `src/pages/WelcomePage.tsx` -- Complete rewrite target. Currently has `onGetStarted` callback prop.
- `src/App.tsx` -- May need to pass `setGuideEnabled` or handle the skip-guidance path
- `index.html` -- Add Noto Sans font import

</code_context>

<specifics>
## Specific Ideas

- The welcome text uses `_vibes_` with underscore-italic markdown — the existing `renderDialogueText()` helper in LearningBitsOverlay already handles `_word_` -> `<em>` conversion. Reuse this.
- The skip guidance link copy is intentionally casual/humorous: "I know what I'm doing, just let me use the calculator without Bits' guidance"

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 23-homepage-welcome-experience*
*Context gathered: 2026-03-26*
