---
status: diagnosed
trigger: "Validation errors appear while typing instead of on blur only"
created: 2026-01-29T00:00:00Z
updated: 2026-01-29T00:10:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: reValidateMode defaults to 'onChange' after first validation, causing errors to appear while typing
test: confirmed all forms have mode: 'onBlur', but reValidateMode is not explicitly set
expecting: reValidateMode defaults to 'onChange', which shows errors during typing after initial blur
next_action: confirm root cause and document findings

## Symptoms

expected: No validation errors while actively typing. Errors only appear after blur (leaving field) or clicking Next.
actual: Errors appear while typing in the field
errors: Validation errors displayed during onChange instead of onBlur
reproduction: Type in any form field and observe validation errors appearing immediately
started: Unknown - current behavior

## Eliminated

- hypothesis: mode is set to 'onChange' or 'all'
  evidence: All three form files (BaselineMetricsForm, UncertaintyPriorForm, ThresholdScenarioForm) have mode: 'onBlur' correctly set (lines 50, 88, 219 respectively)
  timestamp: 2026-01-29T00:05:00Z

- hypothesis: manual trigger() calls during onChange
  evidence: Checked all input components (PercentageInput, NumberInput, CurrencyInput) - none call trigger() during onChange, only field.onChange() and field.onBlur()
  timestamp: 2026-01-29T00:06:00Z

## Evidence

- timestamp: 2026-01-29T00:01:00Z
  checked: BaselineMetricsForm.tsx line 50
  found: mode: 'onBlur' correctly set
  implication: Initial validation mode is correct

- timestamp: 2026-01-29T00:02:00Z
  checked: UncertaintyPriorForm.tsx line 88
  found: mode: 'onBlur' correctly set
  implication: Initial validation mode is correct

- timestamp: 2026-01-29T00:03:00Z
  checked: ThresholdScenarioForm.tsx line 219
  found: mode: 'onBlur' correctly set
  implication: Initial validation mode is correct

- timestamp: 2026-01-29T00:04:00Z
  checked: All input components (PercentageInput, NumberInput, CurrencyInput)
  found: No manual trigger() calls during onChange - only field.onChange() and field.onBlur()
  implication: Input components are not causing the issue

- timestamp: 2026-01-29T00:07:00Z
  checked: react-hook-form default configuration
  found: reValidateMode is not explicitly set in any form
  implication: react-hook-form defaults reValidateMode to 'onChange', which validates on every keystroke AFTER the first validation occurs (after blur or submit)

## Resolution

root_cause: |
  react-hook-form's reValidateMode defaults to 'onChange' when not explicitly set.

  The forms correctly set mode: 'onBlur' which controls INITIAL validation timing.
  However, reValidateMode controls RE-validation timing (after first validation occurs).

  Behavior:
  1. User types in field (no validation yet - mode: 'onBlur' working)
  2. User blurs field (first validation occurs - correct)
  3. User focuses field again and starts typing
  4. NOW validation runs on every keystroke (reValidateMode: 'onChange' default)

  The issue appears "while typing" but only AFTER a field has been validated once.

  Location: All three form files where useForm is called:
  - src/components/forms/BaselineMetricsForm.tsx:48
  - src/components/forms/UncertaintyPriorForm.tsx:86
  - src/components/forms/ThresholdScenarioForm.tsx:217

fix: Add reValidateMode: 'onBlur' to useForm configuration in all three files

verification: Type in field, blur (see error), focus again, type more - error should NOT update until blur

files_changed:
  - src/components/forms/BaselineMetricsForm.tsx
  - src/components/forms/UncertaintyPriorForm.tsx
  - src/components/forms/ThresholdScenarioForm.tsx
