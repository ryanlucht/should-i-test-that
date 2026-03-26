---
phase: 23-homepage-welcome-experience
verified: 2026-03-26T20:00:00Z
status: human_needed
score: 4/4 must-haves verified
human_verification:
  - test: "Visual check of Bubbly Pill logo appearance"
    expected: "Logo shows 'Should I' and 'That?' in purple Noto Sans extrabold, 'Test' inside a glossy purple pill with visible specular highlight, bottom reflection glow, and drop shadow depth effect"
    why_human: "CSS glass effect rendering cannot be verified programmatically"
  - test: "Typewriter animation in dialogue card"
    expected: "Welcome text reveals character-by-character at ~12ms speed. After completion, three bouncing dots appear. The word 'vibes' renders in italics."
    why_human: "Animation timing and visual italic rendering require visual browser inspection"
  - test: "CTAs always visible without waiting for typewriter"
    expected: "'Start (with Guidance)' button and skip link are visible immediately on page load, before typewriter finishes"
    why_human: "Load timing behavior requires live browser verification"
  - test: "Guide overlay on Start vs. Skip paths"
    expected: "Clicking 'Start (with Guidance)' shows the Learning Bits overlay in the calculator bottom-right. Clicking the skip link navigates to calculator WITHOUT the overlay."
    why_human: "Visual overlay presence/absence requires live browser testing"
  - test: "Responsive layout at mobile width (~375px)"
    expected: "Logo scales down, dialogue card remains readable, no overflow"
    why_human: "Responsive layout requires browser resize testing"
---

# Phase 23: Homepage & Welcome Experience Verification Report

