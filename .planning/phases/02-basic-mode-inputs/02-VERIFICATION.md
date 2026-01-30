---
phase: 02-basic-mode-inputs
verified: 2026-01-30T07:38:00Z
status: passed
score: 15/15 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 15/15
  previous_date: 2026-01-30T22:54:00Z
  uat_status: 5 issues found in 14 tests
  gaps_closed:
    - "Decimal input blocking in PercentageInput, CurrencyInput, NumberInput (UAT Test 1, 3)"
    - "Default prior button UX confusion (UAT Test 6)"
    - "Validation errors appearing while typing (UAT Test 11)"
    - "Results display wrong default prior interval (UAT Test 13)"
  gaps_remaining: []
  regressions: []
---

# Phase 2: Basic Mode Inputs Re-Verification Report

**Phase Goal:** Users can enter all Basic mode inputs with clear guidance and validation

**Verified:** 2026-01-30T07:38:00Z

**Status:** PASSED

**Re-verification:** Yes — after UAT gap closure (plans 02-04, 02-05, 02-06)

## Re-Verification Summary

**Previous verification (2026-01-30T22:54:00Z):** 15/15 truths verified, automated checks passed

**UAT results:** 8/14 tests passed, 5 issues found (2 major, 2 minor, 1 skipped)

**Gap closure:** 3 plans executed (02-04, 02-05, 02-06)

**Current status:** All 5 UAT issues resolved, no regressions, phase goal achieved

## UAT Gaps Closed

### Gap 1: Decimal Input Blocking (CLOSED)

**UAT Issues:** Test 1 (conversion rate), Test 3 (value per conversion)

**Root cause:** `onChange` handlers parsed input immediately with `parseFloat()`, stripping trailing decimal points. User typing "3." would see "3" instantly.

**Fix (Plan 02-04):**
- Added local `displayValue` state to PercentageInput, CurrencyInput, NumberInput
- Store raw string while focused (no parsing on change)
- Parse only on blur and propagate to form
- Applied same pattern to ThresholdInlineInput

**Verification:**

| Component | displayValue state | Parse on blur | Pattern complete |
|-----------|-------------------|---------------|------------------|
| PercentageInput.tsx | ✓ Line 48 | ✓ Lines 79-84 | ✓ VERIFIED |
| CurrencyInput.tsx | ✓ Line 48 | ✓ Lines 79-84 | ✓ VERIFIED |
| NumberInput.tsx | ✓ Line 64 | ✓ Lines 90-95 | ✓ VERIFIED |
| ThresholdScenarioForm (inline) | ✓ Line 117 | ✓ Lines 145-153 | ✓ VERIFIED |

**Code evidence:**
```typescript
// PercentageInput.tsx, Lines 72-84
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setDisplayValue(e.target.value); // Raw string, no parsing
};

const handleBlur = () => {
  setIsFocused(false);
  const parsed = parsePercentage(displayValue); // Parse only on blur
  field.onChange(parsed);
  field.onBlur();
};

// Value binding uses displayValue while focused
value={isFocused ? displayValue : formatDisplayValue(field.value)}
```

**Status:** ✓ CLOSED — Users can now type "3.2" and "50.99" without decimal stripping

---

### Gap 2: Default Prior Button UX Confusion (CLOSED)

**UAT Issue:** Test 6 — User reported "Default values cannot be overwritten, probably because there is no way to de-select the 'use default prior' radio button"

**Root cause:** Button had radio-style visual feedback (filled circle, border highlight) suggesting mutual exclusion. Looked like a stateful selector instead of an action button.

**Fix (Plan 02-05):**
- Removed radio-style visual indicators (no filled circle, no persistent highlight)
- Changed button text to "Fill with Recommended Default" (action-oriented)
- Removed `priorType` from stored state tracking
- Made interval values the source of truth (priorType derived at validation time)

**Verification:**

| Aspect | Before (Radio-style) | After (Action button) | Status |
|--------|---------------------|----------------------|--------|
| Button text | "Use Recommended Default" | "Fill with Recommended Default" | ✓ VERIFIED (Line 230) |
| Visual state | Border highlight when selected | Plain border, no selected state | ✓ VERIFIED (Lines 221-226) |
| State tracking | `priorType` in form state | No persistent selection state | ✓ VERIFIED (Lines 169-177) |
| Editability | Blocked after selection | Always editable | ✓ VERIFIED |

