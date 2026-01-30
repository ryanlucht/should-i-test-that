---
phase: 06-export-polish
plan: 01
subsystem: ui
tags: [html-to-image, png-export, react, recharts]

# Dependency graph
requires:
  - phase: 04-basic-chart
    provides: PriorDistributionChart component for mini chart
  - phase: 05-advanced-mode
    provides: EVSI calculations and Advanced mode results
provides:
  - PNG export functionality for results
  - useExportPng hook for DOM-to-image conversion
  - ExportCard component for composed export content
  - ExportButton with title input integration
affects: [design-polish, accessibility]

# Tech tracking
tech-stack:
  added: [html-to-image@1.11.13]
  patterns: [hidden-render-target, forwardRef-for-capture]

key-files:
  created:
    - src/hooks/useExportPng.ts
    - src/components/export/ExportCard.tsx
    - src/components/export/ExportButton.tsx
  modified:
    - src/components/results/ResultsSection.tsx
    - src/components/results/AdvancedResultsSection.tsx
    - package.json

key-decisions:
  - "Native <a download> instead of file-saver - simpler, no extra dependency needed"
  - "Inline styles in ExportCard - ensures html-to-image captures correctly"
  - "Prior construction in AdvancedResultsSection mirrors useEVSICalculations - avoids prop drilling K value"

patterns-established:
  - "Hidden render target: position absolute off-screen, aria-hidden"
  - "Export filename: {sanitized-title}-{timestamp}.png format"

# Metrics
duration: 5min
completed: 2026-01-30
---

# Phase 6 Plan 01: PNG Export Summary

**PNG export with html-to-image capturing 1080x1080 composed card with verdict, inputs, and mini distribution chart**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-30T21:27:27Z
- **Completed:** 2026-01-30T21:32:27Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Installed html-to-image library for DOM-to-PNG conversion
- Created useExportPng hook with ref, async export function, and loading state
- Built ExportCard component with fixed 1080x1080 dimensions for social sharing
- Integrated ExportButton into both Basic and Advanced results sections

## Task Commits

Each task was committed atomically:

1. **Task 1: Install html-to-image and create useExportPng hook** - `867d326` (feat)
2. **Task 2: Create ExportCard hidden render target** - `9053876` (feat)
3. **Task 3: Create ExportButton with title input and integrate** - `2050ced` (feat)

## Files Created/Modified
- `src/hooks/useExportPng.ts` - Hook wrapping html-to-image with ref, export function, loading state
- `src/components/export/ExportCard.tsx` - 1080x1080 composed card for PNG capture
- `src/components/export/ExportButton.tsx` - Title input and download trigger with hidden ExportCard
- `src/components/results/ResultsSection.tsx` - Added ExportButton for Basic mode
- `src/components/results/AdvancedResultsSection.tsx` - Added ExportButton for Advanced mode with prior construction
- `package.json` - Added html-to-image dependency

## Decisions Made
- Used native `<a download>` pattern instead of file-saver library per 06-RESEARCH.md recommendation
- Used inline styles in ExportCard to ensure html-to-image captures styling correctly
- Constructed prior distribution object in AdvancedResultsSection to avoid needing K value from results

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- React hooks rules violation: `useMemo` was initially called after early return in AdvancedResultsSection. Moved hook before early return to comply with rules of hooks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PNG export fully functional for both Basic and Advanced modes
- Ready for design polish and accessibility audit in remaining Phase 6 plans
- Manual verification recommended: test export in browser to confirm PNG output

---
*Phase: 06-export-polish*
*Completed: 2026-01-30*
