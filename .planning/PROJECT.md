# Should I Test That?

## What This Is

A decision-value calculator that helps non-technical users (PMs, growth, marketing) decide whether an A/B test is worth running. It outputs a single "max cost worth paying" threshold: "If you can A/B test this idea for less than $X, it's worth testing." The calculator uses EVSI (Expected Value of Sample Information) to provide a realistic estimate of the value of running a test, with an optional guided dialogue flow powered by the "Learning Bits" mascot that walks users through each input.

> **IMPORTANT:** This document provides a broad overview of the project. For exact specifications (formulas, UI copy, validation rules, edge cases), always reference **SPEC.md** as the source of truth. The mathematical approach and decision theory are already defined there — do not deviate.

## Core Value

Help users make better testing decisions by quantifying the value of information — so they stop running tests that aren't worth it and start running tests that are.

## Current State

**Version:** v2.0 in progress (v1.2 shipped 2026-02-21)
**Phase 22 complete** — Learning Bits guide infrastructure: RPG dialogue overlay with 8-message typewriter system, accordion progressive disclosure, highlight pulse, session persistence
**Phase 22.1 complete** — Stats engine correctness: Student-t calibration fix, centralized prior construction, unit-aware threshold formatting, worker truncation routing, truncated-Normal posterior mean, legacy CoD removal, warning plumbing
**Phase 23 complete** — Homepage & Welcome Experience: Bubbly Pill Frutiger Aero logo, Learning Bits mascot welcome dialogue with typewriter animation, dual start/skip navigation paths wired to Zustand guideEnabled, updated footer
**Codebase:** ~16,400 lines TypeScript/React (Phase 19: -3,100 lines EVPI/mode code removed)
**Tech stack:** Vite + React 19 + TypeScript + Tailwind 4 + shadcn/ui + Zustand + Recharts + jStat + Datadog RUM

## Current Milestone: v2.0 Learning Bits

**Goal:** Transform the calculator from a dual-mode tool into a single guided experience with the Learning Bits mascot, fix statistical engine accuracy, and prepare for AWS deployment.

**Target features:**
- Basic Mode deprecation — remove EVPI calculations and dual-mode infrastructure entirely
- Statistical engine fixes — Student-t calibration, feasibility/truncation consistency, traffic input semantics, negative net value handling, legacy CoD cleanup
- Learning Bits guided dialogue — Brain Age-inspired overlay with animated typing, contextual per-section explanations, toggleable via session storage
- New homepage — Learning Bits welcome dialogue, "Bubbly Pill" logo (Frutiger Aero style), start button, skip-guidance link
- Datadog PA user identification — fix Product Analytics to track Users
- Shareable "walkthrough" URLs — encode all calculator inputs into a URL that opens the calculator with pre-filled state AND Learning Bits guided flow enabled, so recipients get walked through the sender's analysis
- Extract rare-events warning helper — DRY up duplicated logic across evsi.ts/net-value.ts (natural fit with engine overhaul)
- PNG export branding — add new logo/branding to exported images
- General polish — acronym definitions, heading hierarchy, derived field prefills, inclusive language, export visibility, ARIA/screen reader accessibility
- AWS serverless deployment prep — follow Datadog community-golden-paths for setup

## Requirements

### Validated

- 5-step wizard flow with progress indicator and validation — v1.0
- Basic mode: EVPI calculation from business inputs + prior + threshold — v1.0
- Advanced mode: EVSI via Monte Carlo, Cost of Delay, prior shape selection — v1.0
- Live-updating distribution chart with threshold visualization — v1.0
- Clear results with supporting explanations (probability, regret, etc.) — v1.0
- PNG export with descriptive filenames — v1.0
- Datadog-inspired visual design with purple accent — v1.0
- Desktop-first responsive layout — v1.0
- WCAG 2.1 AA accessibility (keyboard nav, ARIA, text redundancy) — v1.0
- EVSI Monte Carlo uses Bayesian posterior-mean decision rule (E[L|data] >= T) — v1.1
- Normal fast-path and Monte Carlo EVSI produce consistent results — v1.1
- Truncation at feasibility bounds (L >= -1) applied consistently — v1.1
- Box-Muller sampling guards against Math.random()=0 — v1.1
- EVPI handles sigma=0 (degenerate/point-mass prior) correctly — v1.1
- Student-t parameter clarity (scale vs SD labeling) — v1.1
- Cost of Delay integrated into EVSI simulation (coherent net value) — v1.1
- Effective prior metrics computed under feasibility truncation — v1.1
- Warnings for rare events and high rejection rates — v1.1
- Datadog RUM SDK with error tracking and session replay — v1.2
- Custom analytics events for wizard steps, mode selection, calculations, exports — v1.2
- DRUIDS design tokens (colors, typography, shadows) applied throughout — v1.2
- Responsive grid layouts for Baseline Metrics, Experiment Design, Results — v1.2
- Side-by-side Uncertainty Model layout with distribution chart — v1.2
- Statistical interpretation callout boxes in results — v1.2
- Advanced mode input persistence across mode switches — v1.2
- Section state persistence across mode switches — v1.2

