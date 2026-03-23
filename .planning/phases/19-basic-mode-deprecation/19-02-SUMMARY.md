---
phase: 19-basic-mode-deprecation
plan: 02
subsystem: types, store, pages, hooks, export, analytics
tags: [mode-deprecation, single-mode, evsi, store-refactor, type-refactor]

requires:
  - phase: 19-basic-mode-deprecation
    plan: 01
    provides: "EVPI code removed, types cleaned, CoD inlined in hook"
provides:
  - "Flat WizardInputs type replaces SharedInputs + AdvancedInputs + InputsState"
  - "Single setInput action replaces setSharedInput + setAdvancedInput + setMode"
  - "No mode-switching infrastructure in store (no sessionStorage backups)"
  - "ModeCard.tsx and ModeToggle.tsx deleted"
  - "WelcomePage has no mode selector"
  - "CalculatorPage has single SECTIONS constant (5 sections)"
  - "useEVSICalculations reads flat inputs without mode check"
  - "ExportButton/ExportCard/useExportPng have no mode parameter"
  - "Analytics module has no trackModeSelected or basic/advanced references"
affects: [19-03]

tech-stack:
  added: []
  patterns:
    - "Flat input structure (WizardInputs) instead of nested shared/advanced"
    - "Single setInput<K> action for all input fields"

key-files:
  created: []
  modified:
    - src/types/wizard.ts
    - src/stores/wizardStore.ts
    - src/stores/wizardStore.test.ts
    - src/lib/analytics.ts
    - src/pages/WelcomePage.tsx
    - src/pages/CalculatorPage.tsx
    - src/hooks/useEVSICalculations.ts
    - src/hooks/useEVSICalculations.test.ts
    - src/components/export/ExportButton.tsx
    - src/components/export/ExportCard.tsx
    - src/hooks/useExportPng.ts
    - src/App.test.tsx
  deleted:
    - src/components/welcome/ModeCard.tsx
    - src/components/wizard/ModeToggle.tsx

decisions:
  - "priorShape defaults to 'normal' in initialInputs (always EVSI mode)"
  - "Kept AdvancedResultsSection name unchanged; Plan 03 renames to ResultsSection"
  - "Export filename simplified to should-i-test-that-{title}.png pattern"

metrics:
  duration: "12m 25s"
  completed: "2026-03-23T23:43:53Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 14
---

# Phase 19 Plan 02: Mode-Switching Infrastructure Removal Summary

Removed mode-switching infrastructure from types, store, pages, hooks, and export components, converting to single EVSI-based experience with flat input structure.

## What Changed

### Task 1: Core Type/Store/Analytics Cleanup (ba76a9b)

**Types (wizard.ts):**
- Removed `Mode = 'basic' | 'advanced'` type
- Merged `SharedInputs` + `AdvancedInputs` into flat `WizardInputs` interface (18 fields)
- Removed `InputsState` nested interface
- Created single `initialInputs: WizardInputs` with `priorShape: 'normal'` default
- Replaced `setSharedInput`/`setAdvancedInput`/`setMode` with single `setInput` action

**Store (wizardStore.ts):**
- Removed entire `setMode` function (100+ lines of sessionStorage backup logic)
- Removed `setSharedInput` and `setAdvancedInput` (replaced by `setInput`)
- Removed `mode: 'basic'` from initial state
- Removed all `sessionStorage.setItem`/`getItem` calls
- Simplified `partialize` to only persist `inputs`
- Simplified `resetWizard` to just set `inputs: initialInputs`

**Analytics (analytics.ts):**
- Removed `trackModeSelected` function
- Changed `trackCalculationCompleted` to only accept `'EVSI'`
- Removed `mode` parameter from `trackExportPng`

**Deleted files:**
- `src/components/welcome/ModeCard.tsx` (141 lines)
- `src/components/wizard/ModeToggle.tsx` (70 lines)

**Store tests (wizardStore.test.ts):**
- Removed entire `mode switching` describe block (10 tests)
- Rewrote all tests to use `setInput` and flat `inputs` structure
- 15 tests passing

### Task 2: Pages/Hooks/Export Updates (6a98e3a)

**WelcomePage:**
- Removed `ModeSelection` component and `useWizardStore` import
- Page now shows: title, description, Get Started button, footer (no mode cards)

**CalculatorPage:**
- Replaced `BASIC_SECTIONS` + `ADVANCED_SECTIONS` with single `SECTIONS` constant (5 entries)
- Removed `ModeToggle` from header
- Removed `useMemo` wrapping sections selection
- Changed results rendering from `mode === 'advanced' && <AdvancedResultsSection />` to just `<AdvancedResultsSection />`
- Removed Hubbard attribution footer conditional

**useEVSICalculations hook:**
- Removed `mode` selector and mode check (`if mode !== 'advanced'`)
- Changed from `inputs.shared.X` and `inputs.advanced.X` to `inputs.X`
- Validation now checks flat input fields directly

**useEVSICalculations tests:**
- Removed `mode: 'basic'` null-return test
- Removed `setMode('advanced')` setup from all tests
- Updated helpers to use `setInput` instead of `setSharedInput`/`setAdvancedInput`
- All 14 tests passing

**ExportButton:**
- Removed `BasicModeProps` interface and discriminated union
- Single `ExportButtonProps` interface (no mode prop)
- Removed `EVPIResults` import and basic mode branches
- Export calls `exportPng(customTitle)` without mode parameter

**ExportCard:**
- Removed `mode` prop from interface
- Removed `modeBadge` variable and mode badge rendering
- Removed all `mode === 'basic'` conditional branches
- Always renders EVSI verdict text and 4-column grid layout

**useExportPng:**
- Removed `mode` parameter from `exportPng` signature
- Simplified `generateFilename` to single pattern: `should-i-test-that-{title}.png`
- Removed mode-based filename distinction

**App.test.tsx:**
- Removed `'renders mode selection cards'` test
- Removed `'Calculator mode'` aria-label assertion
- 2 tests (navigation to calculator, back navigation) expected to fail until Plan 03 updates form consumers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed unused imports in ExportButton.tsx**
- **Found during:** Task 2E
- **Issue:** `computePriorFromInterval` and `DEFAULT_PRIOR` were imported but no longer used after removing basic mode branch
- **Fix:** Removed unused imports, kept only `DEFAULT_INTERVAL`
- **Files modified:** src/components/export/ExportButton.tsx

## Known Stubs

None -- all changes are removals/simplifications. No new stubs introduced.

## Notes

- Form components (`BaselineMetricsForm`, `UncertaintyPriorForm`, `ThresholdScenarioForm`, `ExperimentDesignForm`) still reference `setSharedInput`/`setAdvancedInput` and `inputs.shared`/`inputs.advanced`. These will cause TypeScript errors until Plan 03 updates them.
- `AdvancedResultsSection` still references `inputs.shared`/`inputs.advanced` and passes `mode="advanced"` to ExportButton. Plan 03 will update this component.
- 2 App integration tests fail because form components crash on `inputs.shared` being undefined. This is expected and will resolve with Plan 03.

## Self-Check: PASSED

- All 12 modified files exist on disk
- Both deleted files (ModeCard.tsx, ModeToggle.tsx) confirmed absent
- Task 1 commit ba76a9b verified in git log
- Task 2 commit 6a98e3a verified in git log
