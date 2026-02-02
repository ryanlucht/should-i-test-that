# Requirements: Should I Test That? v1.1

**Defined:** 2026-02-02
**Core Value:** Help users make better testing decisions by quantifying the value of information
**Milestone Goal:** Fix correctness and robustness issues in the statistics engine identified by external audit

## Audit Reference

**Primary source:** `.planning/audit.md` — External statistics engine audit
**Supplemental:** `.planning/research/SUPPLEMENTAL.md` — Additional implementation concerns

When planning or implementing fixes, ALWAYS reference the audit for:
- Exact problem description and why it's incorrect
- Concrete fix code snippets
- File locations mentioned in audit

## v1.1 Requirements

Requirements derived from external statistics engine audit + supplemental research.

### EVSI Correctness

> **Audit ref:** Section 2.1 `[HIGH] EVSI Monte Carlo uses the wrong decision rule`
> **Audit ref:** Section 2.2 `[HIGH] Normal EVSI "fast path" computes Bayesian EVSI; Monte Carlo computes value of a different policy`

- [ ] **EVSI-01**: Monte Carlo EVSI uses posterior-mean decision rule (E[L|data] >= T), not L_hat >= T
  - Audit 2.1: "The rule 'ship iff L_hat >= T' ignores the prior and overreacts to noisy estimates"
- [ ] **EVSI-02**: For Normal prior, implement shrinkage: w*L_hat + (1-w)*mu where w = sigma^2/(sigma^2+SE^2)
  - Audit 2.1: See "Correct decision rule for Normal prior + Normal likelihood" and code snippet
- [ ] **EVSI-03**: For non-Normal priors, implement grid-based posterior mean approximation
  - Audit 2.1: See "Fix for non-Normal priors (Student-t / Uniform)" with grid integration method
- [ ] **EVSI-04**: Normal fast-path and Monte Carlo EVSI produce matching results (within MC error)
  - Audit 2.2: "The app can output different EVSI results depending on computation path"

### Truncation Consistency

> **Audit ref:** Section 2.3 `[HIGH] "Truncation at feasibility bounds" is inconsistently applied`

- [ ] **TRUNC-01**: EVPI applies truncation at L=-1 when prior has mass below feasibility bound
  - Audit 2.3: "EVPI (evpi.ts) does NOT truncate the Normal prior at L = -1"
- [ ] **TRUNC-02**: All metrics (mean, probabilities) use consistent truncation assumption
  - Audit 2.3: "Prior metrics may reflect untruncated prior. Simulation paths may behave as if truncated."
- [ ] **TRUNC-03**: Document or implement Method B numerical integration for truncated EVPI
  - Audit 2.3: See "Option A (recommended): implement true truncated priors everywhere"

### Sampling Robustness

> **Audit ref:** Section 3.1 `[MED] Box-Muller normal sampler can produce NaN/Inf`
> **Supplemental ref:** Section 3 `Student-t Inverse CDF at Extreme Quantiles`

- [ ] **SAMP-01**: Box-Muller guards against Math.random()=0 (use Math.max(u, 1e-16))
  - Audit 3.1: "Box-Muller uses log(u1). If u1 = 0, log(0) = -Infinity"
  - Audit 3.1: Fix: `const u1 = Math.max(Math.random(), 1e-16);`
- [ ] **SAMP-02**: Student-t sampling checks for finite z values, re-samples if not
  - Supplemental: "jStat.studentt.inv() may be unstable at extreme quantiles with low df"

### Edge Case Handling

> **Audit ref:** Section 3.2 `[MED] EVPI edge case when sigma_L == 0`
> **Audit ref:** Section 5 `evsi.ts` notes

- [ ] **EDGE-01**: EVPI handles sigma=0 (point-mass prior) without NaN
  - Audit 3.2: "If sigma_L == 0, L is deterministic. Some outputs can incorrectly show 0.5"
  - Audit 3.2: See fix with explicit branch for point mass
- [ ] **EDGE-02**: EVSI handles n_control=0 or n_variant=0 gracefully
  - Audit 5 (evsi.ts): "add guards for n_control/n_variant == 0"

### Student-t Parameters

> **Audit ref:** Section 3.3 `[MED] Student-t prior: parameter meaning and existence of mean/variance`

- [ ] **TDIST-01**: UI labels Student-t "sigma" as "scale" (not SD)
  - Audit 3.3: "sigma is a SCALE parameter, not necessarily the standard deviation"
- [ ] **TDIST-02**: Validation warns when df <= 2 (variance undefined)
  - Audit 3.3: "For df <= 2, variance does not exist"
- [ ] **TDIST-03**: Validation warns or blocks df <= 1 (mean undefined)
  - Audit 3.3: "For df <= 1, mean does not exist"

### Cost of Delay Integration

> **Audit ref:** Section 4.1 `[MED] Cost-of-delay is computed separately from EVSI`

- [ ] **COD-01**: EVSI simulation includes value during test period (split traffic)
  - Audit 4.1: "value during test (split traffic, treatment effect only on variant)"
- [ ] **COD-02**: EVSI simulation includes value during latency period
  - Audit 4.1: "value during latency (depends on operational policy)"
- [ ] **COD-03**: "Net value of testing" computed as single coherent simulation
  - Audit 4.1: "integrate timing into EVSI simulation so 'net value of testing' is one coherent simulation rather than EVSI minus a separate heuristic"

### Worker Lifecycle

> **Supplemental ref:** Section 5 `Web Worker Memory Leak on Navigation`

- [ ] **WORK-01**: Worker terminates immediately on component unmount (not just requestId bump)
  - Supplemental 5: "if the user navigates away mid-calculation, the worker continues running until completion"
  - Supplemental 5: Fix: Track worker reference and call `worker.terminate()` on unmount

## Out of Scope (v1.2+)

| Feature | Reason |
|---------|--------|
| Test Costs inputs | Deferred to focus on correctness fixes first |
| EVPI ceiling comparison display | UI feature, not correctness |
| Shareable URL with encoded state | UI feature, not correctness |
| Interactive sliders | UI feature, not correctness |
| Binomial simulation for SE | More accurate but higher complexity; document approximation for now |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EVSI-01 | Phase 8 | Pending |
| EVSI-02 | Phase 8 | Pending |
| EVSI-03 | Phase 8 | Pending |
| EVSI-04 | Phase 8 | Pending |
| TRUNC-01 | Phase 9 | Pending |
| TRUNC-02 | Phase 9 | Pending |
| TRUNC-03 | Phase 9 | Pending |
| SAMP-01 | Phase 7 | Pending |
| SAMP-02 | Phase 7 | Pending |
| EDGE-01 | Phase 7 | Pending |
| EDGE-02 | Phase 7 | Pending |
| TDIST-01 | Phase 10 | Pending |
| TDIST-02 | Phase 10 | Pending |
| TDIST-03 | Phase 10 | Pending |
| COD-01 | Phase 11 | Pending |
| COD-02 | Phase 11 | Pending |
| COD-03 | Phase 11 | Pending |
| WORK-01 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 — traceability updated with phase mappings*
