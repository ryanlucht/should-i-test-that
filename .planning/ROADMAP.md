# Roadmap: v2.0 Learning Bits

## Overview

Transform the calculator from a dual-mode tool into a single guided EVSI experience. This milestone deprecates Basic Mode first (simplifying the codebase), then fixes statistical engine accuracy, builds the Learning Bits guided dialogue system, adds a new homepage, enables shareable walkthrough URLs, and ships to AWS. The GUIDE phase is partially blocked pending PM dialogue content.

**Milestone:** v2.0
**Phases:** 19-26 (8 phases)
**Requirements:** 43 (3 DEPR + 19 ENG + 3 GUIDE + 4 HOME + 4 SHARE + 2 A11Y + 2 EXPORT + 4 POL + 1 DD + 1 DEPLOY)
**Granularity:** Standard

## Phases

- [x] **Phase 19: Basic Mode Deprecation** - Remove EVPI calculations, dual-mode UI, and mode-switching infrastructure (completed 2026-03-24)
- [x] **Phase 20: Engine Accuracy Fixes** - Fix Student-t calibration, feasibility/truncation, traffic semantics, negative net value, and horizon validation (completed 2026-03-24)
- [x] **Phase 21: Engine Cleanup** - Extract shared helpers, fix comments, remove dead code, harden edge cases (completed 2026-03-24)
- [x] **Phase 22: Learning Bits Guide Infrastructure** - Build dialogue component, typewriter hook, toggle, and section-aware state (BLOCKED on PM content for dialogue text) (completed 2026-03-25)
- [x] **Phase 22.1: Stats Engine Correctness Fixes** - Fix remaining audit findings: Student-t double-division, worker truncation routing, truncated posterior mean, centralized prior builder, threshold formatting, traffic label semantics, legacy CoD removal, warning plumbing (completed 2026-03-25)
- [x] **Phase 23: Homepage & Welcome Experience** - New homepage with Learning Bits welcome sequence, logo, start/skip flow, and footer update (completed 2026-03-26)
- [x] **Phase 24: Shareable Walkthrough URLs** - Encode calculator state into URLs with guided mode flag, schema versioning, and copy-to-clipboard (completed 2026-04-06)
- [x] **Phase 25: Polish, Accessibility & Export** - Acronym definitions, heading hierarchy, derived prefills, inclusive language, ARIA labels, reduced-motion support, export branding, and Datadog PA user identification (completed 2026-04-08)
- [ ] **Phase 26: AWS Deployment** - Serverless deployment following Datadog community-golden-paths

## Phase Details

### Phase 19: Basic Mode Deprecation
**Goal**: Calculator operates as a single EVSI-based experience with no trace of dual-mode infrastructure
**Depends on**: Nothing (first phase -- simplifies codebase before all other work)
**Requirements**: DEPR-01, DEPR-02, DEPR-03
**Success Criteria** (what must be TRUE):
  1. Welcome screen has no Basic/Advanced mode selector; calculator loads directly into EVSI mode
  2. No EVPI calculation code, components (CostOfDelayCard, etc.), or EVPI-related tests remain in the codebase
  3. All mode-switching UI copy, localStorage backup for mode switches, and dual-mode conditional rendering are gone
  4. Existing Advanced mode inputs and calculations still work correctly after removal
**Plans:** 3/3 plans complete

Plans:
- [x] 19-01-PLAN.md -- Delete EVPI calculation code, Basic results components, and related tests
- [ ] 19-02-PLAN.md -- Remove mode infrastructure from types, store, pages, hooks, and export components
- [ ] 19-03-PLAN.md -- Migrate form consumers to flat store API and rename ResultsSection

### Phase 20: Engine Accuracy Fixes
**Goal**: Statistical engine produces correct results for Student-t priors, feasibility-truncated scenarios, and edge cases in traffic/horizon semantics
**Depends on**: Phase 19 (deprecation simplifies the code paths engine fixes touch)
**Requirements**: ENG-01, ENG-02, ENG-03, ENG-04, ENG-05, ENG-06, ENG-07, ENG-08, ENG-09, ENG-10, ENG-11, ENG-12, ENG-13
**Success Criteria** (what must be TRUE):
  1. Student-t prior with user-entered 90% CI produces a distribution whose 5th/95th percentiles match the entered bounds (not Normal-approximated bounds)
  2. When feasibility truncation is material, the default decision and Normal fast-path fallback reflect the truncated prior (not the untruncated one)
  3. Traffic input semantics are unambiguous -- either dailyTraffic means total visitors (eligibilityFraction applies) or already-eligible visitors (no eligibilityFraction), with no contradictory paths
  4. Negative net value displays honestly as a negative dollar amount with "test not worth running" messaging (not clamped to $0)
  5. Test duration + decision latency cannot silently exceed a 365-day horizon without explicit validation or capping
