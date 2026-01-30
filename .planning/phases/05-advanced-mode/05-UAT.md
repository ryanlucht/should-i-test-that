# Phase 5: Advanced Mode - User Acceptance Testing

**Phase Goal:** Users can calculate realistic test value using EVSI and Cost of Delay
**Started:** 2026-01-30
**Status:** Complete (12/12 pass)

## Test Checklist

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | Mode switching shows 5 sections in Advanced mode | pass | |
| 2 | Prior shape selector shows Normal/Student-t/Uniform options | pass | |
| 3 | Student-t df presets display with correct labels | pass | Bug fixed: chart now updates on shape change |
| 4 | Experiment design form shows all required fields | pass | Bug fixed: NaN defaults |
| 5 | Auto-derive daily traffic calculates from annual visitors | pass | |
| 6 | Chart renders Normal distribution correctly | pass | |
| 7 | Chart renders Student-t distribution (fatter tails) | pass | |
| 8 | Chart renders Uniform distribution as rectangle | pass | |
| 9 | EVSI calculation shows loading state then verdict | pass | Bugs fixed: Worker pattern, priorShape init |
| 10 | Verdict displays "up to $X" format | pass | |
| 11 | Cost of Delay card expands to show breakdown | pass | UX feedback: explain $/day calculation |
| 12 | Net Value displays as max(0, EVSI - CoD) | pass | |

## Test Details

### Test 1: Mode switching shows 5 sections in Advanced mode
**Steps:**
1. Go to Welcome page
2. Select "Advanced" mode
3. Click "Begin"
4. Observe the progress indicator

**Expected:** Progress indicator shows 5 sections: Baseline, Uncertainty, Threshold, Test Design, Results

---

### Test 2: Prior shape selector shows Normal/Student-t/Uniform options
**Steps:**
1. In Advanced mode, navigate to Uncertainty section
2. Look for prior shape selection

**Expected:** Three radio cards appear: Normal (default), Student-t, Uniform

---

### Test 3: Student-t df presets display with correct labels
**Steps:**
1. In Uncertainty section, select "Student-t" prior shape
2. Look for degrees of freedom options

**Expected:** Three preset options appear: "Heavy tails (df=3)", "Moderate tails (df=5)", "Near-normal (df=10)"

---

### Test 4: Experiment design form shows all required fields
**Steps:**
1. In Advanced mode, navigate to "Test Design" section
2. Review available inputs

**Expected:** Form shows: Test Duration (days), Daily Traffic, Traffic Split (%), Eligibility (%), and two latency fields (Conversion Latency, Decision Latency) that appear de-emphasized

---

### Test 5: Auto-derive daily traffic calculates from annual visitors
**Steps:**
1. Enter 365,000 as annual visitors in Baseline section
2. Go to Test Design section
3. Click "Auto-derive from annual" button

**Expected:** Daily traffic field populates with 1,000 (365,000 / 365)

---

### Test 6: Chart renders Normal distribution correctly
**Steps:**
1. In Advanced mode, select Normal prior shape
2. Enter custom 90% interval values
3. Observe the chart

**Expected:** Smooth bell curve with 90% interval shading, mean marker, and threshold line

---

### Test 7: Chart renders Student-t distribution (fatter tails)
**Steps:**
1. Select Student-t prior shape with df=3 (Heavy tails)
2. Observe the chart

**Expected:** Distribution curve with visibly fatter tails than Normal, still shows interval shading and markers

---

### Test 8: Chart renders Uniform distribution as rectangle
**Steps:**
1. Select Uniform prior shape
2. Observe the chart

**Expected:** Rectangle-shaped chart (flat top, vertical sides), NO 90% interval shading (entire range is the interval)

---

### Test 9: EVSI calculation shows loading state then verdict
**Steps:**
1. Complete all Advanced mode inputs (Baseline, Uncertainty with Student-t, Threshold, Test Design)
2. Navigate to Results section
3. Observe the verdict card

**Expected:** Brief loading spinner appears, then verdict displays with calculated value

---

### Test 10: Verdict displays "up to $X" format
**Steps:**
1. View completed Advanced mode results

**Expected:** Primary verdict reads "If you can run this test for up to $X, it's worth testing" (where X is formatted currency)

---

### Test 11: Cost of Delay card expands to show breakdown
**Steps:**
1. View Advanced mode results
2. Find the Cost of Delay card
3. Click on it to expand

**Expected:** Card expands to show formula breakdown: daily cost × (test duration + decision latency)

---

### Test 12: Net Value displays as max(0, EVSI - CoD)
**Steps:**
1. View Advanced mode results
2. Find the Net Value card

**Expected:** Shows Net Value = EVSI - Cost of Delay, never negative (floors at $0)

---

## Session Log

**Session Date:** 2026-01-30

### Bugs Found and Fixed

1. **Nested forms error** - `PriorShapeForm` had its own `<form>` tag inside `UncertaintyPriorForm`'s form. Fixed by replacing with `<div>`.

2. **Missing switch default** - `useEVSICalculations` switch statement had no default case, causing `prior` to be undefined. Fixed by adding default case.

3. **Chart not updating on shape change** - `UncertaintyPriorForm` used legacy chart that always showed Normal. Fixed by using `PriorDistributionChart` with full `PriorDistribution` object in Advanced mode.

4. **NaN in percentage fields** - `trafficSplit` and `eligibilityFraction` showed NaN due to stale session data. Fixed with null/undefined/NaN guards.

5. **Worker not completing** - Used incorrect vite-plugin-comlink pattern. Fixed by using native Worker API with explicit `Comlink.expose()` and `Comlink.wrap()`.

6. **priorShape not initialized** - When entering Advanced mode, `priorShape` stayed null. Fixed by initializing to 'normal' in `setMode`.

7. **Results showing "Complete all sections"** - Component checked `testDurationDays` directly instead of hook state. Fixed by checking `!loading && !results`.

### UX Feedback (Non-blocking)

- **Cost of Delay breakdown**: User requested more explanation of how the $/day figure is calculated.

### Summary

- **Tests:** 12/12 passed
- **Bugs fixed:** 7
- **UX feedback:** 1 item noted for future improvement

