---
status: issues_found
phase: 27
depth: standard
files_reviewed: 27
findings:
  critical: 2
  warning: 8
  info: 4
  total: 14
---

# Code Review: Phase 27

## Summary

Phase 27 delivers meaningful fixes for the Student-t CDF/PDF formulas, Box-Muller caching, UTF-8 URL encoding, and infeasible-prior propagation. The statistical math in `evsi.ts` is materially improved. However, two critical gaps remain: the stale-values invalidation (CR-1) does not fire for in-progress edits before re-submit, and several required fields in `wizardStore.test.ts` are missing from the `beforeEach` reset, leaving tests in a subtly inconsistent initial state.

---

## Findings

### critical-1: CR-1 invalidation does not fire during in-progress form edits
**File:** `src/components/forms/BaselineMetricsForm.tsx:84` (and `ExperimentDesignForm.tsx:97`, `UncertaintyPriorForm.tsx:169`, `ThresholdScenarioForm.tsx:255`)
**Severity:** critical
**Description:** Every form wires `isDirty && onSectionDirty()` inside a `useEffect`. React Hook Form's `isDirty` tracks whether form values have diverged from `defaultValues` — it becomes `true` on the very first keystroke. However, `setInput()` (and therefore `invalidateSection()`) is only called on successful form submission, not during typing. This means:
1. A user with completed sections edits baseline conversion rate by typing one character.
2. `isDirty` → `true` immediately, `onSectionDirty` fires, `invalidateSection(0)` removes all downstream completions.
3. The user has not yet committed the edit; the new value is not in the store.
4. If the user then navigates away without re-submitting, the store still holds the old (pre-edit) value but downstream sections are already invalidated — the results section becomes inaccessible even though the stored inputs are still valid.

The bug is the inverse of the original concern: invalidation fires too eagerly (on first keystroke) rather than on blur/submit. This can cause false invalidations that lock a user out of Results without any actual change to the computation inputs.
**Suggestion:** Move `onSectionDirty` out of the `isDirty` watch effect and instead call it from inside the `onSubmit` callback (after `setInput` calls commit the new values). Alternatively, fire it on blur of each field, but only after the blur handler has parsed and committed the new value to the store. This ensures invalidation is tied to a real value change, not an in-progress edit.

---

### critical-2: wizardStore.test.ts `beforeEach` reset omits `sharedNetValue`
**File:** `src/stores/wizardStore.test.ts:9`
**Severity:** critical
**Description:** The `beforeEach` reset sets:
```js
useWizardStore.setState({
  inputs: { ...initialInputs },
  currentSection: 0,
  completedSections: [],
  guideEnabled: true,
  sharedBaseline: null,
});
```
It omits `sharedNetValue` and `analysisName`. Because `setState` performs a shallow merge (not a replacement) in Zustand, a test that sets `sharedNetValue` via `setSharedNetValue(...)` will leak that value into subsequent tests. The `resetWizard` tests do cover clearing `sharedNetValue`, but the isolation contract for all other tests is broken if any test runs `setSharedNetValue` before them.
**Suggestion:** Add `sharedNetValue: null` and `analysisName: ''` to every `useWizardStore.setState(...)` call in `beforeEach`.

---

### warning-1: Box-Muller spare cache is module-level mutable state; test isolation relies on `_resetBoxMullerSpare` being called
**File:** `src/lib/calculations/abtest-math.ts:51`
**Severity:** warning
**Description:** `_boxMullerSpare` is declared as a module-level `let` variable. Because Vitest (and Jest) reuse module instances across tests in the same file by default, any test that consumes an odd number of `sampleStandardNormal()` calls will leave a cached spare value that bleeds into the next test. The test file uses `_resetBoxMullerSpare()` in a `beforeEach`, which is correct for the tests in `abtest-math.test.ts`. However, any test file that imports `sampleStandardNormal` without resetting (e.g., `evsi.test.ts`) inherits whatever spare the previous test left. If Vitest runs test files sequentially and shares module state, this can cause non-deterministic RNG sequences even when `Math.random` is mocked with a seeded LCG.
**Suggestion:** Call `_resetBoxMullerSpare()` at the top of the `beforeEach` in `evsi.test.ts` as well, or export a reset function that is called from a global test setup.

