---
phase: 27-code-review-statistics-audit-v4-fixes
verified: 2026-04-15T14:39:40Z
status: passed
score: 18/18 must-haves verified
re_verification: false
---

# Phase 27: Code Review and Statistics Audit V4 Fixes — Verification Report

**Phase Goal:** Address all findings from the 2026-04-14 code review (CR-1 through CR-5) and v4 statistics audit (SA-1 through SA-11), fixing HIGH/MEDIUM severity bugs in the statistics engine, stale-values display, URL codec, infeasible-prior reporting, and code quality issues.
**Verified:** 2026-04-15T14:39:40Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Student-t effectiveProbClears for symmetric prior at threshold=0 returns ~0.5 regardless of CR0 | VERIFIED | `evsi.ts` uses `jStat.studentt.cdf` at line 167-168; test at evsi.test.ts line 1984 asserts `toBeCloseTo(0.5, 1)` for all CR0 values |
| 2 | Normal posterior mean in MC path uses truncation-aware formula when truncation is material | VERIFIED | `computePosteriorMean` calls `liftFeasibilityBounds(CR0)` and `truncatedNormalMeanTwoSided` when `truncatedMass < 1 - 0.001` (lines 488-499) |
| 3 | Student-t posterior grid uses quantile-based bounds instead of hardcoded 6*sigma | VERIFIED | `studentTQuantileBounds(mu, scale, prior.df!, 0.0001, 0.9999)` used at line 327; regression test confirms bounds are 2x+ wider for df=3 |
| 4 | Editing an input in a completed section invalidates that section and all downstream | VERIFIED | `invalidateSection` in `wizardStore.ts` uses `filter((s) => s < section)` (line 81); 7 store tests confirm behavior |
| 5 | Results cannot be viewed while an upstream section is invalidated | VERIFIED | `canAccessSection` depends on `completedSections`; store test line 363 confirms section 4 inaccessible after `invalidateSection(0)` |
| 6 | Invalidation triggers during RHF editing (isDirty), not only on Zustand setInput | VERIFIED | All four forms have `useEffect` watching `isDirty` that calls `onSectionDirty`; CalculatorPage passes gated callbacks |
| 7 | Share URL generation works with non-ASCII unit labels without throwing | VERIFIED | `toBase64Url` uses `new TextEncoder().encode(input)` at url-codec.ts line 108; test with Japanese "訪問者" at test line 457 |
| 8 | URL hydration validates decoded inputs against form-aligned schemas before marking sections complete | VERIFIED | `validateSectionFields` function at App.tsx line 42 replaces simple non-null check; 3 new hydration tests (H9-H11) pass |
| 9 | Tampered URLs with impossible inputs are rejected | VERIFIED | `validateDecodedPayload` checks: dailyTraffic<=0 (line 273), testDurationDays<1 (line 276), thresholdUnit==null for non-any-positive (line 290), low>=high (line 301), studentTDf==null (line 311), sum>365 (line 316) |
| 10 | encodeWizardState errors are caught inside handleShare try/catch | VERIFIED | `EVSIVerdictCard.tsx` line 69: `try {` block contains `encodeWizardState` call at line 72 |
| 11 | Infeasible prior produces isInfeasiblePrior=true and UI suppresses interpretive cards | VERIFIED | `useEVSICalculations.ts` sets `isInfeasiblePrior = !Number.isFinite(rawEffectiveMean)` (line 406); `AdvancedResultsSection.tsx` gates on `results.isInfeasiblePrior` at lines 171 and 196 |
| 12 | Tie detection normalizes dollar thresholds to lift units before comparison | VERIFIED | `computeIsTie(effectivePriorMeanDecimal, threshold_L)` at AdvancedResultsSection.tsx line 54-59; call site passes `results.threshold_L` (line 140) |
| 13 | Waterfall uses effective feasible prior mean when truncation is material | VERIFIED | `WaterfallBlock` accepts `effectivePriorMeanPercent?: number` (line 45) and shows "adjusted" text when provided and differs by >0.1pp (line 71) |
| 14 | Box-Muller transform caches the sine component to halve RNG calls | VERIFIED | `_boxMullerSpare` module-level variable in abtest-math.ts (line 51); spare-cache test confirms 2 Math.random calls for first sample, still 2 for second (abtest-math.test.ts line 37) |
| 15 | net-value.ts uses liftFeasibilityBounds instead of hardcoded L_min/L_max | VERIFIED | Import at net-value.ts line 29; `const { L_min, L_max } = liftFeasibilityBounds(CR0)` at line 344; no `const L_min = -1` present |
| 16 | Timing-cost copy does not claim per-iteration computation | VERIFIED | ValueBreakdownCard.tsx line 42: "This is a derived decomposition (difference of two MC summaries)"; no "per Monte Carlo iteration" text |
| 17 | Unreachable both-directions interpretation branch is removed | VERIFIED | No `pStopsShip > 0.01 && pConvincesShip > 0.01` condition in AdvancedResultsSection.tsx; comment at line 276 confirms removal rationale |
| 18 | README testing instructions match actual package.json scripts | VERIFIED | README.md contains `npx vitest run` (line 115), `npx vitest` (line 118), and "570+ tests" (line 124) |