**Phase Goal:** Users land on a new homepage with Learning Bits welcome dialogue, branded logo, and clear start/skip paths into the calculator
**Verified:** 2026-03-26T20:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Homepage displays animated typewriter welcome text from Learning Bits mascot explaining the tool's purpose | ✓ VERIFIED | `WelcomePage.tsx` imports `useTypewriter`, calls `useTypewriter(WELCOME_TEXT)`, renders `displayed` via `renderDialogueParagraphs` in JSX. `useTypewriter.ts` (2.2KB) uses `setTimeout`/timer-based animation, handles `prefers-reduced-motion` via `matchMedia`. Hook is substantive and wired to real output. |
| 2 | "Bubbly Pill" Frutiger Aero logo with glossy purple pill on "Test" replaces the previous text title | ✓ VERIFIED | `BubblyPillLogo.tsx` exists, exports `BubblyPillLogo`, uses `frutiger-glass` + `pill-shadow` + `logo-font` + `rounded-full`. `index.css` has `.frutiger-glass` with gradient + `::before` specular highlight + `::after` bottom reflection. Noto Sans font loaded in `index.html`. Logo is wired into `WelcomePage.tsx` via import and `<BubblyPillLogo />`. Visual rendering needs human check. |
| 3 | Start button launches calculator WITH guided flow enabled; "skip guidance" link launches calculator WITHOUT guided flow | ✓ VERIFIED | `App.tsx` imports `useWizardStore`, reads `setGuideEnabled` via selector. `onStartWithGuidance` callback calls `setGuideEnabled(true)` then `setCurrentPage('calculator')`. `onSkipGuidance` calls `setGuideEnabled(false)` then `setCurrentPage('calculator')`. Both props are passed to `WelcomePage`. Confirmed by 7 passing App integration tests including store-state assertions. |
| 4 | Footer credits Ryan Lucht and lists "frontier Claude Opus, GPT-Pro, Codex, and Gemini Pro models" (no Hubbard attribution) | ✓ VERIFIED | `WelcomePage.tsx` footer contains link to `ryanlucht.com`, text "Created by Ryan Lucht", "Claude Opus, GPT-Pro, Codex, and Gemini Pro models". Grep confirms no "Hubbard" or "vibe-coded" anywhere in the file. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/BubblyPillLogo.tsx` | CSS/HTML Bubbly Pill logo with Frutiger Aero glass effect | ✓ VERIFIED | Exists, 37 lines, exports `BubblyPillLogo`, uses `frutiger-glass`, `logo-font`, `pill-shadow`, `rounded-full`, renders "Should I", "Test", "That?". Imported and used in `WelcomePage.tsx`. |
| `src/pages/WelcomePage.tsx` | Redesigned homepage with logo, welcome dialogue, dual CTAs, footer | ✓ VERIFIED | Exists, 192 lines, exports `WelcomePage`, full dialogue card with `rpg-dialog-box` + `lb-font`, dual CTAs wired to props, footer with correct credits. No stubs or TODO markers. |
| `index.html` | Noto Sans font import | ✓ VERIFIED | Contains `family=Noto+Sans:wght@400;700;800&display=swap` Google Fonts link. |
| `src/index.css` | Frutiger Aero glass CSS classes | ✓ VERIFIED | Contains `.frutiger-glass`, `.frutiger-glass::before`, `.frutiger-glass::after`, `.logo-font` with `'Noto Sans'`, `.text-glow`, `.pill-shadow`. All 7 required classes present. |
| `src/App.tsx` | Routing with dual navigation paths wired to Zustand setGuideEnabled | ✓ VERIFIED | Contains `useWizardStore` import, `setGuideEnabled` selector, `onStartWithGuidance` and `onSkipGuidance` props on `WelcomePage`. No `onGetStarted` remains. |
| `src/App.test.tsx` | Updated integration tests for new WelcomePage flows | ✓ VERIFIED | Contains exactly 7 tests covering logo rendering, both CTA buttons, both navigation paths, and `guideEnabled` store state assertions for true and false paths. All 7 tests pass. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/pages/WelcomePage.tsx` | `src/components/BubblyPillLogo.tsx` | `import BubblyPillLogo` | ✓ WIRED | Import present, `<BubblyPillLogo />` rendered in JSX |
| `src/pages/WelcomePage.tsx` | `src/hooks/useTypewriter.ts` | `import useTypewriter` | ✓ WIRED | Import present, `useTypewriter(WELCOME_TEXT)` called, `{ displayed, isComplete }` destructured and used in JSX |
| `src/pages/WelcomePage.tsx` | `src/components/guide/LearningBitsAvatar.tsx` | `import LearningBitsAvatar` | ✓ WIRED | Import present, `<LearningBitsAvatar />` rendered in dialogue card |
| `src/pages/WelcomePage.tsx` | `src/components/guide/BouncingDots.tsx` | `import BouncingDots` | ✓ WIRED | Import present, `{isComplete && <BouncingDots />}` in JSX |
| `src/App.tsx` | `src/stores/wizardStore.ts` | `useWizardStore for setGuideEnabled` | ✓ WIRED | `useWizardStore((state) => state.setGuideEnabled)` selector, called on both navigation paths |
| `src/App.tsx` | `src/pages/WelcomePage.tsx` | `onStartWithGuidance and onSkipGuidance props` | ✓ WIRED | Both props passed with callbacks that call `setGuideEnabled` and `setCurrentPage` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `WelcomePage.tsx` (dialogue card) | `displayed`, `isComplete` | `useTypewriter(WELCOME_TEXT)` | Yes — `useTypewriter.ts` is 2.2KB with timer-based character-reveal logic, `matchMedia` for reduced-motion, exports non-empty string slices | ✓ FLOWING |
| `WelcomePage.tsx` (CTAs) | `onStartWithGuidance`, `onSkipGuidance` | Props from `App.tsx` which bind `setGuideEnabled` + `setCurrentPage` | Yes — callbacks are non-empty functions with Zustand store mutations | ✓ FLOWING |
| `App.tsx` (routing) | `guideEnabled` write | `useWizardStore((state) => state.setGuideEnabled)` | Yes — `wizardStore.ts` has `guideEnabled` and `setGuideEnabled` confirmed | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles without errors | `npx tsc --noEmit` | Exit 0, no output | ✓ PASS |
| App integration tests pass (7 tests) | `npx vitest run src/App.test.tsx` | PASS (14) FAIL (0) (file runs as part of broader test context) | ✓ PASS |
| BubblyPillLogo exports correct function | Static analysis | `export function BubblyPillLogo()` confirmed | ✓ PASS |
| useTypewriter hook is substantive | Static analysis | 2.2KB, timer-based, handles reduced-motion | ✓ PASS |
| Visual logo/animation rendering | Requires browser | Cannot test programmatically | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| HOME-01 | 23-01-PLAN.md, 23-02-PLAN.md | Learning Bits welcome sequence with animated typewriter text greeting user and explaining the tool's purpose | ✓ SATISFIED | `WelcomePage.tsx` has `useTypewriter(WELCOME_TEXT)` wired to `renderDialogueParagraphs(displayed, 'visible')`. WELCOME_TEXT is the verbatim welcome monologue. `BouncingDots` shown on completion. |
| HOME-02 | 23-01-PLAN.md | "Bubbly Pill" Frutiger Aero logo replaces text title (Noto Sans font, glossy purple pill on "Test") | ✓ SATISFIED | `BubblyPillLogo.tsx` with `frutiger-glass` CSS (gradient + `::before`/`::after`), Noto Sans loaded, wired into `WelcomePage`. Visual appearance requires human check. |
| HOME-03 | 23-01-PLAN.md, 23-02-PLAN.md | Start button launches calculator WITH guided flow; "skip guidance" text link launches calculator WITHOUT guided flow | ✓ SATISFIED | `App.tsx` `onStartWithGuidance` calls `setGuideEnabled(true)`, `onSkipGuidance` calls `setGuideEnabled(false)`. Both callbacks navigate to calculator. 7 passing tests confirm behavior. |
| HOME-04 | 23-01-PLAN.md | Footer updated — keep "Created by Ryan Lucht" credit, update model list to "frontier Claude Opus, GPT-Pro, Codex, and Gemini Pro models", remove Hubbard attribution | ✓ SATISFIED | Footer in `WelcomePage.tsx` has exact required text, link to `ryanlucht.com`, no "Hubbard" present. |

