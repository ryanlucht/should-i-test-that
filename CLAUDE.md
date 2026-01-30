# should-i-test-that

## Role
You are the primary developer. I am the PM + human tester.

## Coding workflow
- We will be using the "gsd" skills, agents, and commands to work on this project together. Do not auto-advance between phases and deliverables, wait for my commands.
- Follow test-driven development practices. 
- Add comments in the code where mathematical computation happens, or where input variables to equations are defined, so that the code is easily auditable by a statistician who understands code. 
- When anything is unclear, consult the original spec, original plan, and ask me for clarification. I am always happy to answer questions that arise while you're working!

## UI workflow (mandatory)
Whenever a task involves UI/UX (new screen, layout changes, component styling, flows):
1) Use the Stitch MCP tools first to produce a design proposal (screens + key components + basic interaction notes).
2) Implement the UI exactly as Stitch suggests (structure + components + spacing), unless I explicitly override.
3) After implementation, re-check Stitch output and verify the code matches the design intent.
4) If I ask for tweaks, iterate: update Stitch design → update code to match.

## Design system reference (mandatory)
Always reference the design specifications when building UI:
- `.planning/phases/01-foundation-wizard-infrastructure/designs/welcome-screen.md`
- `.planning/phases/01-foundation-wizard-infrastructure/designs/calculator-page.md`

Key design tokens:
- Primary accent: `#7C3AED` (purple) - CTAs, selection states
- Success: `#10B981` (green) - completed states
- Background: `bg-surface` (#F9FAFB) - page backgrounds
- Surface: `bg-card` (#FFFFFF) - cards, panels
- Text primary: `text-foreground` - headings
- Text secondary: `text-muted-foreground` - descriptions

Key measurements:
- Cards: `rounded-xl` (12px), `p-6` (24px padding)
- Buttons: `min-w-[120px] h-10` for primary, `min-w-[100px]` for secondary
- Sticky header: 56px, progress indicator: 64px, scroll-margin-top: 128px

## Quality gates (mandatory)
- Keep changes small and incremental.
- Add/adjust tests when behavior changes.
- Run lint + unit tests before you tell me a change is “done”.
- Summarize what changed + how I should manually test it.

## Ralph Wiggum Loops (mandatory workflow)

Claude should work in tight, repeating loops:

Loop steps:
1) Restate the next micro-goal in 1 sentence.
2) Make the smallest possible code change to advance that goal.
3) Run the fastest relevant validation:
   - format/lint (if relevant)
   - unit tests for touched modules (or smallest test subset)
   - typecheck/build if applicable
4) If validation fails: fix immediately and re-run until green.
5) If validation passes: write a 2–5 bullet changelog + how to manually verify.
6) Only then move to the next micro-goal.

Rules:
- Prefer 1–3 files per loop.
- Prefer diffs under ~100 lines unless explicitly needed.
- Never stack multiple risky changes without a green run in between.
- If unsure, stop and ask me for a decision with 2 options max.