**Score:** 18/18 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/calculations/evsi.ts` | Exact CDF/PDF Student-t + truncated Normal posterior + quantile-bounded grid | VERIFIED | `jStat.studentt.cdf` at lines 167-168, `truncatedNormalMeanTwoSided` at line 499, `studentTQuantileBounds` at line 327, df<=1 guard at line 194 |
| `src/lib/calculations/evsi.test.ts` | Regression tests for SA-1, SA-2, SA-7 | VERIFIED | 16 new tests: SA-1 symmetric/asymmetric across CR0 values, SA-2 truncation-sensitive/negligible, SA-7 quantile vs 6*sigma regression |
| `src/stores/wizardStore.ts` | `invalidateSection` action with filter | VERIFIED | `invalidateSection` at line 79 with `filter((s) => s < section)` |
| `src/pages/CalculatorPage.tsx` | `onSectionDirty` callbacks to four forms | VERIFIED | `invalidateSection` selector, `handleBaselineDirty`, `handleUncertaintyDirty`, `handleThresholdDirty`, `handleExperimentDirty` wired to all four forms |
| `src/stores/wizardStore.test.ts` | 4+ invalidateSection tests + integration test | VERIFIED | 7 tests (lines 324-402) including full integration test |
| `src/components/forms/BaselineMetricsForm.tsx` | `onSectionDirty` prop + isDirty useEffect | VERIFIED | Prop at line 43, useEffect at lines 83-88 |
| `src/components/forms/UncertaintyPriorForm.tsx` | `onSectionDirty` prop + isDirty useEffect | VERIFIED | Prop at line 68, useEffect at lines 168-173 |
| `src/components/forms/ThresholdScenarioForm.tsx` | `onSectionDirty` prop + isDirty useEffect | VERIFIED | Prop at line 215, useEffect at lines 254-259 |
| `src/components/forms/ExperimentDesignForm.tsx` | `onSectionDirty` prop + isDirty useEffect | VERIFIED | Prop at line 45, useEffect at lines 96-101 |
| `src/lib/url-codec.ts` | UTF-8 safe encoding + expanded validation | VERIFIED | `TextEncoder` at line 108, `validateDecodedPayload` with 7 new domain checks |
| `src/lib/url-codec.test.ts` | Non-ASCII round-trip + impossible-input rejection tests | VERIFIED | Japanese chars test at line 453; 10 new tests covering all constraint checks |
| `src/components/results/EVSIVerdictCard.tsx` | encodeWizardState inside try/catch | VERIFIED | `try {` at line 69, `encodeWizardState` call inside at line 72 |
| `src/App.tsx` | `validateSectionFields` function replacing SECTION_REQUIRED_FIELDS | VERIFIED | Function at line 42; `SECTION_REQUIRED_FIELDS` constant absent |
| `src/App.test.tsx` | Hydration tests for invalid custom prior and minimum-lift scenarios | VERIFIED | H9-H11 tests pass (custom prior missing intervals, minimum-lift missing value, inverted intervals) |
| `src/hooks/useEVSICalculations.ts` | `isInfeasiblePrior`, `effectiveProbClears`, `threshold_L` on EVSICalculationResults | VERIFIED | Interface fields at lines 57, 61, 63; populated in `finalResults` useMemo |
| `src/components/results/AdvancedResultsSection.tsx` | computeIsTie uses threshold_L; infeasible-prior gate | VERIFIED | New signature at lines 54-59; suppression at lines 171/196 |
| `src/components/results/AdvancedResultsSection.test.tsx` | Infeasible suppression test, tie detection test | VERIFIED | `isInfeasiblePrior: true` tests at lines 375, 401; fixture at line 58 |
| `src/components/results/WaterfallBlock.tsx` | `effectivePriorMeanPercent` optional prop with adjusted text | VERIFIED | Prop at line 45; adjustment logic at lines 71-74 |
| `src/components/results/WaterfallBlock.test.tsx` | Effective-prior waterfall text tests | VERIFIED | Tests at lines 153, 173, 189 for adjusted/not-adjusted/within-threshold cases |
| `src/components/export/ExportCard.tsx` | "Prior input" / "Engine uses" distinction when truncation material | VERIFIED | `priorLabel = showEffectiveMeanAnnotation ? 'Prior input' : 'expected lift'` at line 152; "Engine uses:" text at line 428 |
| `src/lib/calculations/abtest-math.ts` | Cached Box-Muller with `_boxMullerSpare` and `_resetBoxMullerSpare` | VERIFIED | Module var at line 51; export at line 70 |
| `src/lib/calculations/abtest-math.test.ts` | Spare-cache test (Math.random call count) | VERIFIED | Test at line 37 confirms 2 calls for first sample, still 2 for second (cached) |
| `src/lib/calculations/net-value.ts` | `liftFeasibilityBounds` import, no hardcoded bounds | VERIFIED | Import at line 29; `liftFeasibilityBounds(CR0)` at line 344; no `const L_min = -1` |
| `src/lib/calculations/derived.ts` | File header updated from EVPI-specific language | VERIFIED | Lines 1-8 say "Derived calculation utilities for EVSI-based analysis" |
| `src/components/results/ValueBreakdownCard.tsx` | Timing-cost copy fixed | VERIFIED | "derived decomposition (difference of two MC summaries)" at lines 42-43 |
| `README.md` | npx vitest instructions, 570+ count | VERIFIED | `npx vitest run` at line 115; "570+ tests" at line 124 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `evsi.ts` | `jStat.studentt.cdf` | Exact CDF formula for truncated Student-t | WIRED | Called at lines 167, 168, 182 in `computeEffectivePriorMetrics` |
| `evsi.ts` | `truncatedNormalMeanTwoSided` | Posterior truncation correction for Normal branch | WIRED | Called at line 499 in `computePosteriorMean` |
| `evsi.ts` | `studentTQuantileBounds` | Quantile-bounded posterior grid | WIRED | Imported at line 32; called at line 327 in `computePosteriorMeanGrid` |
| `BaselineMetricsForm.tsx` | `CalculatorPage.tsx` | `onSectionDirty` callback on isDirty | WIRED | All 4 forms have `useEffect([isDirty, onSectionDirty])`; CalculatorPage passes gated callbacks |
| `CalculatorPage.tsx` | `wizardStore.ts` | `onSectionDirty` calls `invalidateSection(n)` | WIRED | `invalidateSection` selector in CalculatorPage; 4 gated dirty handlers |
| `url-codec.ts` | `TextEncoder` | UTF-8 safe encoding | WIRED | `new TextEncoder().encode(input)` at line 108 |
| `url-codec.ts` | `validateDecodedPayload` | Tightened domain validation on decode | WIRED | 7 constraint checks in `validateDecodedPayload`; called at line 456 in `decodeWizardState` |
| `App.tsx` | `url-codec.ts` | Hydration uses `validateSectionFields` | WIRED | `validateSectionFields` at line 42; loop at line 140 marks sections complete only when it returns true |
| `useEVSICalculations.ts` | `AdvancedResultsSection.tsx` | `isInfeasiblePrior`, `effectiveProbClears`, `threshold_L` on results | WIRED | Interface fields populated in useMemo (lines 439-441); AdvancedResultsSection reads `results.isInfeasiblePrior` and `results.threshold_L` |
| `AdvancedResultsSection.tsx` | `WaterfallBlock.tsx` | `effectivePriorMeanPercent` prop | WIRED | Prop passed when `truncationMaterial` is true |
| `abtest-math.ts` | `sampleStandardNormal` | Cached spare from Box-Muller sine component | WIRED | `_boxMullerSpare = r * Math.sin(theta)` at line 65; returned on next call |
| `net-value.ts` | `abtest-math.ts` | `liftFeasibilityBounds` import | WIRED | Import confirmed at line 29; used at line 344 |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 621 tests pass | `npx vitest run` | 621 passed (26 test files) | PASS |
| Build succeeds | `npx vite build` | `built in 2.69s`, no errors | PASS |
| SA-1: symmetric Student-t returns ~0.5 at threshold=0 | Test in evsi.test.ts | Asserts `toBeCloseTo(0.5, 1)` for CR0=0.05, 0.03, 0.01 | PASS |
| SA-7: quantile bounds wider than 6*sigma for df=3 | Test in evsi.test.ts | Asserts quantile bounds >= 2x wider | PASS |
| SA-11: Box-Muller spare cache halves RNG calls | Test in abtest-math.test.ts | Asserts `Math.random` called 2 times for first 2 samples | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SA-1 | 27-01 | Student-t effective-prior exact CDF/PDF (was broken Simpson integration) | SATISFIED | `jStat.studentt.cdf` in evsi.ts; symmetric tests pass |
| SA-2 | 27-01 | Truncation-aware Normal posterior mean in MC path | SATISFIED | `truncatedNormalMeanTwoSided` called in computePosteriorMean when truncation material |
| SA-3 | 27-04 | Infeasible prior propagation and UI suppression | SATISFIED | `isInfeasiblePrior` on hook results; AdvancedResultsSection gates interpretive cards |
| SA-4 | 27-04 | Waterfall and export use effective feasible prior mean | SATISFIED | `effectivePriorMeanPercent` prop on WaterfallBlock; ExportCard "Prior input"/"Engine uses" |
| SA-5 | 27-04 | Dollar-threshold tie detection in lift units | SATISFIED | `computeIsTie(effectivePriorMeanDecimal, threshold_L)` — no more unit mismatch |
| SA-6 | 27-05 | Timing-cost copy corrects per-iteration overclaim | SATISFIED | "derived decomposition (difference of two MC summaries)" in ValueBreakdownCard.tsx |
| SA-7 | 27-01 | Student-t posterior grid quantile-based bounds | SATISFIED | `studentTQuantileBounds(mu, scale, prior.df!, 0.0001, 0.9999)` in computePosteriorMeanGrid |
| SA-10a | 27-05 | Note about duplicate warning logic (document as-is) | SATISFIED | Acknowledged as documentation-only; no code artifact required per plan objective |
| SA-10b | 27-05 | net-value.ts uses shared liftFeasibilityBounds helper | SATISFIED | Import and use confirmed; no hardcoded `const L_min = -1` |
| SA-10c | 27-04 | effectiveProbClears exposed on hook results | SATISFIED | Field on EVSICalculationResults interface at line 57 |
| SA-10d | 27-05 | Remove unreachable both-directions interpretation branch | SATISFIED | No `pStopsShip > 0.01 && pConvincesShip > 0.01` condition in AdvancedResultsSection.tsx |
| SA-10e | 27-05 | Rename Student-t locals from sigma to scale | SATISFIED | `const scale = prior.sigma_L!` in Student-t branches of evsi.ts |
| SA-11 | 27-05 | Cache Box-Muller sine component to halve RNG calls | SATISFIED | `_boxMullerSpare` module variable; spare-cache test confirms behavior |
| CR-1 | 27-02 | Stale-values invalidation when editing completed sections | SATISFIED | `invalidateSection` store action + form isDirty detection + CalculatorPage wiring |
| CR-2 | 27-03 | Expanded URL decode validation for impossible inputs | SATISFIED | 7 domain constraint checks in `validateDecodedPayload`; App.tsx `validateSectionFields` |
| CR-3 | 27-03 | UTF-8 safe URL encoding for non-ASCII labels | SATISFIED | `TextEncoder` in `toBase64Url`; `encodeWizardState` inside try/catch |
| CR-4 | 27-04 | Plain-English explanation uses effective prior when truncation material | SATISFIED | `effectivePriorMeanPercent` prop gates "adjusted to X%" text in WaterfallBlock step 1 |
| CR-5 | 27-05 | README testing instructions updated to npx vitest | SATISFIED | `npx vitest run` and `npx vitest` in README; test count updated to "570+" |

**Requirements coverage: 18/18 — all satisfied**

Note: SA-1, SA-2, SA-7 share plan 27-01. SA-3, SA-4, SA-5, CR-4 share plan 27-04. SA-6, SA-10a-e, SA-11, CR-5 share plan 27-05.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/lib/calculations/derived.ts` (lines 45, 101) | Residual "EVPI calculation" in function-level JSDoc comments | Info | Non-blocking — file header was correctly updated; individual function comments pre-date phase 27 and are not misleading (function actually computes threshold normalization used in both EVPI and EVSI contexts) |

No blockers or warnings found. The one info-level item is not a stub, not a missing implementation, and does not affect correctness.

---

### Human Verification Required

#### 1. Stale-Values Invalidation (CR-1) — User Flow

**Test:** Complete all 4 wizard sections (see Results). Scroll back to section 0 (Baseline Metrics). Edit the conversion rate by typing a new value. Do NOT click "Continue" (keep editing). Check whether Results is accessible.
**Expected:** Results section becomes inaccessible immediately after the first keystroke (isDirty fires onSectionDirty, which calls invalidateSection(0)).
**Why human:** Cannot verify RHF isDirty trigger timing without running the browser app.

#### 2. WaterfallBlock Adjusted-Prior Text — Visual

**Test:** Configure a prior with a very narrow feasible range (high CR0, e.g., CR0=0.98, prior centered outside feasible zone). Navigate to results. Check waterfall step 1.
**Expected:** Step 1 text shows "your expected effect (X%) is adjusted to Y% after accounting for feasible outcomes" with X != Y.
**Why human:** Requires browser rendering; cannot verify text content from static analysis when effectivePriorMeanPercent is populated by the running hook.

#### 3. Infeasible Prior UI Suppression — Visual

**Test:** Configure a baseline CR of 0.90 with a prior expecting a 100%+ lift (prior interval 50% to 200%). Navigate to results.
**Expected:** See the amber "Prior belief is infeasible" message instead of waterfall and supporting cards.
**Why human:** Requires browser rendering and domain-specific input configuration.

#### 4. Share URL with Non-ASCII Label — Browser

**Test:** Set visitor unit label to "訪問者" (Japanese) or emoji. Complete all sections. Click "Share". Paste the URL in a new tab.
**Expected:** URL generates without error, and the shared view shows the correct Japanese label.
**Why human:** Requires clipboard interaction and browser navigation.

---

### Gaps Summary

No gaps found. All 18 requirement IDs are satisfied. All artifacts exist, are substantive, and are wired. All key links are verified. The full test suite (621 tests, 26 files) passes. Build succeeds.

---

_Verified: 2026-04-15T14:39:40Z_
_Verifier: Claude Sonnet 4.6 (gsd-verifier)_
