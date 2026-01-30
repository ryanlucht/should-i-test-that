---
created: 2026-01-30T17:55
title: Add baseline inputs to PNG export
area: ui
files:
  - src/components/export/ExportCard.tsx
  - src/components/export/ExportButton.tsx
---

## Problem

The PNG export currently shows prior and threshold information but doesn't include the baseline metrics from the Baselines section (conversion rate, annual visitors, value per conversion). There's plenty of space in the 1080x1080 rendered image to include this additional context.

## Solution

Update ExportCard to include a "Baseline Metrics" card showing:
- Baseline conversion rate (e.g., "2.5%")
- Annual visitors/sessions (e.g., "1M visitors/year")
- Value per conversion (e.g., "$50/conversion")

This would help recipients understand the full context of the analysis when the PNG is shared.
