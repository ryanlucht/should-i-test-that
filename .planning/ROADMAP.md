# Roadmap: Should I Test That?

## Completed Milestones

- **v1.0 MVP** (2026-02-02): 8 phases, 31 plans — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

## Current Milestone: v1.1 Refine Stats Engine

**Goal:** Fix correctness and robustness issues in the statistics engine identified by external audit.

**Phases:** 5 (Phases 7-11)
**Requirements:** 18 total

### Audit Reference

> **Primary source:** `.planning/audit.md`
> **Supplemental:** `.planning/research/SUPPLEMENTAL.md`
>
> When planning or executing, reference these documents for:
> - Problem descriptions and root cause analysis
> - Concrete fix code snippets
> - File locations and line numbers

### Phases Overview

- [ ] **Phase 7: Defensive Fixes** - Harden sampling, edge cases, and worker lifecycle
- [ ] **Phase 8: EVSI Correctness** - Fix Monte Carlo decision rule to use posterior mean
- [ ] **Phase 9: Truncation Consistency** - Apply feasibility bounds uniformly across calculations
- [ ] **Phase 10: Student-t Parameters** - Improve UI labels and validation for t-distribution
- [ ] **Phase 11: Cost of Delay Integration** - Integrate CoD into EVSI simulation for coherent net value

## Phase Details

### Phase 7: Defensive Fixes
**Goal**: Eliminate edge-case failures and resource leaks before touching core algorithms
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: SAMP-01, SAMP-02, EDGE-01, EDGE-02, WORK-01
**Audit sections**: 3.1 (Box-Muller), 3.2 (sigma=0), 5 (evsi.ts guards), Supplemental 3+5
**Success Criteria** (what must be TRUE):
  1. Box-Muller sampling never produces NaN/Infinity even when Math.random() returns 0
  2. Student-t sampling handles non-finite intermediate values by re-sampling
  3. EVPI returns correct deterministic value when sigma=0 (point-mass prior)
  4. EVSI handles n=0 for control or variant without crashing
  5. Monte Carlo worker terminates immediately when user navigates away mid-calculation
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

### Phase 8: EVSI Correctness
**Goal**: Monte Carlo EVSI uses Bayesian posterior-mean decision rule, matching analytical results
**Depends on**: Phase 7
**Requirements**: EVSI-01, EVSI-02, EVSI-03, EVSI-04
**Audit sections**: 2.1 (wrong decision rule + fix), 2.2 (fast-path vs MC inconsistency)
**Success Criteria** (what must be TRUE):
  1. Each Monte Carlo iteration decides based on E[L|data] >= threshold, not sample L_hat
  2. Normal prior EVSI uses shrinkage formula: posterior_mean = w*L_hat + (1-w)*prior_mu
  3. Non-Normal priors compute posterior mean via grid-based numerical integration
  4. Normal fast-path EVSI and Monte Carlo EVSI agree within expected Monte Carlo error bounds
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

### Phase 9: Truncation Consistency
**Goal**: All calculations respect the feasibility bound (L >= -1) consistently
**Depends on**: Phase 8
**Requirements**: TRUNC-01, TRUNC-02, TRUNC-03
**Audit sections**: 2.3 (truncation inconsistency + fix options)
**Success Criteria** (what must be TRUE):
  1. EVPI calculation uses truncated prior when significant mass exists below L=-1
  2. Prior mean, variance, and probabilities are all computed on the truncated distribution
  3. Method B (numerical integration) is documented or implemented for truncated EVPI edge cases
**Plans**: TBD

Plans:
- [ ] 09-01: TBD

### Phase 10: Student-t Parameters
**Goal**: User interface clearly communicates Student-t parameter semantics and validates inputs
**Depends on**: Nothing (independent UI work)
**Requirements**: TDIST-01, TDIST-02, TDIST-03
**Audit sections**: 3.3 (Student-t parameter meaning + recommended actions)
**Success Criteria** (what must be TRUE):
  1. UI labels Student-t dispersion parameter as "scale" (not sigma or SD)
  2. Validation displays warning when df <= 2 (variance undefined)
  3. Validation displays warning or blocks submission when df <= 1 (mean undefined)
**Plans**: TBD

Plans:
- [ ] 10-01: TBD

### Phase 11: Cost of Delay Integration
**Goal**: Net value of testing computed as a single coherent simulation including CoD effects
**Depends on**: Phase 8, Phase 9
**Requirements**: COD-01, COD-02, COD-03
**Audit sections**: 4.1 (CoD computed separately + integration recommendation)
**Success Criteria** (what must be TRUE):
  1. Simulation includes foregone value during test period (split traffic)
  2. Simulation includes foregone value during latency period (implementation delay)
  3. "Net value of testing" metric reflects EVSI minus integrated CoD in one coherent calculation
**Plans**: TBD

Plans:
- [ ] 11-01: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 7. Defensive Fixes | 0/TBD | Not started | - |
| 8. EVSI Correctness | 0/TBD | Not started | - |
| 9. Truncation Consistency | 0/TBD | Not started | - |
| 10. Student-t Parameters | 0/TBD | Not started | - |
| 11. Cost of Delay Integration | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-02*
*For milestone archives, see `.planning/milestones/`*
