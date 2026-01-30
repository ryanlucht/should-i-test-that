# Domain Pitfalls

**Domain:** Calculator/Wizard Web App (A/B Test Decision-Value Calculator)
**Researched:** 2026-01-29
**Confidence:** MEDIUM (based on multiple concordant web sources; domain-specific patterns well-documented)

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Heavy Computation Blocking the UI Thread

**What goes wrong:** Monte Carlo simulations (500ms-2s) run on the main thread, freezing the entire UI. Users see unresponsive buttons, janky scrolling, and may think the app has crashed. On mobile/low-end devices, this triggers browser "page unresponsive" warnings.

**Why it happens:** JavaScript is single-threaded. Developers test on fast machines and don't notice the freeze, or they assume React's async rendering handles it (it doesn't for CPU-bound work).

**Consequences:**
- Users abandon the calculator mid-computation
- Worst on mobile where users expect immediate touch feedback
- Charts freeze mid-render, displaying incomplete/corrupted visualizations

**Prevention:**
- Move Monte Carlo computation to a Web Worker from day one
- Use Vite's built-in worker support (`new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`)
- Add loading states with progress indicators for long computations
- Consider `requestIdleCallback` for lighter computations (<50ms)

**Detection:**
- Test on a throttled CPU (Chrome DevTools > Performance > 4x slowdown)
- Monitor for computations exceeding 50ms on the main thread
- Watch for "Long Task" warnings in Chrome DevTools

**Phase to address:** Phase 1 (Core Architecture) - Worker infrastructure must be foundational

**Sources:** [Why Your React App Feels Slow: Fixing Performance with Web Workers](https://dev.to/pockit_tools/why-your-react-app-feels-slow-fixing-performance-with-web-workers-439h), [React + Web Workers](https://medium.com/@ektakumari8872/react-web-workers-handle-heavy-tasks-without-blocking-the-ui-%EF%B8%8F-1745a3125419)

---

### Pitfall 2: Chart Memory Leaks on Re-render

**What goes wrong:** Every time chart data updates (which happens frequently with live-updating distribution charts), a new chart instance is created without destroying the old one. Memory usage grows ~1MB every few minutes, eventually crashing the browser tab.

**Why it happens:** Chart libraries (ECharts, Chart.js, Recharts) require explicit cleanup. React's `useEffect` cleanup function is either missing or incorrectly implemented. Context API triggers full component tree re-renders, creating cascading chart recreations.

**Consequences:**
- Browser tab crashes after extended use (7+ days or intense usage)
- App becomes progressively slower
- Users on lower-memory devices (tablets, older phones) hit issues faster

**Prevention:**
- Always implement `useEffect` cleanup that calls chart.dispose() or equivalent
- Use refs to store chart instances, not state
- Consider Zustand over Context API for chart state (avoids tree-wide re-renders)
- Implement chart instance pooling for frequently updating charts
- Use React.memo() on chart wrapper components

**Detection:**
- Chrome DevTools > Memory tab: watch for "sawtooth" pattern that doesn't return to baseline
- Monitor JS Heap size during extended sessions
- Test by rapidly changing inputs 50+ times

**Phase to address:** Phase 2 (Charts) - Build cleanup patterns into initial chart implementation

**Sources:** [Memory Leaks in JavaScript & React](https://dev.to/fazal_mansuri_/memory-leaks-in-javascript-react-the-hidden-enemy-74p), [Building a High-Performance Real-Time Chart in React](https://dev.to/ibtekar/building-a-high-performance-real-time-chart-in-react-lessons-learned-ij7)

---

### Pitfall 3: Wizard State Loss on Navigation

**What goes wrong:** Users fill out Steps 1-3, then click browser back button or accidentally navigate away. When they return, all entered data is gone. Even worse: navigating between wizard steps loses previous step data if state isn't lifted properly.

**Why it happens:** Form state stored in individual step components is destroyed when step unmounts. Developers test linear "next, next, next" flows but not back-navigation or page refresh scenarios.

**Consequences:**
- Furious users who spent time entering complex financial inputs
- High abandonment rates
- Support tickets from confused users

**Prevention:**
- Lift ALL wizard state to a parent provider (Zustand store or lifted React state)
- Persist critical inputs to sessionStorage for refresh resilience
- Sync wizard step with URL (e.g., `/calculator?step=3`) for browser back button support
- Test "chaotic navigation" flows: back, forward, refresh, jump to arbitrary step

**Detection:**
- Manual testing: fill form, click browser back, click forward - is data still there?
- Test: fill form, refresh page - any recovery possible?
- Watch for state stored in step components vs. centralized store

**Phase to address:** Phase 1 (Wizard Infrastructure) - State architecture must be right from the start

**Sources:** [Managing State in a Multi-Step Form](https://birdeatsbug.com/blog/managing-state-in-a-multi-step-form), [Build a Multistep Form With React Hook Form](https://claritydev.net/blog/build-a-multistep-form-with-react-hook-form)

---

### Pitfall 4: Inaccessible Charts for Screen Reader Users

**What goes wrong:** Distribution charts render as decorative SVGs with no semantic meaning. Screen reader users get zero information from the primary visual output of the calculator. They see results but have no way to understand the distribution shape or confidence intervals.

**Why it happens:** Chart accessibility is an afterthought. Most chart library examples don't include ARIA attributes. Developers assume "it's a chart, screen readers can't use it anyway."

**Consequences:**
- App fails WCAG 2.2 accessibility requirements
- Excludes users with visual impairments
- Potential legal liability in enterprise/government contexts

**Prevention:**
- Use chart libraries with built-in accessibility (AG Charts, Highcharts with accessibility module)
- Add `role="img"` to SVG with descriptive `aria-label` summarizing the distribution
- Provide a text-based summary below charts: "The expected value distribution ranges from $X to $Y with median at $Z"
- Use pattern `<svg role="img" aria-labelledby="title desc">` with `<title>` and `<desc>` elements
- Ensure color contrast meets WCAG requirements for any text/annotations

**Detection:**
- Test with screen reader (VoiceOver, NVDA)
- Run axe-core accessibility audit
- Ask: "What does a blind user learn from this chart?"

**Phase to address:** Phase 2 (Charts) - Design accessibility approach before implementing charts

**Sources:** [Creating Accessible SVG Charts](https://accessibility-test.org/blog/compliance/creating-accessible-svg-charts-and-infographics/), [AG Charts Accessibility](https://www.ag-grid.com/charts/react/accessibility/)

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 5: Validation Timing That Frustrates Users

**What goes wrong:** Aggressive inline validation shows errors while users are still typing. OR validation only runs on submit, leaving users to fix 5+ errors at once after they thought they were done. Both create frustration.

**Why it happens:** No clear validation strategy chosen upfront. Copy-pasting validation patterns without understanding UX implications.

**Prevention:**
- Adopt "reward early, punish late" pattern:
  - Show success checkmarks immediately when input becomes valid
  - Show errors only on blur (when user leaves field) or on explicit "Next" action
- Validate empty required fields only on step navigation, not on blur
- Never disable the Next/Submit button - let users click it to see what's missing
- Provide error summary at top with anchor links to problem fields

**Detection:**
- Watch for red error messages appearing while still typing
- Check if Next button is ever disabled
- Test: can a user see ALL their errors at once?

**Phase to address:** Phase 1 (Wizard Infrastructure) - Establish validation patterns before building forms

**Sources:** [A Complete Guide To Live Validation UX](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/), [The UX of form validation](https://blog.logrocket.com/ux-design/ux-form-validation-inline-after-submission/)

---

### Pitfall 6: Number Input Locale Confusion

**What goes wrong:** The calculator expects "1000.50" but European users enter "1.000,50". Or users type "$1,000" and the number parsing chokes on the dollar sign and comma. Users see unexpected results or cryptic errors.

**Why it happens:** Developers build for their own locale. Number parsing uses simple `parseFloat()` which doesn't handle localized formats.

**Prevention:**
- Use `react-number-format` library for all financial inputs
- Display thousand separators in formatted preview but store raw numbers
- Explicitly show expected format via placeholder: "e.g., 1000.50"
- Strip currency symbols and non-numeric characters before parsing
- Show formatted preview of what the system understood: "Interpreted as: $1,000.50"

**Detection:**
- Enter "1.000,50" (European format) - what happens?
- Enter "$1,000" - does it parse correctly?
- Enter "1e6" (scientific notation) - expected behavior?

**Phase to address:** Phase 1 (Input Components) - Build robust number input component early

**Sources:** [react-number-format](https://s-yadav.github.io/react-number-format/docs/numeric_format/), [A simple compromise: Input number formatting in React](https://tedeh.net/a-simple-compromise-input-number-formatting-in-react/)

---

### Pitfall 7: Wizard Progress Indicator That Confuses

**What goes wrong:** Users can't tell how many steps remain, what each step is about, or whether they can jump back to previous steps. The progress indicator shows step numbers (1, 2, 3...) but not step names. Users feel lost in an endless tunnel.

**Why it happens:** Progress indicators are added as visual decoration without thinking through information architecture. Step titles are generic ("Step 1") instead of descriptive.

**Prevention:**
- Show ALL step names upfront in the progress indicator, not just numbers
- Clearly indicate: current step, completed steps (clickable to return), and future steps
- Use descriptive step titles: "Business Metrics" > "Test Parameters" > "Results"
- For 5 steps, show all 5 - don't hide future steps
- Allow clicking completed steps to jump back (critical for editing)
- Show "Step 3 of 5" text explicitly

**Detection:**
- Ask: "Can a new user tell at step 3 how many steps remain?"
- Check: can user click a completed step to return?
- Are step names descriptive or generic?

**Phase to address:** Phase 1 (Wizard UI) - Design progress indicator with step names before building

**Sources:** [Wizard UI Pattern: When to Use It](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained), [Wizards: Definition and Design Recommendations - NN/G](https://www.nngroup.com/articles/wizards/)

---

### Pitfall 8: Help Text Hidden in Tooltips

**What goes wrong:** Critical context for understanding inputs (e.g., "What is baseline conversion rate?") is buried in hover-only tooltips. Non-technical users who need the help most don't discover it. Tooltips disappear when users need to reference them while typing.

**Why it happens:** Desire for "clean" UI leads to hiding information. Tooltips work for developers who understand the domain but fail for the target users who don't.

**Prevention:**
- Show brief inline help text for complex fields by default, not on hover
- Use expandable "Learn more" sections for detailed explanations
- Tooltips OK for supplementary info, never for required understanding
- For calculations: show the formula or logic with clear variable labels
- Test with someone unfamiliar with A/B testing terminology

**Detection:**
- Hide all tooltips - can a non-technical user still complete the form?
- Does critical info disappear when tooltip dismisses?
- User test: "What does this field mean?" - can they find out without hovering?

**Phase to address:** Phase 1 (Input Design) - Default to visible help text for complex fields

**Sources:** [12 Design Recommendations for Calculator and Quiz Tools - NN/G](https://www.nngroup.com/articles/recommendations-calculator/), [Tooltip Guidelines - NN/G](https://www.nngroup.com/articles/tooltip-guidelines/)

---

### Pitfall 9: Mobile Touch Targets Too Small

**What goes wrong:** Form inputs, buttons, and wizard navigation work fine on desktop but are frustrating on mobile. Touch targets are too close together, causing mis-taps. Number inputs are hard to interact with on small screens.

**Why it happens:** Development/testing happens primarily on desktop. Mobile testing is cursory "does it fit on screen?" rather than "is it easy to use?"

**Prevention:**
- Minimum touch target: 44x44px (WCAG), prefer 48x48px
- Adequate spacing between tappable elements (minimum 8px gap)
- Consider larger input fields on mobile
- Test on actual mobile devices, not just browser device emulator
- For number inputs, consider custom numeric keypad vs. native input

**Detection:**
- Test on real phone (not emulator): can you tap without mis-taps?
- Measure touch targets: are any below 44x44px?
- Try completing the full flow on mobile - is it frustrating?

**Phase to address:** Phase 1 (Component Library) - Define touch-target sizes in component system

**Sources:** [Calculator Design - UXPin](https://www.uxpin.com/studio/blog/calculator-design/)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 10: Missing Keyboard Navigation in Wizard

**What goes wrong:** Power users who prefer keyboard can't Tab through the wizard efficiently. Focus gets lost after step transitions. Enter key doesn't advance to next step.

**Prevention:**
- Ensure logical Tab order through all form fields
- Move focus to first field of new step on step transition
- Enter key on last field should trigger "Next" (with careful validation)
- Escape key should not accidentally close/reset the wizard

**Detection:**
- Complete entire wizard using only keyboard
- Check: where does focus go after clicking "Next"?
- Test: does Enter on a field do something sensible?

**Phase to address:** Phase 1 (Wizard Infrastructure) - Build keyboard navigation into step transitions

---

### Pitfall 11: Wizard Without Cancel/Exit Confirmation

**What goes wrong:** User accidentally clicks outside the wizard or hits Escape, losing 5 minutes of entered data. No "are you sure?" prompt.

**Prevention:**
- Add confirmation dialog on destructive navigation away
- Use `beforeunload` event to warn on page close/refresh
- Consider auto-saving draft state

**Detection:**
- Try to navigate away with data entered - any warning?
- Close browser tab - any warning?

**Phase to address:** Phase 1 (Wizard Infrastructure) - Add exit guards early

---

### Pitfall 12: Charts Not Responsive

**What goes wrong:** Charts render at fixed dimensions, overflowing on mobile or looking tiny on large screens. Legend overlaps chart area on narrow screens.

**Prevention:**
- Use responsive chart configuration from chart library
- Move legend to bottom/top on narrow screens
- Test at multiple breakpoints (mobile, tablet, desktop, ultrawide)
- Consider hiding less-critical chart elements on mobile

**Detection:**
- Resize browser to phone width - does chart adapt?
- Check legend position at narrow widths

**Phase to address:** Phase 2 (Charts) - Configure responsive behavior during chart implementation

---

### Pitfall 13: No Loading State During Computation

**What goes wrong:** User clicks "Calculate" and nothing visible happens for 1-2 seconds. They click again, potentially triggering duplicate computations or navigating away thinking it's broken.

**Prevention:**
- Show loading spinner or skeleton immediately on action
- Consider progress bar for longer computations (Monte Carlo can show % complete)
- Disable the button with visible loading state during computation
- Show estimated time if computation is predictably long

**Detection:**
- Click Calculate - is there immediate visual feedback?
- Long computation - does user know it's working?

**Phase to address:** Phase 1 (UX Infrastructure) - Define loading patterns before building features

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Wizard Infrastructure | State loss on navigation | Design centralized state store (Zustand) from day 1 |
| Wizard Infrastructure | Validation frustration | Adopt "reward early, punish late" pattern explicitly |
| Input Components | Number locale confusion | Use react-number-format for all numeric inputs |
| Input Components | Help text discovery | Default to inline help, not hover tooltips |
| Chart Implementation | Memory leaks | Require useEffect cleanup in all chart components |
| Chart Implementation | Accessibility gaps | Choose accessible chart library (AG Charts/Highcharts) |
| Monte Carlo Engine | UI blocking | Use Web Worker from the start |
| Mobile Adaptation | Touch targets | Define 48px minimum in component system |

---

## "Looks Done But Isn't" Checklist

These are the things that appear complete but will cause problems if not explicitly addressed:

| Item | Why It Seems Done | Why It Isn't | Test |
|------|-------------------|--------------|------|
| Wizard navigation | Forward/next works | Back button loses state | Fill step 1-3, click back, click forward |
| Number inputs | Values display correctly | European locale breaks parsing | Enter "1.000,50" |
| Charts render | Visuals appear correct | No screen reader support | Test with VoiceOver/NVDA |
| Calculations work | Results appear | Main thread blocks on mobile | Test on 4x CPU throttle |
| Progress indicator | Steps are numbered | Users don't know what's coming | Ask: "How many steps?" at step 2 |
| Form validation | Errors show | They show while typing (annoying) | Type slowly, watch for premature errors |
| Mobile layout | It fits on screen | Touch targets too small to tap | Complete flow on real phone |
| Long session | Works in quick tests | Memory leaks after 10 minutes | Run for 30 minutes with frequent updates |

---

## Sources

### Wizard UX
- [Wizard UI Pattern: When to Use It](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [Wizards: Definition and Design Recommendations - NN/G](https://www.nngroup.com/articles/wizards/)
- [Managing State in a Multi-Step Form](https://birdeatsbug.com/blog/managing-state-in-a-multi-step-form)
- [Build a Multistep Form With React Hook Form](https://claritydev.net/blog/build-a-multistep-form-with-react-hook-form)
- [8 Best Multi-Step Form Examples in 2025](https://www.webstacks.com/blog/multi-step-form)

### Form Validation
- [A Complete Guide To Live Validation UX - Smashing Magazine](https://www.smashingmagazine.com/2022/09/inline-validation-web-forms-ux/)
- [The UX of form validation - LogRocket](https://blog.logrocket.com/ux-design/ux-form-validation-inline-after-submission/)
- [Accessible Form Validation Best Practices](https://www.uxpin.com/studio/blog/accessible-form-validation-best-practices/)

### Performance & Web Workers
- [Why Your React App Feels Slow: Fixing Performance with Web Workers](https://dev.to/pockit_tools/why-your-react-app-feels-slow-fixing-performance-with-web-workers-439h)
- [React + Web Workers - Handle Heavy Tasks Without Blocking the UI](https://medium.com/@ektakumari8872/react-web-workers-handle-heavy-tasks-without-blocking-the-ui-%EF%B8%8F-1745a3125419)
- [Web Workers in JavaScript: Limits, Usage & Best Practices (2025)](https://medium.com/@QuarkAndCode/web-workers-in-javascript-limits-usage-best-practices-2025-a365b36beaa2)

### Memory Leaks & Charts
- [Memory Leaks in JavaScript & React - The Hidden Enemy](https://dev.to/fazal_mansuri_/memory-leaks-in-javascript-react-the-hidden-enemy-74p)
- [Building a High-Performance Real-Time Chart in React](https://dev.to/ibtekar/building-a-high-performance-real-time-chart-in-react-lessons-learned-ij7)
- [How to Fix Memory Leaks in React Applications](https://www.freecodecamp.org/news/fix-memory-leaks-in-react-apps/)

### Accessibility
- [Creating Accessible SVG Charts and Infographics](https://accessibility-test.org/blog/compliance/creating-accessible-svg-charts-and-infographics/)
- [AG Charts Accessibility](https://www.ag-grid.com/charts/react/accessibility/)
- [React Aria - Accessibility](https://react-spectrum.adobe.com/react-aria/accessibility.html)
- [Creating Accessible SVGs - Deque](https://www.deque.com/blog/creating-accessible-svgs/)

### Number Formatting
- [react-number-format Documentation](https://s-yadav.github.io/react-number-format/docs/numeric_format/)
- [@react-input/number-format](https://www.npmjs.com/package/@react-input/number-format)

### State Management
- [React State Management in 2025: Context API vs Zustand](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m)
- [State Management in 2025: When to Use Context, Redux, Zustand, or Jotai](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)

### Calculator Testing
- [How To Write Calculator Test Cases](https://testsigma.com/blog/calculator-test-cases/)
- [15+ Test Cases for Calculator: Complete Guide 2025](https://www.botgauge.com/blog/test-cases-calculator-complete-guide)

### Help Text & Tooltips
- [12 Design Recommendations for Calculator and Quiz Tools - NN/G](https://www.nngroup.com/articles/recommendations-calculator/)
- [Tooltip Guidelines - NN/G](https://www.nngroup.com/articles/tooltip-guidelines/)
