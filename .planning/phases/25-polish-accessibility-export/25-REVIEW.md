---
status: issues_found
phase: 25-polish-accessibility-export
depth: standard
files_reviewed: 16
findings:
  critical: 3
  warning: 5
  info: 4
  total: 12
---

# Code Review: Phase 25

## Summary

Phase 25 adds PNG export (ExportButton, ExportCard, useExportPng), Datadog analytics integration, accessibility improvements on all three input components, and a BouncingDots animation indicator. The architecture is sound and the a11y additions (aria-label, aria-invalid, aria-describedby, role="img", sr-only, motion-reduce) are well-structured. However, running `tsc --noEmit` directly (bypassing rtk) reveals 3 critical type errors that would produce a broken runtime in production: a missing required discriminant prop, an import of a non-existent type, and a function called with the wrong arity. There are also several warning-level issues and a few informational observations.

---

## Findings

### CR-001: Missing `mode` prop on ExportButton — runtime discriminated-union failure
**Severity:** critical
**File:** `src/components/results/AdvancedResultsSection.tsx:241`
**Description:** `ExportButton` is a discriminated union (`BasicModeProps | AdvancedModeProps`) where `mode` is a required discriminant field on both branches. The call site in `AdvancedResultsSection.tsx` passes `evsiResults`, `sharedInputs`, `prior`, `testDurationDays`, and `analysisName` but omits `mode` entirely. At runtime `props.mode` is `undefined`, causing the guard `if (mode === 'basic')` to always be false, which silently falls through to the advanced-mode branch regardless of intent. TypeScript (when invoked directly via `node_modules/.bin/tsc --noEmit`) confirms this as `TS2322: Property 'mode' is missing in type … but required in type 'AdvancedModeProps'`.
**Suggestion:** Add `mode="advanced"` to the JSX call:
```tsx
<ExportButton
  mode="advanced"
  evsiResults={results}
  sharedInputs={inputs}
  prior={prior}
  testDurationDays={inputs.testDurationDays ?? undefined}
  analysisName={analysisName}
/>
```

---

### CR-002: Import of non-existent type `EVPIResults`
**Severity:** critical
**File:** `src/components/export/ExportButton.tsx:23`
**Description:** The file imports `EVPIResults` from `@/lib/calculations/types`, but that module only exports `EVSIResults`. TypeScript confirms `TS2724: '"@/lib/calculations/types"' has no exported member named 'EVPIResults'`. Because `EVPIResults` is used as the type of `BasicModeProps.evpiResults`, the `BasicModeProps` branch is effectively untyped at runtime, which could suppress type guards that rely on it. Since the `basic` mode branch may now be unreachable (see CR-001), this is doubly problematic.
**Suggestion:** Audit whether `BasicModeProps` is still needed (given the single-mode architecture). If not, remove it. If the basic mode path is intentional, define `EVPIResults` in `src/lib/calculations/types.ts` with the appropriate shape, or alias the correct existing type.

---

### CR-003: `useGuideMessages` called with 4 arguments; function accepts 3
**Severity:** critical
**File:** `src/pages/CalculatorPage.tsx:116`
**Description:** `useGuideMessages(activeSection, guideTrigger, enabledSections, guideEnabled)` passes 4 arguments. The function signature in `src/hooks/useGuideMessages.ts:89-93` accepts only 3 (`activeSection`, `triggerEvent`, `enabledSections?: Set<string>`). TypeScript confirms `TS2554: Expected 2-3 arguments, but got 4`. The 4th argument `guideEnabled` is silently ignored, meaning the guide system has no way to gate on the toggle — the guide messages will always advance regardless of whether the user has enabled the guide overlay.
**Suggestion:** Add `guideEnabled?: boolean` as the 4th parameter to `useGuideMessages`, or pass it via a different mechanism (the hook could subscribe to the store directly). The current behavior makes the guide overlay dismissal partially ineffective.

---

### WR-001: `ExportCard` receives `testDurationDays` but never uses it
**Severity:** warning
**File:** `src/components/export/ExportCard.tsx:125`
**Description:** `testDurationDays` is destructured from props (`const { …, testDurationDays, } = …`) but is never referenced in the render output. TypeScript flags `TS6133: 'testDurationDays' is declared but its value is never read`. If this prop was intended to show test duration metadata on the export card (e.g., "14-day test"), the feature was silently dropped.
**Suggestion:** Either render `testDurationDays` in the export card (e.g., in the key inputs grid next to the EVSI row), or remove it from props and from the call site in `ExportButton.tsx`.

