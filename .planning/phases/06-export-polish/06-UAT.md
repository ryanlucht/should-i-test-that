---
status: complete
phase: 06-export-polish
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md]
started: 2026-01-30T17:00:00Z
completed: 2026-01-30T17:15:00Z
---

## Current Test

status: complete
all_tests_executed: true

## Tests

### 1. Export PNG in Basic Mode
expected: In Basic mode results, you see a "Share your analysis" section with a title input and "Export as PNG" button. Clicking the button downloads a 1080x1080 PNG file containing the verdict, key inputs summary, and mini distribution chart.
result: issue
reported: "PNG has truncated text (headline does not have the full output text - i.e., 'If you can A/B test this idea for less than $22.4K, it's worth testing.') The PNG should contain most of the results section, including the explanation text"
severity: major

### 2. Export PNG with Custom Title
expected: Enter a custom title in the input field (e.g., "Q1 Homepage Test"), then click export. The downloaded PNG shows your custom title at the top instead of the default.
result: pass

### 3. Export PNG in Advanced Mode
expected: In Advanced mode results, the same export section appears. Clicking export produces a PNG with EVSI verdict, Cost of Delay info, and all advanced mode details.
result: issue
reported: "Advanced Mode PNG export should also describe the shape of the prior distribution, write out 'Expected Value of Sample Information' instead of using an undefined acronym, and include more explainer text."
severity: major

### 4. Purple Accent on Primary Buttons
expected: Primary buttons (like "Continue", "Get Started") have purple (#7C3AED) background, not blue. The color matches the chart accent.
result: issue
reported: "Buttons are still blue, not purple"
severity: major

### 5. Purple Focus Rings on Inputs
expected: When you tab through form inputs (baseline rate, visitors, etc.), the focus ring is purple, not blue.
result: issue
reported: "Focus rings are blue, not purple"
severity: major

### 6. Placeholder Text is Lighter
expected: Form input placeholders (like "e.g., 2.5" or "Add a title...") are noticeably lighter/grayer than actual entered values, making it clear which fields are empty.
result: pass
note: "User also requested: make Daily Eligible Traffic placeholder a round number like '5,000'"

### 7. Screen Reader Announcement on Results
expected: Using a screen reader (or inspecting the DOM), the verdict card has role="status" and aria-live="polite", which means the verdict value should be announced when it appears/changes.
result: pass

### 8. Notable Badge on Highlighted Cards
expected: When the "chance of being wrong" exceeds 20%, the regret card shows a "Notable" badge in addition to (not instead of) any color highlighting.
result: pass
note: "User requested: remove Notable badge, not necessary"

## Summary

total: 8
passed: 4
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "PNG contains full verdict text and explanation"
  status: failed
  reason: "User reported: PNG has truncated text (headline does not have the full output text - i.e., 'If you can A/B test this idea for less than $22.4K, it's worth testing.') The PNG should contain most of the results section, including the explanation text"
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Advanced mode PNG includes prior shape, full term names, and explainer text"
  status: failed
  reason: "User reported: Advanced Mode PNG export should also describe the shape of the prior distribution, write out 'Expected Value of Sample Information' instead of using an undefined acronym, and include more explainer text."
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Primary buttons use purple (#7C3AED) accent color"
  status: failed
  reason: "User reported: Buttons are still blue, not purple"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Focus rings on inputs are purple"
  status: failed
  reason: "User reported: Focus rings are blue, not purple"
  severity: major
  test: 5
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
