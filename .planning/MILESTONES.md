# Project Milestones: Should I Test That?

## v1.0 MVP (Shipped: 2026-02-02)

**Delivered:** A complete A/B test decision-value calculator with Basic mode (EVPI) and Advanced mode (EVSI minus Cost of Delay), helping users determine if a test is worth running.

**Phases completed:** 1-6 + 4.1, 6.1 (31 plans total)

**Key accomplishments:**

- 5-step wizard flow with progress indicator and validation
- Basic mode: EVPI calculation from business inputs + prior + threshold
- Advanced mode: EVSI via Monte Carlo, Cost of Delay, prior shape selection
- Live-updating distribution chart with threshold visualization and regret shading
- PNG export with descriptive filenames
- WCAG 2.1 AA accessibility (keyboard nav, ARIA live regions, text redundancy)

**Stats:**

- 241 files created/modified
- ~13,800 lines of TypeScript/React
- 8 phases, 31 plans, ~200 tasks
- 4 days from project init to ship (2026-01-29 → 2026-02-02)
- 264 tests passing

**Git range:** `c5197fd` (Initial commit) → `a675616` (fix: Hubbard footer)

**What's next:** Deploy to production, gather user feedback, plan v1.1 improvements

---
