# Project Research Summary

**Project:** Should I Test That? - A/B Test Decision-Value Calculator
**Domain:** Statistical Calculator with Multi-Step Wizard UI
**Researched:** 2026-01-29
**Confidence:** HIGH

## Executive Summary

"Should I Test That?" is a client-side statistical calculator that helps product managers determine whether to run an A/B test by calculating Expected Value of Perfect Information (EVPI) and Expected Value of Sample Information (EVSI). Based on research across stack, features, architecture, and pitfalls, the recommended approach is a feature-based React application using modern 2025 patterns: Vite + React 19 + TypeScript + Tailwind CSS + shadcn/ui for the foundation, with Recharts for visualization and jStat for statistical computations. The core challenge is managing wizard state persistence and preventing UI blocking during Monte Carlo simulations.

The architecture should follow a feature-based structure with clear separation between wizard orchestration, calculation logic, and visualization components. Zustand provides lightweight state management for wizard flow, while Web Workers handle heavy computation to keep the UI responsive. The most critical risks are: (1) UI blocking from Monte Carlo simulations - mitigated by using Web Workers from day one, (2) wizard state loss on navigation - solved by centralized state with sessionStorage persistence, and (3) chart memory leaks from improper cleanup - prevented by enforcing useEffect cleanup patterns in all chart components.

User experience research emphasizes the importance of inline validation ("reward early, punish late"), visible help text rather than hidden tooltips, and descriptive step labels in the progress indicator. The calculator must work flawlessly without registration, show results immediately, and provide shareable URLs for collaboration. The mathematical approach is pre-defined in SPEC.md; this research focused exclusively on implementation patterns, UI/UX best practices, and technical architecture.

## Key Findings

### Recommended Stack

The 2025 standard for client-side React calculators is Vite + React 19 + TypeScript with a carefully chosen set of specialized libraries. Vite replaces the deprecated Create React App and offers near-instant HMR and development server startup. React 19 is stable and provides excellent performance for wizard flows. TypeScript is essential for mathematical code auditability, catching type errors at compile time.

**Core technologies:**
- **Vite 7.3.1 + React 19.2.4 + TypeScript 5.9.3**: Build foundation with SWC compiler for fast iteration - this is the uncontested 2025 standard
- **Recharts 3.7.0**: Distribution visualizations (PDF/CDF curves) - best balance of ease-of-use and customization for statistical charts
- **jStat 1.9.6**: Statistical computations (PDF, CDF, inverse functions for normal, beta, gamma distributions) - most complete distribution coverage
- **Tailwind CSS 4.1.18 + shadcn/ui**: Datadog-inspired styling - utility-first CSS with copy-paste components built on Radix UI
- **Zustand 5.0.10**: Wizard state management - lightweight (<1kb), no boilerplate, perfect for multi-step forms
- **Vitest 4.0.18**: Testing - native Vite integration, 4x faster than Jest
- **Web Workers (Vite built-in)**: Monte Carlo computation - prevents UI blocking on heavy calculations

**Version confidence:** All versions verified via npm as of January 2026. HIGH confidence.

**Alternative considerations:**
- Chart.js and Victory were evaluated but Recharts better fits statistical visualization needs
- Redux was considered but overkill for this app's state complexity
- jStat hasn't had major updates in 3 years but statistical functions are mathematically stable

### Expected Features

Wizard UX research reveals clear table stakes vs. differentiators. Missing table stakes makes the product feel incomplete; differentiators set it apart from competitors.

