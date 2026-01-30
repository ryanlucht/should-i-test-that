---
created: 2026-01-30T11:45
title: Improve EVPI intuition explanation clarity
area: ui
files:
  - src/components/results/ResultsSection.tsx
---

## Problem

User feedback during Phase 4 UAT: The EVPI intuition explanation card says "Without testing, your default decision is to ship/not ship" but doesn't explain WHY that's the default decision. This is not immediately intuitive to non-technical users who may not understand that the default decision is based on comparing the prior mean to the threshold.

Users need to understand that:
- If you believe the change is more likely to help than hurt (mean > threshold), the rational default is to ship
- If you believe the change is more likely to hurt than help (mean < threshold), the rational default is to not ship
- The EVPI represents the value of knowing for certain before making that decision

## Solution

Add a brief explanation of the default decision logic to the EVPI intuition card. Something like: "Based on your beliefs, it's more likely that this change [helps/hurts], so without more information you would [ship/not ship]."
