---
phase: quick-001
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/results/ResultsSection.tsx
autonomous: true

must_haves:
  truths:
    - "EVPI intuition card explains WHY the default decision is ship/not-ship"
    - "Explanation references prior belief vs threshold comparison"
    - "Language is accessible to non-technical users"
  artifacts:
    - path: "src/components/results/ResultsSection.tsx"
      provides: "Enhanced EVPI intuition explanation"
      contains: "Based on your beliefs"
  key_links:
    - from: "ResultsSection"
      to: "evpiResults.defaultDecision"
      via: "conditional text rendering"
      pattern: "defaultDecision.*ship"
---

<objective>
Improve the EVPI intuition explanation by adding a sentence that explains WHY the default decision is to ship or not ship.

Purpose: Users currently see "your default decision is to ship/not ship" but don't understand the reasoning. Adding an explanation that ties the decision back to their prior beliefs (mean vs threshold) makes the logic transparent and educational.

Output: Updated ResultsSection.tsx with enhanced EVPI intuition card copy.
</objective>

<execution_context>
@/Users/ryan.lucht/.claude/get-shit-done/workflows/execute-plan.md
@/Users/ryan.lucht/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@src/components/results/ResultsSection.tsx
@src/lib/calculations/evpi.ts (determineDefaultDecision logic: ship if mu_L >= threshold_L)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add default decision explanation to EVPI intuition card</name>
  <files>src/components/results/ResultsSection.tsx</files>
  <action>
Update the EVPI Intuition card (lines 126-137) to add a sentence explaining WHY the default decision is ship/not-ship.

Current text:
"Without testing, your default decision is to **ship/not ship**."

New structure (add explanation BEFORE the existing text):
1. First sentence: Explain WHY based on prior vs threshold
   - If defaultDecision === 'ship': "Based on your beliefs, the expected lift ({priorMean}%) exceeds your threshold ({thresholdLift}%), so without more information you would ship."
   - If defaultDecision === 'dont-ship': "Based on your beliefs, the expected lift ({priorMean}%) falls below your threshold ({thresholdLift}%), so without more information you would not ship."

2. Second sentence: Keep existing EVPI explanation
   "The {EVPI} is the expected value of the regret you'd avoid by having perfect foresight — it's the maximum you should pay for any information about whether this change helps."

Key implementation details:
- Use the existing `priorMean` variable (already calculated at line 58)
- Use the existing `thresholdLift` variable (already calculated at line 62-64)
- Format percentages consistently with existing card copy (use toFixed(1) with +/- sign prefix)
- Handle edge case: For "any-positive" threshold, say "exceeds 0%" or "falls below 0%"
- Keep the card layout and styling unchanged (just update text content)

Do NOT change:
- The card container styling (rounded-xl, border, bg-muted/30, etc.)
- The title "What {EVPI} represents"
- The core EVPI explanation about regret and perfect foresight
  </action>
  <verify>
1. Run `npm run lint` - should pass with no errors
2. Run `npm run typecheck` - should pass with no errors
3. Run `npm test -- --testPathPattern=ResultsSection` - any existing tests should pass
4. Manual verification: The EVPI intuition card now shows explanation text that references the user's prior belief and threshold
  </verify>
  <done>
- EVPI intuition card includes sentence explaining default decision logic
- Explanation references prior mean percentage and threshold percentage
- Both ship and dont-ship cases have appropriate explanatory text
- All existing functionality preserved
  </done>
</task>

</tasks>

<verification>
1. Lint passes: `npm run lint`
2. Types pass: `npm run typecheck`
3. Tests pass: `npm test`
4. Visual check: Navigate to Results section, verify the EVPI intuition card shows the new explanatory text
</verification>

<success_criteria>
- [ ] EVPI intuition card explains WHY default decision is ship/not-ship
- [ ] Explanation mentions prior belief (expected lift %) and threshold (%)
- [ ] Text is plain-English accessible (no jargon like "mu_L" or "threshold_L")
- [ ] Both ship and dont-ship scenarios have appropriate text
- [ ] All linting, typecheck, and tests pass
</success_criteria>

<output>
After completion, create `.planning/quick/001-improve-evpi-intuition-explanation/001-SUMMARY.md`
</output>
