---
phase: 25-polish-accessibility-export
verified: 2026-04-08T13:47:00Z
status: gaps_found
score: 13/15 must-haves verified
gaps:
  - truth: "Screen readers can read Learning Bits dialogue text via sr-only span"
    status: partial
    reason: "sr-only span is present AND correct in LearningBitsOverlay, but the useWizardStore mock in AdvancedResultsSection.test.tsx was not updated to include sharedNetValue and analysisName added in Phase 25. The incomplete mock causes loading-state rendering to break: isLoading evaluates to false when mock returns undefined for sharedNetValue, so 'Calculating...' text never renders. Two tests fail: 'has no accessibility violations when loading' and 'has ARIA live region with aria-busy during loading'."
    artifacts:
      - path: "src/components/results/AdvancedResultsSection.test.tsx"
        issue: "Mock for useWizardStore does not include sharedNetValue or analysisName. The component added reads for both in Phase 25 (line 43-46 of AdvancedResultsSection.tsx). When sharedNetValue is undefined (not null), the condition sharedNetValue !== null evaluates to true, so isLoading is forced to false regardless of the actual loading prop."
    missing:
      - "Update useWizardStore mock in AdvancedResultsSection.test.tsx to include sharedNetValue: null and analysisName: '' alongside the existing inputs mock"
  - truth: "A11Y-02: Screen readers can read Learning Bits dialogue — test suite passes"
    status: partial
    reason: "The implementation is correct. The test failure is not a regression in the component behavior itself, but in the test scaffolding not being updated to match Phase 25's new store fields."
    artifacts:
      - path: "src/components/results/AdvancedResultsSection.test.tsx"
        issue: "2 tests failing: 'has no accessibility violations when loading' and 'has ARIA live region with aria-busy during loading'"
    missing:
      - "Fix useWizardStore mock to include sharedNetValue: null and analysisName: '' in all test cases that mock useWizardStore"
human_verification:
  - test: "Visual export PNG review"
    expected: "PNG header shows 'Should I [Test] That?' logo with purple pill, analysis name title (when provided), no mode badge, footer says 'Created with Should I Test That?'"
    why_human: "html-to-image rendering of inline styles cannot be verified programmatically; visual output requires manual inspection"
  - test: "DD-01 Datadog PA Users view"
    expected: "After visiting in production, the Datadog PA Users view should populate with stable anonymous UUIDs"
    why_human: "Requires production deployment and Datadog PA dashboard access to verify"
---

# Phase 25: Polish, Accessibility, Export Verification Report

**Phase Goal:** Calculator is polished, accessible, branded for export, and tracked in Datadog PA
**Verified:** 2026-04-08T13:47:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | EVSI acronym is spelled out on first use in the calculator results section | VERIFIED | AdvancedResultsSection.tsx line 212: `EVSI (Expected Value of Sample Information) represents` |
| 2 | Section headings are visually larger/bolder than description text below them | VERIFIED | AdvancedResultsSection.tsx: "How to interpret" uses `font-semibold`, "Share your analysis" uses `font-semibold`; SectionWrapper uses `text-lg font-semibold` |
| 3 | 'Ship' terminology is clarified with 'deploy/launch' synonym | VERIFIED (partial) | SupportingCard descriptions use "Your minimum bar to deploy" and "Deploy if it helps". Statistical Interpretation callout retains "ship"/"not ship" as domain values (acceptable — these describe the `defaultDecision` enum value, not UI copy) |
| 4 | 'Test Design' and 'Experiment Design' naming is consistent | VERIFIED | CalculatorPage.tsx SECTIONS array: `{ id: 'test-design', label: 'Experiment', title: 'Experiment Design' }` |
| 5 | Input fields have aria-label attributes describing purpose and units | VERIFIED | NumberInput, CurrencyInput, PercentageInput all have `ariaLabel?: string` prop wired to `aria-label`; BaselineMetricsForm and ExperimentDesignForm pass descriptive labels with units |
| 6 | Distribution chart has a textual alt description | VERIFIED | PriorDistributionChart.tsx: `role="img"` div with static aria-label + `<span className="sr-only">` dynamic description |
| 7 | Learning Bits overlay shows full text immediately when prefers-reduced-motion is active | VERIFIED | useTypewriter.ts already respects prefers-reduced-motion (existing); BouncingDots has `motion-reduce:animate-none` on all three dot spans |
| 8 | Screen readers can read Learning Bits dialogue text via sr-only span | VERIFIED | LearningBitsOverlay.tsx line 92: `<span className="sr-only">{messageText}</span>` inside `aria-live="polite"` container |
| 9 | When a user enters annual visitors and daily traffic is empty, daily traffic auto-fills | VERIFIED | ExperimentDesignForm.tsx: useEffect checks `inputs.dailyTraffic === null` then sets `Math.round(inputs.annualVisitors / 365)` |
| 10 | Once daily traffic has any value, it is never overwritten | VERIFIED | ExperimentDesignForm.tsx: Guard `inputs.dailyTraffic === null` in useEffect per D-02 |
| 11 | A subtle hint '(derived from annual visitors)' appears on the auto-filled field | VERIFIED | ExperimentDesignForm.tsx: `derivedHint` state + `helpText={derivedHint ?? undefined}` on NumberInput |
| 12 | Datadog PA Users view populates with anonymous UUIDs from localStorage | VERIFIED (implementation) | analytics.ts exports `getOrCreateAnonymousId()` using `crypto.randomUUID()`; main.tsx calls `datadogRum.setUser({ id: getOrCreateAnonymousId() })` after init() in PROD guard |
| 13 | Exported PNG includes the BubblyPillLogo branding in the header area | VERIFIED | ExportCard.tsx: Inline-styled logo with "Should I", purple-pill "Test", "That?" using `linear-gradient(135deg, #9333EA...)` and `fontFamily: '"Noto Sans"'` |
| 14 | Analysis name field appears in the results section near share/export buttons | VERIFIED | AdvancedResultsSection.tsx: `<Input placeholder="Name this analysis (optional)" aria-label="Analysis name for export and sharing" />` inside "Share your analysis" card |
| 15 | Export filename follows the format should-i-test-that_{analysis-name}_{date}.png | VERIFIED | useExportPng.ts: `generateFilename()` uses `new Date().toISOString().slice(0, 10)` for date; produces `should-i-test-that_${safeTitle}_${date}.png` or `should-i-test-that_${date}.png` |