---

### warning-2: `computeEffectivePriorMetrics` Student-t truncated mean formula uses `Z` (feasibility mass) as denominator, but this is not the same Z used in the truncated mean derivation
**File:** `src/lib/calculations/evsi.ts:207`
**Severity:** warning
**Description:** The truncated mean formula for a standardised Student-t on `[a, b]` is:
```
E[Z | a≤Z≤b] = ((df + a²)·f(a) − (df + b²)·f(b)) / ((df − 1) · Z_std)
```
where `Z_std = F(b) − F(a)` (the normalising mass over `[a, b]`). In the code the denominator uses `(df - 1) * Z` where `Z` is computed as `Fb - Fa` (lines 168-169). These are the same quantity, so the formula is mathematically correct. **However**, if `Z` underflows to `0` and the `Z < 1e-10` guard is not triggered (because `Z` is exactly 0 at the float level but the guard fires slightly above it), `truncatedStdMean` becomes `Infinity` or `NaN` and propagates into `effectivePriorMean`. The guard at line 172 (`if (Z < 1e-10) return NaN`) appears before the formula but relies on `Z` being accurately computed. For very low-df Student-t with extreme bounds, floating-point subtraction of two nearly-equal CDF values can lose precision. A secondary `Number.isFinite(truncatedStdMean)` check before returning would prevent silent NaN propagation.
**Suggestion:** After computing `truncatedStdMean`, add: `if (!Number.isFinite(truncatedStdMean)) { return { effectivePriorMean: NaN, effectiveProbClears: NaN }; }`.

---

### warning-3: `computePosteriorMean` Normal truncation check uses incorrect threshold `1 - 0.001`
**File:** `src/lib/calculations/evsi.ts:498`
**Severity:** warning
**Description:** The truncation trigger reads:
```ts
if (truncatedMass < 1 - 0.001) {
```
`truncatedMass` is `PhiBeta - PhiAlpha`, which equals the fraction of the posterior that lies within `[L_min, L_max]`. When truncation is negligible, `truncatedMass ≈ 1.0` and the condition is `false` (does not truncate) — correct. When truncation removes more than 0.1% of mass, `truncatedMass < 0.999` and the condition is `true` — also correct. The logic is sound but is written in a confusing double-negative form. More critically, the comment says "threshold matches `TRUNCATION_THRESHOLD (0.001)`" but `TRUNCATION_THRESHOLD` is applied in `feasibility.ts` to infeasible *tail* mass (the mass outside feasibility), not to the truncated posterior mass. The two quantities measure different things. If `TRUNCATION_THRESHOLD` is ever changed, these two uses will silently diverge.
**Suggestion:** Replace the magic literal `0.001` with a named constant (e.g., `POSTERIOR_TRUNCATION_THRESHOLD`) and add a comment clarifying it is the minimum fraction of posterior mass that must be inside feasibility bounds to skip truncated-normal adjustment.

---

### warning-4: `decodeWizardState` passes `originalVersion` to validation before migrations run, but runs migrations before passing the version
**File:** `src/lib/url-codec.ts:419,456`
**Severity:** warning
**Description:** `originalVersion` is captured before the migration loop (line 419). The migration loop then transforms the payload to `SCHEMA_VERSION`. `validateDecodedPayload` is called with `originalVersion` (line 456) to apply version-aware validation rules — v1 payloads get loose rules, v2 payloads get tight rules. This is intentional for backward compatibility. However, the migration functions (lines 90-92) currently transform v0→v1→v2 with identity transforms (no field changes). If a future migration *removes* a field that v2 strict validation now requires, payloads migrated from v0 will pass the loose v1 validation rules even though they are being evaluated as v2 data structures. The version-aware validation was designed to handle this, but the comment at line 455 says "v1 uses loose rules" — yet after migration those payloads are fully v2 data. This is a latent correctness trap rather than a current bug.
**Suggestion:** Add a code comment on the `validateDecodedPayload` call clearly explaining that `originalVersion` is intentionally the pre-migration version for backward-compat purposes, and that this assumption will need revisiting if future migrations change field semantics.

