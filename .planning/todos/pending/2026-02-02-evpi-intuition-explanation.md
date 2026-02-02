---
created: 2026-02-02T14:50
title: Improve EVPI intuition explanation clarity
area: ui
files:
  - src/components/results/BasicResultsSection.tsx
  - src/components/results/AdvancedResultsSection.tsx
---

## Problem

The current EVPI intuition explanation shows the default decision (Ship or Don't ship) but doesn't explain WHY this is the default decision. Non-technical users (PMs, marketers) may not immediately understand:

1. Why "Ship" is the default when prior mean is above threshold
2. Why "Don't ship" is the default when prior mean is below threshold
3. How uncertainty creates potential regret regardless of decision

The current copy assumes users understand that the default decision is based on comparing the prior mean to the shipping threshold, but this connection isn't made explicit.

## Solution

Add brief explanatory text to the EVPI intuition card that connects:
- Prior mean (your best guess)
- Shipping threshold (your standard)
- Why the default follows logically from the comparison

Example improved copy:
- "Based on your beliefs (average lift of X%), the default is to Ship because this exceeds your threshold of Y%."
- "Based on your beliefs (average lift of X%), the default is Don't ship because this falls below your threshold of Y%."

This makes the decision logic explicit for users who don't intuit the mean vs. threshold comparison.
