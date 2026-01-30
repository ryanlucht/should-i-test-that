---
phase: 05-advanced-mode
plan: 02
type: summary
subsystem: forms
tags: [prior-shape, radio-cards, student-t, validation]

dependency_graph:
  requires:
    - 05-01 (Advanced mode infrastructure, wizard types)
  provides:
    - PriorShapeForm component with radio cards
    - Prior shape validation schema (priorShapeSchema)
    - Student-t df presets (3, 5, 10)
    - Shape-aware interval labels in UncertaintyPriorForm
  affects:
    - 05-03+ (Chart needs to render different distribution shapes)

tech_stack:
  added: []
  patterns:
    - Discriminated union Zod schema for conditional fields
    - RadioCard pattern for shape selection
    - ToggleGroup for df presets
    - Mode-conditional rendering with ref forwarding

key_files:
  created:
    - src/components/forms/PriorShapeForm.tsx
  modified:
    - src/lib/validation.ts
    - src/types/wizard.ts
    - src/components/forms/UncertaintyPriorForm.tsx

decisions:
  - id: prior-shape-radio-cards
    choice: "RadioCard pattern for shape selection"
    rationale: "Consistent with ThresholdScenarioForm pattern, allows inline content for Student-t df"
  - id: df-preset-values
    choice: "df=3 Heavy, df=5 Moderate, df=10 Near-normal"
    rationale: "Per 05-CONTEXT.md and 05-RESEARCH.md recommendations"
  - id: uniform-bounds-labels
    choice: "Change interval labels to 'Minimum/Maximum possible lift' for Uniform"
    rationale: "Uniform uses bounds not credible intervals - different semantic meaning"

metrics:
  duration: "7 min"
  completed: "2026-01-30"
---

# Phase 05 Plan 02: Prior Shape Selector Summary

Prior shape radio card selector for Advanced mode with Student-t df presets and Uniform bounds labeling.

## Scope Delivered

Created PriorShapeForm component allowing users to select between Normal (default), Student-t (fat-tailed), and Uniform (uninformed) prior distributions. Student-t shows df preset buttons (3=Heavy, 5=Moderate, 10=Near-normal). Integrated with UncertaintyPriorForm to appear only in Advanced mode.

## Implementation

### Validation Schema (validation.ts)
- Added `priorShapeSchema` using Zod discriminated union pattern
- Three shape options with df required only for Student-t
- Exported `PriorShapeFormData` type

### Type Definitions (wizard.ts)
- Added `priorShape` field to AdvancedInputs ('normal' | 'student-t' | 'uniform' | null)
- Added `studentTDf` field (3 | 5 | 10 | null)
- Updated initialAdvancedInputs with null defaults

### PriorShapeForm Component (282 lines)
- RadioCard pattern for shape selection (same as ThresholdScenarioForm)
- DfPresetSelector ToggleGroup for Student-t degrees of freedom
- Helper text per ADV-IN-10: "Evidence suggests many experimentation programs' outcomes appear fat-tailed"
- Warning text for Uniform: "Uniform priors should rarely be used; pretending we know nothing is often misleading"
- Store integration via setAdvancedInput for immediate updates

### UncertaintyPriorForm Integration
- Mode-conditional rendering: PriorShapeForm appears only in Advanced mode
- Updated intro text: Basic asks about uncertainty, Advanced asks about shape
- Section divider between shape selector and interval inputs
- Uniform prior mode: Labels change to "Minimum/Maximum possible lift" and "bounds"
- Validation includes PriorShapeForm in Advanced mode

## Key Behaviors

### Shape Selection
1. **Normal (default):** Standard bell curve, no additional inputs
2. **Student-t:** Shows df presets, defaults to df=5 when selected
3. **Uniform:** Shows warning text, interval becomes distribution bounds

### Store Updates
- Shape change immediately updates `advancedInputs.priorShape`
- Switching away from Student-t clears `studentTDf` to null
- Switching to Student-t sets default df=5 if none selected

### Validation
- In Advanced mode, UncertaintyPriorForm validates PriorShapeForm first
- Interval validation unchanged (uses existing priorSelectionSchema)

## Verification

### Automated
- TypeScript: Pass
- Unit tests: 181 passing
- Lint: Pass (only pre-existing warnings)

### Manual Testing
1. Start dev server: `npm run dev`
2. Switch to Advanced mode from Welcome page
3. Navigate to Uncertainty section
4. Verify shape selector appears with 3 radio card options
5. Select Normal - no additional inputs shown
6. Select Student-t - df preset buttons appear
7. Click different df buttons - selection updates
8. Select Uniform - warning text appears, interval labels change
9. Verify store updates via React DevTools

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 05-03+. Note:
- Chart currently renders Normal distribution only
- Future plan needs to extend chart to render Student-t and Uniform shapes
- Distribution library (jStat) integration pending per 05-RESEARCH.md

## Files Changed

| File | Lines | Change |
|------|-------|--------|
| src/lib/validation.ts | +27 | priorShapeSchema |
| src/types/wizard.ts | +10 | priorShape, studentTDf fields |
| src/components/forms/PriorShapeForm.tsx | +282 | New component |
| src/components/forms/UncertaintyPriorForm.tsx | +77 | Mode-conditional integration |

## Commits

| Hash | Message |
|------|---------|
| 0fb8f70 | feat(05-02): add prior shape validation schema |
| 511463b | feat(05-02): create PriorShapeForm component with radio cards |
| 7e8b44a | feat(05-02): integrate PriorShapeForm with UncertaintyPriorForm |
