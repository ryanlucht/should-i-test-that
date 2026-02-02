# Requirements: Should I Test That? v1.1

**Defined:** 2026-02-02
**Core Value:** Help users make better testing decisions by quantifying the value of information
**Milestone Goal:** Fix correctness and robustness issues in the statistics engine identified by external audit

## v1.1 Requirements

Requirements derived from external statistics engine audit + supplemental research.

### EVSI Correctness

- [ ] **EVSI-01**: Monte Carlo EVSI uses posterior-mean decision rule (E[L|data] >= T), not L_hat >= T
- [ ] **EVSI-02**: For Normal prior, implement shrinkage: w*L_hat + (1-w)*mu where w = σ²/(σ²+SE²)
- [ ] **EVSI-03**: For non-Normal priors, implement grid-based posterior mean approximation
- [ ] **EVSI-04**: Normal fast-path and Monte Carlo EVSI produce matching results (within MC error)

### Truncation Consistency

- [ ] **TRUNC-01**: EVPI applies truncation at L=-1 when prior has mass below feasibility bound
- [ ] **TRUNC-02**: All metrics (mean, probabilities) use consistent truncation assumption
- [ ] **TRUNC-03**: Document or implement Method B numerical integration for truncated EVPI

### Sampling Robustness

- [ ] **SAMP-01**: Box-Muller guards against Math.random()=0 (use Math.max(u, 1e-16))
- [ ] **SAMP-02**: Student-t sampling checks for finite z values, re-samples if not

### Edge Case Handling

- [ ] **EDGE-01**: EVPI handles sigma=0 (point-mass prior) without NaN
- [ ] **EDGE-02**: EVSI handles n_control=0 or n_variant=0 gracefully

### Student-t Parameters

- [ ] **TDIST-01**: UI labels Student-t "sigma" as "scale" (not SD)
- [ ] **TDIST-02**: Validation warns when df <= 2 (variance undefined)
- [ ] **TDIST-03**: Validation warns or blocks df <= 1 (mean undefined)

### Cost of Delay Integration

- [ ] **COD-01**: EVSI simulation includes value during test period (split traffic)
- [ ] **COD-02**: EVSI simulation includes value during latency period
- [ ] **COD-03**: "Net value of testing" computed as single coherent simulation

### Worker Lifecycle

- [ ] **WORK-01**: Worker terminates immediately on component unmount (not just requestId bump)

## Out of Scope (v1.2+)

| Feature | Reason |
|---------|--------|
| Test Costs inputs | Deferred to focus on correctness fixes first |
| EVPI ceiling comparison display | UI feature, not correctness |
| Shareable URL with encoded state | UI feature, not correctness |
| Interactive sliders | UI feature, not correctness |
| Binomial simulation for SE | More accurate but higher complexity; document approximation for now |

## Traceability

To be populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EVSI-01 | TBD | Pending |
| EVSI-02 | TBD | Pending |
| EVSI-03 | TBD | Pending |
| EVSI-04 | TBD | Pending |
| TRUNC-01 | TBD | Pending |
| TRUNC-02 | TBD | Pending |
| TRUNC-03 | TBD | Pending |
| SAMP-01 | TBD | Pending |
| SAMP-02 | TBD | Pending |
| EDGE-01 | TBD | Pending |
| EDGE-02 | TBD | Pending |
| TDIST-01 | TBD | Pending |
| TDIST-02 | TBD | Pending |
| TDIST-03 | TBD | Pending |
| COD-01 | TBD | Pending |
| COD-02 | TBD | Pending |
| COD-03 | TBD | Pending |
| WORK-01 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18 ⚠️

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after initial definition*
