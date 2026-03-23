# Requirements: Should I Test That?

**Defined:** 2026-03-23
**Core Value:** Help users make better testing decisions by quantifying the value of information

## v2.0 Requirements

Requirements for the Learning Bits milestone — guided experience, engine overhaul, new homepage.

### Deprecation — Basic Mode Removal

- [x] **DEPR-01**: Basic Mode option removed from welcome screen; calculator loads directly into single EVSI mode
- [x] **DEPR-02**: EVPI calculation code, components (CostOfDelayCard, etc.), and related tests removed from codebase
- [x] **DEPR-03**: All mode-switching UI copy, localStorage backup for mode switches, and dual-mode infrastructure removed

### Engine — Statistical Accuracy (High Priority)

- [ ] **ENG-01**: Student-t prior calibrated using t-quantile (not Normal quantile) to preserve user-entered 90% interval
- [ ] **ENG-02**: Student-t chart shading computed from t-quantiles (not Normal quantiles)
- [ ] **ENG-03**: Default decision uses effective truncated prior mean when feasibility truncation is material
- [ ] **ENG-04**: Feasibility truncation detection based on actual tail mass outside [L_min, L_max] (not lower-bound-only heuristic)
- [ ] **ENG-05**: Normal fast path gated by infeasible tail mass; falls back to MC when truncation is material
- [ ] **ENG-06**: Traffic input semantics resolved — dailyTraffic is either total (keep eligibilityFraction) or already-eligible (remove it); no ambiguity
- [ ] **ENG-07**: conversionLatencyDays either folded into decision delay calculation or removed from UI
- [ ] **ENG-08**: Negative net value displayed honestly in UI (not clamped to $0); clear "test not worth running" messaging when net value is negative
- [ ] **ENG-09**: Legacy standalone Cost of Delay retired from exports; net value explanation uses integrated simulation result

### Engine — Statistical Accuracy (Medium Priority)

- [ ] **ENG-10**: Student-t chart plotting uses quantile-based bounds instead of mu +/- 4*sigma
- [ ] **ENG-11**: Student-t posterior grid uses quantile-based bounds instead of mu +/- 6*sigma
- [ ] **ENG-12**: Rejection sampling handles low accepted-mass regimes (adaptive cap or warning when accepted samples fall short)
- [ ] **ENG-13**: 365-day horizon validated — testDurationDays + decisionLatencyDays capped, or explicit horizon parameter introduced

### Engine — Cleanup

- [ ] **ENG-14**: Rare-events warning logic extracted into shared helper (DRY across evsi.ts and net-value.ts)
- [ ] **ENG-15**: Outdated comments corrected (net-value.ts "negative net value is an artifact" comment, hook test nonneg assertions)
- [ ] **ENG-16**: Dead CostOfDelayCard component and unused standalone CoD exports removed
- [ ] **ENG-17**: net-value.ts uses shared liftFeasibilityBounds() helper instead of manual redefinition
- [ ] **ENG-18**: normalPdf() guards against sd <= 0
- [ ] **ENG-19**: Edge-case safety — one-arm-zero, CR0 at 0 or 1, sigma=0, invalid Uniform bounds produce no NaN or contradictory outputs

### Guide — Learning Bits Guided Dialogue

> **BLOCKER:** Actual dialogue text content and section-by-section flow is pending PM input. Do NOT begin implementing GUIDE requirements until dialogue copy is provided.

- [ ] **GUIDE-01**: Fixed-position overlay dialogue box with mascot avatar, typewriter text animation, and animated ellipsis indicating waiting for input
- [ ] **GUIDE-02**: Dialogue text auto-advances as user navigates between calculator sections; contextual messages per section
- [ ] **GUIDE-03**: Guidance on/off toggle persisted in sessionStorage via Zustand; defaults ON for new sessions

### Homepage — New Welcome Experience

- [ ] **HOME-01**: Learning Bits welcome sequence with animated typewriter text greeting user and explaining the tool's purpose
- [ ] **HOME-02**: "Bubbly Pill" Frutiger Aero logo replaces text title (Noto Sans font, glossy purple pill on "Test")
- [ ] **HOME-03**: Start button launches calculator WITH guided flow; "skip guidance" text link launches calculator WITHOUT guided flow
- [ ] **HOME-04**: Footer updated — keep "Created by Ryan Lucht" credit, update model list to "frontier Claude Opus, GPT-Pro, Codex, and Gemini Pro models", remove Hubbard attribution

### Share — Shareable Walkthrough URLs

- [ ] **SHARE-01**: All calculator inputs encoded into a shareable URL via base64url JSON with short keys
- [ ] **SHARE-02**: Shared URLs enable Learning Bits guided flow for recipients by default
- [ ] **SHARE-03**: Share button in results section with copy-to-clipboard and "Copied!" feedback
- [ ] **SHARE-04**: Schema version integer in encoded state with migration chain so old URLs work after future schema changes

### Accessibility

