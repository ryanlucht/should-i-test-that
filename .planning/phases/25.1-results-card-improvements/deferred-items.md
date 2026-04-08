# Deferred Items - Phase 25.1-01

## Pre-existing Test Failures (Out of Scope)

The following test failures exist in the working tree but are NOT caused by Plan 01 changes.
They result from a store API mismatch: working tree files reference `setMode()` which does not
exist in the wizardStore at this worktree's HEAD commit (97ce053). This is a pre-existing
incompatibility between HEAD and the working tree.

**Affected files:**
- `src/hooks/useEVSICalculations.test.ts` — 20 failures (`setMode is not a function`)
- `src/hooks/useEVPICalculations.test.ts` — multiple failures (same root cause)
- `src/components/results/ResultsSection.test.tsx` — compilation failures (untracked file)
- `src/App.test.tsx` — integration test failures (different Welcome page structure)

These will be resolved naturally when later plans in the wave merge and the worktrees are
reconciled by the orchestrator.
