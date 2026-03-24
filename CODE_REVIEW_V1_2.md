# v1.2 Full Code Review

## Executive Summary
The repository has strong core calculation test coverage, but **CI is currently red** and there are a few correctness/privacy regressions around the new v1.2 mode-switch backup flow.

## Findings (highest severity first)

### 1. High: CI is currently broken (lint + tests)
**Impact:** merges/releases are blocked in a standard CI pipeline.

**Evidence**
- Lint errors:
  - `src/components/results/AdvancedResultsSection.test.tsx:17`
  - `src/components/results/ResultsSection.test.tsx:16`
- Test failures:
  - `src/App.test.tsx:44`
  - `src/components/results/ResultsSection.test.tsx:153`

**Details**
- `declare module 'vitest'` blocks in two test files trigger `no-empty-object-type` and unused generic errors.
- UI copy changed, but tests still assert old strings (`"Should I Test That?"`, `"Chance you'd regret not testing"`).

**Patch suggestion**
```diff
--- a/src/components/results/AdvancedResultsSection.test.tsx
+++ b/src/components/results/AdvancedResultsSection.test.tsx
@@
-import { axe, type AxeMatchers } from 'vitest-axe';
+import { axe } from 'vitest-axe';
@@
-declare module 'vitest' {
-  interface Assertion<T> extends AxeMatchers {}
-  interface AsymmetricMatchersContaining extends AxeMatchers {}
-}
```

```diff
--- a/src/components/results/ResultsSection.test.tsx
+++ b/src/components/results/ResultsSection.test.tsx
@@
-import { axe, type AxeMatchers } from 'vitest-axe';
+import { axe } from 'vitest-axe';
@@
-declare module 'vitest' {
-  interface Assertion<T> extends AxeMatchers {}
-  interface AsymmetricMatchersContaining extends AxeMatchers {}
-}
@@
-const regretCard = screen.getByText('Chance you\'d regret not testing').closest('div');
+const regretCard = screen.getByText('Regret Risk').closest('div');
```

```diff
--- a/src/App.test.tsx
+++ b/src/App.test.tsx
@@
-fireEvent.click(screen.getByRole('button', { name: 'Should I Test That?' }));
+fireEvent.click(screen.getByRole('button', { name: 'Experiment Value Calculator' }));
```

---

### 2. High: `resetWizard()` does not clear v1.2 local backups, so old state can reappear after reset
**Impact:** user chooses “reset”, but old advanced/basic state can be restored on next mode switch. This is a real behavioral regression.

**Evidence**
- Backups written/read in mode switching:
  - `src/stores/wizardStore.ts:84`
  - `src/stores/wizardStore.ts:100`
  - `src/stores/wizardStore.ts:124`
  - `src/stores/wizardStore.ts:140`
- Reset path does not clear backup keys:
  - `src/stores/wizardStore.ts:254`

**Why this is problematic**
- `resetWizard()` only resets in-memory + persisted session store state.
- Local backups (`wizard-advanced-backup`, `wizard-basic-backup`) remain and can repopulate fields/sections later via `setMode()`.

**Patch suggestion**
```diff
--- a/src/stores/wizardStore.ts
+++ b/src/stores/wizardStore.ts
@@
       resetWizard: () => {
+        try {
+          localStorage.removeItem('wizard-advanced-backup');
+          localStorage.removeItem('wizard-basic-backup');
+        } catch {
+          // ignore storage errors
+        }
         set({
           mode: 'basic',
           inputs: initialInputs,
           currentSection: 0,
           completedSections: [],
         });
       },
```

---

### 3. Medium: v1.2 changed persistence scope from session-only to durable localStorage for sensitive input/state
**Impact:** business inputs and section progression now survive browser restarts, conflicting with documented “session only” behavior and increasing privacy risk.

**Evidence**
- Session-only claim in file header comments:
  - `src/stores/wizardStore.ts:9`
  - `src/stores/wizardStore.ts:15`
- Local persistence introduced:
  - `src/stores/wizardStore.ts:84`
  - `src/stores/wizardStore.ts:124`

