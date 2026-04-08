---
phase: 25-polish-accessibility-export
plan: 01
subsystem: ui
tags: [react, accessibility, aria, tailwind, wcag]

# Dependency graph
requires:
  - phase: 24-shareable-walkthrough-urls
    provides: AdvancedResultsSection, ExportCard, form input components, LearningBitsOverlay with shared diff indicators
provides:
  - EVSI acronym defined on first use in results and export card
  - Consistent font-semibold heading hierarchy in results section
  - "Ship/Shipping" terminology replaced with "Deploy/Decision" throughout
  - "Test Design" label unified to "Experiment" matching section title
  - ariaLabel prop on NumberInput, CurrencyInput, PercentageInput with descriptive labels on all key inputs
  - PriorDistributionChart wrapped in role="img" with aria-label and sr-only dynamic description
  - BouncingDots respects prefers-reduced-motion via motion-reduce:animate-none
  - LearningBitsOverlay confirmed to have sr-only + aria-live coverage
affects: [25-02, 25-03, export, form inputs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ariaLabel optional prop pattern on form inputs — callers pass descriptive label including units when label text alone is insufficient"
    - "role=img wrapper pattern for Recharts charts — add sr-only span with dynamic description inside"
    - "motion-reduce:animate-none on Tailwind animate-* classes for prefers-reduced-motion compliance"

key-files:
  created: []
  modified:
    - src/components/results/AdvancedResultsSection.tsx
    - src/components/export/ExportCard.tsx
    - src/pages/CalculatorPage.tsx
    - src/components/forms/inputs/NumberInput.tsx
    - src/components/forms/inputs/CurrencyInput.tsx
    - src/components/forms/inputs/PercentageInput.tsx
    - src/components/forms/BaselineMetricsForm.tsx
    - src/components/forms/ExperimentDesignForm.tsx
    - src/components/charts/PriorDistributionChart.tsx
    - src/components/guide/BouncingDots.tsx

key-decisions:
  - "ariaLabel is optional on input components — existing <Label htmlFor> provides default accessible name; ariaLabel supplements when label text alone is insufficient (e.g., 'Conversion rate' doesn't say 'percentage')"
  - "PriorDistributionChart sr-only description uses prior.mu_L ?? 0 with optional chaining to handle Uniform prior (no mu_L field)"
  - "BouncingDots already handled by global @media (prefers-reduced-motion) in index.css — Tailwind motion-reduce class added as Tailwind-native reinforcement for completeness"
  - "'Deploy' chosen over 'Launch' as synonym for 'Ship' — more technically precise for engineering audience"

patterns-established:
  - "POL-04 language: Use 'deploy' not 'ship', 'Decision Threshold' not 'Shipping Threshold'"
  - "POL-01 acronym: Expand EVSI as '(Expected Value of Sample Information)' on first bare usage in results"
  - "A11Y input pattern: form inputs expose optional ariaLabel prop for screen reader context including units"

requirements-completed: [POL-01, POL-02, POL-04, A11Y-01, A11Y-02]

# Metrics
duration: 15min
completed: 2026-04-08
---

# Phase 25 Plan 01: Polish, Accessibility & Export — Text, ARIA & Reduced-Motion Summary

**EVSI acronym defined on first use, inclusive "deploy" language replacing "ship", consistent font-semibold heading hierarchy, and WCAG-compliant ARIA labels + chart alt text on all form inputs and charts**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-08T12:45:00Z
- **Completed:** 2026-04-08T12:57:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- POL-01: EVSI expanded to "Expected Value of Sample Information" on first bare use in AdvancedResultsSection intuition card and ExportCard key inputs grid
- POL-02: "How to interpret" and "Share your analysis" headings upgraded from `font-medium` to `font-semibold` for consistent heading hierarchy in results section
- POL-04: Renamed "Shipping Threshold" to "Decision Threshold" (section title and export), "Test Design" to "Experiment" (progress indicator label), "ship" to "deploy" in threshold SupportingCard descriptions
- A11Y-01: Added optional `ariaLabel` prop to NumberInput, CurrencyInput, and PercentageInput components; wired to `<Input aria-label>` attribute; added descriptive labels with units to all key form inputs in BaselineMetricsForm and ExperimentDesignForm
- A11Y-01: PriorDistributionChart wrapped in `role="img"` div with static and dynamic `sr-only` text describing the distribution
- A11Y-02: Added `motion-reduce:animate-none` to all three BouncingDots spans; confirmed LearningBitsOverlay already has complete `sr-only` + `aria-live="polite"` coverage; CSS `@media (prefers-reduced-motion)` already handled `animate-dot-bounce: animation: none`

## Task Commits

1. **Task 1: Acronym definitions, heading hierarchy, and inclusive language (POL-01, POL-02, POL-04)** - `14e40ce` (feat)
2. **Task 2: ARIA labels on form inputs and chart alt text (A11Y-01), reduced-motion and sr-only (A11Y-02)** - `f4db4da` (feat)

## Files Created/Modified

- `src/components/results/AdvancedResultsSection.tsx` - EVSI acronym expansion, font-semibold headings, deploy language
- `src/components/export/ExportCard.tsx` - EVSI acronym in key inputs grid, "Decision threshold" rename
- `src/pages/CalculatorPage.tsx` - "Decision Threshold" section title, "Experiment" label
- `src/components/forms/inputs/NumberInput.tsx` - Added optional `ariaLabel` prop wired to `<Input aria-label>`
- `src/components/forms/inputs/CurrencyInput.tsx` - Added optional `ariaLabel` prop wired to `<Input aria-label>`
- `src/components/forms/inputs/PercentageInput.tsx` - Added optional `ariaLabel` prop wired to `<Input aria-label>`
- `src/components/forms/BaselineMetricsForm.tsx` - ariaLabel on conversion rate, annual visitors, value per conversion
- `src/components/forms/ExperimentDesignForm.tsx` - ariaLabel on test duration, daily traffic, traffic split, eligibility, decision latency
- `src/components/charts/PriorDistributionChart.tsx` - role="img" wrapper, aria-label, sr-only dynamic description
- `src/components/guide/BouncingDots.tsx` - motion-reduce:animate-none on each dot span

## Decisions Made

- Used `ariaLabel` (camelCase prop) → `aria-label` (HTML attribute) pattern; optional so existing callers unaffected
- Used `prior.mu_L ?? 0` in sr-only description to safely handle Uniform prior (no mu_L property)
- `motion-reduce:animate-none` added as Tailwind-native class to complement existing global CSS reduced-motion media query
- Chose "deploy" over "launch" as the "ship" synonym — more precise for engineering context

## Deviations from Plan

None - plan executed exactly as written. A11Y-02 note: BouncingDots animation was already handled by the global `@media (prefers-reduced-motion)` block in `index.css`; the Tailwind `motion-reduce:animate-none` class adds redundant Tailwind-native coverage as the plan specified.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All POL and A11Y requirements from Phase 25-01 met; ready for 25-02 (PNG export branding)
- Form input `ariaLabel` prop available for any future inputs that need enhanced screen reader descriptions
- No blockers

---
*Phase: 25-polish-accessibility-export*
*Completed: 2026-04-08*
