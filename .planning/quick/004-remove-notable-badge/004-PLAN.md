---
phase: quick
plan: 004
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/results/SupportingCard.tsx
  - src/components/results/ResultsSection.test.tsx
  - src/components/results/AdvancedResultsSection.test.tsx
autonomous: true

must_haves:
  truths:
    - "Highlighted cards no longer display 'Notable' badge"
    - "Highlight variant styling (bg-primary/5, border-primary/20) remains intact"
    - "All tests pass after removing Notable badge assertions"
  artifacts:
    - path: "src/components/results/SupportingCard.tsx"
      provides: "SupportingCard component without Notable badge"
      contains: "variant === 'highlight'"
  key_links: []
---

<objective>
Remove the "Notable" text badge from the highlight variant in SupportingCard.

Purpose: User finds the badge unnecessary and cluttering - color highlighting alone is sufficient for this use case.
Output: Clean SupportingCard without text badge, passing tests.
</objective>

<execution_context>
@/Users/ryan.lucht/.claude/get-shit-done/workflows/execute-plan.md
@/Users/ryan.lucht/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/results/SupportingCard.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove Notable badge from SupportingCard</name>
  <files>
    src/components/results/SupportingCard.tsx
    src/components/results/ResultsSection.test.tsx
    src/components/results/AdvancedResultsSection.test.tsx
  </files>
  <action>
In SupportingCard.tsx:
1. Remove the JSX block that renders the "Notable" badge (lines 36-44: the comment, flex wrapper, and conditional span)
2. Keep the title `<p>` tag but remove the flex wrapper since it's no longer needed
3. Update/remove the WCAG 1.4.1 comments in the file header (lines 7-9) and inline (line 39)
4. Keep the variant prop and highlight styling (bg-primary/5, border-primary/20) - only remove the text badge

In ResultsSection.test.tsx:
1. Remove the test assertions for "Notable" indicator (lines 152-158 area)
2. Keep the test but remove the expectation for the Notable text

In AdvancedResultsSection.test.tsx:
1. Remove the test assertions for "Notable" indicator (lines 227-229 area)
2. Keep the test but remove the expectation for the Notable text
  </action>
  <verify>
Run: `npm test -- --run SupportingCard ResultsSection AdvancedResultsSection`
All tests pass, no "Notable" text appears in SupportingCard component.
  </verify>
  <done>
- SupportingCard highlight variant renders without "Notable" badge
- Highlight styling (purple background/border) still applies
- Tests updated and passing
  </done>
</task>

</tasks>

<verification>
- `npm run lint` passes
- `npm test -- --run` passes for affected test files
- Visual check: highlighted cards show only color differentiation, no badge
</verification>

<success_criteria>
- No "Notable" text rendered in SupportingCard component
- Highlight variant styling preserved (bg-primary/5, border-primary/20)
- All tests pass
- Lint passes
</success_criteria>

<output>
After completion, create `.planning/quick/004-remove-notable-badge/004-SUMMARY.md`
</output>
