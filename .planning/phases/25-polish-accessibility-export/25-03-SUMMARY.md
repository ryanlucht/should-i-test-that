---
phase: 25-polish-accessibility-export
plan: "03"
subsystem: export
tags: [export, branding, png, analysis-name, filename, EXPORT-01, EXPORT-02]
dependency_graph:
  requires: []
  provides:
    - analysisName field in WizardState and wizardStore
    - date-stamped PNG export filenames
    - canvas-compatible BubblyPillLogo in PNG export header
  affects:
    - src/components/export/ExportCard.tsx
    - src/components/export/ExportButton.tsx
    - src/hooks/useExportPng.ts
    - src/components/results/AdvancedResultsSection.tsx
    - src/stores/wizardStore.ts
    - src/types/wizard.ts
tech_stack:
  added: []
  patterns:
    - inline styles for html-to-image compatible rendering (no CSS pseudo-elements)
    - analysisName as transient Zustand state (not persisted)
    - Date.toISOString().slice(0,10) for YYYY-MM-DD date stamps
key_files:
  created: []
  modified:
    - src/types/wizard.ts
    - src/stores/wizardStore.ts
    - src/components/results/AdvancedResultsSection.tsx
    - src/components/export/ExportButton.tsx
    - src/hooks/useExportPng.ts
    - src/components/export/ExportCard.tsx
decisions:
  - "BubblyPillLogo recreated with inline styles in ExportCard — CSS pseudo-elements not reliably captured by html-to-image"
  - "analysisName is transient (not in partialize) — fresh per session, not persisted to sessionStorage"
  - "Mode badge removed from ExportCard — Basic Mode deprecated in Phase 19, badge was obsolete"
  - "exportPng(mode, customTitle) bug fixed — mode was being passed as title arg; corrected to exportPng(analysisName || undefined)"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-08"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 6
status: checkpoint
checkpoint_at: Task 3 (human-verify)
---

# Phase 25 Plan 03: Export Branding and Analysis Name Summary

One-liner: PNG exports now show inline-styled "Should I [Test] That?" logo and accept user-named analysis with date-stamped filenames (EXPORT-01, EXPORT-02).

## What Was Built

### Task 1: Analysis name state, field in results, and filename format (EXPORT-02)

- Added `analysisName: string` to `WizardState` interface with JSDoc noting it is not persisted
- Added `setAnalysisName: (name: string) => void` to `WizardActions` interface
- Added `analysisName: ''` initial value and `setAnalysisName` action to `wizardStore.ts`
- Added `analysisName: ''` to `resetWizard` action
- Confirmed `analysisName` is NOT in the `partialize` function (transient, not sessionStorage)
- Added `<Input>` field with placeholder "Name this analysis (optional)" above ExportButton in `AdvancedResultsSection`
- ARIA label: "Analysis name for export and sharing"
- Removed internal `customTitle` useState from `ExportButton` — replaced with `analysisName` prop
- Removed `<Input>` from `ExportButton` render (now lives in `AdvancedResultsSection`)
- Updated `generateFilename` in `useExportPng.ts` to produce date-stamped filenames:
  - Named: `should-i-test-that_{slug}_{YYYY-MM-DD}.png`
  - Default: `should-i-test-that_{YYYY-MM-DD}.png`
- Fixed bug: `exportPng(mode, customTitle)` was passing mode string as title; corrected to `exportPng(analysisName || undefined)`

**Commit:** `55130e8`

### Task 2: Canvas-compatible logo in PNG export (EXPORT-01)

- Replaced old `<h1>` + mode badge header in `ExportCard` with inline-styled logo recreation
- Logo renders "Should I" / purple pill "Test" / "That?" with all inline styles
- Purple pill: `linear-gradient(135deg, #9333EA 0%, #7C3AED 50%, #6D28D9 100%)` with `border-radius: 9999px`
- Font: `"Noto Sans", sans-serif` (matches BubblyPillLogo CSS component)
- Analysis title (custom name) renders only when `title !== 'Should I Test That?'`
- Mode badge (`<span>` with "Basic Mode" / "Advanced Mode") removed — obsolete since Phase 19
- Footer updated from "Created with Should I Test That?" to "shoulditestthat.com"

**Commit:** `b8a398a`

## Checkpoint: Task 3 (human-verify)

Task 3 is a `checkpoint:human-verify` gate — execution stopped here per plan instructions.

**What to verify:**
1. Run `npm run dev` and navigate to Results section
2. Verify "Name this analysis (optional)" text input appears above the Export button
3. Type a name like "Checkout Flow Redesign" and click "Export as PNG":
   - Downloaded filename: `should-i-test-that_checkout-flow-redesign_2026-04-08.png`
   - PNG header shows "Should I [Test] That?" logo with purple pill
   - Analysis name appears as title below logo
   - No "Advanced Mode" badge is visible
   - Footer says "shoulditestthat.com"
4. Clear the analysis name and export again:
   - Filename: `should-i-test-that_2026-04-08.png`
   - No custom title below logo

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed exportPng mode-as-title argument bug**
- **Found during:** Task 1
- **Issue:** `ExportButton` was calling `exportPng(mode, customTitle || undefined)` but the hook signature is `exportPng(customTitle?: string)`. Mode string ('advanced') was being passed as the title, which would corrupt filenames.
- **Fix:** Changed call to `exportPng(analysisName || undefined)` — drops the spurious mode argument
- **Files modified:** `src/components/export/ExportButton.tsx`
- **Commit:** `55130e8`

## Known Stubs

None — all data is wired. The analysis name field reads from and writes to Zustand store. The filename includes the real current date. The logo renders with real inline styles.

## Self-Check: PASSED

All files verified present. Both task commits verified in git log.

| Item | Status |
|------|--------|
| src/types/wizard.ts | FOUND |
| src/stores/wizardStore.ts | FOUND |
| src/components/results/AdvancedResultsSection.tsx | FOUND |
| src/components/export/ExportButton.tsx | FOUND |
| src/hooks/useExportPng.ts | FOUND |
| src/components/export/ExportCard.tsx | FOUND |
| Commit 55130e8 (Task 1) | FOUND |
| Commit b8a398a (Task 2) | FOUND |
