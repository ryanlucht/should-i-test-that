---
phase: 19-basic-mode-deprecation
plan: 03
subsystem: forms, results, pages
tags: [mode-deprecation, flat-store, form-migration, rename]

requires:
  - phase: 19-basic-mode-deprecation
    plan: 02
    provides: "Flat WizardInputs type, single setInput action, no mode-switching store"
provides:
  - "All form components use flat setInput and inputs.X (no nested shared/advanced)"
  - "No mode === 'basic' conditionals anywhere in codebase"
  - "ResultsSection export name replaces AdvancedResultsSection"
  - "UncertaintyPriorForm always renders PriorShapeForm (no mode guard)"
  - "Zero setSharedInput/setAdvancedInput/inputs.shared/inputs.advanced references in src/"
affects: []

tech-stack:
  added: []
  patterns:
    - "Forms read state.inputs.X directly (flat structure)"
    - "Forms write via setInput('fieldName', value)"
    - "PriorShapeForm always renders (no mode guard)"

key-files:
  created: []
  modified:
    - src/components/forms/BaselineMetricsForm.tsx
    - src/components/forms/ThresholdScenarioForm.tsx
    - src/components/forms/ExperimentDesignForm.tsx
    - src/components/forms/PriorShapeForm.tsx
    - src/components/forms/UncertaintyPriorForm.tsx
    - src/components/results/AdvancedResultsSection.tsx
    - src/components/results/AdvancedResultsSection.test.tsx
    - src/components/results/index.ts
    - src/pages/CalculatorPage.tsx
  deleted: []

decisions:
  - "Removed duplicate 'Fill with Recommended Default' button from UncertaintyPriorForm (PriorShapeForm already has it)"
  - "Removed 'Or specify your own 90% credible interval' label (PriorShapeForm divider provides equivalent heading)"
  - "Replaced useEVPICalculations with inline threshold_L computation in UncertaintyPriorForm chart"
  - "Kept AdvancedResultsSection.tsx filename, only renamed the export to ResultsSection"

metrics:
  duration: "12m 40s"
  completed: "2026-03-23T23:58:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 9
---

# Phase 19 Plan 03: Form Consumer Updates Summary

Migrated all form components from nested store API (setSharedInput/setAdvancedInput with inputs.shared/inputs.advanced) to flat store API (setInput with inputs.X), removed all mode conditionals from forms, and renamed AdvancedResultsSection to ResultsSection.

## What Changed

### Task 1: Migrate all form components to flat setInput (ca31be5)

**BaselineMetricsForm.tsx:**
- Changed `useWizardStore((state) => state.inputs.shared)` to `state.inputs`
- Changed `useWizardStore((state) => state.setSharedInput)` to `state.setInput`
- All local variable names updated: `sharedInputs` -> `inputs`, `setSharedInput` -> `setInput`

**ThresholdScenarioForm.tsx:**
- Same pattern as BaselineMetricsForm
- Updated `getDefaultValues` function signature from `['inputs']['shared']` to `['inputs']`

**ExperimentDesignForm.tsx:**
- Changed `state.inputs.advanced` to `state.inputs` and `state.inputs.shared` to `state.inputs`
- Changed `setAdvancedInput` to `setInput`
- Updated header comment to remove "Advanced mode" reference

**PriorShapeForm.tsx:**
- Changed `state.inputs.advanced` to `state.inputs`, `setAdvancedInput` to `setInput`
- Removed `mode !== 'advanced'` early-return guard (component now always renders)
- Updated `getDefaultValues` signature from `['inputs']['advanced']` to `['inputs']`

**UncertaintyPriorForm.tsx:**
- Removed `mode` selector entirely
- Changed `isUniformPrior` from `mode === 'advanced' && inputs.priorShape === 'uniform'` to just `inputs.priorShape === 'uniform'`
- Removed `useEVPICalculations` import, replaced with inline `computedThreshold_L` calculation
- Removed `PriorDistributionChartLegacy` import (no longer needed)
- Always renders PriorShapeForm (removed `mode === 'advanced'` wrapper)
- Removed Basic-mode "Fill with Recommended Default" button (duplicate of PriorShapeForm's button)
- Removed Basic-mode "Or specify your own 90% credible interval" label (PriorShapeForm divider covers this)
- Always shows dispersion display (removed `mode === 'advanced'` guard)
- Always uses PriorDistributionChart (removed mode ternary for legacy chart)
- Updated section intro text to single version (no mode ternary)

### Task 2: Rename AdvancedResultsSection to ResultsSection (a7c1c73)

**AdvancedResultsSection.tsx:**
- Renamed export function from `AdvancedResultsSection` to `ResultsSection`
- Changed `state.inputs.shared` and `state.inputs.advanced` to `state.inputs`
- Removed `mode="advanced"` prop from ExportButton call
- Updated header comment to remove "Advanced" prefix

**index.ts (results barrel):**
- Changed `export { AdvancedResultsSection }` to `export { ResultsSection }` from same file

**CalculatorPage.tsx:**
- Updated import to `ResultsSection`
- Updated JSX from `<AdvancedResultsSection />` to `<ResultsSection />`

**AdvancedResultsSection.test.tsx:**
- Updated component import and render calls to `ResultsSection`
- Replaced nested `{ shared: ..., advanced: ... }` mock with flat `sampleInputs` object
- Updated test description to remove "advanced" references

### Codebase Sweep Results

Zero matches for all deprecated patterns:
- `setSharedInput` / `setAdvancedInput`: 0 matches
- `inputs.shared.` / `inputs.advanced.`: 0 matches
- `mode === 'basic'` / `'basic'` mode conditionals: 0 matches
- `ModeToggle` / `ModeCard` / `ModeSelection`: 0 matches
- `setMode`: 0 matches
- `wizard-advanced-backup` / `wizard-basic-backup`: 0 matches

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] Replaced useEVPICalculations with inline threshold_L computation**
- **Found during:** Task 1 (UncertaintyPriorForm migration)
- **Issue:** `useEVPICalculations` was deleted by Plan 01 but UncertaintyPriorForm still imported it
- **Fix:** Computed `threshold_L` inline from store inputs (thresholdValue, thresholdUnit, derivedK)
- **Files modified:** src/components/forms/UncertaintyPriorForm.tsx

**2. [Rule 1 - Bug] Removed duplicate Default Prior button from UncertaintyPriorForm**
- **Found during:** Task 1 (removing mode conditionals)
- **Issue:** Basic-mode "Fill with Recommended Default" button would duplicate PriorShapeForm's identical button when mode guard removed
- **Fix:** Removed the Basic-mode version since PriorShapeForm (now always rendered) already provides this button
- **Files modified:** src/components/forms/UncertaintyPriorForm.tsx

**3. [Rule 3 - Blocking] Cherry-picked Plan 01 and Plan 02 commits into worktree**
- **Found during:** Execution start
- **Issue:** This parallel worktree didn't have Plan 01/02 changes (store was still nested)
- **Fix:** Cherry-picked 4 commits (ba76a9b, 6a98e3a for Plan 02; 7a64a9b, 4d604e3 for Plan 01), resolved merge conflicts
- **Files modified:** Multiple (types, store, pages, hooks, results)

## Known Stubs

None -- all changes are migrations/renames/removals. No new stubs introduced.

## Self-Check: PASSED

- All 9 modified files exist on disk
- Task 1 commit ca31be5 verified in git log
- Task 2 commit a7c1c73 verified in git log
