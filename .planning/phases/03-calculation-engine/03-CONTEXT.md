# Phase 3: Calculation Engine - Context

**Gathered:** 2026-01-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Calculate EVPI and supporting metrics for Basic mode from user inputs. This is the computational core that transforms Business + Prior + Threshold inputs into actionable results. Visualization and results display are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Edge Case Behavior
- **Near-zero sigma:** When user enters identical or near-identical low/high bounds, show inline note: "Your interval is so narrow that you appear certain about a particular effect size. If that's true, why test it?"
- **Prior entirely on one side of threshold:** Same pattern — inline note: "Your beliefs already favor [ship/don't ship] with no meaningful uncertainty"
- **Truncation at L >= -1:** If ANY probability mass is below L = -1, display a note clarifying the distribution was truncated because relative losses greater than -100% are impossible
- **Division-by-zero (K=0):** Trust form validation to prevent CR0=0, N_year=0, or V=0; engine can assume valid inputs

### Output Contracts
- **Dollar formatting (inputs):** Allow two decimal places
- **Dollar formatting (outputs):** Smart rounding — $127 for small amounts, $12.7K for thousands, $1.27M for millions
- **Probability formatting:** Claude's discretion (likely whole percentage for display)
- **Result structure:** Claude's discretion based on codebase patterns
- **Intermediate values:** Expose K, z-score, phi/Phi values, etc. in an expandable "Advanced Debugging" panel at the bottom of the results page for transparency and auditability

### Performance / Reactivity
- **Prior visualization updates:** Recalculate immediately on blur
- **Other live updates:** Claude's discretion on debouncing strategy
- **Web Worker usage:** Claude's discretion — likely main thread for closed-form Basic mode, Worker for Advanced mode later
- **Loading states:** Claude's discretion based on actual calculation latency
- **Incomplete inputs:** Results section hidden until all inputs are valid (not placeholder, not disabled — simply not shown)

### Claude's Discretion
- Computation method details (closed-form vs Monte Carlo, when to use each)
- Probability display precision
- Result object/store architecture
- Debouncing strategy for non-prior calculations
- Whether to use Web Worker for Basic mode
- Loading state implementation

</decisions>

<specifics>
## Specific Ideas

- The inline edge-case notes should be educational but not alarming — help users understand why EVPI is low rather than making them feel they did something wrong
- The Advanced Debugging panel should be collapsed by default but easily expandable for statisticians who want to audit the math
- Smart dollar rounding should feel natural (similar to how financial apps display portfolio values)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-calculation-engine*
*Context gathered: 2026-01-30*
