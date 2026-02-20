# Code Review Report

## Scope
Full repository review focused on correctness, security/privacy, edge cases, test coverage, readability/maintainability, and CI risk.

## Findings (Ordered by Severity)

### 1. High: CI is currently broken (lint + tests fail)
- Impact: Pipeline is red today. `npm run lint` fails with errors, and `npm test` fails with 2 failing test files.
- Evidence:
  - `src/components/results/AdvancedResultsSection.test.tsx:18`
  - `src/components/results/ResultsSection.test.tsx:17`
  - `src/App.test.tsx:44`
  - `src/components/results/ResultsSection.test.tsx:153`
- Why this matters: This blocks merges/releases if CI runs lint/tests.

#### Patch suggestion A (remove stale vitest-axe type augmentation)
The runtime matcher is already wired in `src/test/setup.ts`, so the local `declare module 'vitest'` blocks are unnecessary and now violate lint rules.

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
```

#### Patch suggestion B (update stale test selectors/content)
```diff
--- a/src/App.test.tsx
+++ b/src/App.test.tsx
@@
-    fireEvent.click(screen.getByRole('button', { name: 'Should I Test That?' }));
+    fireEvent.click(screen.getByRole('button', { name: 'Experimentation' }));
```

```diff
--- a/src/components/results/ResultsSection.test.tsx
+++ b/src/components/results/ResultsSection.test.tsx
@@
-    const regretCard = screen.getByText('Chance you\'d regret not testing').closest('div');
+    const regretCard = screen.getByText('Regret Risk').closest('div');
```

---

### 2. High: Advanced export chart can show mathematically incorrect threshold/context
- Impact: Exported PNGs in Advanced mode can communicate incorrect decision thresholds and scaling.
- Evidence:
  - `src/components/export/ExportButton.tsx:143`
  - `src/components/export/ExportButton.tsx:146`
  - `src/components/export/ExportButton.tsx:153`
- Root causes:
  - `chartK` is hardcoded to `100000` in Advanced mode.
  - `threshold_L` is computed as `thresholdValue / 100` regardless of threshold unit; dollar thresholds are not normalized using K.
- Why this matters: The exported chart is a share artifact; incorrect threshold math undermines trust and can mislead decisions.

#### Patch suggestion
```diff
--- a/src/components/export/ExportButton.tsx
+++ b/src/components/export/ExportButton.tsx
@@
 import { computePriorFromInterval, DEFAULT_PRIOR, DEFAULT_INTERVAL } from '@/lib/prior';
+import { deriveK, normalizeThresholdToLift } from '@/lib/calculations';
@@
-  const chartK = mode === 'basic' ? props.evpiResults.K : props.evsiResults.evsi.evsiDollars > 0
-    ? 100000 // Fallback K value
-    : 100000;
+  const chartK = deriveK(
+    sharedInputs.annualVisitors ?? 0,
+    sharedInputs.baselineConversionRate ?? 0,
+    sharedInputs.valuePerConversion ?? 0
+  );
@@
-  const threshold_L = mode === 'basic'
-    ? props.evpiResults.threshold_L
-    : sharedInputs.thresholdScenario === 'any-positive'
-      ? 0
-      : (sharedInputs.thresholdValue ?? 0) / 100; // Convert percent to decimal
+  const threshold_L = mode === 'basic'
+    ? props.evpiResults.threshold_L
+    : sharedInputs.thresholdScenario === 'any-positive'
+      ? 0
+      : normalizeThresholdToLift(
+          sharedInputs.thresholdValue ?? 0,
+          sharedInputs.thresholdUnit ?? 'lift',
+          chartK
+        );
@@
-  const actualK = mode === 'basic' ? props.evpiResults.K : chartK;
+  const actualK = mode === 'basic' ? props.evpiResults.K : chartK;
```

---

### 3. Medium: RUM is initialized unconditionally with production settings in all environments
- Impact: Local/dev/preview sessions can be tracked as `production`; this is a privacy and telemetry hygiene risk and can pollute production analytics.
- Evidence:
  - `src/main.tsx:9`
  - `src/main.tsx:14`
  - `src/main.tsx:17`
- Why this matters: Security/privacy and observability correctness. Hardcoded `env: 'production'` and static credentials reduce deployment safety.

#### Patch suggestion
```diff
--- a/src/main.tsx
+++ b/src/main.tsx
@@
-datadogRum.init({
-  applicationId: '...'
-  clientToken: '...'
-  env: 'production',
+if (import.meta.env.PROD && import.meta.env.VITE_DD_APPLICATION_ID && import.meta.env.VITE_DD_CLIENT_TOKEN) {
+  datadogRum.init({
+    applicationId: import.meta.env.VITE_DD_APPLICATION_ID,
+    clientToken: import.meta.env.VITE_DD_CLIENT_TOKEN,
+    env: import.meta.env.VITE_APP_ENV ?? 'production',
     ...
-})
+  })
+}
```

---

### 4. Medium: Worker failure path drops valid Advanced results with no user-facing fallback
- Impact: If Worker creation fails (browser policy, unsupported env, intermittent worker load issues), advanced results become `null` despite valid inputs.
- Evidence:
  - `src/hooks/useEVSICalculations.ts:351`
  - `src/hooks/useEVSICalculations.ts:377`
  - `src/hooks/useEVSICalculations.ts:379`
- Why this matters: Reliability regression and hard-to-debug user behavior.

#### Patch suggestion
In the `catch` block, compute EVSI + net value on main thread as a fallback instead of nulling results:
```diff
-      } catch (error) {
-        console.error('EVSI Worker error:', error);
-        if (currentRequestId === requestIdRef.current) {
-          setWorkerResults(null);
-          setNetValueResults(null);
-          setLoading(false);
-        }
-      }
+      } catch (error) {
+        console.error('EVSI Worker error:', error);
+        if (currentRequestId === requestIdRef.current) {
+          const fallbackEvsi = calculateEVSIMonteCarlo(evsiInputs, 5000);
+          const fallbackNet = calculateNetValueMonteCarlo(netValueInputs, 5000);
+          setWorkerResults(fallbackEvsi);
+          setNetValueResults(fallbackNet);
+          setLoading(false);
+        }
+      }
```

---

### 5. Low: Existing lint warnings indicate future maintenance risk (React Compiler compatibility + effect cleanup)
- Evidence:
  - `src/components/forms/BaselineMetricsForm.tsx:73`
  - `src/components/forms/ThresholdScenarioForm.tsx:245`
  - `src/hooks/useEVSICalculations.ts:396`
- Why this matters: Not blocking runtime now, but these warnings usually become future friction.

#### Patch suggestion
- Prefer `useWatch` from react-hook-form over direct `watch()` in render scope where possible.
- In `useEVSICalculations` cleanup, capture request id locally for explicit intent and warning removal.

## Test Coverage Gaps
- No focused tests for Advanced export threshold conversion across `thresholdUnit = 'dollars'` vs `'lift'`.
- No tests asserting Advanced export uses real derived `K` instead of a placeholder.
- No tests covering Worker failure fallback behavior (currently only logs and nulls).

## Suggested Additions
1. Add unit tests for `ExportButton` advanced threshold math using both units.
2. Add a test for Worker-unavailable environment to assert fallback results are still returned.
3. Re-run CI checks after fixes: `npm run lint`, `npm test`, `npm run build`.

## Current CI Status Snapshot
- `npm run lint`: failing (6 errors, 3 warnings).
- `npm test`: failing (2 failed tests, 461 passed).
- `npm run build`: passing (bundle warning for large chunk).
