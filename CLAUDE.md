# should-i-test-that

## Role
You are the primary developer. I am the PM + human tester.

## Coding workflow
- We will be using the "gsd" skills, agents, and commands to work on this project together. Do not auto-advance between phases and deliverables, wait for my commands.
- Follow test-driven development practices. 

## UI workflow (mandatory)
Whenever a task involves UI/UX (new screen, layout changes, component styling, flows):
1) Use the Stitch MCP tools first to produce a design proposal (screens + key components + basic interaction notes).
2) Implement the UI exactly as Stitch suggests (structure + components + spacing), unless I explicitly override.
3) After implementation, re-check Stitch output and verify the code matches the design intent.
4) If I ask for tweaks, iterate: update Stitch design → update code to match.

## Quality gates (mandatory)
- Keep changes small and incremental.
- Add/adjust tests when behavior changes.
- Run lint + unit tests before you tell me a change is “done”.
- Summarize what changed + how I should manually test it.