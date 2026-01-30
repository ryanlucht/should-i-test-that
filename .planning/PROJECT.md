# Should I Test That?

## What This Is

A decision-value calculator that helps non-technical users (PMs, growth, marketing) decide whether an A/B test is worth running. It outputs a single "max cost worth paying" threshold: "If you can A/B test this idea for less than $X, it's worth testing." Basic mode uses EVPI (perfect information ceiling); Advanced mode uses EVSI minus Cost of Delay for a realistic estimate.

## Core Value

Help users make better testing decisions by quantifying the value of information — so they stop running tests that aren't worth it and start running tests that are.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Basic mode: 5-step wizard calculating EVPI from business inputs + prior + threshold
- [ ] Advanced mode: adds experiment design, cost inputs, EVSI, and Cost of Delay
- [ ] Live-updating distribution chart with threshold visualization
- [ ] Clear results with supporting explanations (probability, regret, etc.)
- [ ] Datadog-inspired visual design
- [ ] Desktop-first responsive layout

### Out of Scope

- Backend / server-side computation — all math runs client-side
- User accounts / saved sessions — stateless tool
- Mobile-optimized design — desktop-first, mobile can be rough
- PNG export — nice-to-have, defer to post-v1
- Multilingual support — English only

## Context

**Competitive landscape:** Georgi Georgiev has an "A/B Test Planner" at analytics-toolkit.com, but it's paywalled and more technical. This tool differentiates by being free, accessible, and beginner-friendly.

**Mathematical foundation:** Based on decision theory concepts from Douglas Hubbard's "How to Measure Anything" (Chapter 7). Uses Expected Value of Perfect Information (EVPI) and Expected Value of Sample Information (EVSI) to quantify the value of running a test.

**Design direction:** Datadog-adjacent visual language — clean, modern, high-contrast UI with subtle gradients, rounded cards, crisp typography. Charts integrated into product styling.

**Target users:** Non-technical PMs, growth managers, and marketers who understand A/B testing conceptually but aren't statisticians. The tool should use plain language in Basic mode, with correct statistical terminology available in Advanced mode.

## Constraints

- **Deployment**: Static hosting only (Vercel/Netlify) — no backend infrastructure
- **Computation**: All calculations client-side in JavaScript; Monte Carlo must complete in <2s
- **Design**: Must use Stitch MCP for UI design before implementation (per CLAUDE.md workflow)
- **Code quality**: TDD practices, mathematical code must be commented for statistician audit

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side only | Simpler setup, cheaper hosting, all math is JS-friendly | — Pending |
| Both modes for v1 | Full value proposition requires showing EVPI ceiling and realistic EVSI | — Pending |
| Desktop-first | Primary users are at work on desktop; mobile usage expected to be low | — Pending |
| Defer PNG export | Nice-to-have, doesn't block core value proposition | — Pending |

---
*Last updated: 2026-01-29 after initialization*
