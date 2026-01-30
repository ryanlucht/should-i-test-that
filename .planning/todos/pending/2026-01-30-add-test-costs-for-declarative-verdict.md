---
created: 2026-01-30T11:55
title: Add Test Costs for declarative verdict
area: calculations
files:
  - src/lib/calculations/evsi.ts
  - src/components/advanced/TestCostsForm.tsx (new)
  - src/components/results/AdvancedResultsSection.tsx
---

## Problem

Currently the Advanced mode calculates Net Value = max(0, EVSI - CoD), but this doesn't account for direct test costs (tool subscriptions, labor hours, etc.). Users still have to mentally compare the Net Value against their test costs to decide whether to test.

The goal is a declarative verdict: "Test this!" or "Don't test this!" — not just a dollar value that requires interpretation.

## Solution

1. Add Test Costs input section to Advanced mode:
   - Hard costs: tools, subscriptions, vendor fees (dollar amount)
   - Labor costs: hours × hourly rate

2. Update Net Value calculation:
   - Current: `Net Value = max(0, EVSI - CoD)`
   - New: `Net Value = max(0, EVSI - CoD - Test Costs)`

3. Update verdict logic:
   - If Net Value > 0 → "Test this!"
   - If Net Value ≤ 0 → "Don't test this!"

This aligns with SPEC.md Section A6 which mentions test costs but doesn't have full input specs yet.
