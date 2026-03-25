---
phase: 22-learning-bits-guide-infrastructure
verified: 2026-03-25T15:50:00Z
status: human_needed
score: 11/12 must-haves verified
human_verification:
  - test: "Visual overlay appearance"
    expected: "Fixed-position RPG dialogue box appears bottom-right with 3px purple border, 6px offset shadow, dog mascot avatar, 'Learning Bits' label in Space Grotesk bold, typewriter text animation, bouncing dots after completion"
    why_human: "CSS rendering, font loading, and visual layout cannot be verified programmatically"
  - test: "Close and reopen toggle"
    expected: "X button collapses overlay to 64px circular avatar bubble; clicking bubble reopens dialogue overlay"
    why_human: "UI interaction state transition requires browser rendering"
  - test: "Section-aware message progression"
    expected: "Scrolling through baseline -> uncertainty -> threshold -> test-design -> results updates dialogue text to M1 through M8; accordion open and input focus events trigger M3/M4/M7"
    why_human: "Scroll-spy + state transitions require live browser interaction"
  - test: "Highlight pulse on off-center prior"
    expected: "Setting lower=-2% upper=10% (implied mean +4%) shows purple pulse border on 'Implied expected lift' display"
    why_human: "CSS animation and conditional class application requires visual verification"
  - test: "Session persistence"
    expected: "Close dialogue, refresh page — remains collapsed; open new tab — defaults to open"
    why_human: "sessionStorage behavior across navigation requires browser testing"
  - test: "Reduced motion fallback"
    expected: "With OS prefers-reduced-motion ON, typewriter shows full text immediately; bouncing dots are static"
    why_human: "OS-level accessibility setting requires manual browser test"
---

# Phase 22: Learning Bits Guide Infrastructure Verification Report

**Phase Goal:** Complete Learning Bits guided dialogue overlay with RPG-style card, mascot avatar, typewriter animation, section-aware messages, accordion collapses, and highlight pulse — wired to calculator sections with all 7 final dialogue messages (8 implemented per PM request)
**Verified:** 2026-03-25T15:50:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | useTypewriter hook reveals text character-by-character at CHAR_DELAY_MS intervals | VERIFIED | `CHAR_DELAY_MS = 12` (changed from 30ms per PM feedback), 5 tests pass |
| 2  | useTypewriter shows full text immediately when prefers-reduced-motion is active | VERIFIED | `prefersReducedMotionRef` in useTypewriter.ts; reduced-motion test passes |
| 3  | useGuideMessages returns the correct message index (0-7) for each section and trigger event | VERIFIED | 14 tests pass; all 8 indices covered including M8 for results section |
| 4  | guideEnabled boolean persists in sessionStorage via Zustand and defaults to true for new sessions | VERIFIED | `partialize` includes `guideEnabled`; `merge()` uses `persisted.guideEnabled ?? true`; 21 wizardStore tests pass |
| 5  | Space Grotesk font loads alongside Inter in index.html | VERIFIED | `family=Space+Grotesk:wght@400;700` link tag confirmed in index.html line 8 |
| 6  | RPG dialog box CSS class and bouncing-dot keyframes are defined in index.css | VERIFIED | `.rpg-dialog-box`, `@keyframes dot-bounce`, `.animate-dot-bounce`, `.highlight-pulse-container`, `.lb-font` all present |
| 7  | A fixed-position RPG-style dialogue box with mascot avatar and typewriter text appears when guidance is enabled | VERIFIED (code) | LearningBitsOverlay renders `fixed bottom-8 right-8 z-50 rpg-dialog-box`; wired via `guideEnabled` in CalculatorPage |
| 8  | Dialogue text updates automatically when user scrolls between calculator sections | VERIFIED (code) | `useGuideMessages(activeSection, guideTrigger)` wired to `useScrollSpy`; scroll->section->message routing confirmed |
| 9  | Close button dismisses dialogue to collapsed avatar bubble; clicking bubble reopens dialogue | VERIFIED (code) | `onClose={() => setGuideEnabled(false)}` and `onOpen={() => setGuideEnabled(true)}` wired; conditional render confirmed |
| 10 | Prior shape form collapsed into accordion (default closed) with correct toggle text | VERIFIED | `priorShapeOpen` state, `aria-expanded`, "I want to define the shape of the prior distribution (advanced)" button confirmed |
| 11 | Advanced timing fields collapsed into accordion (default closed) with correct toggle text | VERIFIED | `advancedTimingOpen` state, `aria-expanded`, "I want to consider time lag of metrics or decision-making" button confirmed |
| 12 | Accordion open events and input focus events trigger the correct guide message | PARTIAL | Trigger callbacks wired; BUT PriorBoundFocus returns 3 unconditionally (no "current <= 3" guard from spec) — regresses if user is already past M4 |

