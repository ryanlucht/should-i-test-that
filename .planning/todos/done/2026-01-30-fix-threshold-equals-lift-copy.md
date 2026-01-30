---
created: 2026-01-30T13:41
title: Fix threshold equals lift explanation copy
area: ui
files:
  - src/components/results/ResultsSection.tsx:126-137
---

## Problem

In the EVPI intuition explanation card (BASIC-OUT-07), when the expected lift exactly equals the shipping threshold, the copy is misleading:

> "Based on your beliefs, the expected lift (0.0%) **exceeds** your threshold (0.0%), so without more information you would ship."

This is logically incorrect - 0.0% doesn't "exceed" 0.0%. The underlying logic is correct (ties go to ship per the decision rule), but the explanation text uses the wrong word.

This happens when:
- User sets threshold to "any positive" (0%)
- User has a symmetric prior centered at 0% (e.g., default prior N(0, 0.05))

## Solution

Update the explanation copy to handle the three cases:
1. **mu_L > T_L**: "exceeds your threshold" (current behavior, correct)
2. **mu_L == T_L**: "equals your threshold" or "meets your threshold"
3. **mu_L < T_L**: "falls below your threshold" (current behavior, correct)

Should use a tolerance check (e.g., Math.abs(mu_L - T_L) < 0.001) rather than exact equality for floating point safety.
