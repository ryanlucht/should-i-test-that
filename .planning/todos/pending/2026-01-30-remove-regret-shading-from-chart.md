---
created: 2026-01-30T11:30
title: Remove regret shading from prior distribution chart
area: ui
files:
  - src/components/charts/PriorDistributionChart.tsx
---

## Problem

User feedback during Phase 4 UAT: The regret shading (subtle red area on the "wrong side" of the threshold) on the prior distribution chart is too confusing. The chart already shows the threshold line, mean marker, and 90% interval - adding regret shading creates visual clutter and may confuse users about what's being communicated.

## Solution

Remove the red regret shading ReferenceArea from PriorDistributionChart.tsx. Keep the other overlays (mean marker, 90% interval, threshold line, tooltip).