**Code evidence:**
```typescript
// UncertaintyPriorForm.tsx, Lines 218-240
<button
  type="button"
  onClick={handleUseDefault}
  className={cn(
    'w-full rounded-xl border-2 p-4 text-left transition-all',
    'hover:border-primary/50 hover:shadow-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'border-border bg-card hover:bg-muted/50' // No selected state styling
  )}
>
  <div className="flex-1">
    <p className="font-medium text-foreground">
      Fill with Recommended Default
    </p>
```

**Status:** ✓ CLOSED — Button is clearly an action (fills values), not a radio selector

---

### Gap 3: Validation Errors While Typing (CLOSED)

**UAT Issue:** Test 11 — User reported "fail, errors appear while typing in the field"

**Root cause:** Missing `reValidateMode: 'onBlur'` in react-hook-form config. With only `mode: 'onBlur'`, first validation happens on blur, but subsequent re-validation runs `onChange` (default behavior).

**Fix (Plan 02-06):**
- Added `reValidateMode: 'onBlur'` to all three form components
- Ensures consistent validation timing: errors appear on blur only, never while typing

**Verification:**

| Form Component | mode: 'onBlur' | reValidateMode: 'onBlur' | Status |
|----------------|----------------|-------------------------|--------|
| BaselineMetricsForm.tsx | ✓ Line 50 | ✓ Line 51 | ✓ VERIFIED |
| UncertaintyPriorForm.tsx | ✓ Line 88 | ✓ Line 89 | ✓ VERIFIED |
| ThresholdScenarioForm.tsx | ✓ Line 231 | ✓ Line 232 | ✓ VERIFIED |

**Code evidence:**
```typescript
// BaselineMetricsForm.tsx, Lines 48-51
const methods = useForm<BaselineMetricsFormData>({
  resolver: zodResolver(baselineMetricsSchema),
  mode: 'onBlur', // Validate on blur per CONTEXT.md
  reValidateMode: 'onBlur', // Re-validate on blur, not while typing
```

**Status:** ✓ CLOSED — Validation errors only appear on blur, not while typing

---

### Gap 4: Results Display Wrong Default Prior Interval (CLOSED)

**UAT Issue:** Test 13 — User reported "fail, input summary shows Default Prior as '0% +/- 5%' when it is actually '0% +/- 8%'"

**Root cause:** Hardcoded string `'Default (0% +/- 5%)'` in CalculatorPage.tsx instead of using `DEFAULT_INTERVAL.high` constant (8.22%).

**Fix (Plan 02-06):**
- Imported `DEFAULT_INTERVAL` from `@/lib/prior`
- Used `Math.abs(DEFAULT_INTERVAL.high).toFixed(0)` to generate "8%" dynamically
- Ensures single source of truth for default interval value

**Verification:**

| Aspect | Status | Evidence |
|--------|--------|----------|
| DEFAULT_INTERVAL imported | ✓ VERIFIED | Line 47: `import { DEFAULT_INTERVAL } from '@/lib/prior'` |
| Used in Results display | ✓ VERIFIED | Line 351: `${Math.abs(DEFAULT_INTERVAL.high).toFixed(0)}%` |
| Hardcoded value removed | ✓ VERIFIED | No more "5%" literals in CalculatorPage |

**Code evidence:**
```typescript
// CalculatorPage.tsx, Lines 47, 350-351
import { DEFAULT_INTERVAL } from '@/lib/prior';

// ...in Results section:
{sharedInputs.priorType === 'default'
  ? `Default (0% +/- ${Math.abs(DEFAULT_INTERVAL.high).toFixed(0)}%)`
  : // custom interval display
```

**Status:** ✓ CLOSED — Results display now shows "Default (0% +/- 8%)" correctly

---

## Goal Achievement

