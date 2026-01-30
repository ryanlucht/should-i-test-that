---
status: complete
phase: 04-visualization-results
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md]
started: 2026-01-30T10:45:00Z
updated: 2026-01-30T11:31:00Z
---

## Current Test

## Current Test

[testing complete]

## Tests

### 1. Distribution Chart Appears
expected: In the Uncertainty section, after entering prior interval values, a purple density curve chart appears below the "Implied expected lift" section with purple gradient fill.
result: pass

### 2. Chart X-Axis Shows Lift Percentages
expected: The chart X-axis displays lift percentages with sign and % symbol (e.g., "-10%", "0%", "+10%"). Y-axis should be hidden.
result: pass

### 3. Mean Marker on Chart
expected: A purple dot appears on the peak of the density curve, marking the mean/expected lift value.
result: pass

### 4. 90% Interval Shading
expected: A subtle purple shaded region on the chart indicates the 90% confidence interval (the middle portion of the curve where you're 90% confident the true value lies).
result: pass

### 5. Threshold Line with Label
expected: A dashed vertical line appears at the shipping threshold. It has a label like "Ship if positive" (for threshold=0) or "Ship if > +X%" (for specific threshold).
result: pass

### 6. Regret Shading
expected: A subtle red-ish shaded area appears on the "wrong side" of the threshold. If your default decision is Ship, the area below the threshold is shaded (things that would make you regret shipping). If Don't Ship, the area above threshold is shaded.
result: pass

### 7. Chart Tooltip on Hover
expected: Hovering over the chart shows a tooltip with the lift percentage (e.g., "+5.0% lift") and the dollar equivalent (e.g., "≈ $50,000/year").
result: pass

### 8. Chart Updates Live
expected: When you change the prior interval bounds (Low/High percentage inputs), the chart updates immediately without needing to click any button.
result: pass

### 9. Results Section Appears
expected: After completing Baseline, Uncertainty, and Threshold sections, navigate to Results. A verdict card appears with the message "If you can A/B test this idea for less than $X, it's worth testing" where X is the EVPI amount in dollars.
result: pass

### 10. EVPI Warning with Advanced Mode Link
expected: Below the verdict headline, there's a muted info box explaining "This is EVPI — the value of perfect information..." with a link/button to try Advanced mode.
result: pass

### 11. Prior Summary Card
expected: One of the supporting cards shows "Your belief (prior)" with the expected lift percentage and 90% confidence range (e.g., "0% expected lift" and "90% confident: -8% to +8%").
result: pass

### 12. Threshold Summary Card
expected: Another supporting card shows "Shipping threshold" with the threshold value. If "any positive" was selected, it says "Any positive impact". Otherwise shows the % lift threshold.
result: pass

### 13. Probability of Clearing Threshold Card
expected: A card shows "Chance of clearing threshold" with a percentage (e.g., "50%") and context like "More likely than not to clear the bar" or "Less likely than not..."
result: issue
reported: "the card shows correctly, but the context text is incorrect/misleading for 50% specifically. When the probability is exactly 50%, message should say something like 'Equal odds of the test winning or losing'"
severity: minor

### 14. Chance of Regret Card
expected: A card shows "Chance you'd regret not testing" with a percentage and explanation based on your default decision (e.g., "If you ship without testing, there's a 50% chance the change actually hurts").
result: pass

### 15. EVPI Intuition Explanation
expected: At the bottom of results, a full-width card explains what the EVPI number represents: "Without testing, your default decision is to ship/not ship. The $X EVPI is the expected value of the regret you'd avoid..."
result: pass

## Summary

total: 15
passed: 14
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Probability card shows appropriate context text for all probability values including 50%"
  status: fixed
  reason: "User reported: the card shows correctly, but the context text is incorrect/misleading for 50% specifically. When the probability is exactly 50%, message should say something like 'Equal odds of the test winning or losing'"
  severity: minor
  test: 13
  root_cause: "Binary check (> 0.5) didn't handle exactly 50% case"
  artifacts:
    - path: "src/components/results/ResultsSection.tsx"
      issue: "Lines 102-106 - binary probability check"
  fix_commit: "396587e"
