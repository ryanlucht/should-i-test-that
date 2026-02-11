# Helper Copy Audit - Phase 16

## Summary

Total helper copy instances: 68
Total characters: ~8,150

This audit catalogs all helper text across forms, results, and page structure to inform the Phase 17 layout changes. The DRUIDS 3-column layout will need special attention for inputs that currently have long helper text.

---

## Section-by-Section Inventory

### 1. Baseline Metrics Form

**File:** `src/components/forms/BaselineMetricsForm.tsx`

| Location | Text | Chars | Current Style | Space Impact |
|----------|------|-------|---------------|--------------|
| Section intro | "This will help us calculate the range of potential outcomes from the test in dollars." | 86 | text-sm text-muted-foreground | Low - full width |
| Conversion rate helpText | "This is your current conversion rate for the metric and audience/targeting you'd be testing. Ideally, choose a metric that is a revenue-generating event (e.g., visitors to signups)." | 185 | text-sm text-muted-foreground (via NumberInput) | **High** - below input |
| Annual visitors helpText | "Enter the number of visitors you expect in a year, based on the audience and triggering conditions of the test." | 113 | text-sm text-muted-foreground | **High** - below input |
| Value per conversion helpText | "Put the business value of one conversion in dollars. Examples: average order value, gross margin per purchase, first-year LTV, or a blended estimate. Pick one that matches how you evaluate impact." | 197 | text-sm text-muted-foreground | **High** - below input |

**Notes:**
- All three input helpText fields are very long (113-197 chars)
- In 3-column grid, these would overflow significantly
- Candidates for tooltip migration

---

### 2. Uncertainty Prior Form (Basic Mode)

**File:** `src/components/forms/UncertaintyPriorForm.tsx`

| Location | Text | Chars | Current Style | Space Impact |
|----------|------|-------|---------------|--------------|
| Section header (Basic) | "How uncertain are you about whether this change will help or hurt?" | 67 | text-foreground font-medium | Low - full width |
| Section header tooltip | "A 'prior' is your belief about the effect before running a test. A wider range means more uncertainty." | 102 | InfoTooltip | None - tooltip |
| Section intro (Basic) | "A normal distribution is a solid first-pass model for effect sizes. Advanced mode can use other shapes." | 102 | text-sm text-muted-foreground | Low - full width |
| Default button title | "Fill with Recommended Default" | 30 | font-medium text-foreground | Low - button card |
| Default button description | "I'm 90% sure the relative lift is between -8% and +8%" | 54 | text-sm text-muted-foreground | Low - button card |
| Default button extra | "This is a reasonable starting point if you're unsure. It assumes most changes have small effects." | 96 | text-xs text-muted-foreground | Low - button card |
| Custom interval label (Basic) | "Or specify your own 90% credible interval:" | 43 | text-sm font-medium (Label) | Low - full width |
| Custom interval tooltip | "This means you're 90% confident the true effect falls within this range." | 73 | InfoTooltip | None - tooltip |
| Lower bound label | "I'm 90% sure the lift is at least" | 35 | text-sm text-muted-foreground | Medium - grid col |
| Upper bound label | "and at most" | 11 | text-sm text-muted-foreground | Low - grid col |
| Implied lift label | "Implied expected lift:" | 23 | text-muted-foreground | Low - inline |
| Asymmetry message (weak+) | "You're encoding a slight expectation that the change will help." | 63 | text-sm text-muted-foreground | Low - callout box |
| Asymmetry message (moderate+) | "You're encoding a moderate expectation of improvement." | 54 | text-sm text-muted-foreground | Low - callout box |
| Asymmetry message (strong+) | "You're encoding a strong prediction that this change will win." | 62 | text-sm text-muted-foreground | Low - callout box |
| Asymmetry message (weak-) | "You're encoding a slight concern that this might hurt." | 54 | text-sm text-muted-foreground | Low - callout box |
| Asymmetry message (moderate-) | "You're encoding some skepticism about this change." | 50 | text-sm text-muted-foreground | Low - callout box |
| Asymmetry message (strong-) | "You're encoding a strong expectation that this will underperform." | 66 | text-sm text-muted-foreground | Low - callout box |
| Chart title | "Your belief distribution:" | 26 | text-sm font-medium | Low - chart label |

---