### Observable Truths (All 15 Verified)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can enter baseline conversion rate as percentage (0-100%) with validation | ✓ VERIFIED | BaselineMetricsForm with PercentageInput, displayValue pattern for decimal support, schema validates 0 < CR0 < 100 |
| 2 | User can enter annual visitors with editable unit label (visitors/sessions/leads) | ✓ VERIFIED | NumberInput has unitLabelValue prop and onUnitLabelChange, stores to wizardStore.visitorUnitLabel |
| 3 | User can enter value per conversion with dollar formatting | ✓ VERIFIED | CurrencyInput with displayValue pattern for cents support, formatCurrency on blur, schema validates >= $0.01 |
| 4 | User can select default prior (N(0, 0.05)) or enter custom 90% interval | ✓ VERIFIED | "Fill with Recommended Default" button (action, not radio), sets DEFAULT_INTERVAL (-8.22%, +8.22%), custom inputs always editable |
| 5 | User can select shipping threshold scenario and enter value in dollars or lift % | ✓ VERIFIED | ThresholdScenarioForm has 3 RadioCards, ThresholdInlineInput with UnitToggle and displayValue pattern |
| 6 | Validation errors appear on blur, not while typing | ✓ VERIFIED | All forms use mode: 'onBlur' AND reValidateMode: 'onBlur' |
| 7 | Continue button always enabled; clicking with invalid inputs shows errors | ✓ VERIFIED | CalculatorPage handleNext validates via formRef.current.validate(), returns early if !isValid |
| 8 | Implied mean is displayed and asymmetry is explained when mean != 0 | ✓ VERIFIED | UncertaintyPriorForm computes impliedMeanPercent, getAsymmetryMessage returns explanation for \|mean\| > 0.5% |
| 9 | Default interval values are pre-populated (~[-8.2%, +8.2%]) | ✓ VERIFIED | DEFAULT_INTERVAL = { low: -8.22, high: 8.22 }, form defaultValues use these |
| 10 | Custom interval inputs are always visible (not hidden behind toggle) | ✓ VERIFIED | UncertaintyPriorForm renders custom interval section unconditionally |
| 11 | Default scenario is pre-selected: "Ship if any lift" (T=0) | ✓ VERIFIED | ThresholdScenarioForm getDefaultValues returns { scenario: 'any-positive' } when store is null |
| 12 | Threshold input appears inline when scenario requires it | ✓ VERIFIED | RadioCard children render conditionally based on isSelected |
| 13 | User can toggle between dollars and lift % for threshold value | ✓ VERIFIED | UnitToggle component with ToggleGroup, handlers clear value on unit switch |
| 14 | Accept loss scenario stores negative threshold correctly | ✓ VERIFIED | ThresholdScenarioForm onSubmit: setSharedInput('thresholdValue', -data.acceptableLoss) |
| 15 | Values persist across mode switches and page navigation | ✓ VERIFIED | useEffect syncs form with sharedInputs, wizardStore persists to sessionStorage |

**Score:** 15/15 truths verified

### Regression Check (Sample)

Verified that gap closure fixes didn't break existing functionality:

| Feature | Previous Status | Re-verification Status | Notes |
|---------|----------------|----------------------|-------|
| NumberInput unit label | ✓ Working | ✓ Working | unitLabelValue and onUnitLabelChange still present (Lines 134-135) |
| RadioCard component | ✓ Working | ✓ Working | Children render based on isSelected, no changes in 02-04/05/06 |
| BaselineMetricsForm wiring | ✓ Working | ✓ Working | onSubmit stores to wizardStore, percentToDecimal conversion intact |
| UncertaintyPriorForm wiring | ✓ Working | ✓ Working | onSubmit stores priorType, intervalLow, intervalHigh |
| ThresholdScenarioForm wiring | ✓ Working | ✓ Working | onSubmit negates acceptableLoss for accept-loss scenario |
| Session persistence | ✓ Working | ✓ Working | wizardStore still uses sessionStorage |

**Result:** No regressions detected

### Requirements Coverage

All Phase 2 requirements satisfied:

| Requirement | Status | Evidence |
|-------------|--------|----------|
| BASIC-IN-01: Baseline conversion rate input | ✓ SATISFIED | PercentageInput with displayValue pattern, decimal support verified |
| BASIC-IN-02: Annual visitors with editable label | ✓ SATISFIED | NumberInput with unitLabelValue/onUnitLabelChange |
| BASIC-IN-03: Value per conversion | ✓ SATISFIED | CurrencyInput with displayValue pattern, cents support verified |
| BASIC-IN-04: Default prior option | ✓ SATISFIED | Action button fills DEFAULT_INTERVAL, no radio-style confusion |
| BASIC-IN-05: Custom 90% interval | ✓ SATISFIED | Interval inputs always editable, computePriorFromInterval |
| BASIC-IN-06: 3 threshold scenarios | ✓ SATISFIED | RadioCard for any-positive, minimum-lift, accept-loss |
| BASIC-IN-07: Threshold unit selector | ✓ SATISFIED | UnitToggle switches between dollars and lift |
| BASIC-IN-08: Helper text per SPEC.md | ✓ SATISFIED | All forms have helpText and InfoTooltip |
| UX-01: Input formatting | ✓ SATISFIED | formatCurrency, formatPercentage on blur, raw while focused |
| UX-02: Inline validation | ✓ SATISFIED | Zod schema messages, errors on blur only |
| UX-03: Contextual help visible | ✓ SATISFIED | helpText always visible, InfoTooltip supplements |
| UX-04: Keyboard navigation | ✓ SATISFIED | Tab through inputs, htmlFor/id attributes |
| UX-05: Focus indicators | ✓ SATISFIED | focus-visible:ring on inputs and buttons |
| UX-08: Reasonable defaults | ✓ SATISFIED | Placeholders and defaultValues present |