**Must have (table stakes):**
- Progress indicator with descriptive step labels (not just "Step 1, 2, 3")
- Back/Next navigation with validation before advancing
- Data persistence within session (navigating back shouldn't lose data)
- Inline validation with clear error messages (validate on blur, not keystroke)
- Formatted input display (currency with thousands separators, percentage symbols)
- Contextual help text visible by default (not hidden in hover tooltips)
- Prominent, contextualized results display
- Chart tooltips showing exact values on hover
- Responsive chart sizing (mobile to desktop)
- Keyboard navigation with logical tab order
- Leave warning modal to prevent accidental data loss

**Should have (competitive differentiators):**
- **Live result preview**: Results update as inputs change (no submit needed) - low-medium complexity, huge UX win
- **Shareable URL with state**: Encode inputs in URL params for collaboration - medium complexity, high value for PMs sharing with stakeholders
- **Copy results to clipboard**: Quick sharing in Slack/email - low complexity, high utility

**Defer (v2+):**
- Export to PDF/PNG: High complexity, shareable URL covers most needs for MVP
- Comparison mode (side-by-side scenarios): High UI complexity
- Save & resume with account: Requires auth system (LocalStorage provides basic version for MVP)
- Interactive sliders for inputs: Medium complexity, text inputs sufficient for MVP
- Smart industry defaults: Requires research on reasonable defaults per industry

**Anti-features (explicitly avoid):**
- Mandatory registration before results: Kills conversion
- Results only via email: Feels like lead-gen trap
- Validation on every keystroke: Annoying, premature errors
- Hidden critical info in hover tooltips: Mobile users can't access
- Auto-advancing steps: Users feel out of control

### Architecture Approach

Feature-based architecture with clear component boundaries and unidirectional data flow. Separation between wizard orchestration (step management, navigation), calculation logic (pure functions, Web Worker), and visualization (presentational components).

**Major components:**
1. **WizardContainer**: Orchestrates step flow, manages navigation logic, enforces validation before advancing
2. **CalculationEngine**: Manages computation, delegates heavy work to Web Worker, updates results store
3. **Visualization Layer**: Receives transformed chart data as props, handles Recharts lifecycle and cleanup
4. **Shared UI Components**: Form inputs with validation (Zod + React Hook Form), buttons, cards, tooltips from shadcn/ui

**Key patterns to follow:**
- **Wizard State Machine**: Centralize step navigation in custom hook/context that manages current step, validation state, and navigation rules
- **Computation Layering**: Simple math (<10ms) uses useMemo; medium (10-100ms) uses useMemo + debounce; heavy (>100ms) uses Web Worker
- **Presentational/Container Separation**: Chart components receive data as props, don't fetch/compute themselves
- **Form Validation with Zod**: Type-safe validation schemas per wizard step, integrated with React Hook Form
- **Responsive Charts**: Wrap in ResponsiveContainer, memoize data transformations to prevent unnecessary re-renders

**Data flow:**
User Input → Form State → Debounce (300ms) → Calculation Trigger → [useMemo or Web Worker] → Results → Chart Transform → Recharts Components

**Recommended project structure:**
```
src/
├── features/wizard/        # Step orchestration, navigation
├── features/calculator/    # Computation, workers, pure functions
├── features/visualization/ # Charts, results display
├── components/ui/          # shadcn/ui components
├── stores/                 # Zustand store for wizard state
└── utils/                  # Validation, formatting
```

### Critical Pitfalls

Research identified four CRITICAL pitfalls that would cause rewrites if not addressed from day one:

1. **Heavy Computation Blocking UI Thread** - Monte Carlo simulations (500ms-2s) freeze the entire UI if run on main thread. Users see unresponsive buttons, janky scrolling, "page unresponsive" warnings on mobile. **Prevention:** Move Monte Carlo to Web Worker from day one using Vite's built-in support. Add loading states with progress indicators. **Phase to address:** Phase 1 (Core Architecture)

2. **Chart Memory Leaks on Re-render** - Every chart data update creates new instance without destroying old one. Memory grows ~1MB every few minutes, eventually crashing browser tab. **Prevention:** Always implement useEffect cleanup calling chart.dispose(), use refs not state for chart instances, consider Zustand over Context to avoid tree-wide re-renders, wrap charts in React.memo(). **Phase to address:** Phase 2 (Charts)

3. **Wizard State Loss on Navigation** - Browser back button or page refresh loses all entered data. Form state stored in individual step components gets destroyed when step unmounts. **Prevention:** Lift ALL wizard state to Zustand store, persist critical inputs to sessionStorage, sync wizard step with URL for browser back support, test "chaotic navigation" flows. **Phase to address:** Phase 1 (Wizard Infrastructure)

4. **Inaccessible Charts for Screen Readers** - Distribution charts render as decorative SVGs with no semantic meaning. Screen reader users get zero information from primary visual output. **Prevention:** Add role="img" with descriptive aria-label, provide text summary below charts ("ranges from X to Y with median Z"), ensure color contrast meets WCAG requirements. **Phase to address:** Phase 2 (Charts)

**Moderate pitfalls to watch:**
- Validation timing that frustrates users (show errors on blur, not keystroke)
- Number input locale confusion (use react-number-format library)
- Progress indicator that doesn't show step names
- Help text hidden in hover tooltips (make visible by default)
- Touch targets too small on mobile (<44px)

## Implications for Roadmap

Based on combined research findings, the roadmap should follow a foundation-first approach with clear phase dependencies. The architecture dictates build order: shared components before wizard, wizard before calculator, calculator before visualization.

### Suggested Phase Structure (5 phases)

### Phase 1: Foundation & Wizard Infrastructure
**Rationale:** Foundation components and wizard state architecture must be correct from the start. Wizard state loss (Pitfall 3) and validation patterns are foundational concerns that affect every subsequent phase.

**Delivers:**
- Vite + React + TypeScript project setup with SWC
- Shared UI component library (shadcn/ui integration)
- Form components with Zod validation schemas
- Zustand store for wizard state with sessionStorage persistence
- WizardContainer with step navigation and validation
- StepIndicator with descriptive labels
- useDebounce hook for input handling

**Addresses features:**
- Progress indicator with step labels (table stakes)
- Back/Next navigation with validation (table stakes)
- Data persistence within session (table stakes)
- Leave warning modal (table stakes)

**Avoids pitfalls:**
- Pitfall 3: Wizard state loss (centralized Zustand store with persistence)
- Pitfall 5: Validation frustration (adopt "reward early, punish late" pattern)
- Pitfall 7: Confusing progress indicator (descriptive step names from start)

**Research flag:** Standard patterns, skip research-phase (well-documented wizard UX patterns)

---

### Phase 2: Calculator Input Steps (No Computation Yet)
**Rationale:** Build input forms first without calculation logic. This allows parallel development of UI and computation engine, and enables early validation of input UX patterns.

**Delivers:**
- Step 1-4 form components (Basic mode: Baseline, MDE, Traffic; Advanced mode: Cost of Delay)
- Number input components with react-number-format
- Inline validation with clear error messages
- Contextual help text (visible by default, not tooltips)
- Mode switching UI (Basic/Advanced toggle)
- Keyboard navigation between fields

**Addresses features:**
- Formatted input display with currency/percentage (table stakes)
- Inline validation with clear errors (table stakes)
- Contextual help text (table stakes)
- Keyboard navigation (table stakes)
- Mode switching (differentiator)

**Avoids pitfalls:**
- Pitfall 6: Number locale confusion (react-number-format from start)
- Pitfall 8: Help text hidden in tooltips (inline by default)
- Pitfall 10: Missing keyboard navigation (built into form components)

**Research flag:** Standard patterns, skip research-phase (form validation is well-documented)

---

### Phase 3: Calculation Engine with Web Worker
**Rationale:** Computation logic separate from UI. Web Worker infrastructure (Pitfall 1) must be built before Monte Carlo features, not retrofitted later.

**Delivers:**
- Pure calculation functions for EVPI/EVSI (testable, documented)
- jStat integration for statistical distributions
- Web Worker setup for Monte Carlo simulations
- useCalculation hook connecting inputs to computations
- Computation layering (useMemo for simple, Worker for heavy)
- Loading states with progress indicators
- Unit tests for all calculation functions

**Addresses features:**
- Live result preview (differentiator) - computations trigger on debounced input

**Avoids pitfalls:**
- Pitfall 1: UI blocking (Web Worker from day one)
- Pitfall 13: No loading state (spinner + progress bar for Monte Carlo)

**Research flag:** Needs validation - jStat types (@types/jstat) may need verification for our distribution needs

---

### Phase 4: Visualization & Results
**Rationale:** Charts depend on calculation results. Memory leak prevention (Pitfall 2) and accessibility (Pitfall 4) must be designed into initial chart implementation.

**Delivers:**
- Recharts integration with ResponsiveContainer
- DistributionChart (PDF/CDF curves) with useEffect cleanup
- ThresholdChart with reference lines
- ResultsSummary component with contextualized output
- Chart tooltips showing exact probability values
- Accessible chart implementation (aria-labels, text summaries)
- Chart data transformation utilities (memoized)
- Responsive sizing (mobile to desktop)

**Addresses features:**
- Prominent, contextualized results (table stakes)
- Chart tooltips with exact values (table stakes)
- Responsive chart sizing (table stakes)

**Avoids pitfalls:**
- Pitfall 2: Chart memory leaks (useEffect cleanup + React.memo from start)
- Pitfall 4: Chart inaccessibility (aria-labels + text summaries designed in)
- Pitfall 12: Non-responsive charts (ResponsiveContainer from start)

**Research flag:** Standard patterns, skip research-phase (Recharts documentation is comprehensive)

---

### Phase 5: Collaboration & Polish
**Rationale:** Integration and enhancement features come after core functionality works. Shareable URLs depend on complete wizard state management.

**Delivers:**
- Shareable URL with state encoding (URL params)
- Copy results to clipboard functionality
- Mobile responsive polish (touch targets, vertical stepper)
- Dark mode support (via Tailwind CSS variables)
- Final accessibility audit and fixes
- Performance optimization pass
- Cross-browser testing

**Addresses features:**
- Shareable URL (differentiator - high value for collaboration)
- Copy to clipboard (differentiator - quick sharing)
- Mobile touch targets (fixes pitfall 9)

**Avoids pitfalls:**
- Pitfall 9: Small touch targets (44x44px minimum enforced)
- Pitfall 11: No exit confirmation (beforeunload event)

**Research flag:** Standard patterns, skip research-phase (URL encoding and clipboard API well-documented)

---

### Phase Ordering Rationale

**Dependency-based ordering:**
1. Foundation must come first - all features depend on shared components and wizard state architecture
2. Input forms before calculation - enables parallel development and early UX validation
3. Calculation before visualization - charts need data to display
4. Collaboration features last - depend on complete wizard flow and results

**Risk mitigation ordering:**
- Critical pitfalls (1, 2, 3) addressed in early phases (1-4)
- Web Worker infrastructure built in Phase 3 before Monte Carlo features needed
- Chart cleanup patterns enforced in Phase 4 before memory leak detection becomes difficult

**Grouping rationale:**
- Phase 1: All foundational infrastructure together
- Phase 2: All input concerns together (validation, formatting, help text)
- Phase 3: All computation concerns together (pure functions, workers, loading states)
- Phase 4: All visualization concerns together (charts, results display, accessibility)
- Phase 5: All integration and polish together (sharing, responsive, cross-browser)

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Calculation):** Verify @types/jstat completeness for beta, normal, and other distributions. jStat hasn't had major update in 3 years - confirm it handles our edge cases (extreme confidence intervals, very small effect sizes).

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Wizard UX patterns well-documented (Nielsen Norman Group, multiple sources)
- **Phase 2:** Form validation patterns well-documented (Smashing Magazine, LogRocket)
- **Phase 4:** Recharts documentation comprehensive, accessibility patterns established
- **Phase 5:** URL encoding and clipboard API well-documented

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm; stack choices backed by multiple concordant sources; Vite/React/TypeScript is industry standard |
| Features | HIGH | Based on authoritative sources (Nielsen Norman Group) plus community consensus; clear table stakes vs. differentiators |
| Architecture | HIGH | Feature-based structure and wizard patterns well-documented; multiple sources agree on component boundaries |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls backed by multiple sources; moderate pitfalls based on UX research; some domain-specific pitfalls inferred |