**Plans:** 3/4 plans complete

Plans:
- [x] 20-01-PLAN.md -- Student-t calibration via t-quantile, chart shading, plotting range, and posterior grid bounds
- [x] 20-02-PLAN.md -- Traffic label/tooltip fixes, conversionLatencyDays removal, and 365-day horizon validation
- [x] 20-03-PLAN.md -- Feasibility/truncation consistency: tail-mass detection, truncated default decision, fast-path gating, rejection sampling
- [ ] 20-04-PLAN.md -- Negative net value display and legacy Cost of Delay retirement from exports

### Phase 21: Engine Cleanup
**Goal**: Engine codebase is DRY, comments are accurate, dead code is removed, and edge cases produce no NaN or contradictory outputs
**Depends on**: Phase 20 (cleanup builds on top of accuracy fixes)
**Requirements**: ENG-14, ENG-15, ENG-16, ENG-17, ENG-18, ENG-19
**Success Criteria** (what must be TRUE):
  1. Rare-events warning logic exists in a single shared helper used by both evsi.ts and net-value.ts
  2. No outdated comments remain about negative net value being "an artifact" or non-negative assertions in hook tests
  3. Dead CostOfDelayCard component and unused standalone CoD exports are gone from the codebase
  4. normalPdf() returns 0 (not NaN/Infinity) when sd <= 0; edge-case inputs (one-arm-zero, CR0=0, CR0=1, sigma=0, invalid Uniform bounds) produce valid numeric outputs
**Plans:** 2/2 plans complete

Plans:
- [x] 21-01-PLAN.md -- Extract shared warning helpers into feasibility.ts, add normalPdf sd<=0 guard, update CalculationWarning type
- [x] 21-02-PLAN.md -- Fix outdated hook test assertions, verify dead CostOfDelayCard removal, add comprehensive edge-case safety tests

### Phase 22: Learning Bits Guide Infrastructure
**Goal**: Complete Learning Bits guided dialogue overlay with RPG-style card, mascot avatar, typewriter animation, section-aware messages, accordion collapses, and highlight pulse — wired to calculator sections with all 7 final dialogue messages
**Depends on**: Phase 21 (engine must be stable before layering UI)
**Requirements**: GUIDE-01, GUIDE-02, GUIDE-03
**Success Criteria** (what must be TRUE):
  1. A fixed-position overlay dialogue box with mascot avatar and typewriter text animation appears when guidance is enabled
  2. Dialogue content updates automatically when user navigates between calculator sections
  3. Guidance on/off toggle persists in sessionStorage; new sessions default to guidance ON
  4. Animated ellipsis indicates waiting state after text completes; prefers-reduced-motion shows full text immediately
**Plans:** 2/2 plans complete

Plans:
- [x] 22-01-PLAN.md -- Store extension, hooks (useTypewriter, useGuideMessages), CSS infrastructure, font import, mascot asset
- [x] 22-02-PLAN.md -- Guide components (Overlay, Avatar, Bubble, BouncingDots), accordion collapses, highlight pulse, CalculatorPage wiring

**UI hint**: yes

### Phase 22.1: Stats Engine Correctness Fixes (INSERTED)

**Goal:** All 8 audit findings from the v2 statistics audit are resolved: Student-t prior scale is correct at hook level, worker respects truncation routing, posterior mean uses truncated formula when appropriate, prior construction is centralized, threshold display is unit-aware, traffic label semantics are unambiguous, legacy CoD is removed, and warnings are plumbed to the UI
**Requirements**: AUDIT-P1, AUDIT-P2, AUDIT-P3, AUDIT-P4, AUDIT-P5, AUDIT-P6, AUDIT-P7, AUDIT-P8a, AUDIT-P8b
**Depends on:** Phase 22
**Success Criteria** (what must be TRUE):
  1. Student-t prior with [-8.22, 8.22] and df=5 produces sigma_L ~ 0.04079 (not 0.0004079)
  2. Worker does not use Normal fast path when infeasible tail mass exceeds TRUNCATION_THRESHOLD
  3. computePosteriorMean returns truncated-Normal posterior mean when truncation is active
  4. All prior-construction sites (hook, form preview, results) use single buildPriorFromInputs helper
  5. Dollar thresholds display as currency, not as percentage
  6. dailyTraffic label/tooltip clarifies total traffic before eligibility filtering
  7. Legacy calculateCostOfDelay and CoDResults removed from codebase
  8. Net-value warnings reach the UI warning renderer