---

### WR-002: `useExportPng` — anchor element created but never appended or revoked
**Severity:** warning
**File:** `src/hooks/useExportPng.ts:136-139`
**Description:** The download is triggered by creating a detached `<a>` element, setting its `href` to a `data:` URL, and calling `link.click()`. The link is never appended to the document before clicking, which is not guaranteed to work in all browsers (Firefox historically requires the element to be in the DOM). Additionally, the `data:` URL is a base64 blob held in memory; there is no `link.href = ''` or `URL.revokeObjectURL()` call after the click. For a 1080×1080@2x PNG this can be several MB retained until GC.
**Suggestion:** Append the link to `document.body`, click it, then remove it and clear the href:
```ts
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
link.href = '';
```

---

### WR-003: `PercentageInput` treats `0` as empty — hides user-entered zero
**Severity:** warning
**File:** `src/components/forms/inputs/PercentageInput.tsx:71,106`
**Description:** `formatDisplayValue` returns `''` when `value === 0`, and `handleFocus` initialises `displayValue` to `''` when `val === 0`. This means if a user intentionally enters `0%` (e.g., for a threshold field accepting zero), the field will appear blank on blur and will be cleared on re-focus, giving the appearance that the value was lost. `CurrencyInput` and `NumberInput` do not have this `=== 0` special case.
**Suggestion:** Remove the `value === 0` guards unless there is a specific UX requirement that a zero percentage must display as empty. If zero is intentionally treated as "not set" (because the Zod schema rejects it), document that assumption in a comment and ensure consistent behavior across all three input components.

---

### WR-004: `SectionId` type in `wizard.ts` is stale and unused
**Severity:** warning
**File:** `src/types/wizard.ts:15-21`
**Description:** The exported `SectionId` union (`'business-inputs' | 'prior-selection' | 'threshold' | 'test-design' | 'costs' | 'results'`) uses section IDs from an earlier architecture. The live section IDs in `CalculatorPage.tsx` are `'baseline'`, `'uncertainty'`, `'threshold'`, `'test-design'`, `'results'`. The type is not referenced anywhere in the reviewed codebase (no import found). Stale dead-type exports create confusion for future maintainers who may rely on the type definition to understand valid IDs.
**Suggestion:** Update `SectionId` to match the actual section IDs or remove it if it is unused.

---

### WR-005: `getOrCreateAnonymousId` is not SSR/private-browsing safe
**Severity:** warning
**File:** `src/lib/analytics.ts:28-35`
**Description:** The function calls `localStorage.getItem` and `localStorage.setItem` without a try/catch. In strict private-browsing modes (some mobile Safari configurations) `localStorage` access throws `SecurityError`. This would crash the Datadog initialisation block in `main.tsx` and prevent the app from loading entirely, since the error would propagate out of the `if (import.meta.env.PROD)` block.
**Suggestion:** Wrap in a try/catch and fall back to a per-session random ID (not persisted):
```ts
try {
  const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;
  localStorage.setItem(ANONYMOUS_ID_KEY, id);
} catch {
  // Private browsing or quota exceeded — session-only ID
}
return id;
```

---

### IR-001: Datadog `clientToken` exposed in source
**Severity:** info
**File:** `src/main.tsx:13`
**Description:** `clientToken: 'pubba9c852dc22a1fa80089cd99e3029464'` is hardcoded in source. Datadog client tokens (prefixed `pub`) are designed for front-end use and are not secret — they cannot be used to write data or access Datadog's API. However, embedding them in public source may allow third parties to submit noise events to the RUM session. This is standard practice for Datadog RUM and is the Datadog-recommended approach, so this is informational only.
**Suggestion:** No action required unless rate/quota protection becomes a concern. Consider environment-variable injection (`import.meta.env.VITE_DD_CLIENT_TOKEN`) to avoid the token appearing in git history.

---

