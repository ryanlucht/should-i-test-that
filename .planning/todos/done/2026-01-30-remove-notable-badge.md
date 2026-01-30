---
created: 2026-01-30T17:15
title: Remove Notable badge from highlighted cards
area: ui
files:
  - src/components/results/SupportingCard.tsx
---

## Problem

The "Notable" text badge on highlighted cards (when chance of being wrong >20%) was added for WCAG 1.4.1 text redundancy, but user feels it's unnecessary and clutters the UI.

## Solution

Remove the "Notable" badge from the highlight variant in SupportingCard.tsx. The color highlighting alone is sufficient for this use case.
