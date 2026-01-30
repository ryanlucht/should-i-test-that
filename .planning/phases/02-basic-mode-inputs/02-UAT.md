---
status: diagnosed
phase: 02-basic-mode-inputs
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md]
started: 2026-01-30T04:00:00Z
updated: 2026-01-30T04:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Baseline Conversion Rate Input
expected: Enter a percentage (e.g., "3.2") in the conversion rate field. On blur, it should display "3.2%". Leaving the field empty and clicking Next should show a validation error.
result: issue
reported: "Fails. Cannot enter decimal points in the field."
severity: major

### 2. Annual Visitors Input with Editable Unit Label
expected: Enter a number (e.g., "1000000") in annual visitors field. On blur, it should display "1,000,000". The unit label (default: "visitors") should be editable - change it to "sessions" or "leads".
result: pass

### 3. Value Per Conversion Input
expected: Enter a dollar amount (e.g., "50") in value per conversion field. On blur, it should display "$50". Validation requires at least $0.01.
result: issue
reported: "Fail. Field should also accept decimal points (and up to two decimal places for cents)"
severity: major

### 4. InfoTooltips on Baseline Inputs
expected: Each of the 3 baseline inputs has an (i) icon. Hovering over it shows a tooltip with contextual help explaining that input.
result: pass

### 5. Default Prior Selection
expected: In Section 2 (Uncertainty), click "Use Recommended Default" button. The interval inputs should populate with -8.22% and +8.22%.
result: pass

### 6. Custom Prior Interval Inputs
expected: The custom interval inputs are always visible (not hidden). Enter custom values like -5% and 15%. The implied mean should display (5% in this case).
result: issue
reported: "Fail. Default values cannot be overwritten, probably because there is no way to de-select the 'use default prior' radio button. This is why I suggested making the 'use default prior' a simple button that fills the values upon click, not a radio button that stores a state."
severity: major

### 7. Asymmetry Explanation
expected: When custom interval has non-zero implied mean (e.g., -5% to 15% = mean of 5%), a contextual message appears explaining the asymmetry (e.g., "You're encoding a moderate expectation of improvement").
result: skipped
reason: Blocked by Test 6 - cannot enter custom interval values

### 8. Threshold Scenario Radio Cards
expected: Section 3 shows 3 radio card options. "Ship if it helps at all" should be pre-selected by default (T=0).
result: pass

### 9. Minimum Lift Threshold Input
expected: Select "Needs a minimum lift" scenario. An inline input appears with a unit toggle ($ per year / % lift). Enter a value (e.g., $10,000 or 2%).
result: pass

### 10. Accept Loss Threshold with Negative Storage
expected: Select "Worth it even with a small loss". Enter a positive value (e.g., 5). In the Results section summary, verify the threshold shows as negative (indicating loss tolerance).
result: pass

### 11. Validation Timing - On Blur Only
expected: While typing in any input, no validation errors appear. Errors only appear after you blur (leave) the field or click Next.
result: issue
reported: "fail, errors appear while typing in the field"
severity: minor

### 12. Continue Button Always Enabled
expected: The Next button is always clickable, even with invalid/empty inputs. Clicking it with invalid inputs shows validation errors without advancing.
result: pass

### 13. Full Wizard Flow Completion
expected: Complete all 3 sections with valid data. Navigate through baseline -> uncertainty -> threshold -> results. Results section shows an input summary of all entered values.
result: issue
reported: "fail, input summary shows Default Prior as '0% +/- 5%' when it is actually '0% +/- 8%'"
severity: minor

### 14. Back Navigation Preserves Data
expected: Complete Section 1, go to Section 2. Click Back. Section 1 should still have all your previously entered values preserved.
result: pass

## Summary

total: 14
passed: 8
issues: 5
pending: 0
skipped: 1
skipped: 0

## Gaps

