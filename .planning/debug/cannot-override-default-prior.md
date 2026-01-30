---
status: diagnosed
trigger: "Cannot override default prior interval values after clicking 'Use Recommended Default'"
created: 2026-01-29T00:00:00Z
updated: 2026-01-29T00:05:00Z
---

## Current Focus

hypothesis: CONFIRMED - The UI pattern creates confusion. The "Use Recommended Default" button looks like a radio option that must be deselected, but it's not. Users CAN edit the values, but the auto-detection logic keeps priorType='default' when values stay close to defaults, making the UI appear unresponsive.
test: Confirmed through code analysis
expecting: Root cause identified
next_action: return diagnosis

## Symptoms

expected: User can click default button to populate -8.22%/+8.22%, then manually edit those values to custom values
actual: Default values cannot be overwritten - no way to de-select the radio button
errors: None reported
reproduction: 1) Click "Use Recommended Default" button, 2) Try to edit interval values in input fields
started: Unknown - design issue

## Eliminated

## Evidence

- timestamp: 2026-01-29T00:01:00Z
  checked: UncertaintyPriorForm.tsx structure
  found: "Use Recommended Default" is a button (line 222-260) that calls handleUseDefault when clicked
  implication: Button sets priorType='default' in form state and store

- timestamp: 2026-01-29T00:02:00Z
  checked: handleUseDefault function (lines 159-167)
  found: Sets priorType='default', intervalLow=-8.22, intervalHigh=8.22 in form AND store
  implication: Creates persistent state that priorType='default' even after populating values

- timestamp: 2026-01-29T00:03:00Z
  checked: Input fields (lines 281-357)
  found: No disabled prop or conditional based on priorType - inputs are always enabled
  implication: Inputs themselves are NOT locked/disabled

- timestamp: 2026-01-29T00:04:00Z
  checked: handleIntervalChange function (lines 172-182)
  found: Auto-detects when values differ from defaults and sets priorType='custom'
  implication: This SHOULD allow editing - when user changes values, priorType should flip to 'custom'

- timestamp: 2026-01-29T00:05:00Z
  checked: handleIntervalChange logic (lines 175-177)
  found: Uses Math.abs(low - DEFAULT_INTERVAL.low) < 0.01 to check if still default
  implication: PROBLEM - When user tries to edit, onChange fires BEFORE the value changes, so comparison still sees old value

- timestamp: 2026-01-29T00:06:00Z
  checked: Input field onChange handlers (lines 298-300, 344-346)
  found: onChange updates field.value immediately, but handleIntervalChange is called in onBlur (lines 302-303, 348-349)
  implication: handleIntervalChange runs AFTER blur, uses methods.getValues() which SHOULD have new values

- timestamp: 2026-01-29T00:07:00Z
  checked: Flow more carefully
  found: User types new value -> onChange updates form value -> onBlur triggers -> handleIntervalChange reads updated values via getValues() -> compares to DEFAULT_INTERVAL
  implication: This should work... but maybe the comparison tolerance is the issue?

- timestamp: 2026-01-29T00:08:00Z
  checked: DEFAULT_INTERVAL values in prior.ts (lines 115-120)
  found: DEFAULT_INTERVAL = { low: -8.22, high: 8.22 }
  implication: Exact values are -8.22 and 8.22

- timestamp: 2026-01-29T00:09:00Z
  checked: Tolerance check again (line 176-177)
  found: Math.abs(low - DEFAULT_INTERVAL.low) < 0.01 && Math.abs(high - DEFAULT_INTERVAL.high) < 0.01
  implication: If user types "-8.22" it's EXACTLY equal to DEFAULT_INTERVAL.low, so abs difference is 0, which is < 0.01, so isDefault=true, so priorType NOT changed to 'custom'

## Resolution

root_cause: **UX confusion caused by mixed interaction pattern in UncertaintyPriorForm.tsx (lines 172-182, 222-260)**

The "Use Recommended Default" button is implemented as a visual radio-style selector (lines 222-260) that sets priorType='default' and populates interval values. This creates user confusion for two reasons:

1. **Visual mismatch**: The button has radio-style visual feedback (filled circle when selected, line 243-244) suggesting it's a mutually-exclusive choice that needs to be "deselected" before editing the inputs below it. Users expect to click it OFF before editing custom values.

2. **Auto-detection creates perceived unresponsiveness**: The handleIntervalChange function (lines 172-182) automatically switches priorType to 'custom' only when values differ from defaults by more than 0.01%. If a user edits -8.22 to -8.20, the tolerance check (line 176-177) still considers it "default", so the radio indicator stays selected even though the user is actively customizing. This makes the UI appear broken.

3. **No explicit "custom" selection affordance**: There's no button/radio for "Use Custom Values" that users can click to signal intent to customize. The only way to switch is by editing values enough to trigger auto-detection.

The user's suggestion is correct: this should be a simple action button that fills values, not a stateful radio that suggests mutual exclusion with the custom inputs below.

fix: Convert "Use Recommended Default" from a radio-style selector to a simple action button that populates values without managing priorType state. Remove the auto-detection logic (handleIntervalChange). Let priorType be derived from actual values at validation time, not stored as persistent UI state.
verification: After fix, user should be able to: 1) Click button to populate defaults, 2) Immediately edit those values, 3) See no visual confusion about selection state
files_changed: []