**Plans:** 5/5 plans complete

Plans:
- [x] 22.1-01-PLAN.md -- Centralize prior construction (buildPriorFromInputs) and fix Student-t double-division
- [x] 22.1-02-PLAN.md -- Unit-aware threshold formatting and dailyTraffic label semantics fix
- [x] 22.1-03-PLAN.md -- Remove legacy Cost of Delay from hook, export button, and export card
- [x] 22.1-04-PLAN.md -- Worker truncation routing gate and dead truncated-normal.ts deletion
- [x] 22.1-05-PLAN.md -- Truncated-Normal posterior mean for Normal priors and net-value warning plumbing

### Phase 23: Homepage & Welcome Experience
**Goal**: Users land on a new homepage with Learning Bits welcome dialogue, branded logo, and clear start/skip paths into the calculator
**Depends on**: Phase 22 (reuses the dialogue component for welcome sequence)
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-04
**Success Criteria** (what must be TRUE):
  1. Homepage displays animated typewriter welcome text from Learning Bits mascot explaining the tool's purpose
  2. "Bubbly Pill" Frutiger Aero logo with glossy purple pill on "Test" replaces the previous text title
  3. Start button launches calculator WITH guided flow enabled; "skip guidance" link launches calculator WITHOUT guided flow
  4. Footer credits Ryan Lucht and lists "frontier Claude Opus, GPT-Pro, Codex, and Gemini Pro models" (no Hubbard attribution)
**Plans:** 2/2 plans complete

Plans:
- [x] 23-01-PLAN.md -- Bubbly Pill logo, Noto Sans font, Frutiger Aero CSS, and WelcomePage rewrite with dialogue, CTAs, footer
- [x] 23-02-PLAN.md -- App.tsx routing wiring for dual navigation paths and integration test updates

**UI hint**: yes

### Phase 24: Shareable Walkthrough URLs
**Goal**: Users can share a URL that opens the calculator with their inputs pre-filled and Learning Bits guidance enabled for the recipient
**Depends on**: Phase 23 (calculator must be in final state -- engine fixed, deprecation done, guide built)
**Requirements**: SHARE-01, SHARE-02, SHARE-03, SHARE-04
**Success Criteria** (what must be TRUE):
  1. All calculator inputs are encoded into a compact URL via base64url JSON with short keys (under 400 characters for typical scenarios)
  2. Opening a shared URL hydrates the calculator with the sender's inputs and enables Learning Bits guided flow by default
  3. Share button in results section copies URL to clipboard with "Copied!" feedback that resets after 2 seconds
  4. Encoded state includes a schema version integer; URLs created today will still decode correctly after future schema changes
**Plans:** 3/3 plans complete

Plans:
- [x] 24-01-PLAN.md -- URL codec: encode/decode WizardInputs with base64url JSON, short keys, and schema versioning (TDD)
- [x] 24-02-PLAN.md -- Store sharedBaseline extension, share button in EVSIVerdictCard with clipboard copy, URL hydration in App.tsx
- [x] 24-03-PLAN.md -- Modified-field visual indicators: useSharedDiff hook and accessible form input styling

**UI hint**: yes

### Phase 25: Polish, Accessibility & Export
**Goal**: Calculator is polished, accessible, branded for export, and tracked in Datadog PA
**Depends on**: Phase 24 (polish and a11y apply to the final UI surface; export needs final branding; DD-01 is independent but tiny)
**Requirements**: POL-01, POL-02, POL-03, POL-04, A11Y-01, A11Y-02, EXPORT-01, EXPORT-02, DD-01
**Success Criteria** (what must be TRUE):
  1. EVSI and similar acronyms are spelled out on first use; section headings are visually differentiated from description text
  2. Optional fields are prefilled where derivable from earlier inputs (e.g., daily traffic from annual visitors + eligibility)
  3. Input fields have ARIA labels describing purpose and units; distribution plot has a textual alt description
  4. Learning Bits dialogue respects prefers-reduced-motion (full text shown immediately) and supports screen readers via sr-only text
  5. Exported PNG images include the new logo/branding; export file title is pre-populated with helpful context
  6. Datadog PA Users view populates with anonymous UUIDs generated from localStorage