### Backlog (v2.1+)

- [ ] Test Costs inputs (hard costs + labor) for declarative "Test!" verdict
- [ ] Interactive sliders synced with text inputs

### Out of Scope

- EVPI / Basic Mode — deprecated in v2.0 in favor of single EVSI-based flow
- EVPI ceiling comparison display — no longer applicable after Basic Mode removal
- Backend / server-side computation — math runs client-side (AWS serverless is for static hosting)
- User accounts / saved sessions — stateless tool
- Mobile-optimized design — desktop-first, mobile can be rough
- Multilingual support — English only
- Real-time collaboration — would require backend
- Binomial simulation for SE — Normal approximation documented, sufficient for typical inputs

## Context

**Competitive landscape:** Georgi Georgiev has an "A/B Test Planner" at analytics-toolkit.com, but it's paywalled and more technical. This tool differentiates by being free, accessible, and beginner-friendly.

**Mathematical foundation:** Based on decision theory concepts from Douglas Hubbard's "How to Measure Anything" (Chapter 7). Uses Expected Value of Perfect Information (EVPI) and Expected Value of Sample Information (EVSI) to quantify the value of running a test.

**Design direction:** Datadog-adjacent visual language — clean, modern, high-contrast UI with subtle gradients, rounded cards, crisp typography. Purple accent (#7C3AED) for CTAs and selection states.

**Target users:** Non-technical PMs, growth managers, and marketers who understand A/B testing conceptually but aren't statisticians. The tool uses plain language in Basic mode, with correct statistical terminology available in Advanced mode.

**v1.1 improvements:** External statistics engine audit identified correctness issues in EVSI decision rule and truncation consistency. All HIGH and MEDIUM severity issues addressed. Codebase now includes comprehensive accuracy test suite.

## Constraints

- **Deployment**: Static hosting only (Vercel/Netlify) — no backend infrastructure
- **Computation**: All calculations client-side in JavaScript; Monte Carlo must complete in <2s
- **Design**: Must use Stitch MCP for UI design before implementation (per CLAUDE.md workflow)
- **Code quality**: TDD practices, mathematical code must be commented for statistician audit

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side only | Simpler setup, cheaper hosting, all math is JS-friendly | ✓ Good |
| Both modes for v1 | Full value proposition requires showing EVPI ceiling and realistic EVSI | Deprecated v2.0 — single EVSI mode |
| Desktop-first | Primary users are at work on desktop; mobile usage expected to be low | ✓ Good |
| State-based routing | Only 2 pages, simpler than adding react-router | ✓ Good |
| Zustand for state | Simple, persist middleware, no boilerplate | ✓ Good |
| Zod v4 for validation | Modern API, good TypeScript support | ✓ Good |
| Action buttons for presets | Better UX than radio-style selectors for form defaults | ✓ Good |
| Abramowitz-Stegun CDF | Error < 7.5e-8, sufficient for EVPI precision | ✓ Good |
| Rejection sampling for EVSI | Handles feasibility constraints cleanly | ✓ Good (v1.1 fixed truncation consistency) |
| Worker for non-Normal EVSI | Keeps UI responsive during Monte Carlo | ✓ Good |
| Defer Test Costs to v2.1+ | Stats engine fixes took priority in v1.1; engine overhaul in v2.0 | — Backlog |
| Bayesian posterior-mean decision rule | v1.1 audit fix: E[L|data] >= T is correct Bayes-optimal rule | ✓ Good |
| Truncated EVPI (Method B) | Grid-based numerical integration for priors with mass below L=-1 | ✓ Good |
| Integrated CoD simulation | Single coherent simulation instead of EVSI - CoD subtraction | ✓ Good |
| 10% rejection warning threshold | Balances user awareness vs alert fatigue | ✓ Good |
| 100% session sampling, 20% replay | Full visibility with balanced replay cost | ✓ Good |
| Centralized analytics module | Isolates Datadog dependency from feature code | ✓ Good |
| DRUIDS exact hex tokens | Precise color matching over oklch approximations | ✓ Good |
| localStorage for mode state backup | Persists inputs + section state across mode switches | ✓ Good |
| Simplified header (no breadcrumb) | User feedback: cleaner, less cluttered | ✓ Good |
| Tooltips for space-constrained help text | Preserves helper copy without layout bloat | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-26 — Phase 23 (Homepage & Welcome Experience) complete*
