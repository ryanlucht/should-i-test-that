# Should I Test That?

## What This Is

A decision-value calculator that helps non-technical users (PMs, growth, marketing) decide whether an A/B test is worth running. It outputs a single "max cost worth paying" threshold: "If you can A/B test this idea for less than $X, it's worth testing." Basic mode uses EVPI (perfect information ceiling); Advanced mode uses EVSI minus Cost of Delay for a realistic estimate.

> **IMPORTANT:** This document provides a broad overview of the project. For exact specifications (formulas, UI copy, validation rules, edge cases), always reference **SPEC.md** as the source of truth. The mathematical approach and decision theory are already defined there — do not deviate.

## Core Value

Help users make better testing decisions by quantifying the value of information — so they stop running tests that aren't worth it and start running tests that are.

## Current State

**Version:** v1.0 shipped 2026-02-02
**Codebase:** ~13,800 lines TypeScript/React, 264 tests
**Tech stack:** Vite + React 19 + TypeScript + Tailwind 4 + shadcn/ui + Zustand + Recharts + jStat

## Current Milestone: v1.1 Refine Stats Engine

**Goal:** Fix correctness and robustness issues in the statistics engine identified by external audit.

**Target features:**
- Correct EVSI Monte Carlo to use posterior-mean decision rule (Bayesian EVSI)
- Align Normal fast-path and Monte Carlo EVSI to produce consistent results
- Apply truncation at feasibility bounds consistently across all calculations
- Harden sampling against edge cases (Box-Muller, sigma=0, Student-t parameters)
- Integrate Cost of Delay into EVSI simulation for coherent "net value of testing"

**Audit reference:** `/Users/ryan.lucht/Downloads/statistics-engine-audit-llm.md`

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

### Active (v1.1 — Stats Engine Audit Fixes)

**HIGH severity:**
- [ ] EVSI Monte Carlo uses posterior-mean decision rule (E[L|data] >= T)
- [ ] Normal fast-path and Monte Carlo EVSI produce consistent results
- [ ] Truncation at feasibility bounds (L >= -1) applied consistently everywhere

**MEDIUM severity:**
- [ ] Box-Muller sampling guards against Math.random()=0
- [ ] EVPI handles sigma=0 (degenerate/point-mass prior) correctly
- [ ] Student-t parameter clarity (scale vs SD, df validation/warnings)
- [ ] SE model robustness documented or improved

**Architecture:**
- [ ] Cost of Delay integrated into EVSI simulation (coherent net value)

### Backlog (v1.2+)

- [ ] Test Costs inputs (hard costs + labor) for declarative "Test!" verdict
- [ ] EVPI ceiling comparison display ("EVSI ≤ EVPI" teaching point)
- [ ] Shareable URL with encoded state
- [ ] Interactive sliders synced with text inputs

### Out of Scope

- Backend / server-side computation — all math runs client-side
- User accounts / saved sessions — stateless tool
- Mobile-optimized design — desktop-first, mobile can be rough
- Multilingual support — English only
- Real-time collaboration — would require backend

## Context

**Competitive landscape:** Georgi Georgiev has an "A/B Test Planner" at analytics-toolkit.com, but it's paywalled and more technical. This tool differentiates by being free, accessible, and beginner-friendly.

**Mathematical foundation:** Based on decision theory concepts from Douglas Hubbard's "How to Measure Anything" (Chapter 7). Uses Expected Value of Perfect Information (EVPI) and Expected Value of Sample Information (EVSI) to quantify the value of running a test.

**Design direction:** Datadog-adjacent visual language — clean, modern, high-contrast UI with subtle gradients, rounded cards, crisp typography. Purple accent (#7C3AED) for CTAs and selection states.

**Target users:** Non-technical PMs, growth managers, and marketers who understand A/B testing conceptually but aren't statisticians. The tool uses plain language in Basic mode, with correct statistical terminology available in Advanced mode.

## Constraints

- **Deployment**: Static hosting only (Vercel/Netlify) — no backend infrastructure
- **Computation**: All calculations client-side in JavaScript; Monte Carlo must complete in <2s
- **Design**: Must use Stitch MCP for UI design before implementation (per CLAUDE.md workflow)
- **Code quality**: TDD practices, mathematical code must be commented for statistician audit

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side only | Simpler setup, cheaper hosting, all math is JS-friendly | ✓ Good |
| Both modes for v1 | Full value proposition requires showing EVPI ceiling and realistic EVSI | ✓ Good |
| Desktop-first | Primary users are at work on desktop; mobile usage expected to be low | ✓ Good |
| State-based routing | Only 2 pages, simpler than adding react-router | ✓ Good |
| Zustand for state | Simple, persist middleware, no boilerplate | ✓ Good |
| Zod v4 for validation | Modern API, good TypeScript support | ✓ Good |
| Action buttons for presets | Better UX than radio-style selectors for form defaults | ✓ Good |
| Abramowitz-Stegun CDF | Error < 7.5e-8, sufficient for EVPI precision | ✓ Good |
| Rejection sampling for EVSI | Handles feasibility constraints cleanly | ⚠️ Revisit — truncation inconsistent |
| Worker for non-Normal EVSI | Keeps UI responsive during Monte Carlo | ✓ Good |
| Defer Test Costs to v1.2 | Stats engine fixes take priority in v1.1 | — Pending |
| EVSI MC decision rule | v1.0 used L_hat >= T, audit shows need E[L｜data] >= T | ⚠️ Fix in v1.1 |

---
*Last updated: 2026-02-02 after v1.1 milestone start*
