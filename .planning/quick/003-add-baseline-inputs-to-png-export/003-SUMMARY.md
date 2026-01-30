---
quick: 003
subsystem: ui
tags: [export, png, baseline-metrics, formatting]

provides:
  - Baseline metrics card in PNG export
  - Full context in exported images with conversion rate, visitors, and value per conversion
affects: [export, sharing]

key-files:
  modified:
    - src/components/export/ExportCard.tsx
    - src/components/export/ExportButton.tsx

key-decisions:
  - "Use compact notation for annual visitors (1M, 10K) via Intl.NumberFormat"

# Metrics
duration: 3min
completed: 2026-01-30
---

# Quick Task 003: Add Baseline Inputs to PNG Export

**Added Baseline Metrics card to PNG export showing conversion rate, annual visitors, and value per conversion**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-30T22:53:22Z
- **Completed:** 2026-01-30T22:56:17Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Added baselineConversionRate, annualVisitors, visitorUnitLabel, valuePerConversion props to ExportCard
- Created Baseline Metrics card rendered before Prior card in the Key Inputs Grid
- Formatted values appropriately: percentage for rate, compact notation for visitors, currency for value

## Task Commits

Each task was committed atomically:

1. **Task 1: Add baseline metrics props and card to ExportCard** - `8ddf97b` (feat)
2. **Task 2: Pass baseline data from ExportButton to ExportCard** - `6aefc6c` (feat)
3. **Task 3: Run lint and verify** - No commit (verification only)

## Files Modified
- `src/components/export/ExportCard.tsx` - Added baseline props interface, destructuring, formatting logic, and Baseline Metrics card
- `src/components/export/ExportButton.tsx` - Expanded SharedInputs interface with baseline fields, passed to ExportCard

## Decisions Made
- Used Intl.NumberFormat with compact notation and 3 significant digits for annual visitors (e.g., "1M visitors/year")
- Formatted conversion rate as percentage with 2 decimal places (e.g., "2.50% conversion rate")
- Used existing formatSmartCurrency for value per conversion

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## Manual Verification Steps
1. Load the app at localhost:5173
2. Complete all sections (baseline metrics, prior, threshold)
3. Click "Export as PNG" in the results section
4. Verify the exported PNG shows a "Baseline Metrics" card with:
   - Conversion rate as percentage
   - Annual visitors with unit label and compact notation
   - Value per conversion as currency

---
*Quick Task: 003*
*Completed: 2026-01-30*