### 3. Uncertainty Prior Form (Advanced Mode Additions)

**File:** `src/components/forms/UncertaintyPriorForm.tsx` + `PriorShapeForm.tsx`

| Location | Text | Chars | Current Style | Space Impact |
|----------|------|-------|---------------|--------------|
| Section header (Advanced) | "What shape describes your uncertainty?" | 39 | text-foreground font-medium | Low - full width |
| Section intro (Advanced) | "Choose a distribution shape, then specify your 90% interval." | 61 | text-sm text-muted-foreground | Low - full width |
| Uniform bounds intro | "Define the bounds of your uniform distribution:" | 48 | text-sm font-medium | Low - divider text |
| Normal interval intro | "Specify your 90% credible interval:" | 37 | text-sm font-medium | Low - divider text |
| Uniform helper | "These bounds define the edges of your uniform distribution." | 60 | text-xs text-muted-foreground | Low - above inputs |
| Uniform lower label | "Minimum possible lift" | 21 | text-sm text-muted-foreground | Low - grid col |
| Uniform upper label | "Maximum possible lift" | 21 | text-sm text-muted-foreground | Low - grid col |
| Midpoint label (Uniform) | "Midpoint (expected value):" | 26 | text-muted-foreground | Low - inline |

**PriorShapeForm.tsx (Advanced only):**

| Location | Text | Chars | Current Style | Space Impact |
|----------|------|-------|---------------|--------------|
| Default button title | "Fill with Recommended Default" | 30 | font-medium text-foreground | Low - button card |
| Default button description | "I'm 90% sure the relative lift is between -8% and +8%" | 54 | text-sm text-muted-foreground | Low - button card |
| Default button extra | "This is a reasonable starting point if you're unsure. It assumes most changes have small effects. This is also the prior used in Eppo for Bayesian experiment analysis." | 165 | text-xs text-muted-foreground | Low - button card |
| Shape section header | "What shape describes your uncertainty?" | 39 | text-sm font-medium | Low - section header |
| Shape section intro | "Choose the distribution that best matches how you think about possible outcomes." | 80 | text-sm text-muted-foreground | Low - full width |
| Normal card title | "Normal distribution" | 19 | font-medium | Low - card |
| Normal card description | "Standard bell curve - a solid default for most experiments." | 60 | text-sm text-muted-foreground | Low - card |
| Student-t card title | "Fat-tailed (Student-t)" | 22 | font-medium | Low - card |
| Student-t card description | "Heavy tails for when rare large effects are plausible." | 55 | text-sm text-muted-foreground | Low - card |
| Student-t df header | "How fat should the tails be?" | 29 | text-sm font-medium | Low - nested card |
| Student-t df helper | "Evidence suggests many experimentation programs' outcomes appear fat-tailed: most tests are small, but rare outcomes are much larger than a normal curve predicts." | 160 | text-xs text-muted-foreground | Medium - nested card |
| Uniform card title | "Uniform (uninformed)" | 20 | font-medium | Low - card |
| Uniform card description | "Equal probability across the entire interval." | 46 | text-sm text-muted-foreground | Low - card |
| Uniform warning | "Uniform priors should rarely be used; pretending we know nothing is often misleading." | 85 | text-xs text-amber-600 | Low - nested warning |

---

### 4. Threshold Scenario Form

**File:** `src/components/forms/ThresholdScenarioForm.tsx`

| Location | Text | Chars | Current Style | Space Impact |
|----------|------|-------|---------------|--------------|
| Section header | "What counts as \"worth shipping\"?" | 33 | text-base font-medium | Low - full width |
| Section header tooltip | "The threshold is the break-even point: below it, shipping is a mistake; above it, not shipping is a mistake." | 108 | InfoTooltip | None - tooltip |
| Section intro | "This helps determine whether the uncertainty about your change is costly." | 73 | text-sm text-muted-foreground | Low - full width |
| Any positive title | "Ship if it helps at all" | 24 | font-medium | Low - card |
| Any positive description | "Any positive impact is worth shipping." | 39 | text-sm text-muted-foreground | Low - card |
| Minimum lift title | "Needs a minimum lift" | 21 | font-medium | Low - card |
| Minimum lift description | "Implementation cost, maintenance, or other trade-offs mean it needs at least some upside." | 90 | text-sm text-muted-foreground | Low - card |
| Minimum lift input label | "Minimum required impact:" | 25 | text-sm font-medium | Medium - nested inline |
| Accept loss title | "Worth it even with a small loss" | 32 | font-medium | Low - card |
| Accept loss description | "Strategic importance or long-term benefits justify shipping even if short-term metrics dip slightly." | 99 | text-sm text-muted-foreground | Low - card |
| Accept loss input label | "Maximum acceptable loss:" | 25 | text-sm font-medium | Medium - nested inline |
| Accept loss help | "Enter as a positive number (we'll treat it as a loss)" | 54 | text-xs text-muted-foreground | Medium - nested |