---

### warning-5: `url-codec.ts` prior-interval narrowness check uses URL percentage values, but comment is misleading
**File:** `src/lib/url-codec.ts:304`
**Severity:** warning
**Description:** The comment reads:
```
// URL stores in percentage form, so check >= 0.1
if (high - low < 0.1) return null;
```
The threshold `0.1` is intended to prevent impossibly narrow intervals (0.1 percentage points). However, `priorIntervalLow` and `priorIntervalHigh` are stored in the wizard inputs as **percentage form** (e.g., `-5` for -5%), not decimal. The URL encodes these raw values. So `high - low < 0.1` means less than 0.1 percentage points — equivalent to 0.001 in decimal form. This is correct, but the comment's claim that "Interval must not be impossibly narrow (0.001 in decimal = 0.1 in percentage)" is inverted: 0.001 in decimal **is** 0.1 in percentage. The numeric threshold is correct; the comment is backwards.
**Suggestion:** Fix the comment: `// URL stores in percentage form; 0.1 = 0.1 percentage points = 0.001 decimal. Reject intervals narrower than 0.1pp.`

---

### warning-6: `AdvancedResultsSection` computes `rawPriorMean` from form inputs, not from engine
**File:** `src/components/results/AdvancedResultsSection.tsx:118`
**Severity:** warning
**Description:** `rawPriorMeanDecimal` is computed as `(priorLow + priorHigh) / 2 / 100` from the raw form inputs, and used to detect whether truncation is material (`truncationMaterial`). This is an approximation: the actual raw prior mean depends on the prior shape (Normal vs Student-t vs Uniform), not just the midpoint of the interval. For a symmetric Normal or Uniform prior the midpoint equals the mean, but the formula is used for all prior shapes and for Student-t the mean is the same as Normal (since it is also location-scale). For Uniform, `(low + high) / 2` is also the mean. So in practice the formula is correct for all three currently-supported shapes, but only by coincidence — there is no guard against future shape additions.
**Suggestion:** Add an explanatory comment: "For Normal, Student-t, and Uniform, the raw prior mean equals (low + high) / 2. This must be revisited if new prior shapes are added."

---

### warning-7: `UncertaintyPriorForm` sync effect has an eslint suppression comment for `setValue` dependency but the omission is incorrect
**File:** `src/components/forms/UncertaintyPriorForm.tsx:337`
**Severity:** warning
**Description:** The effect at lines 328-338 intentionally omits `setValue` from its dependency array, with the comment: "react-hook-form's setValue is not memoized and changes reference every render." This is accurate — RHF's `setValue` does change reference on every render, so including it would cause the effect to run every render and overwrite user input. The suppression is therefore intentionally correct. However, the `// eslint-disable-next-line react-hooks/exhaustive-deps` comment silences the lint warning without explaining the performance/correctness reason, making it easy for a future reviewer to remove it thinking it is an oversight.
**Suggestion:** Expand the suppression comment to explain why `setValue` is explicitly omitted and what the consequence of including it would be, to prevent accidental re-introduction.

---

### warning-8: `computePosteriorMeanGrid` `gridSize + 1` loop produces `gridSize + 1` points but `gridStep` assumes `gridSize` intervals
**File:** `src/lib/calculations/evsi.ts:358`
**Severity:** warning
**Description:** The grid is defined as:
```ts
const gridStep = (L_max - L_min) / gridSize;
for (let i = 0; i <= gridSize; i++) {  // gridSize + 1 iterations
```
This is correct — it produces `gridSize + 1` points spanning `[L_min, L_max]` inclusive, with `gridSize` equal-width intervals. This is the standard midpoint/endpoint grid formulation. However, it is easy to read as an off-by-one error (one more iteration than `gridSize`). The comment says "Number of grid points (default 200)" in the JSDoc but the actual number of evaluated points is 201, not 200. This is a minor documentation issue but could confuse a statistician auditing the integration.
**Suggestion:** Update the JSDoc: `@param gridSize - Number of intervals in the integration grid (evaluates gridSize + 1 points, including both endpoints).`

