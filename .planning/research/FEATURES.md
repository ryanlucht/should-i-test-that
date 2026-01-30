# Feature Landscape: Calculator/Wizard UI/UX

**Domain:** Financial/Statistical Calculator with Multi-Step Wizard
**Researched:** 2026-01-29
**Focus:** UI/UX patterns only (statistical features defined in SPEC.md)

---

## Table Stakes

Features users expect. Missing = product feels incomplete or frustrating.

### Wizard Navigation & Progress

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Progress indicator** | Users need to know where they are and how much remains | Low | Use numbered steps with labels; highlight current step; gray out future steps |
| **Back/Next navigation** | Fundamental wizard pattern; users expect to review/edit | Low | Always show Back (except step 1); Next should validate before advancing |
| **Step labels** | Generic "Step 1/2/3" frustrates users; they want context | Low | Short, descriptive labels: "Baseline Metrics", "Prior Beliefs", etc. |
| **Linear flow enforcement** | Users shouldn't skip ahead without completing prerequisites | Low | Disable/gray future steps; enforce validation before advancing |
| **Data persistence within session** | Navigating back shouldn't lose entered data | Low | Store wizard state in memory; restore on back navigation |
| **Leave warning** | Users hate losing work to accidental navigation | Low | "You have unsaved changes" modal on browser back/close |

### Calculator Input UX

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Inline validation** | Users expect immediate feedback on invalid input | Med | Validate on blur (not keystroke); show error below field; red border |
| **Input formatting** | Currency should look like currency ($1,234); percentages should show % | Med | Format on blur; parse on focus; handle locale differences |
| **Contextual help text** | Non-experts need guidance on unfamiliar terms | Low | Inline text below inputs, not hidden in tooltips; explain "what is this?" |
| **Reasonable defaults/examples** | Empty fields are intimidating; users need anchors | Low | Show placeholder examples: "e.g., 2.5%" or pre-fill common values |
| **Numeric keyboard on mobile** | Frustrating to type numbers with full keyboard | Low | Use `inputmode="decimal"` for percentage fields |
| **Clear field labels** | Users shouldn't guess what to enter | Low | "Baseline conversion rate" not just "Conversion" |
| **Required field indicators** | Users need to know what's mandatory | Low | Asterisk or "(required)" text |

### Results Display

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Prominent result display** | The whole point of the calculator; must be unmissable | Low | Large font, visual hierarchy, positioned prominently |
| **Result contextualization** | Raw numbers meaningless without interpretation | Med | "Your EVPI is $X, meaning..." or comparison to thresholds |
| **Visual hierarchy** | Primary result vs. supporting details need distinction | Low | Headline number + smaller supporting metrics |
| **Currency/number formatting** | Unformatted numbers hard to read | Low | Thousands separators, appropriate decimal places |

### Chart Interactions

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Tooltips on hover** | Users expect to see exact values when hovering data points | Med | Show precise values; format appropriately |
| **Responsive sizing** | Charts must work on mobile/tablet/desktop | Med | SVG-based charts; container-responsive |
| **Clear axis labels** | Users need to understand what they're looking at | Low | Descriptive labels with units |
| **Legend** | Multi-series charts need identification | Low | Clear, positioned appropriately |

### Accessibility Basics

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Keyboard navigation** | Required for accessibility; expected by power users | Med | Tab through inputs logically; Enter to advance; focus management |
| **Focus indicators** | Keyboard users must see where they are | Low | Visible focus rings; don't rely on browser defaults |
| **Error announcements** | Screen reader users need error feedback | Med | ARIA live regions for validation errors |
| **Color + text for status** | Color-blind users need redundant cues | Low | Green + checkmark; red + X; never color alone |

---

## Differentiators

Features that set the product apart. Not expected, but valued.