---

### 5. Experiment Design Form (Advanced Mode)

**File:** `src/components/forms/ExperimentDesignForm.tsx`

| Location | Text | Chars | Current Style | Space Impact |
|----------|------|-------|---------------|--------------|
| Section header | "Plan your experiment" | 20 | text-lg font-semibold | Low - full width |
| Section intro | "These parameters determine sample size and test precision" | 58 | text-sm text-muted-foreground | Low - full width |
| Test duration label | "How long will you run the test?" | 32 | Label | Low |
| Test duration helpText | "Enter duration in days. Longer tests = more data = less noise." | 63 | text-sm text-muted-foreground | **Medium** - below input |
| Daily traffic label | "Daily eligible traffic" | 22 | Label | Low |
| Daily traffic helpText | "Average daily visitors who can enter the experiment" | 52 | text-sm text-muted-foreground | Medium - below input |
| Variant allocation label | "Variant allocation" | 18 | Label | Low |
| Variant allocation helpText | "Percentage of traffic seeing the variant (50% = standard A/B)" | 62 | text-sm text-muted-foreground | Medium - below input |
| Eligible traffic label | "Eligible traffic" | 16 | Label | Low |
| Eligible traffic helpText | "What fraction of all traffic is eligible for this experiment?" | 63 | text-sm text-muted-foreground | Medium - below input |
| Advanced timing header | "Advanced timing (optional)" | 26 | text-xs text-muted-foreground uppercase | Low - divider |
| Conversion latency label | "Conversion latency" | 18 | Label | Low |
| Conversion latency helpText | "Days from exposure to expected conversion (e.g., 7 for weekly purchases)" | 73 | text-sm text-muted-foreground | Medium - below input |
| Decision latency label | "Decision latency" | 16 | Label | Low |
| Decision latency tooltip | "Time needed for analysis, review, and deployment after the test concludes." | 75 | InfoTooltip | None - tooltip |

---

### 6. Results Section (Basic Mode)

**File:** `src/components/results/ResultsSection.tsx` + `VerdictCard.tsx` + `SupportingCard.tsx`