---

### info-1: `App.tsx` URL hydration marks sections complete before infeasibility can be detected
**File:** `src/App.tsx:139`
**Severity:** info
**Description:** The URL hydration loop at lines 139-143 marks section 1 complete if `priorType !== null` and (for custom priors) intervals are valid. It does not check whether the prior is *feasible* given the decoded `baselineConversionRate`. A recipient arriving via a shared URL where the prior is infeasible (entire interval outside `[L_min, L_max]`) will land on a completed wizard with the Results section accessible, but the results will show $0 with an infeasibility warning. This is not a crash, but it is a confusing first impression for the recipient. The infeasibility check requires running `computeEffectivePriorMetrics`, which is a pure function and could be called during hydration.
**Suggestion:** Consider a future enhancement: after marking sections complete, call `computeEffectivePriorMetrics` with the decoded inputs, and if it returns NaN, do not mark section 1 complete (or add a visible pre-flight warning). This is a UX improvement, not a correctness bug.

---

### info-2: `App.test.tsx` H8 assertion uses `window.location.pathname` without `window.location.search`
**File:** `src/App.test.tsx:194`
**Severity:** info
**Description:** The test asserts:
```ts
expect(window.history.replaceState).toHaveBeenCalledWith(
  null,
  '',
  window.location.pathname
);
```
The production code at `App.tsx:157` calls:
```ts
window.history.replaceState(null, '', window.location.pathname + window.location.search);
```
In the test environment `window.location.search` is likely `''`, making the test pass. But if a test ever sets a query string, the assertion would incorrectly fail. The test should mirror the production code exactly.
**Suggestion:** Update the test assertion to `window.location.pathname + window.location.search` to match the production call.

---

### info-3: `ValueBreakdownCard` timing-cost display treats negative `timingCostsDollars` as a gain with `+` prefix, which is semantically ambiguous
**File:** `src/components/results/ValueBreakdownCard.tsx:88`
**Severity:** info
**Description:** The timing cost row renders:
```ts
{timingCostsDollars > 0 ? '-' : timingCostsDollars < 0 ? '+' : ''}
```
When `timingCostsDollars < 0` (EVSI < Net Value, which can happen when the default decision is already optimal and a very short test barely delays it), the row shows `+$X` in the "Timing costs (est.)" row. This is arithmetically correct (a negative timing cost is a timing gain), but the label says "Timing costs" which implies a negative number. A user seeing `Timing costs (est.) +$200` may be confused.
**Suggestion:** When `timingCostsDollars < 0`, consider changing the label from "Timing costs (est.)" to "Timing benefit (est.)" dynamically, or add a tooltip explaining the sign convention.

---

### info-4: `evsi.test.ts` references `df: 30` Student-t prior, which is outside the product-constrained set `{3, 5, 10}`
**File:** `src/lib/calculations/evsi.test.ts:228`
**Severity:** info
**Description:** The test "Student-t with high df approaches Normal" uses `df: 30`. The `PriorDistribution` type allows any positive integer for `df`, and the calculation engine (`jStat.studentt.cdf`) handles arbitrary `df` correctly. However, the URL codec's `ENUM_CONSTRAINTS.studentTDf` only allows `{3, 5, 10}`. A `df: 30` prior can only be constructed programmatically (in tests or direct API calls), not via the UI or URL hydration. The test is valid as a mathematical sanity check of the engine, but it implicitly tests a code path that end users cannot reach through the product. This is not a bug but worth noting for test auditability.
**Suggestion:** Add a comment to this test clarifying that `df: 30` is outside the UI-allowed set and is being used purely to verify mathematical convergence toward the Normal distribution.