**Plans**: TBD
**UI hint**: yes

### Phase 26: AWS Deployment
**Goal**: Application is deployed to AWS serverless infrastructure with working Datadog instrumentation
**Depends on**: Phase 25 (deploy the finished product)
**Requirements**: DEPLOY-01
**Success Criteria** (what must be TRUE):
  1. Application is accessible at its production URL via AWS serverless hosting
  2. Datadog RUM/PA instrumentation reports data correctly from the AWS-hosted deployment
**Plans**: TBD

## Progress

**Execution Order:** 19 > 20 > 21 > 22 > 22.1 > 23 > 24 > 25 > 26

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 19. Basic Mode Deprecation | 1/3 | Complete    | 2026-03-24 |
| 20. Engine Accuracy Fixes | 3/4 | Complete    | 2026-03-24 |
| 21. Engine Cleanup | 2/2 | Complete    | 2026-03-24 |
| 22. Learning Bits Guide Infrastructure | 2/2 | Complete    | 2026-03-25 |
| 22.1. Stats Engine Correctness Fixes | 5/5 | Complete    | 2026-03-25 |
| 23. Homepage & Welcome Experience | 2/2 | Complete    | 2026-03-26 |
| 24. Shareable Walkthrough URLs | 3/3 | Complete    | 2026-04-06 |
| 25. Polish, Accessibility & Export | 3/3 | Complete    | 2026-04-08 |
| 26. AWS Deployment | 0/TBD | Not started | - |

## Coverage Validation

| Requirement | Phase | Mapped |
|-------------|-------|--------|
| DEPR-01 | 19 | Yes |
| DEPR-02 | 19 | Yes |
| DEPR-03 | 19 | Yes |
| ENG-01 | 20 | Yes |
| ENG-02 | 20 | Yes |
| ENG-03 | 20 | Yes |
| ENG-04 | 20 | Yes |
| ENG-05 | 20 | Yes |
| ENG-06 | 20 | Yes |
| ENG-07 | 20 | Yes |
| ENG-08 | 20 | Yes |
| ENG-09 | 20 | Yes |
| ENG-10 | 20 | Yes |
| ENG-11 | 20 | Yes |
| ENG-12 | 20 | Yes |
| ENG-13 | 20 | Yes |
| ENG-14 | 21 | Yes |
| ENG-15 | 21 | Yes |
| ENG-16 | 21 | Yes |
| ENG-17 | 21 | Yes |
| ENG-18 | 21 | Yes |
| ENG-19 | 21 | Yes |
| GUIDE-01 | 22 | Yes |
| GUIDE-02 | 22 | Yes |
| GUIDE-03 | 22 | Yes |
| AUDIT-P1 | 22.1 | Yes |
| AUDIT-P2 | 22.1 | Yes |
| AUDIT-P3 | 22.1 | Yes |
| AUDIT-P4 | 22.1 | Yes |
| AUDIT-P5 | 22.1 | Yes |
| AUDIT-P6 | 22.1 | Yes |
| AUDIT-P7 | 22.1 | Yes |
| AUDIT-P8a | 22.1 | Yes |
| AUDIT-P8b | 22.1 | Yes |
| HOME-01 | 23 | Yes |
| HOME-02 | 23 | Yes |
| HOME-03 | 23 | Yes |
| HOME-04 | 23 | Yes |
| SHARE-01 | 24 | Yes |
| SHARE-02 | 24 | Yes |
| SHARE-03 | 24 | Yes |
| SHARE-04 | 24 | Yes |
| A11Y-01 | 25 | Yes |
| A11Y-02 | 25 | Yes |
| EXPORT-01 | 25 | Yes |
| EXPORT-02 | 25 | Yes |
| POL-01 | 25 | Yes |
| POL-02 | 25 | Yes |
| POL-03 | 25 | Yes |
| POL-04 | 25 | Yes |
| DD-01 | 25 | Yes |
| DEPLOY-01 | 26 | Yes |

**Coverage:** 52/52 requirements mapped (100%)

---
*Roadmap created: 2026-03-23*