| Location | Text | Chars | Current Style | Space Impact |
|----------|------|-------|---------------|--------------|
| Verdict headline | "If you can A/B test this idea for less than $[EVPI], it's worth testing." | ~70 | text-xl font-semibold | Low - full width |
| EVPI warning | "This is EVPI - the value of perfect information. Real A/B tests are imperfect, so this is an optimistic ceiling on what testing is worth. For a more realistic estimate, try Advanced mode." | 186 | text-sm text-muted-foreground | Low - callout box |
| Prior card title | "Your belief (prior)" | 19 | text-sm text-muted-foreground | Low - card |
| Prior card description | "90% confident: -X% to +X%" | ~26 | text-xs text-muted-foreground | Low - card |
| Threshold card title | "Shipping threshold" | 18 | text-sm text-muted-foreground | Low - card |
| Threshold card description (any-positive) | "Ship if the change helps at all" | 33 | text-xs text-muted-foreground | Low - card |
| Threshold card description (min lift) | "Approx. $X/year" | ~16 | text-xs text-muted-foreground | Low - card |
| P(clears threshold) title | "Chance of clearing threshold" | 29 | text-sm text-muted-foreground | Low - card |
| P(clears threshold) desc (high) | "More likely than not to clear the bar" | 38 | text-xs text-muted-foreground | Low - card |
| P(clears threshold) desc (low) | "Less likely than not to clear the bar" | 38 | text-xs text-muted-foreground | Low - card |
| P(clears threshold) desc (equal) | "Equal odds of clearing the bar" | 31 | text-xs text-muted-foreground | Low - card |
| Regret card title | "Chance you'd regret not testing" | 32 | text-sm text-muted-foreground | Low - card |
| Regret card desc (ship) | "If you ship without testing, there's a X% chance the change actually hurts" | ~75 | text-xs text-muted-foreground | Low - card |
| Regret card desc (don't ship) | "If you don't ship, there's a X% chance you're leaving gains on the table" | ~72 | text-xs text-muted-foreground | Low - card |
| EVPI intuition title | "What $[EVPI] represents" | ~22 | text-sm font-medium | Low - full width |
| EVPI intuition body | "Based on your beliefs, the expected lift (X%) [exceeds/meets/falls below] your threshold (Y%), so without more information you would [ship/not ship]. The $X is the expected value of the regret you'd avoid by having perfect foresight - it's the maximum you should pay for any information about whether this change helps." | ~330 | text-sm text-muted-foreground | Low - full width |
| Export section title | "Share your analysis" | 19 | text-sm font-medium | Low - full width |

---

### 7. Advanced Results Section

**File:** `src/components/results/AdvancedResultsSection.tsx` + `EVSIVerdictCard.tsx` + `ValueBreakdownCard.tsx`

| Location | Text | Chars | Current Style | Space Impact |
|----------|------|-------|---------------|--------------|
| EVSI verdict headline | "If you can run this test for up to $[NetValue], test it." | ~55 | text-xl font-semibold | Low - full width |
| EVSI explanation | "This is EVSI minus Cost of Delay - the realistic value of running this specific test. It accounts for the test being imperfect and the opportunity cost of waiting for results." | 177 | text-sm text-muted-foreground | Low - callout box |
| Loading text | "Calculating..." | 14 | text-muted-foreground | Low |
| No results text | "Complete all previous sections to see your results." | 52 | text-muted-foreground | Low |
| EVSI row label | "EVSI (test value)" | 17 | text-sm text-muted-foreground | Low - breakdown row |
| Timing costs label | "Timing costs" | 12 | text-sm text-muted-foreground | Low - breakdown row |
| Timing costs expanded - test period | "During the test (X days): Only Y% of users (variant group) receive the treatment. The Z% in control get nothing, even if the treatment is beneficial." | ~150 | text-xs text-muted-foreground | Low - expandable |
| Timing costs expanded - latency | "During decision latency (X days): While you analyze results and decide, nobody receives the treatment." | ~100 | text-xs text-muted-foreground | Low - expandable |
| Timing costs expanded - footer | "These timing effects are computed per Monte Carlo iteration, capturing the true opportunity cost regardless of your default decision." | 135 | text-xs text-muted-foreground | Low - expandable |
| Net value label | "Net value" | 9 | text-sm font-medium | Low - breakdown row |
| Net value description | "Net value is the most you should pay to run this test." | 55 | text-xs text-muted-foreground | Low - breakdown footer |
| P(test changes decision) title | "P(test changes decision)" | 24 | text-sm text-muted-foreground | Low - card |
| P(test changes decision) desc (high) | "Significant chance the test will influence your decision" | 56 | text-xs text-muted-foreground | Low - card |
| P(test changes decision) desc (low) | "Low chance the test will change your mind" | 42 | text-xs text-muted-foreground | Low - card |
| EVSI intuition title | "How to interpret $[NetValue]" | ~28 | text-sm font-medium | Low - full width |
| EVSI intuition body | "The $X EVSI represents the expected improvement in your decision from running this test. However, running a test has timing costs: during the test period, only the variant group receives treatment, and during decision latency, nobody does. The net $Y accounts for these timing effects and is the most you should pay to run this test." | ~330 | text-sm text-muted-foreground | Low - full width |

---

### 8. Calculator Page Structure

**File:** `src/pages/CalculatorPage.tsx`

| Location | Text | Chars | Current Style | Space Impact |
|----------|------|-------|---------------|--------------|
| Header title | "Should I Test That?" | 19 | text-lg font-semibold | Low - header |
| Section labels (progress) | "Baseline", "Uncertainty", "Threshold", "Test Design", "Results" | 10-11 each | text-sm | Low - progress bar |
| Section titles | "Baseline Metrics", "Uncertainty (Prior)", "Shipping Threshold", "Experiment Design", "Results" | 15-20 each | SectionWrapper | Low - section headers |
| Footer attribution | "Created by Ryan Lucht and 100% vibe-coded by Claude Opus 4.5, GPT-5.2 Pro, GPT-Codex-5.2, and Gemini 3 Pro." | 108 | text-sm text-muted-foreground | Low - footer |
| Footer EVPI reference | "EVPI calculation based on \"How to Measure Anything\" by Douglas Hubbard" | 73 | text-sm text-muted-foreground | Low - footer |

---

## Space Analysis

### Constrained Areas (High/Medium Impact)

Areas where DRUIDS 3-column layout may conflict with current copy:

1. **Baseline Metrics inputs (HIGH):**
   - Conversion rate helpText: 185 chars
   - Annual visitors helpText: 113 chars
   - Value per conversion helpText: 197 chars
   - These are currently displayed as text-sm below each input
   - In 3-col grid (~250px per column), these would wrap to 4-6 lines each

2. **Experiment Design inputs (MEDIUM):**
   - Test duration helpText: 63 chars
   - Daily traffic helpText: 52 chars
   - Variant allocation helpText: 62 chars
   - Eligible traffic helpText: 63 chars
   - Conversion latency helpText: 73 chars
   - Shorter than Baseline, but still 2-3 line wraps per input

3. **Inline inputs in cards (MEDIUM):**
   - Threshold scenario nested inputs have labels and help text
   - Student-t df helper in Prior shape: 160 chars

### Unconstrained Areas (Low Impact)

Areas that naturally fit or are already full-width:

1. **Section intros:** All are full-width, no layout change needed
2. **Radio card descriptions:** Already constrained to card width
3. **Result cards:** 2x2 grid layout, descriptions are already short
4. **Verdict headlines:** Full-width, no change needed
5. **Intuition explainers:** Full-width callout boxes
6. **Tooltips:** Info icons with popover, no space impact

---

## Character Count Thresholds

Based on DRUIDS mockup analysis:

- **Column width in 3-col grid:** ~220-250px (allowing for padding)
- **Characters per line (12px font):** ~30-35 chars
- **Comfortable helpText length:** 60-80 chars (2-3 lines)
- **Current longest helpText:** 197 chars (6+ lines in narrow column)

### Suggested Thresholds

| Length | Treatment |
|--------|-----------|
| <60 chars | Keep inline, will fit 2 lines |
| 60-100 chars | Keep inline if space permits, else tooltip |
| >100 chars | Move to tooltip |

---

## Recommendations

Based on DRUIDS mockup patterns:

### Keep Inline (Short, <80 chars)
- Section intro text (full width, no issue)
- Radio card titles and short descriptions
- Result card titles
- Label text and short helper text

### Move to Tooltip (Long, >80 chars)
1. **Baseline Metrics helpText (all three):** 113-197 chars each
2. **Experiment Design helpText (most):** 52-73 chars each
3. **Student-t df helper:** 160 chars
4. **EVPI warning text:** 186 chars (could stay in callout)

### Preserve As-Is
- Full-width section intros and intuition explainers
- Verdict headlines and callout boxes
- Tooltips already in use (InfoTooltip)

---

## Proposed Approach

**Option A: Move long helpText (>100 chars) to tooltips**
- Affects: 3 Baseline inputs, 1 Prior shape helper
- Keeps inputs compact in 3-column layout
- Users can hover/click for full context
- Trade-off: Slightly less discoverable

**Option B: Truncate and simplify copy**
- Reduce all helpText to <80 chars
- Example: "Enter your current conversion rate for this metric" (49 chars)
- Trade-off: May lose important guidance

**Option C: Adaptive layout based on viewport**
- Keep long helpText on wide screens
- Move to tooltips on narrow/mobile
- Trade-off: More complex implementation

**Option D: Side-by-side layout (label left, input right)**
- DRUIDS mockup style with narrower input columns
- HelpText could go below row or in tooltip
- Trade-off: Different from current vertical stacking

**Recommendation:** Start with **Option A** for Phase 17. The longest copy (Baseline metrics) benefits most from tooltip treatment, and this is the cleanest change that preserves all guidance while fitting the new layout.

---

*Audit completed: 2026-02-11*