### Build and Test Results

**Build:** ✓ PASSED
```
vite v7.3.1 building client environment for production...
✓ 1877 modules transformed.
dist/assets/index-YEg-0hdG.js   439.85 kB │ gzip: 133.55 kB
✓ built in 1.24s
```

**Tests:** ✓ PASSED (17/17)
```
✓ src/stores/wizardStore.test.ts (12 tests) 4ms
✓ src/App.test.tsx (5 tests) 299ms
Test Files  2 passed (2)
Tests  17 passed (17)
```

**Lint:** ✓ PASSED
- 3 informational React Compiler warnings (react-hook-form watch() usage)
- No blocking errors

### Anti-Patterns Found

**Scan results:** None found

All modified files scanned:
- src/components/forms/inputs/PercentageInput.tsx
- src/components/forms/inputs/CurrencyInput.tsx
- src/components/forms/inputs/NumberInput.tsx
- src/components/forms/BaselineMetricsForm.tsx
- src/components/forms/UncertaintyPriorForm.tsx
- src/components/forms/ThresholdScenarioForm.tsx
- src/pages/CalculatorPage.tsx

**Results:**
- 0 TODO/FIXME comments
- 0 placeholder content
- 0 empty implementations
- 0 console.log-only functions
- All exports substantive and properly wired

### Human Verification Required

All automated checks passed. The following items need manual testing to verify full UX:

#### 1. Decimal Input — User Experience

**Test:**
1. Focus conversion rate field, type "3." — should display "3." (not "3")
2. Continue typing "3.2" — should display "3.2"
3. Tab away — should format as "3.2%"
4. Focus again — should show "3.2" (raw number)
5. Repeat for value per conversion: "50.99" → "$50.99"

**Expected:** Seamless decimal typing experience, no intermediate value stripping

**Why human:** Real-time typing behavior requires manual verification

#### 2. Default Prior Button — Action Not Selection

**Test:**
1. Navigate to uncertainty section
2. Click "Fill with Recommended Default"
3. Interval inputs should populate: -8.22%, +8.22%
4. Immediately edit intervalLow to "-5"
5. Edit should work without any "deselect" action
6. Button should not show persistent "selected" styling

**Expected:** Button fills values on click, then user can freely edit

**Why human:** Interaction pattern and UX affordance need manual verification

#### 3. Validation Timing — Blur Only

**Test:**
1. Focus conversion rate field, type "abc" — no error should appear
2. Continue typing "150" — still no error while typing
3. Tab away — error "Must be less than 100%" should appear
4. Focus field, type "3" — error should persist (not disappear)
5. Type "3.2" — still shows error
6. Tab away — error should clear

**Expected:** Errors appear/update only on blur, never during typing

**Why human:** Error timing relative to keystrokes requires manual observation

#### 4. Results Display — Correct Default Prior

**Test:**
1. Complete baseline section with valid values
2. In uncertainty section, click "Fill with Recommended Default"
3. Continue to threshold section, select any scenario
4. Navigate to Results section
5. Input Summary should show "Prior: Default (0% +/- 8%)"
6. NOT "0% +/- 5%"

**Expected:** Results display uses DEFAULT_INTERVAL constant (8%), not hardcoded 5%

**Why human:** Visual verification of displayed text

#### 5. Full Flow Regression

**Test:**
1. Complete all three sections with various values
2. Navigate back and forward using buttons
3. Verify all values persist
4. Toggle to Advanced mode
5. Toggle back to Basic mode
6. Verify all values still present

**Expected:** No loss of data, no broken interactions after gap closure fixes

**Why human:** Full integration testing across navigation and mode switches

## Gaps Summary

**No gaps remaining.** All 5 UAT issues resolved:

1. ✓ Decimal input blocking fixed (displayValue pattern)
2. ✓ Default prior button UX fixed (action button, not radio)
3. ✓ Validation timing fixed (reValidateMode: 'onBlur')
4. ✓ Results display fixed (uses DEFAULT_INTERVAL constant)
5. ✓ Asymmetry explanation working (was blocked, unblocked after fix 2)

All must-haves verified. Phase goal achieved.

---

_Verified: 2026-01-30T07:38:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — UAT gaps closed via plans 02-04, 02-05, 02-06_