**Overall confidence:** HIGH

Research was comprehensive across all four dimensions. Stack recommendations verified with npm versions. Feature expectations based on authoritative UX research (Nielsen Norman Group) plus community consensus. Architecture patterns established with multiple concordant sources. Pitfalls identified from both general React/wizard best practices and domain-specific calculator patterns.

### Gaps to Address

**jStat edge cases:** While jStat has the required distribution functions, its maturity (3 years without major update) raises questions about edge case handling. During Phase 3 planning, validate:
- Inverse normal/beta functions with extreme percentiles (0.001, 0.999)
- Behavior with very small effect sizes or sample sizes
- Numerical stability for our specific use cases

**Chart library final choice:** Recharts is recommended but during Phase 4 planning, verify:
- Accessibility module completeness (aria-label support for all chart types)
- Performance with 100+ data points updating live
- Memory cleanup patterns with React 19 (confirm no breaking changes)

**Mobile performance:** Research focused on desktop patterns. During Phase 5, conduct actual device testing to validate:
- Web Worker performance on mid-range mobile devices
- Chart rendering performance on mobile
- Touch target sizing in practice (44px minimum may need adjustment based on actual usage)

**URL encoding limits:** Shareable URL feature (Phase 5) needs validation of:
- Maximum URL length with all inputs encoded (browser limits ~2048 chars)
- Handling of malformed/invalid URL params gracefully

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- npm registry (versions verified January 2026): react@19.2.4, vite@7.3.1, recharts@3.7.0, jstat@1.9.6, zustand@5.0.10, tailwindcss@4.1.18, vitest@4.0.18
- Vite official docs: https://vite.dev/guide/
- shadcn/ui official: https://ui.shadcn.com/
- jStat documentation: https://jstat.github.io/all.html
- Recharts GitHub: https://github.com/recharts/recharts