**Risk**
- Sensitive experimentation assumptions remain on shared machines unexpectedly.
- Behavior/documentation mismatch causes operator surprise.

**Patch options**
1. If persistence should be session-only: switch backups to `sessionStorage`.
2. If persistent by design: update docs/UI copy and provide a “clear saved mode backups” control.

Example (session-scoped backups):
```diff
-localStorage.setItem('wizard-advanced-backup', ...)
+sessionStorage.setItem('wizard-advanced-backup', ...)
```

---

### 4. Medium: Advanced export chart is still mathematically incorrect in some scenarios
**Impact:** shared PNG can show wrong threshold interpretation and distorted dollar conversion context.

**Evidence**
- Hardcoded fallback `K = 100000` in advanced mode:
  - `src/components/export/ExportButton.tsx:143`
  - `src/components/export/ExportButton.tsx:146`
- Threshold conversion assumes percent and ignores threshold unit in advanced mode:
  - `src/components/export/ExportButton.tsx:153`

**Why this matters**
- If threshold is entered in dollars, `(thresholdValue / 100)` is wrong.
- Tooltip/chart interpretation depending on `K` is also wrong with a constant placeholder.

**Patch suggestion**
Use `deriveK(...)` from shared inputs and `normalizeThresholdToLift(...)` with actual threshold unit.

```diff
--- a/src/components/export/ExportButton.tsx
+++ b/src/components/export/ExportButton.tsx
@@
 import { computePriorFromInterval, DEFAULT_PRIOR, DEFAULT_INTERVAL } from '@/lib/prior';
+import { deriveK, normalizeThresholdToLift } from '@/lib/calculations';
@@
-const chartK = ... ? 100000 : 100000;
+const chartK = deriveK(
+  sharedInputs.annualVisitors ?? 0,
+  sharedInputs.baselineConversionRate ?? 0,
+  sharedInputs.valuePerConversion ?? 0
+);
@@
-: (sharedInputs.thresholdValue ?? 0) / 100;
+: normalizeThresholdToLift(
+    sharedInputs.thresholdValue ?? 0,
+    sharedInputs.thresholdUnit ?? 'lift',
+    chartK
+  );
```

---

### 5. Medium: Worker error path drops results instead of using fallback compute path
**Impact:** in environments where `Worker` is unavailable/fails (already seen in tests), advanced results collapse to null.

**Evidence**
- Worker creation and nulling on failure:
  - `src/hooks/useEVSICalculations.ts:351`
  - `src/hooks/useEVSICalculations.ts:377`
  - `src/hooks/useEVSICalculations.ts:379`

**Recommendation**
Use synchronous Monte Carlo fallback in catch block (`calculateEVSIMonteCarlo` + `calculateNetValueMonteCarlo`) before returning null.

---

### 6. Low: Datadog RUM is initialized unconditionally as production
**Impact:** local/dev traffic can be captured as production, and telemetry config is hard-coded in source.

**Evidence**
- `src/main.tsx:9`
- `src/main.tsx:14`

**Recommendation**
Gate initialization on `import.meta.env.PROD` and source tokens/env from Vite env vars.

---

### 7. Low: Existing warnings indicate future maintenance friction
**Evidence**
- React compiler compatibility warnings:
  - `src/components/forms/BaselineMetricsForm.tsx:73`
  - `src/components/forms/ThresholdScenarioForm.tsx:245`
- Hook cleanup warning:
  - `src/hooks/useEVSICalculations.ts:396`

**Recommendation**
- Prefer `useWatch` where practical.
- Capture ref value locally in effect cleanup path to satisfy exhaustive-deps warning intent.

## Test Coverage Gaps
1. Missing test: `resetWizard()` followed by mode switch should **not** restore stale local backups.
2. Missing tests for advanced export threshold conversion when `thresholdUnit='dollars'`.
3. Missing tests for Worker-unavailable fallback behavior.

## Current Quality Gate Snapshot (v1.2)
- `npm run lint`: fails (`6 errors, 3 warnings`)
- `npm test`: fails (`2 failed, 464 passed`)
- `npm run build`: passes (with large-chunk warning)