### IR-002: Dual accessible name on input components (aria-label overrides `<Label>`)
**Severity:** info
**File:** `src/components/forms/inputs/CurrencyInput.tsx:109,129`, `NumberInput.tsx:126,147`, `PercentageInput.tsx:112,132`
**Description:** Each input renders a `<Label htmlFor={name}>` (providing an accessible name via label association) and also sets `aria-label={ariaLabel}` on the `<Input>`. When both are present, `aria-label` takes precedence and the visible `<Label>` text is ignored by screen readers. This is generally fine when `ariaLabel` is a superset of the label text (e.g., "Baseline conversion rate, percentage") but creates a disconnect: the visible label and the announced label can diverge if only one is updated.
**Suggestion:** This is intentional per the component design (the JSDoc says "overrides the default accessible name"). Ensure every call site that passes `ariaLabel` keeps it in sync with the `label` prop, or consider using `aria-describedby` for the supplementary unit information and relying solely on `<Label>` for the primary name.

---

### IR-003: `linearGradient id="densityGradient"` is document-scoped, not component-scoped
**Severity:** info
**File:** `src/components/charts/PriorDistributionChart.tsx:173`
**Description:** The SVG `<linearGradient id="densityGradient">` uses a fixed ID that is global within the SVG namespace of the document. If `PriorDistributionChart` is ever rendered more than once on the same page (e.g., the live chart and the hidden ExportCard chart render simultaneously), the second definition silently overrides the first and both charts would use the same gradient definition. Currently the ExportCard renders `PriorDistributionChart` off-screen, meaning two instances coexist in the DOM.
**Suggestion:** Use a unique ID per instance. A `useId()` hook (React 18+) is the idiomatic solution:
```tsx
const gradientId = useId();
// ...
<linearGradient id={gradientId} …>
// ...
fill={`url(#${gradientId})`}
```

---

### IR-004: `advancedTimingOpen` accordion lacks `aria-controls` target in DOM until open
**Severity:** info
**File:** `src/components/forms/ExperimentDesignForm.tsx:269-282`
**Description:** The toggle button has `aria-controls="advanced-timing-content"` but the `id="advanced-timing-content"` element is conditionally rendered (`{advancedTimingOpen && <div id="advanced-timing-content">…</div>}`). When closed, the element with that ID does not exist in the DOM, so `aria-controls` points to a non-existent element. Screen readers may warn about or ignore `aria-controls` that reference absent IDs.
**Suggestion:** Always render the controlled region but hide it with `hidden` attribute or `aria-hidden="true"` when closed, rather than conditional rendering. This ensures the `aria-controls` target always exists:
```tsx
<div id="advanced-timing-content" hidden={!advancedTimingOpen}>…</div>
```

---

## Files Reviewed

| File | Status |
|------|--------|
| `src/components/charts/PriorDistributionChart.tsx` | IR-003 (gradient ID collision) |
| `src/components/export/ExportButton.tsx` | CR-001 (missing mode prop propagation), CR-002 (missing EVPIResults type) |
| `src/components/export/ExportCard.tsx` | WR-001 (unused testDurationDays prop) |
| `src/components/forms/BaselineMetricsForm.tsx` | Clean |
| `src/components/forms/ExperimentDesignForm.tsx` | IR-004 (aria-controls missing target) |
| `src/components/forms/inputs/CurrencyInput.tsx` | IR-002 (dual accessible name) |
| `src/components/forms/inputs/NumberInput.tsx` | IR-002 (dual accessible name) |
| `src/components/forms/inputs/PercentageInput.tsx` | WR-003 (zero treated as empty), IR-002 (dual accessible name) |
| `src/components/guide/BouncingDots.tsx` | Clean |
| `src/components/results/AdvancedResultsSection.tsx` | CR-001 (missing mode prop at call site) |
| `src/hooks/useExportPng.ts` | WR-002 (detached anchor, no memory cleanup) |
| `src/lib/analytics.ts` | WR-005 (localStorage not guarded) |
| `src/main.tsx` | IR-001 (client token in source) |
| `src/pages/CalculatorPage.tsx` | CR-003 (4th arg to 3-param hook) |
| `src/stores/wizardStore.ts` | Clean (TS warnings are pre-existing, not introduced in phase 25) |
| `src/types/wizard.ts` | WR-004 (stale SectionId type) |
