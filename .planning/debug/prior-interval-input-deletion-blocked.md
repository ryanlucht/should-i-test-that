---
status: resolved
trigger: "User cannot delete all characters in Prior interval inputs (lower/upper bounds). Backspacing to the last digit causes the field to reset to default value, making it impossible to enter custom values."
created: 2026-01-29T10:00:00Z
updated: 2026-01-30T10:20:00Z
resolved: 2026-01-30T10:20:00Z
commit: 8c20a59
---

## Current Focus

hypothesis: CONFIRMED - type="number" input combined with parseFloat returns NaN for partial inputs (like "-"), which breaks controlled input behavior
test: Changed to type="text" inputMode="decimal" with displayValue pattern
expecting: Text input can properly hold partial values like "-" or "." while editing
next_action: User manual verification of fix

## Symptoms

expected: User can delete all characters in interval inputs and type custom values from scratch
actual: Can only backspace until one digit remains; deleting that last digit resets field to -8.22 or 8.22
errors: None (silent reset behavior)
reproduction:
1. Go to Uncertainty Prior section
2. Click "Fill with Recommended Default" or just have default values in the fields
3. Click into lower bound field (-8.22)
4. Try to backspace/delete all characters
5. When down to last digit, backspacing resets to -8.22
started: After gap closure fixes (02-04, 02-05, 02-06) - likely regression from displayValue pattern or handleIntervalChange refactor

## Eliminated

- hypothesis: useEffect with setValue in dependency array caused re-render to reset values
  evidence: |
    User verified fix did not work. Removed setValue from deps, but bug persists.
    The useEffect was NOT the root cause, or not the ONLY cause.
  timestamp: 2026-01-30T10:00:00Z

## Evidence

- timestamp: 2026-01-29T10:05:00Z
  checked: UncertaintyPriorForm.tsx input implementation
  found: |
    - Uses `<Input type="number" step="0.1">` directly with Controller (lines 266-285)
    - NOT using the PercentageInput component (which has displayValue pattern)
    - onChange handler: `field.onChange(val === '' ? undefined : parseFloat(val))`
    - value binding: `value={field.value ?? ''}`
  implication: |
    type="number" inputs handle empty string differently - native number inputs
    cannot hold empty string as value. When user deletes all chars, parseFloat('')
    returns NaN, but the code passes `undefined`. However, real issue may be
    elsewhere since field.onChange(undefined) should work.

- timestamp: 2026-01-29T10:06:00Z
  checked: useEffect sync in UncertaintyPriorForm (lines 189-196)
  found: |
    ```javascript
    useEffect(() => {
      if (sharedInputs.priorIntervalLow !== null) {
        setValue('intervalLow', sharedInputs.priorIntervalLow);
      }
      if (sharedInputs.priorIntervalHigh !== null) {
        setValue('intervalHigh', sharedInputs.priorIntervalHigh);
      }
    }, [sharedInputs.priorIntervalLow, sharedInputs.priorIntervalHigh, setValue]);
    ```
  implication: |
    Initial thought: sync is one-directional. But real issue is elsewhere.

- timestamp: 2026-01-29T10:20:00Z
  checked: react-hook-form setValue function stability
  found: |
    In react-hook-form v7.71.1, the `setValue` function is defined as:
    `const setValue = (name, value, options = {}) => { ... }`

    It is NOT wrapped in useCallback, meaning it gets a NEW reference on every render.

    The useEffect has `setValue` in its dependency array:
    `[sharedInputs.priorIntervalLow, sharedInputs.priorIntervalHigh, setValue]`

    Since setValue changes every render, the useEffect runs every render.
  implication: |
    Initially thought this was root cause. Fix was applied (removed setValue from deps)
    but bug persisted. Not the root cause, or not the only cause.

- timestamp: 2026-01-30T10:05:00Z
  checked: parseFloat behavior with partial numeric inputs
  found: |
    parseFloat('-') returns NaN
    parseFloat('.') returns NaN
    parseFloat('') returns NaN

    The onChange handler does: `val === '' ? undefined : parseFloat(val)`
    For '-', this calls parseFloat('-') = NaN

    Then `value={field.value ?? ''}` where field.value is NaN
    NaN ?? '' returns NaN (because ?? only catches null/undefined, not NaN)

    Setting value={NaN} on type="number" input causes unpredictable browser behavior.
  implication: |
    The issue is a combination of:
    1. type="number" inputs cannot properly hold partial values like "-"
    2. parseFloat returns NaN for partial inputs
    3. NaN is not handled by the nullish coalescing operator (??)

    The fix should use type="text" with inputMode="decimal" and a displayValue
    pattern (like PercentageInput uses) to hold the raw string while editing.

## Resolution

root_cause: |
  Two issues combined to cause this bug:

  1. (Previously fixed) The useEffect had `setValue` in dependency array, causing reruns

  2. (Main issue) The interval inputs used `type="number"` with direct parseFloat:
     - When user backspaces to "-" or empty, parseFloat returns NaN
     - NaN is not caught by nullish coalescing (`NaN ?? ''` = NaN)
     - Setting `value={NaN}` on type="number" input causes unpredictable browser behavior
     - The native number input cannot properly hold partial values like "-" or "."

  The combination meant that when a user tried to delete all characters, the form value
  became NaN or undefined, which the number input couldn't display properly, leading
  to inconsistent behavior that appeared as "resetting to default".

fix: |
  1. Changed interval inputs from `type="number"` to `type="text" inputMode="decimal"`
     - Text inputs can properly hold any string including "-", ".", empty string
     - inputMode="decimal" still shows numeric keyboard on mobile

  2. Implemented displayValue pattern (similar to PercentageInput component):
     - Added local state for each input's display value (intervalLowDisplay, intervalHighDisplay)
     - Added focus tracking state (intervalLowFocused, intervalHighFocused)
     - While focused: show raw string from local state (allows typing partial values)
     - While blurred: show form value converted to string
     - Parsing to number only happens on blur

  3. Updated handleUseDefault and useEffect to sync display values with form values

verification: |
  - TypeScript check passes (npx tsc --noEmit)
  - Lint passes (0 errors, 2 pre-existing warnings)
  - Unit tests pass (17/17)
  - Manual testing required: user should now be able to:
    1. Delete all characters from interval inputs
    2. Type partial values like "-" without reset
    3. Type new values from scratch
    4. "Fill with Recommended Default" still works

files_changed:
  - src/components/forms/UncertaintyPriorForm.tsx
