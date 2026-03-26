---
phase: 23-homepage-welcome-experience
plan: 01
subsystem: ui
tags: [react, tailwind, css, google-fonts, frutiger-aero, typewriter]

# Dependency graph
requires:
  - phase: 22-learning-bits-guide-infrastructure
    provides: LearningBitsAvatar, BouncingDots, useTypewriter, rpg-dialog-box CSS, lb-font CSS
provides:
  - BubblyPillLogo component with Frutiger Aero glass pill effect
  - Redesigned WelcomePage with logo, typewriter dialogue, dual CTAs, footer
  - Noto Sans font loaded in index.html
  - frutiger-glass / logo-font / text-glow / pill-shadow CSS classes in index.css
  - New WelcomePage props: onStartWithGuidance, onSkipGuidance
affects:
  - 23-02 (App.tsx wiring must pass onStartWithGuidance/onSkipGuidance instead of onGetStarted)

# Tech tracking
tech-stack:
  added: [Noto Sans (Google Fonts)]
  patterns:
    - Frutiger Aero glass effect via CSS gradients + ::before/::after pseudo-elements
    - renderDialogueText helper for _word_ → <em> conversion (duplicated from LearningBitsOverlay — candidate for shared util in future)

key-files:
  created:
    - src/components/BubblyPillLogo.tsx
    - .planning/phases/23-homepage-welcome-experience/23-01-SUMMARY.md
  modified:
    - index.html
    - src/index.css
    - src/pages/WelcomePage.tsx

key-decisions:
  - "WelcomePage props changed from onGetStarted to onStartWithGuidance + onSkipGuidance — App.tsx wiring deferred to Plan 02"
  - "renderDialogueText kept as local function in WelcomePage (not extracted to shared util) — per executor discretion, plan said executor's discretion"
  - "Skip CTA uses plain <button> styled as text link, not Button component — intentional per D-11"
  - "CTAs always visible from page load — no typewriter completion gate per D-09"

patterns-established:
  - "BubblyPillLogo: pure presentational CSS/HTML logo — no animations, no state, no hover effects"
  - "Frutiger Aero glass: .frutiger-glass + .pill-shadow wrapper pattern for depth effect"
  - "Inline RPG dialog box: same rpg-dialog-box class as LearningBitsOverlay but without position: fixed"

requirements-completed: [HOME-01, HOME-02, HOME-03, HOME-04]

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 23 Plan 01: Homepage & Welcome Experience Summary

**Bubbly Pill Frutiger Aero logo, Learning Bits typewriter welcome dialogue, and dual start/skip CTA flow built as a complete homepage redesign**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-26T14:55:12Z
- **Completed:** 2026-03-26T14:58:20Z
- **Tasks:** 3 of 3
- **Files modified:** 4

## Accomplishments

- Added Noto Sans font (wt 400/700/800) and 7 Frutiger Aero CSS utility classes to the design system
- Created BubblyPillLogo component rendering "Should I [Test] That?" with a glossy purple CSS pill around "Test"
- Rewrote WelcomePage with logo, centered RPG dialogue card (typewriter + bouncing dots), "Start (with Guidance)" primary button, skip text link, and updated footer

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Noto Sans font and Frutiger Aero glass CSS** - `47aa098` (feat)
2. **Task 2: Create BubblyPillLogo component** - `ac67abd` (feat)
3. **Task 3: Rewrite WelcomePage with dialogue, CTAs, and footer** - `3444f33` (feat)

## Files Created/Modified

- `index.html` - Added Noto Sans Google Fonts link alongside Inter and Space Grotesk
- `src/index.css` - Added .frutiger-glass, ::before, ::after, .logo-font, .text-glow, .pill-shadow
- `src/components/BubblyPillLogo.tsx` - New: Frutiger Aero pill logo with "Should I [Test] That?"
- `src/pages/WelcomePage.tsx` - Complete rewrite with new props, dialogue card, dual CTAs, footer

## Decisions Made

- WelcomePage props changed from `onGetStarted` to `onStartWithGuidance` + `onSkipGuidance` — App.tsx wiring is deferred to Plan 02 (as planned)
- `renderDialogueText` kept as a local function in WelcomePage rather than extracted to a shared util — plan explicitly left this to executor's discretion
- Skip CTA uses a plain `<button>` element styled as a text link (not the `Button` component) per D-11
- CTAs are always visible from page load — no typewriter completion gate per D-09

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

`App.test.tsx` now has additional failures because `WelcomePage`'s props changed from `onGetStarted` to `onStartWithGuidance`/`onSkipGuidance`. This is explicitly expected per the plan ("App.test.tsx will likely fail due to WelcomePage prop changes — that is expected and fixed in Plan 02"). Pre-existing failures in `ResultsSection.test.tsx` and `useEVPICalculations.test.ts` are unrelated to this plan's changes.

## Known Stubs

None - all components are wired to real data (useTypewriter hook, existing guide components).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- BubblyPillLogo and WelcomePage are fully built and ready for Plan 02 wiring
- Plan 02 must update `App.tsx` to pass `onStartWithGuidance` and `onSkipGuidance` callbacks and call `setGuideEnabled()` appropriately
- TypeScript compiles cleanly — App.tsx wiring failure is a test-only issue, not a type error

## Self-Check: PASSED

All files created/modified confirmed on disk. All 3 task commits verified in git log.

---
*Phase: 23-homepage-welcome-experience*
*Completed: 2026-03-26*