**All 4 requirements confirmed: HOME-01, HOME-02, HOME-03, HOME-04**

No orphaned requirements: REQUIREMENTS.md maps all four HOME-0x requirements to Phase 23 only. Both plans (23-01, 23-02) claim the same IDs — HOME-01 and HOME-03 are shared between plans (23-01 builds the component, 23-02 wires the routing), which is consistent with the implementation.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None | — | — | — |

Scanned: `WelcomePage.tsx`, `BubblyPillLogo.tsx`, `App.tsx`, `App.test.tsx`, `index.html`, `src/index.css`. No TODO/FIXME, placeholder text, empty returns, stub handlers, or hardcoded empty data found. All state variables (`displayed`, `isComplete`) are populated from real timer-based logic, not static defaults.

### Human Verification Required

#### 1. Bubbly Pill Logo Glass Effect

**Test:** Run `npm run dev`, open http://localhost:5173, examine the logo at top of page.
**Expected:** "Should I" and "That?" in purple Noto Sans extrabold; "Test" inside a glossy purple capsule with a curved white specular highlight at the top, a soft bottom reflection glow, and a purple drop shadow giving depth.
**Why human:** CSS `::before`/`::after` pseudo-element rendering and filter depth effects cannot be verified programmatically.

#### 2. Typewriter Animation and Italic Rendering

**Test:** Load the homepage and watch the dialogue card.
**Expected:** Welcome text appears character-by-character. The word "vibes" renders in italics (not underscores). After the full text completes, three bouncing dots appear.
**Why human:** Animation timing, italic rendering, and bouncing-dots CSS animation require visual inspection.

#### 3. CTAs Always Visible Without Gate

**Test:** Load the homepage and observe the CTA section immediately on load.
**Expected:** "Start (with Guidance)" button and the skip text link are visible from the first render, without waiting for the typewriter to finish.
**Why human:** Load-time visibility requires live browser observation.

#### 4. Guide Overlay Appears on Start Path, Hidden on Skip Path

**Test:** (A) Click "Start (with Guidance)" — verify Learning Bits overlay appears in bottom-right of calculator. (B) Navigate back, click the skip link — verify calculator loads WITHOUT the overlay.
**Expected:** Overlay visible on Start path, absent on Skip path.
**Why human:** Visual overlay presence/absence depends on the guide component's `guideEnabled` read from Zustand store, which is correct in code but requires visual confirmation.

#### 5. Responsive Layout at 375px

**Test:** Resize browser to ~375px width on the homepage.
**Expected:** Logo scales down proportionally, dialogue card remains readable, no horizontal overflow.
**Why human:** Responsive breakpoint rendering requires browser resize inspection.

### Gaps Summary

No gaps found. All automated checks pass:

- All 4 observable truths: VERIFIED
- All 6 artifacts: VERIFIED (exist, substantive, wired)
- All 6 key links: WIRED
- All 3 data flows: FLOWING
- All 4 requirements (HOME-01 through HOME-04): SATISFIED
- TypeScript: clean compile
- Test suite: 7/7 App tests pass

Five items remain for human visual verification — these are aesthetic and behavioral properties (glass effect rendering, animation appearance, guide overlay visibility) that the automated checks cannot evaluate.

---

_Verified: 2026-03-26T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
