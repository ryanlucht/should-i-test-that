---
quick: 002
title: Fix threshold equals lift explanation copy
type: execute
area: ui
files_modified:
  - src/components/results/ResultsSection.tsx
autonomous: true

must_haves:
  truths:
    - "When expected lift exceeds threshold, explanation says 'exceeds'"
    - "When expected lift equals threshold, explanation says 'meets'"
    - "When expected lift is below threshold, explanation says 'falls below'"
  artifacts:
    - path: "src/components/results/ResultsSection.tsx"
      provides: "EVPI intuition explanation with correct comparison wording"
      contains: "meets your threshold"
---

<objective>
Fix misleading copy in EVPI intuition explanation (BASIC-OUT-07) when expected lift exactly equals the shipping threshold.

Purpose: When mu_L == T_L (e.g., both 0%), the current text says "exceeds" which is factually incorrect. Should say "meets" or "equals" to accurately describe the relationship while maintaining the correct decision logic (ties go to ship).

Output: Updated ResultsSection.tsx with three-way comparison wording.
</objective>

<context>
@.planning/quick/002-fix-threshold-equals-lift-copy/002-TODO.md
@src/components/results/ResultsSection.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add comparison wording helper and update explanation copy</name>
  <files>src/components/results/ResultsSection.tsx</files>
  <action>
Update the EVPI intuition explanation (lines 131-144) to handle three cases:

1. Add a helper function or inline logic to determine comparison wording:
   - Use a tolerance of 0.001 (0.1%) for floating point equality
   - If Math.abs(priorMean - thresholdLift) < 0.001: "meets"
   - If priorMean > thresholdLift: "exceeds"
   - If priorMean < thresholdLift: "falls below"

2. Update the ship case (defaultDecision === 'ship'):
   - Use the comparison wording variable instead of hardcoded "exceeds"
   - Result: "the expected lift (+0.0%) meets your threshold (+0.0%)"

3. The not-ship case already says "falls below" which is correct, but extract
   to use the same helper for consistency.

Implementation approach:
```tsx
// Determine comparison wording with tolerance for floating point equality
const EQUALITY_TOLERANCE = 0.001; // 0.1% tolerance
const getComparisonWording = () => {
  if (Math.abs(priorMean - thresholdLift) < EQUALITY_TOLERANCE) {
    return 'meets';
  }
  return priorMean > thresholdLift ? 'exceeds' : 'falls below';
};
const comparisonWording = getComparisonWording();
```

Then in the JSX:
- Ship case: `{comparisonWording} your threshold`
- Not-ship case: `{comparisonWording} your threshold` (will always be "falls below" in this branch)

Note: The decision logic itself is correct (ties go to ship). Only the explanation wording needs fixing.
  </action>
  <verify>
1. `npm run lint` passes
2. `npm run build` succeeds
3. Manual verification:
   - Set prior to symmetric around 0% (default)
   - Set threshold to "any positive" (0%)
   - Results section should say "meets your threshold" not "exceeds"
  </verify>
  <done>
- Copy says "meets your threshold" when priorMean equals thresholdLift (within tolerance)
- Copy says "exceeds your threshold" when priorMean > thresholdLift
- Copy says "falls below your threshold" when priorMean < thresholdLift
- No regressions in build or lint
  </done>
</task>

</tasks>

<verification>
- `npm run lint` passes
- `npm run build` succeeds
- Visual inspection confirms correct wording in all three scenarios
</verification>

<success_criteria>
1. When expected lift equals threshold (e.g., both 0%), explanation says "meets your threshold"
2. When expected lift exceeds threshold, explanation says "exceeds your threshold"
3. When expected lift is below threshold, explanation says "falls below your threshold"
4. Build and lint pass with no errors
</success_criteria>

<output>
After completion, mark task complete in 002-TODO.md
</output>