**Score:** 14/15 truths fully verified; 1 has a test scaffolding gap (implementation correct, tests broken)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/results/EVSIVerdictCard.tsx` | EVSI acronym definition on first use | VERIFIED | Contains "net value of testing" context; EVSI acronym expanded in AdvancedResultsSection instead (correct per plan) |
| `src/components/results/AdvancedResultsSection.tsx` | Acronym definitions in results context | VERIFIED | Line 212: "EVSI (Expected Value of Sample Information) represents" |
| `src/components/charts/PriorDistributionChart.tsx` | Chart accessibility alt text | VERIFIED | Lines 158-164: `role="img"`, `aria-label="Prior distribution density chart..."`, `<span className="sr-only">` |
| `src/components/forms/inputs/NumberInput.tsx` | ARIA labels for numeric inputs | VERIFIED | Lines 43-46: `ariaLabel?: string` interface; line 147: `aria-label={ariaLabel}` on Input |
| `src/components/forms/inputs/CurrencyInput.tsx` | ARIA labels for currency inputs | VERIFIED | Lines 33-37: `ariaLabel?: string` interface; line 129: `aria-label={ariaLabel}` on Input |
| `src/components/forms/inputs/PercentageInput.tsx` | ARIA labels for percentage inputs | VERIFIED | Lines 36-39: `ariaLabel?: string` interface; line 132: `aria-label={ariaLabel}` on Input |
| `src/components/guide/BouncingDots.tsx` | Respects prefers-reduced-motion | VERIFIED | All three dot spans have `motion-reduce:animate-none` class |
| `src/components/forms/ExperimentDesignForm.tsx` | Auto-derivation of daily traffic | VERIFIED | Lines 144-157: useEffect with `Math.round(inputs.annualVisitors / 365)` and `inputs.dailyTraffic === null` guard |
| `src/lib/analytics.ts` | Anonymous UUID generation and retrieval | VERIFIED | Lines 25-37: `ANONYMOUS_ID_KEY = 'dd_anonymous_id'`, `getOrCreateAnonymousId()` with `crypto.randomUUID()` |
| `src/main.tsx` | Datadog PA user identification with anonymous UUID | VERIFIED | Lines 4, 32-37: imports `getOrCreateAnonymousId`, calls `datadogRum.setUser({ id: getOrCreateAnonymousId() })` after init() |
| `src/components/export/ExportCard.tsx` | Canvas-compatible logo rendering in PNG export header | VERIFIED | Lines 177-225: Inline-styled logo with "Should I", purple pill "Test", "That?" |
| `src/components/export/ExportButton.tsx` | Analysis name integration for export filename | VERIFIED | Lines 55-57, 71-72: `analysisName?: string` prop; no internal `customTitle` useState |
| `src/hooks/useExportPng.ts` | Date-stamped filename generation | VERIFIED | Line 60: `new Date().toISOString().slice(0, 10)` for YYYY-MM-DD date |
| `src/components/results/AdvancedResultsSection.tsx` | Analysis name text input field | VERIFIED | Lines 233-240: `<Input placeholder="Name this analysis (optional)" aria-label="Analysis name for export and sharing" />` |
| `src/types/wizard.ts` | analysisName field in WizardState | VERIFIED | Lines 148-153: `analysisName: string` in WizardState; lines 185-188: `setAnalysisName` in WizardActions |
| `src/stores/wizardStore.ts` | analysisName state and action | VERIFIED | Line 37: `analysisName: ''` initial state; lines 123-129: `setAnalysisName` action; not in partialize (line 157-160) |
| `src/components/results/AdvancedResultsSection.test.tsx` | Test scaffolding for Phase 25 store changes | FAILED | Mock does not include `sharedNetValue` or `analysisName`. 2 tests fail. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/main.tsx` | `src/lib/analytics.ts` | `getOrCreateAnonymousId import` | WIRED | Line 4: `import { getOrCreateAnonymousId } from './lib/analytics'`; line 36: `id: getOrCreateAnonymousId()` |
| `src/components/forms/ExperimentDesignForm.tsx` | `src/stores/wizardStore.ts` | `auto-derive dailyTraffic from annualVisitors` | WIRED | Lines 144-157: useEffect reads `inputs.annualVisitors`, writes via `setInput('dailyTraffic', derived)` |
| `src/components/results/AdvancedResultsSection.tsx` | `src/stores/wizardStore.ts` | `analysisName state` | WIRED | Lines 45-46: `const analysisName = useWizardStore(...)`, `const setAnalysisName = useWizardStore(...)` |
| `src/components/export/ExportButton.tsx` | `src/hooks/useExportPng.ts` | `generateFilename with analysis name + date` | WIRED | Line 203: `await exportPng(analysisName || undefined)` — passes analysis name to hook's generateFilename |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `AdvancedResultsSection.tsx` | `analysisName` | `useWizardStore` → Zustand store | Yes — real-time text input updates store | FLOWING |
| `ExportButton.tsx` | `analysisName` prop | Passed from AdvancedResultsSection | Yes — flows from store to ExportCard title and filename | FLOWING |
| `useExportPng.ts` | `customTitle` parameter | Passed from ExportButton | Yes — used in `generateFilename()` which produces real dates | FLOWING |
| `analytics.ts` | `getOrCreateAnonymousId()` | `localStorage.getItem('dd_anonymous_id')` | Yes — crypto.randomUUID() for new visits, localStorage read for returns | FLOWING |
| `ExperimentDesignForm.tsx` | `derivedHint` | Computed from `inputs.annualVisitors / 365` | Yes — live store value, not hardcoded | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| EVSI acronym expanded on first use | `grep "Expected Value of Sample Information" src/components/results/AdvancedResultsSection.tsx` | "EVSI (Expected Value of Sample Information) represents" found at line 212 | PASS |
| Decision Threshold rename | `grep "Decision Threshold" src/pages/CalculatorPage.tsx` | `title: 'Decision Threshold'` found at line 67 | PASS |
| Experiment label in SECTIONS | `grep "label: 'Experiment'" src/pages/CalculatorPage.tsx` | `label: 'Experiment'` found at line 68 | PASS |
| EVSI in ExportCard key inputs | `grep "Expected Value of Sample Information" src/components/export/ExportCard.tsx` | "Test value (EVSI — Expected Value of Sample Information)" found at line 460 | PASS |
| Deploy language in SupportingCard | `grep "deploy" src/components/results/AdvancedResultsSection.tsx` | "Your minimum bar to deploy" and "Deploy if it helps" both present | PASS |
| crypto.randomUUID in analytics | `grep "crypto.randomUUID" src/lib/analytics.ts` | Found at line 31 | PASS |
| setUser after init in main.tsx | `grep "setUser" src/main.tsx` | `datadogRum.setUser({ id: getOrCreateAnonymousId() })` at line 35 | PASS |
| Analysis name NOT in partialize | `grep "analysisName" src/stores/wizardStore.ts` | `analysisName: ''` in state (line 37), NOT in partialize function (lines 157-160) | PASS |
| Test suite passes | `npx vitest run` | 989 passed, 2 FAILED | FAIL — 2 tests in AdvancedResultsSection.test.tsx |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| POL-01 | 25-01 | EVSI and similar acronyms spelled out on first appearance | SATISFIED | AdvancedResultsSection.tsx line 212; ExportCard.tsx line 460 |
| POL-02 | 25-01 | Section headings differentiated from descriptions | SATISFIED | "How to interpret" and "Share your analysis" headings use `font-semibold` |
| POL-03 | 25-02 | Optional fields prefilled from earlier inputs (daily traffic from annual visitors) | SATISFIED | ExperimentDesignForm.tsx: auto-derive useEffect + "(derived from annual visitors)" hint |
| POL-04 | 25-01 | Inclusive language — clarify "ship" terminology; consistent naming | SATISFIED | "Decision Threshold" replaces "Shipping Threshold"; "Experiment" replaces "Test Design" label; "deploy" replaces "ship" in SupportingCard |
| A11Y-01 | 25-01 | Input fields get ARIA labels; distribution plot gets textual alt description | SATISFIED | NumberInput/CurrencyInput/PercentageInput have `ariaLabel` prop; PriorDistributionChart has `role="img"` + `aria-label` + `sr-only` |
| A11Y-02 | 25-01 | Learning Bits dialogue supports prefers-reduced-motion; screen reader support | SATISFIED | BouncingDots has `motion-reduce:animate-none`; LearningBitsOverlay has `sr-only` + `aria-live="polite"` |
| EXPORT-01 | 25-03 | New logo/branding added to exported PNG images | SATISFIED | ExportCard.tsx: Inline-styled "Should I [Test] That?" logo in export header |
| EXPORT-02 | 25-03 | Export file title pre-populated with helpful context and better human readability | SATISFIED | Analysis name field in ResultsSection; date-stamped filename format in useExportPng.ts |
| DD-01 | 25-02 | Anonymous UUID generated in localStorage, setUser() called so Datadog PA Users view populates | SATISFIED (impl) | analytics.ts `getOrCreateAnonymousId()`; main.tsx `datadogRum.setUser()` after init() |

