---
status: investigating
trigger: "Diagnose the root cause of this UAT issue: Results input summary shows wrong default prior values"
created: 2026-01-29T00:00:00Z
updated: 2026-01-29T00:00:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Display code uses hardcoded "5%" or raw sigma_L value instead of calculating 90% interval width
test: Read CalculatorPage.tsx Results section and prior.ts constants
expecting: Find display logic that doesn't multiply sigma_L by 2*z_0.95
next_action: Read the two key files to locate display logic

## Symptoms

expected: Default prior N(0, 0.05) should display as "0% +/- 8.22%" (the 90% interval)
actual: Shows "0% +/- 5%" instead of "0% +/- 8%"
errors: None - incorrect value displayed
reproduction: View Results section input summary with default prior
started: Current behavior

## Eliminated

## Evidence

- timestamp: 2026-01-29T00:05:00Z
  checked: src/lib/prior.ts
  found: DEFAULT_PRIOR correctly has sigma_L = 0.05, DEFAULT_INTERVAL correctly has low = -8.22, high = 8.22
  implication: The prior constants are mathematically correct

- timestamp: 2026-01-29T00:06:00Z
  checked: src/pages/CalculatorPage.tsx line 350
  found: Hardcoded string "Default (0% +/- 5%)" in Results section input summary display
  implication: Display logic doesn't use the computed DEFAULT_INTERVAL values, uses wrong hardcoded value instead

## Resolution

root_cause: Line 350 in CalculatorPage.tsx hardcodes "Default (0% +/- 5%)" instead of using DEFAULT_INTERVAL.high value (8.22). The display logic doesn't compute the interval width from sigma_L, it just shows a hardcoded incorrect string.
fix: Replace hardcoded "5%" with DEFAULT_INTERVAL.high (8.22) to show "Default (0% +/- 8.22%)"
verification: View Results section input summary with default prior selected
files_changed:
  - src/pages/CalculatorPage.tsx