- truth: "User can enter decimal percentage (e.g., 3.2%) in conversion rate field"
  status: failed
  reason: "User reported: Fails. Cannot enter decimal points in the field."
  severity: major
  test: 1
  root_cause: "onChange handlers immediately parse input with parseFloat(), which strips trailing decimal points. When user types '3.', parseFloat returns 3, losing the decimal."
  artifacts:
    - path: "src/components/forms/inputs/PercentageInput.tsx"
      issue: "Line 71: parsePercentage(e.target.value) strips decimals during typing"
    - path: "src/components/forms/inputs/CurrencyInput.tsx"
      issue: "Line 71: parseCurrency(e.target.value) strips decimals during typing"
    - path: "src/components/forms/inputs/NumberInput.tsx"
      issue: "Line 82: parseNumber(e.target.value) strips decimals during typing"
  missing:
    - "Store raw input string in local state while focused, only parse to number on blur"
  debug_session: ".planning/debug/resolved/decimal-input-blocked.md"

- truth: "User can enter decimal dollar amount (e.g., $50.99) in value per conversion field"
  status: failed
  reason: "User reported: Fail. Field should also accept decimal points (and up to two decimal places for cents)"
  severity: major
  test: 3
  root_cause: "Same as Test 1 - onChange handlers parse on every keystroke, losing intermediate decimal states"
  artifacts:
    - path: "src/components/forms/inputs/CurrencyInput.tsx"
      issue: "Line 71: parseCurrency strips trailing decimals"
  missing:
    - "Use local string state while focused, parse to number only on blur"
  debug_session: ".planning/debug/resolved/decimal-input-blocked.md"

- truth: "User can enter custom prior interval values after selecting default"
  status: failed
  reason: "User reported: Fail. Default values cannot be overwritten, probably because there is no way to de-select the 'use default prior' radio button. This is why I suggested making the 'use default prior' a simple button that fills the values upon click, not a radio button that stores a state."
  severity: major
  test: 6
  root_cause: "UX confusion from mixed interaction pattern. Button has radio-style visual feedback suggesting mutual exclusion. Auto-detection uses 0.01% tolerance that fails for small edits. No explicit 'custom' affordance."
  artifacts:
    - path: "src/components/forms/UncertaintyPriorForm.tsx"
      issue: "Lines 159-182, 222-260: Radio-style button with persistent priorType state"
  missing:
    - "Convert from stateful radio selector to simple action button that fills values"
    - "Remove radio-style visual feedback (filled circle indicator)"
    - "Let priorType be derived at validation time, not stored as UI state"
  debug_session: ".planning/debug/cannot-override-default-prior.md"

- truth: "Validation errors appear on blur only, not while typing"
  status: failed
  reason: "User reported: fail, errors appear while typing in the field"
  severity: minor
  test: 11
  root_cause: "Missing reValidateMode: 'onBlur' in react-hook-form config. Default reValidateMode is 'onChange', so after first validation, re-validation runs on every keystroke."
  artifacts:
    - path: "src/components/forms/BaselineMetricsForm.tsx"
      issue: "Line 48: useForm missing reValidateMode"
    - path: "src/components/forms/UncertaintyPriorForm.tsx"
      issue: "Line 86: useForm missing reValidateMode"
    - path: "src/components/forms/ThresholdScenarioForm.tsx"
      issue: "Line 217: useForm missing reValidateMode"
  missing:
    - "Add reValidateMode: 'onBlur' to all useForm configs"
  debug_session: ".planning/debug/validation-errors-while-typing.md"

- truth: "Results input summary displays correct default prior values"
  status: failed
  reason: "User reported: fail, input summary shows Default Prior as '0% +/- 5%' when it is actually '0% +/- 8%'"
  severity: minor
  test: 13
  root_cause: "Hardcoded string 'Default (0% +/- 5%)' on line 350 instead of using DEFAULT_INTERVAL.high constant (8.22%)"
  artifacts:
    - path: "src/pages/CalculatorPage.tsx"
      issue: "Line 350: Hardcoded wrong interval width"
  missing:
    - "Import DEFAULT_INTERVAL from @/lib/prior and use in template string"
  debug_session: ".planning/debug/results-input-summary-wrong-prior.md"
