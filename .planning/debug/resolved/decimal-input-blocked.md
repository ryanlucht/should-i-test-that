---
status: resolved
trigger: "Cannot enter decimal points in numeric input fields (conversion rate percentage, value per conversion currency)"
created: 2026-01-29T00:00:00Z
updated: 2026-01-29T00:00:05Z
---

## Current Focus

hypothesis: CONFIRMED - parseFloat("3.") returns 3, losing trailing decimal point
test: verified with node REPL
expecting: confirmed - String(parseFloat("3.")) = "3"
next_action: document resolution

## Symptoms

expected: User can type "3.2" for 3.2% conversion rate, or "50.99" for $50.99 value per conversion
actual: Decimal points cannot be entered in the field
errors: None reported
reproduction: Try to type a decimal point in percentage or currency input fields
started: Unknown

## Eliminated

## Evidence

- timestamp: 2026-01-29T00:00:01Z
  checked: PercentageInput.tsx, CurrencyInput.tsx, NumberInput.tsx
  found: All use type="text", not type="number", and inputMode="decimal" or "numeric"
  implication: Input type is not blocking decimal entry

- timestamp: 2026-01-29T00:00:02Z
  checked: src/lib/formatting.ts parse functions
  found: parsePercentage, parseCurrency, parseNumber all use parseFloat and preserve decimals
  implication: Parsing logic correctly handles decimal points

- timestamp: 2026-01-29T00:00:03Z
  checked: formatDisplayValue in all three components
  found: When focused, returns String(value) where value is a number
  implication: This is suspicious - need to trace what happens when user types "3."

- timestamp: 2026-01-29T00:00:04Z
  checked: parseFloat behavior in Node.js
  found: parseFloat("3.") = 3 (loses trailing decimal), parseFloat("3.2") = 3.2
  implication: The parse functions convert "3." to number 3, then formatDisplayValue converts it back to "3"

- timestamp: 2026-01-29T00:00:05Z
  checked: Full onChange flow
  found: User types "3." → parseFloat("3.") → 3 → String(3) → "3" displayed → decimal point lost
  implication: Root cause confirmed

## Resolution

root_cause: |
  The onChange handlers immediately parse the input value using parseFloat(), which loses
  trailing decimal points (e.g., "3." becomes 3). This parsed number is stored in the form state,
  then immediately displayed back using String(value), which shows "3" instead of "3.".
  This creates a feedback loop that prevents users from entering decimal points.

  Specific locations:
  - PercentageInput.tsx line 71: parsePercentage(e.target.value)
  - CurrencyInput.tsx line 71: parseCurrency(e.target.value)
  - NumberInput.tsx line 82: parseNumber(e.target.value)

  All three parse functions use parseFloat(), which strips trailing decimals and incomplete numbers.

fix: |
  Store the raw input string in component state while focused, only parse to number on blur.
  This allows intermediate typing states like "3." and "3.2" to be preserved.

  Changes needed in all three components (PercentageInput, CurrencyInput, NumberInput):
  1. Add local state for raw input string
  2. While focused: display raw string, allow any typing
  3. On blur: parse the string, store number to form, format for display
  4. On focus: convert number back to string for editing

verification: |
  Test in browser:
  1. Focus percentage input, type "3." - should show "3."
  2. Type "2" to make "3.2" - should show "3.2"
  3. Blur - should format to "3.2%"
  4. Focus again - should show "3.2" for editing

files_changed:
  - src/components/forms/inputs/PercentageInput.tsx
  - src/components/forms/inputs/CurrencyInput.tsx
  - src/components/forms/inputs/NumberInput.tsx