**Score:** 11/12 truths verified (12th is partial — behavioral correctness issue but not goal-blocking)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/useTypewriter.ts` | Character-by-character text reveal hook with reduced-motion support | VERIFIED | Exports `useTypewriter`; `CHAR_DELAY_MS = 12`; reduced-motion guard via `useRef` on mount |
| `src/hooks/useGuideMessages.ts` | Section-aware message routing hook with 8 messages and trigger event support | VERIFIED | Exports `useGuideMessages`, `GUIDE_MESSAGES`, `GuideTrigger`; 8 messages (M8 added per PM) |
| `src/types/wizard.ts` | Extended WizardState and WizardActions with guideEnabled | VERIFIED | `guideEnabled: boolean` in WizardState; `setGuideEnabled` in WizardActions |
| `src/stores/wizardStore.ts` | Extended Zustand store with guideEnabled persistence | VERIFIED | `guideEnabled: true` initial state; `setGuideEnabled` action; `partialize` and `merge()` both handle `guideEnabled` |
| `src/index.css` | RPG dialog box, dot-bounce, and highlight-pulse CSS classes | VERIFIED | `.rpg-dialog-box` with `border: 3px solid #7C3AED`; `@keyframes dot-bounce`; `.animate-dot-bounce`; `.highlight-pulse-container`; `.lb-font`; reduced-motion overrides present |
| `index.html` | Space Grotesk font import | VERIFIED | `family=Space+Grotesk:wght@400;700` Google Fonts link on line 8 |
| `public/learning-bits.png` | Learning Bits mascot avatar image asset | VERIFIED | 317KB file exists at `public/learning-bits.png` |
| `src/components/guide/LearningBitsOverlay.tsx` | Expanded dialogue card with avatar, typewriter text, close button | VERIFIED | Exports `LearningBitsOverlay`; `rpg-dialog-box` class; `lb-font` class; `useTypewriter`; `aria-label="Close Learning Bits guidance"`; `aria-live="polite"`; `sr-only` span |
| `src/components/guide/LearningBitsBubble.tsx` | Collapsed avatar button to reopen dialogue | VERIFIED | Exports `LearningBitsBubble`; `aria-label="Open Learning Bits guidance"` |
| `src/components/guide/LearningBitsAvatar.tsx` | 64px circular avatar with purple bg + border | VERIFIED | Exports `LearningBitsAvatar`; `w-16 h-16 rounded-full border-2 border-primary` |
| `src/components/guide/BouncingDots.tsx` | Three-dot animated ellipsis waiting indicator | VERIFIED | Exports `BouncingDots`; three spans with `animate-dot-bounce` class |
| `src/pages/CalculatorPage.tsx` | Orchestrates guide overlay/bubble rendering and trigger event wiring | VERIFIED | All imports, state, callbacks, and conditional rendering present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `LearningBitsOverlay.tsx` | `useTypewriter.ts` | `useTypewriter(messageText)` drives displayed text | WIRED | Import confirmed; `useTypewriter(messageText)` call at line 67 |
| `CalculatorPage.tsx` | `useGuideMessages.ts` | `useGuideMessages(activeSection, guideTrigger)` drives message routing | WIRED | Import at line 29; `useGuideMessages(activeSection, guideTrigger)` at line 105 |
| `CalculatorPage.tsx` | `wizardStore.ts` | `useWizardStore` guideEnabled state | WIRED | `useWizardStore((state) => state.guideEnabled)` at line 91; `setGuideEnabled` at line 92 |
| `UncertaintyPriorForm.tsx` | `CalculatorPage.tsx` | `onPriorShapeAccordionOpen` and `onPriorBoundFocus` callback props | WIRED | Props defined in interface at lines 64/66; passed in CalculatorPage at lines 352/353 |
| `ExperimentDesignForm.tsx` | `CalculatorPage.tsx` | `onAdvancedTimingOpen` callback prop | WIRED | Prop defined at line 44; passed in CalculatorPage at line 366 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `LearningBitsOverlay.tsx` | `messageText` prop | `GUIDE_MESSAGES[currentMessageIndex]` via `useGuideMessages` | Yes — 8-entry string array with final PM-approved copy | FLOWING |
| `LearningBitsOverlay.tsx` | `displayed` (typewriter) | `useTypewriter(messageText)` slices text via `index` state | Yes — character-by-character slice of real message string | FLOWING |
| `CalculatorPage.tsx` | `currentMessage` | `useGuideMessages(activeSection, guideTrigger)` | Yes — routes to indexed GUIDE_MESSAGES entry | FLOWING |
| `CalculatorPage.tsx` | `guideEnabled` | `useWizardStore` (Zustand + sessionStorage) | Yes — persisted boolean with default true | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles clean | `npx tsc --noEmit` | Exit 0 | PASS |
| wizardStore tests (21 tests including guideEnabled block) | `node_modules/.bin/vitest run src/stores/wizardStore.test.ts` | 21/21 passed | PASS |
| useTypewriter tests (5 tests including reduced-motion) | `node_modules/.bin/vitest run src/hooks/useTypewriter.test.ts` | 5/5 passed | PASS |
| useGuideMessages tests (14 tests including all 8 message indices) | `node_modules/.bin/vitest run src/hooks/useGuideMessages.test.ts` | 14/14 passed | PASS |
| Full test suite | `node_modules/.bin/vitest run --run` | 472/472 passed | PASS |
| learning-bits.png asset exists and has content | `ls -la public/learning-bits.png` | 317KB file present | PASS |
| Guide overlay rendering in CalculatorPage | Manual browser test | Not run | ? SKIP (needs browser) |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| GUIDE-01 | 22-01, 22-02 | Fixed-position overlay dialogue box with mascot avatar, typewriter text animation, and animated ellipsis | SATISFIED (code) | LearningBitsOverlay with `fixed bottom-8 right-8`, `rpg-dialog-box`, avatar, `useTypewriter`, `BouncingDots` all verified in code; human visual verification needed |
| GUIDE-02 | 22-01, 22-02 | Dialogue text auto-advances as user navigates between calculator sections; contextual messages per section | SATISFIED (code) | `useGuideMessages(activeSection, guideTrigger)` driven by `useScrollSpy`; 8 messages mapped to 5 sections + 3 trigger events |
| GUIDE-03 | 22-01, 22-02 | Guidance on/off toggle persisted in sessionStorage via Zustand; defaults ON for new sessions | SATISFIED | `partialize` persists `guideEnabled`; `merge()` defaults to `true`; `resetWizard()` resets to `true`; all 21 store tests pass |

