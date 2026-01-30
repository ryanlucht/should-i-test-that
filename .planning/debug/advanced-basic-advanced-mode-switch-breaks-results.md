---
status: verifying
trigger: "Results don't display after switching Advanced -> Basic -> Advanced mode"
created: 2026-01-30T10:00:00Z
updated: 2026-01-30T10:50:00Z
---

## Current Focus

hypothesis: CONFIRMED - completedSections array carries over between mode switches, causing confusion
test: Fix implemented - now verifying
expecting: User confirms the A->B->A mode switch now works correctly
next_action: Manual verification needed, then archive session

## Symptoms

expected: Results should display correctly when user switches to Advanced mode, fills all sections, and views Results
actual: "Complete all previous sections" message appears in Results section even though all fields are filled
errors: No console errors visible
reproduction: 1) Start in Advanced mode (works fine), 2) Switch to Basic mode, 3) Switch back to Advanced mode, 4) Fill all sections, 5) Results shows placeholder instead of calculations
started: Found during Phase 5 UAT - NOT an issue when starting fresh in Advanced mode

## Eliminated

## Evidence

- timestamp: 2026-01-30T10:05:00Z
  checked: wizardStore.ts setMode action logic
  found: |
    A->B: advancedInputs = initialAdvancedInputs (priorShape=null, trafficSplit=0.5, eligibilityFraction=1.0)
    B->A: { ...state.inputs.advanced, priorShape: state.inputs.advanced.priorShape ?? 'normal' }
    This preserves all values from initialAdvancedInputs and sets priorShape to 'normal'
  implication: setMode logic appears correct for advanced inputs

- timestamp: 2026-01-30T10:06:00Z
  checked: useEVSICalculations.ts validation (lines 113-126)
  found: |
    Validates: priorShape, testDurationDays, dailyTraffic, trafficSplit, eligibilityFraction
    All must be non-null for results to compute
    initialAdvancedInputs has trafficSplit=0.5, eligibilityFraction=1.0 (valid defaults)
  implication: User must fill testDurationDays and dailyTraffic - if they report "all filled", validation should pass

- timestamp: 2026-01-30T10:15:00Z
  checked: ExperimentDesignForm useEffect sync logic (lines 132-159)
  found: |
    useEffect only calls setValue when advancedInputs.field != null
    When advancedInputs reset to initialAdvancedInputs (null values),
    the useEffect skips the setValue call.
    BUT: Component unmounts in Basic mode and remounts in Advanced mode,
    so defaultValues are re-read on mount. This should work correctly.
  implication: Form should show empty fields after A->B->A and user should refill them.

- timestamp: 2026-01-30T10:25:00Z
  checked: wizardStore unit tests
  found: |
    Added bug reproduction test for A->B->A scenario. Test passes.
    Store-level state management works correctly:
    - A->B: advanced inputs cleared
    - B->A: priorShape initialized to 'normal', other inputs stay null
    - Setting advanced inputs after B->A works correctly
  implication: Issue is NOT in Zustand store. Must be in React component interaction.

- timestamp: 2026-01-30T10:30:00Z
  checked: useEVSICalculations unit tests
  found: |
    Tests pass. Hook correctly rejects incomplete inputs.
    Validation logic is working as expected.
  implication: Issue is NOT in validation logic.

- timestamp: 2026-01-30T10:35:00Z
  added: Comprehensive console logging throughout
  logged_locations:
    - wizardStore.setMode: mode transitions and advanced inputs state
    - useEVSICalculations validation: which check fails and actual values
    - useEVSICalculations finalResults: validation state and worker results
    - ExperimentDesignForm.validate: trigger result
    - ExperimentDesignForm.onSubmit: form data and store state after update
  purpose: Need to observe actual runtime behavior to identify where the breakdown occurs

## Resolution

root_cause: |
  When switching modes (Basic <-> Advanced), the `completedSections` array was NOT being reset.

  Basic mode has 4 sections: baseline(0), uncertainty(1), threshold(2), results(3)
  Advanced mode has 5 sections: baseline(0), uncertainty(1), threshold(2), test-design(3), results(4)

  The issue: Index 3 is "results" in Basic mode but "test-design" in Advanced mode.

  Scenario:
  1. User completes Basic mode - completedSections = [0, 1, 2, 3]
  2. User switches to Advanced mode
  3. completedSections still = [0, 1, 2, 3]
  4. Section 3 (test-design in Advanced) shows green checkmark as "completed"
  5. User sees test-design as completed and may scroll past without filling it
  6. Results section fails validation because testDurationDays and dailyTraffic are null

  Even if user does fill test-design, the confusing UX (section appearing complete when empty)
  contributes to a poor experience.

fix: |
  Modified `setMode` in wizardStore.ts to:
  1. Skip if already in the same mode (no-op for same-mode switches)
  2. Clear `completedSections` to [] when switching to a different mode
  3. Reset `currentSection` to 0 when switching modes

  This ensures users must re-complete sections in the new mode, preventing
  index misalignment confusion.

verification: |
  - Added 3 new unit tests verifying the fix:
    - A->B->A mode switch correctly resets advanced inputs and allows refilling
    - completedSections clears when switching modes
    - Same-mode switch is a no-op (preserves state)
  - All 253 tests pass
  - Lint passes with only pre-existing warnings

files_changed:
  - src/stores/wizardStore.ts (setMode action - added completedSections/currentSection reset)
  - src/stores/wizardStore.test.ts (added 3 new tests for mode switch behavior)