- [ ] **A11Y-01**: Input fields get ARIA labels describing purpose and units; distribution plot gets textual alt description
- [ ] **A11Y-02**: Learning Bits dialogue supports prefers-reduced-motion (full text shown immediately); screen reader support via aria-label + sr-only for typewriter text

### Export

- [ ] **EXPORT-01**: New logo/branding added to exported PNG images
- [ ] **EXPORT-02**: Export file title pre-populated with helpful context and better human readability

### Polish

- [ ] **POL-01**: EVSI and similar acronyms spelled out on first appearance; consistent capitalization throughout
- [ ] **POL-02**: Section headings differentiated from descriptions (bold/larger font for titles vs body text)
- [ ] **POL-03**: Optional fields prefilled from earlier inputs where possible (e.g., derive daily traffic from annual visitors + eligibility)
- [ ] **POL-04**: Inclusive language — clarify "ship" terminology with synonyms or explanations; consistent "Test Design" vs "Experiment Design" naming

### Analytics

- [ ] **DD-01**: Anonymous UUID generated in localStorage, setUser() called before init() so Datadog PA Users view populates

### Deployment

- [ ] **DEPLOY-01**: AWS serverless deployment prepared following Datadog community-golden-paths repo; RUM/PA instrumentation updated if needed

## Future Requirements

### Backlog (v2.1+)

- **COST-01**: Test Costs inputs (hard costs + labor) for declarative "Test!" verdict
- **SLIDER-01**: Interactive sliders synced with text inputs
- **BINOM-01**: Binomial simulation (Exact) mode for low-count/rare-event scenarios

### Collaboration (requires backend)

- **COLLAB-01**: User can save scenario to account
- **COLLAB-03**: User can see active collaborators

## Out of Scope

| Feature | Reason |
|---------|--------|
| EVPI / Basic Mode | Deprecated in v2.0 — single EVSI mode |
| EVPI ceiling comparison display | No longer applicable after Basic Mode removal |
| User accounts / saved sessions | Stateless tool, no backend |
| Mobile-optimized design | Desktop-first; mobile can be rough |
| Multilingual support | English only |
| Real-time collaboration | Requires backend |
| Sound effects for typewriter | Adds complexity with marginal UX benefit on web; defer |
| Click-to-advance in dialogue | Text auto-advances on section navigation instead |
| URL shortener integration | URLs already compact (~300 chars); no external dependency |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPR-01 | Phase 19 | Complete |
| DEPR-02 | Phase 19 | Complete |
| DEPR-03 | Phase 19 | Complete |
| ENG-01 | Phase 20 | Pending |
| ENG-02 | Phase 20 | Pending |
| ENG-03 | Phase 20 | Pending |
| ENG-04 | Phase 20 | Pending |
| ENG-05 | Phase 20 | Pending |
| ENG-06 | Phase 20 | Pending |
| ENG-07 | Phase 20 | Pending |
| ENG-08 | Phase 20 | Pending |
| ENG-09 | Phase 20 | Pending |
| ENG-10 | Phase 20 | Pending |
| ENG-11 | Phase 20 | Pending |
| ENG-12 | Phase 20 | Pending |
| ENG-13 | Phase 20 | Pending |
| ENG-14 | Phase 21 | Pending |
| ENG-15 | Phase 21 | Pending |
| ENG-16 | Phase 21 | Pending |
| ENG-17 | Phase 21 | Pending |
| ENG-18 | Phase 21 | Pending |
| ENG-19 | Phase 21 | Pending |
| GUIDE-01 | Phase 22 | Pending |
| GUIDE-02 | Phase 22 | Pending |
| GUIDE-03 | Phase 22 | Pending |
| HOME-01 | Phase 23 | Pending |
| HOME-02 | Phase 23 | Pending |
| HOME-03 | Phase 23 | Pending |
| HOME-04 | Phase 23 | Pending |
| SHARE-01 | Phase 24 | Pending |
| SHARE-02 | Phase 24 | Pending |
| SHARE-03 | Phase 24 | Pending |
| SHARE-04 | Phase 24 | Pending |
| A11Y-01 | Phase 25 | Pending |
| A11Y-02 | Phase 25 | Pending |
| EXPORT-01 | Phase 25 | Pending |
| EXPORT-02 | Phase 25 | Pending |
| POL-01 | Phase 25 | Pending |
| POL-02 | Phase 25 | Pending |
| POL-03 | Phase 25 | Pending |
| POL-04 | Phase 25 | Pending |
| DD-01 | Phase 25 | Pending |
| DEPLOY-01 | Phase 26 | Pending |

**Coverage:**
- v2.0 requirements: 43 total (3 DEPR + 19 ENG + 3 GUIDE + 4 HOME + 4 SHARE + 2 A11Y + 2 EXPORT + 4 POL + 1 DD + 1 DEPLOY)
- Mapped to phases: 43/43 (100%)

---
*Requirements defined: 2026-03-23*
*Traceability updated: 2026-03-23 (roadmap created)*