**Orphaned requirements check:** REQUIREMENTS.md maps GUIDE-01, GUIDE-02, GUIDE-03 to Phase 22. Both plans claim all three. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/useGuideMessages.ts` | 119-122 | PriorBoundFocus returns `3` unconditionally — comment says "Will be handled with current check below" but no check exists | Warning | If user has advanced past M4 (index >= 4) and focuses a prior bound input, message regresses to index 3. Spec required `only if current <= 3`. No test covers this regression scenario. |
| `src/hooks/useGuideMessages.ts` | 132 | `eslint-disable-next-line react-hooks/exhaustive-deps` on trigger effect | Info | The trigger effect omits `currentMessageIndex` from deps (required for the guard that doesn't exist). Related to the PriorBoundFocus issue above. |

**Stub classification:** Neither anti-pattern prevents the phase goal. The PriorBoundFocus regression is a behavioral correctness issue (M4 can regress message index unexpectedly) but does not block GUIDE-01/02/03.

### Human Verification Required

#### 1. Visual Overlay Appearance

**Test:** Run `npm run dev`, navigate to calculator page. Observe bottom-right corner.
**Expected:** RPG dialogue box with 3px purple border, 6px offset shadow, 64px circular dog mascot avatar, "Learning Bits" label in Space Grotesk bold, typewriter text animation, bouncing middle dots after text completes.
**Why human:** CSS rendering, font loading, and visual layout cannot be verified programmatically.

#### 2. Close and Reopen Toggle

**Test:** Click X button in overlay corner.
**Expected:** Overlay collapses to 64px circular avatar button. Clicking avatar button reopens full overlay.
**Why human:** UI interaction state transitions require browser rendering.

#### 3. Section-Aware Message Progression

**Test:** Scroll through calculator sections from baseline to results.
**Expected:** Dialogue text updates at each section transition (M1 at baseline, M2 at uncertainty, M5 at threshold, M6 at test-design, M8 at results). Open prior shape accordion to trigger M3. Focus lower/upper bound input to trigger M4. Open advanced timing accordion to trigger M7.
**Why human:** Scroll-spy and state transitions require live browser interaction.

#### 4. Highlight Pulse on Off-Center Prior

**Test:** Enter prior interval low = -2%, high = 10% (implied mean +4%).
**Expected:** "Implied expected lift: +4.0%" display shows purple border pulse animation.
**Why human:** CSS animation and conditional class application requires visual verification.

#### 5. Session Persistence

**Test:** Close dialogue (X button), then refresh page. Then open new tab to the calculator.
**Expected:** After refresh, dialogue remains collapsed (bubble shown). In new tab, dialogue starts open (guideEnabled defaults to true).
**Why human:** sessionStorage behavior across navigation requires browser testing.

#### 6. Reduced Motion Fallback

**Test:** Enable OS-level "Reduce motion" accessibility setting, then load calculator page.
**Expected:** Typewriter shows full dialogue text immediately (no character animation). Bouncing dots are static (no animation).
**Why human:** OS-level accessibility setting requires manual browser configuration and testing.

### Gaps Summary

No blocking gaps found. The automated verification is comprehensive:
- All 5 core infrastructure artifacts exist and are substantive (not stubs)
- All 4 guide UI components exist and are wired
- All 5 key links are verified
- Data flows from GUIDE_MESSAGES through useGuideMessages through CalculatorPage to LearningBitsOverlay
- 472 tests pass (zero failures), TypeScript compiles clean
- 3 GUIDE requirements all satisfied in code

One behavioral correctness note: `PriorBoundFocus` in useGuideMessages.ts lacks the `current <= 3` guard specified in the plan. This means focusing a prior bound input when already past M4 will unexpectedly regress the dialogue back to M4. This is a warning-level issue, not a goal blocker, and the existing test suite does not cover this regression scenario.

The ROADMAP goal references "7 final dialogue messages" but 8 were implemented (M8 for results section added per PM feedback during plan 22-02 human verification checkpoint). This is a documented, intentional deviation.

Phase goal is achieved. Human visual verification of rendering, interaction, and animation behavior is the remaining step before final sign-off.

---

_Verified: 2026-03-25T15:50:00Z_
_Verifier: Claude (gsd-verifier)_
