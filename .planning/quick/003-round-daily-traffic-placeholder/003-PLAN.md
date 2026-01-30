---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/forms/ExperimentDesignForm.tsx
autonomous: true

must_haves:
  truths:
    - "Daily eligible traffic placeholder shows a round number"
  artifacts:
    - path: "src/components/forms/ExperimentDesignForm.tsx"
      provides: "Experiment design form with daily traffic input"
      contains: 'placeholder="5,000"'
  key_links: []
---

<objective>
Update the Daily Eligible Traffic placeholder to use a round number

Purpose: The current placeholder "2,740" is an odd, non-round number that looks arbitrary and confusing. A round number like "5,000" provides a clearer mental anchor for users.

Output: Updated placeholder value in ExperimentDesignForm.tsx
</objective>

<execution_context>
@/Users/ryan.lucht/.claude/get-shit-done/workflows/execute-plan.md
@/Users/ryan.lucht/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/forms/ExperimentDesignForm.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update daily traffic placeholder to round number</name>
  <files>src/components/forms/ExperimentDesignForm.tsx</files>
  <action>
    Change the placeholder attribute on line 188 from "2,740" to "5,000".

    Location: NumberInput for "Daily eligible traffic" (around line 185-192)
    Current: placeholder="2,740"
    New: placeholder="5,000"
  </action>
  <verify>
    grep -n 'placeholder="5,000"' src/components/forms/ExperimentDesignForm.tsx
    npm run lint
    npm test -- --run ExperimentDesignForm
  </verify>
  <done>
    Placeholder shows "5,000" instead of "2,740"
  </done>
</task>

</tasks>

<verification>
- Visual check: Advanced mode shows "5,000" in the daily traffic field placeholder
- No lint errors
- Existing tests pass
</verification>

<success_criteria>
- Daily eligible traffic placeholder displays "5,000"
- No regression in form functionality
</success_criteria>

<output>
After completion, create `.planning/quick/003-round-daily-traffic-placeholder/003-SUMMARY.md`
</output>