### Enhanced Wizard Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Live result preview** | See output update as you adjust inputs (no submit needed) | Med | Real-time calculation on input change; powerful "what-if" exploration |
| **Interactive sliders** | More intuitive than text entry for ranges | Med | Combine with text input; sync bidirectionally |
| **Mode switching (Basic/Advanced)** | Accommodates different user sophistication | Med | Clean toggle; preserve data when switching; clear what's different |
| **Smart defaults based on industry** | Pre-populate reasonable values for e-commerce vs SaaS | Med | Optional "What industry?" at start; reduces cognitive load |

### Enhanced Results Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Shareable URL with state** | Share exact calculation with colleagues; bookmarkable | Med | Encode inputs in URL params; restore on load |
| **Export to PDF/image** | Share results in reports/presentations | High | Generate PDF with charts; requires server-side or canvas-to-image |
| **Copy results to clipboard** | Quick sharing in Slack/email | Low | Button that copies formatted text |
| **Comparison mode** | Compare two scenarios side-by-side | High | Significant UI complexity; powerful for decision-making |

### Enhanced Chart Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Animated transitions** | Charts feel alive; changes are easy to follow | Med | Smooth transitions when data updates |
| **Interactive exploration** | Click to drill down; zoom on region | High | Requires careful touch/mouse handling |
| **Annotation/highlights** | Point out key thresholds or decision points | Med | Vertical lines at key values; shaded regions |

### Enhanced Input Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Save & resume later** | Complex inputs shouldn't require one-sitting completion | Med | LocalStorage or account-based; "Continue where you left off" |
| **Input history/presets** | Return users can quickly re-run with saved scenarios | Med | Requires local/server storage |
| **Undo/redo** | Power users expect editing capabilities | Med | Command pattern; Ctrl+Z support |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Mandatory registration before results** | Kills conversion; users exploring won't commit | Allow full use without signup; offer optional save/share with account |
| **Results only via email** | Frustrating; feels like lead-gen trap | Show results immediately on page |
| **Validation on every keystroke** | Annoying interruptions; premature errors | Validate on blur or submit; use "reward early, punish late" pattern |
| **Generic "Invalid input" errors** | Unhelpful; users don't know how to fix | Specific errors: "Enter a number between 0 and 100" |
| **Hidden tooltips for critical info** | Tooltips are hover-only; mobile users miss them | Inline help text that's always visible |
| **Horizontal stepper on mobile** | Doesn't fit; labels get truncated | Vertical stepper on narrow screens; or minimal dot/progress bar |
| **Auto-advancing steps** | Users feel out of control; can't review | Explicit Next button; user controls pace |
| **Popup/modal for calculator** | Blocks context; feels intrusive | Embed directly on page |
| **Complex nested wizards** | Confusing; users lose track of where they are | Flatten into single linear flow |
| **Overly clever animations** | Slow down task completion; annoy repeat users | Subtle, fast transitions; respect `prefers-reduced-motion` |
| **Full-page charts on mobile** | Unusable; requires scrolling to see anything | Constrained height; stack vertically; simplify for mobile |
| **Technical jargon without explanation** | Target users are non-technical PMs | Plain language + "Learn more" links for those who want depth |
| **AI/ML just because** | Doesn't add value for deterministic calculations | Use straightforward calculations; show your work |

---

## Feature Dependencies

```
Core Flow Dependencies:
  Input Validation → Results Display (can't show results without valid inputs)
  Progress Indicator → Step Navigation (indicator reflects navigation state)

Enhancement Dependencies:
  Live Result Preview → Real-time Validation (need valid inputs to calculate)
  Shareable URL → URL State Management (inputs must serialize to URL)
  Export PDF → Chart Rendering (charts must exist to export)
  Interactive Sliders → Input Synchronization (slider + text must sync)

Chart Dependencies:
  Tooltips → Chart Library Setup (tooltips are library feature)
  Responsive Charts → Container Layout (parent must resize properly)
  Animations → Chart Library Support (not all libraries support)
```

---

## MVP Recommendation

For MVP, prioritize all table stakes plus these high-value differentiators:

### Must Have (Table Stakes)
1. Progress indicator with step labels
2. Back/Next navigation with validation
3. Inline validation with clear error messages
4. Contextual help text for all inputs
5. Formatted input display (currency, percentages)
6. Prominent, contextualized results
7. Chart tooltips and responsive sizing
8. Keyboard navigation
9. Leave warning modal

### High-Value Differentiators for MVP
1. **Live result preview** - Low-medium complexity, huge UX win; users see impact of changes immediately
2. **Shareable URL** - Medium complexity, high value for collaboration; PMs share with stakeholders
3. **Copy results to clipboard** - Low complexity, high utility for quick sharing

### Defer to Post-MVP

| Feature | Reason to Defer |
|---------|-----------------|
| Export to PDF | High complexity; shareable URL covers most sharing needs |
| Comparison mode | High complexity; v2 feature |
| Save & resume (with account) | Requires auth system; LocalStorage provides basic version |
| Interactive sliders | Medium complexity; text inputs work fine for MVP |
| Input presets/history | Requires storage architecture; v2 feature |
| Smart industry defaults | Requires research on reasonable defaults per industry |

---

## Implementation Notes

### Wizard Pattern Specifics
- **Step count:** Keep to 5 steps maximum (Welcome, Baseline, Uncertainty, Threshold, Results)
- **Step indicator style:** Numbered circles with labels; highlight current; checkmark for completed
- **Mobile adaptation:** Vertical stepper or simplified dot indicator on narrow screens
- **Button labels:** Use descriptive labels ("Continue to Results") not just "Next"

### Input Validation Timing
- **On blur:** Validate format and required fields
- **On Next click:** Validate all fields on current step; show all errors
- **During typing:** Only for real-time feedback (like password strength); not general inputs
- **Success indicators:** Show checkmarks only for complex validations (not for simple required fields)

### Chart Library Considerations
- Need responsive container support
- Need tooltip customization
- Need smooth transitions
- Need touch event handling for mobile
- Recommend: Chart.js, Recharts, or Visx (investigate in stack research)

### URL State for Sharing
- Encode all inputs as URL params
- Use short param names to avoid URL length limits
- Handle missing/invalid params gracefully (show defaults)
- Example: `?cr=2.5&traffic=10000&mode=basic&...`

### Results Display Hierarchy
1. **Primary:** Headline metric (EVPI or EVSI) - largest, most prominent
2. **Secondary:** Interpretation text - "This means..."
3. **Tertiary:** Supporting details and chart
4. **Quaternary:** Methodology explanation (collapsible)

---

## Sources

### Authoritative (HIGH Confidence)
- [Nielsen Norman Group: 12 Design Recommendations for Calculator and Quiz Tools](https://www.nngroup.com/articles/recommendations-calculator/)
- [Nielsen Norman Group: Wizards Definition and Design Recommendations](https://www.nngroup.com/articles/wizards/)
- [U.S. Web Design System: Step Indicator](https://designsystem.digital.gov/components/step-indicator/)
- [WebAIM: Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
- [W3C WAI: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)

### Credible (MEDIUM Confidence)
- [Smashing Magazine: A Complete Guide To Live Validation UX](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
- [Baymard Institute: Usability Testing of Inline Form Validation](https://baymard.com/blog/inline-form-validation)
- [Material Design: Steppers](https://m1.material.io/components/steppers.html)
- [PatternFly: Wizard Design Guidelines](https://www.patternfly.org/components/wizard/design-guidelines/)
- [LogRocket: Form Validation UX](https://blog.logrocket.com/ux-design/ux-form-validation-inline-after-submission/)
- [Eleken: Wizard UI Pattern](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [Webstacks: Multi-Step Form Best Practices](https://www.webstacks.com/blog/multi-step-form)

### Supporting (LOW Confidence - Verify Before Implementing)
- Various Medium articles on contextual help and tooltips
- Dribbble examples for visual patterns
- LinkedIn articles on hover states