**Orphaned requirements check:** REQUIREMENTS.md maps POL-01, POL-02, POL-03, POL-04, A11Y-01, A11Y-02, EXPORT-01, EXPORT-02, DD-01 to Phase 25. All 9 are claimed by plan frontmatter. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/results/AdvancedResultsSection.tsx` | 185, 188, 196 | `"ship"/"not ship"` in Statistical Interpretation callout | INFO | These are domain values (the `defaultDecision` enum value from the calculation engine), not UI copy. The plan's POL-04 acceptance criteria targeted SupportingCard descriptions only. Not a stub. |
| `src/components/results/AdvancedResultsSection.test.tsx` | 83-88, 107-112, 131-136, 154-160 | `useWizardStore` mock missing `sharedNetValue` and `analysisName` | BLOCKER | Mock returns undefined for fields added in Phase 25. When `sharedNetValue` is undefined (not null), `sharedNetValue !== null` is true, so `isLoading` is forced to false in loading-state test cases. Two tests fail as a result. |

### Human Verification Required

#### 1. PNG Export Visual Quality

**Test:** Run `npm run dev`, navigate to Results section, fill all required inputs, type "Checkout Flow Redesign" in the analysis name field, click "Export as PNG"
**Expected:**
- Downloaded filename: `should-i-test-that_checkout-flow-redesign_2026-04-08.png`
- PNG header shows "Should I [Test] That?" with purple pill on "Test"
- Analysis name appears as a title below the logo
- No "Advanced Mode" or "Basic Mode" badge
- Footer says "Created with Should I Test That?"
- Clear the analysis name, export again: filename is `should-i-test-that_2026-04-08.png` with no custom title below logo
**Why human:** html-to-image rendering of inline styles cannot be verified programmatically

#### 2. Datadog PA Users View Populates

**Test:** Deploy to production, wait for a session, check Datadog PA dashboard
**Expected:** Users view shows stable anonymous UUIDs (not empty); same UUID on return visits from the same browser
**Why human:** Requires production deployment and Datadog dashboard access

### Gaps Summary

One gap blocks marking the test suite as fully green: **`src/components/results/AdvancedResultsSection.test.tsx` was not updated** when Phase 25 added `sharedNetValue` and `analysisName` reads to `AdvancedResultsSection.tsx`. The partial `useWizardStore` mock now returns `undefined` for both fields. When `sharedNetValue` is `undefined` (not `null`), the component's loading-state guard incorrectly evaluates `sharedNetValue !== null` as `true`, suppressing the loading indicator. Two tests fail as a result:

1. `has no accessibility violations when loading` — cannot find "Calculating..." text
2. `has ARIA live region with aria-busy during loading` — cannot find `[aria-busy="true"]`

The fix is minimal: add `sharedNetValue: null` and `analysisName: ''` to the `state` object in all four `useWizardStore.mockImplementation` blocks in that test file. The component behavior is correct; only the test scaffolding needs updating.

All 9 requirements (POL-01 through POL-04, A11Y-01, A11Y-02, EXPORT-01, EXPORT-02, DD-01) are substantively implemented and wired. Two items require human verification (export visual quality and Datadog PA production check).

---

_Verified: 2026-04-08T13:47:00Z_
_Verifier: Claude (gsd-verifier)_