**Feature Research:**
- Nielsen Norman Group: 12 Design Recommendations for Calculator and Quiz Tools
- Nielsen Norman Group: Wizards Definition and Design Recommendations
- U.S. Web Design System: Step Indicator component
- WebAIM: Keyboard Accessibility
- W3C WAI: Developing a Keyboard Interface

**Architecture Research:**
- Robin Wieruch: React Folder Structure in 5 Steps (2025)
- Bulletproof React: Project Structure
- patterns.dev: Container/Presentational Pattern
- developerway.com: Debouncing in React

### Secondary (MEDIUM confidence)

**Stack Research:**
- LogRocket: Best React Chart Libraries 2025
- DEV Community: React State Management 2025 - Context vs Zustand
- Medium: Vitest vs Jest 2025
- DEV Community: React with Web Workers for Heavy Computation

**Feature Research:**
- Smashing Magazine: Complete Guide To Live Validation UX
- Baymard Institute: Usability Testing of Inline Form Validation
- Material Design: Steppers
- PatternFly: Wizard Design Guidelines
- Eleken: Wizard UI Pattern Explained

**Architecture Research:**
- Medium: Writing a Wizard in React (Lee Gillentine)
- Doctolib: How to Build a Smart Multi-Step Form in React
- DEV Community: Context API vs Zustand 2025
- Makers Den: State Management Trends 2025

**Pitfalls Research:**
- DEV: Why Your React App Feels Slow - Web Workers
- DEV: Memory Leaks in JavaScript & React
- Smashing Magazine: Live Validation UX
- accessibility-test.org: Creating Accessible SVG Charts
- AG Charts: Accessibility documentation
- react-number-format documentation

### Tertiary (LOW confidence - verify before implementing)

- Various Medium articles on contextual help and tooltip patterns
- Dribbble examples for visual design patterns
- LinkedIn articles on hover states and micro-interactions

---

*Research completed: 2026-01-29*
*Ready for roadmap: yes*
