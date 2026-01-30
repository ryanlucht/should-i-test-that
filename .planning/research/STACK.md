# Technology Stack

**Project:** Should I Test That? - A/B Test Decision-Value Calculator
**Researched:** 2026-01-29
**Overall Confidence:** HIGH

## Executive Summary

For a client-side statistical calculator with wizard UI and interactive charts, the 2025 standard stack is:
- **Vite + React 19 + TypeScript** for the core application
- **Recharts** for distribution visualizations (PDF/CDF curves)
- **jStat** for statistical computations
- **Tailwind CSS + shadcn/ui** for Datadog-inspired styling
- **Zustand** for wizard state management
- **Vitest** for testing

This stack prioritizes developer experience, performance, and the specific needs of statistical visualization. All recommendations are verified against current npm versions as of January 2026.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React | ^19.2.4 | UI framework | Industry standard, excellent ecosystem, React 19 is stable with improved performance | HIGH |
| TypeScript | ^5.9.3 | Type safety | Essential for mathematical code auditability; catches errors at compile time | HIGH |
| Vite | ^7.3.1 | Build tool | De facto standard replacing CRA; instant HMR, native ESM, excellent DX | HIGH |

**Rationale:** Vite + React + TypeScript is the uncontested 2025 standard for new React projects. Create React App is deprecated. Vite's near-instant startup and hot module replacement make iterative UI development fast.

**Template command:**
```bash
npm create vite@latest should-i-test-that -- --template react-swc-ts
```

Use `react-swc-ts` over `react-ts` for faster compilation (SWC is a Rust-based compiler).

---

### Charting Library

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Recharts | ^3.7.0 | Distribution charts | Best balance of ease-of-use and customization for statistical visualizations | HIGH |

**Why Recharts over alternatives:**

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Recharts** | Simple API, good defaults, responsive, active community (24.8K stars) | Less customizable than Visx | **RECOMMENDED** for this use case |
| Victory | Cross-platform, accessible, modular | Larger bundle, more boilerplate | Good alternative |
| Visx | Maximum flexibility, smallest bundle | Steep learning curve, requires D3 knowledge | Overkill for PDF/CDF curves |
| Nivo | Beautiful defaults, many chart types | Heavier, less control over low-level rendering | Not needed |
| Chart.js | Most popular overall | Not React-native, wrapper feels awkward | Pass |

**Why Recharts specifically for statistical distributions:**
- Line/Area charts work perfectly for PDF/CDF curves
- Built-in responsiveness handles window resizing
- Composable components (`<LineChart>`, `<Area>`, `<ReferenceLine>`) match our needs
- Good TypeScript support
- Easy to add tooltips showing exact probability values

**Example use case (PDF curve):**
```tsx
<AreaChart data={distributionPoints}>
  <Area type="monotone" dataKey="pdf" fill="#8884d8" />
  <ReferenceLine x={currentValue} stroke="red" />
</AreaChart>
```

---

### Statistical Computation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| jStat | ^1.9.6 | PDF, CDF, inverse functions | Most complete distribution coverage for our needs | HIGH |

**Why jStat:**
- Provides PDF, CDF, inverse, mean, mode, variance for: normal, beta, gamma, t, F, chi-squared, binomial, Poisson
- The inverse functions are critical for computing confidence intervals and EVPI/EVSI
- 410K weekly npm downloads, proven in production
- TypeScript types available via `@types/jstat`

**Alternative considered:**

| Library | Version | Pros | Cons |
|---------|---------|------|------|
| simple-statistics | ^7.8.8 | Simpler API, more stars (3.5K), better docs | Fewer distributions, no inverse functions for all distributions |

**Verdict:** jStat has the specific distribution functions (beta, normal inverse) required for decision-value calculations. simple-statistics is easier but lacks coverage.

**Note:** jStat hasn't had a major update in 3 years (last: 1.9.6), but the statistical functions are mathematically stable. Flag for validation if edge cases arise.

---

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | ^4.1.18 | Utility-first CSS | Fastest styling for Datadog-inspired UI; design system via config | HIGH |
| shadcn/ui | latest | Component primitives | Copy-paste components built on Radix; full control, no lock-in | HIGH |
| Radix UI | ^1.2.x | Accessible primitives | Powers shadcn/ui; handles a11y correctly | HIGH |
| Lucide React | ^0.563.0 | Icons | Clean, consistent icon set; works with shadcn/ui | HIGH |

**Why Tailwind + shadcn/ui for Datadog-inspired design:**
- Datadog's DRUIDS design system emphasizes: high contrast, clean layouts, dark mode support
- Tailwind's utility classes enable rapid iteration on spacing, colors, typography
- shadcn/ui provides pre-built components (buttons, inputs, tooltips, progress bars) that we own and can customize
- No runtime CSS-in-JS overhead (unlike styled-components or Emotion)

**Datadog-inspired color strategy:**
- Use Tailwind's gray scale as foundation
- Define custom colors in `tailwind.config.js` for brand consistency
- Support both light and dark modes via CSS variables (shadcn/ui pattern)

**Not recommended:**
- CSS Modules: More boilerplate, less design consistency
- styled-components: Runtime overhead, not aligned with current React trends
- Material UI / Ant Design: Too opinionated, harder to achieve Datadog aesthetic

---

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | ^5.0.10 | Wizard state | Lightweight (<1kb), no boilerplate, excellent performance | HIGH |

**Why Zustand for wizard state:**
- Multi-step wizards need shared state across steps
- Zustand stores state outside React tree - no re-render cascades
- Perfect for: current step, form values, computed results, chart data
- DevTools integration for debugging

**Alternative analysis:**

| Solution | Pros | Cons | Verdict |
|----------|------|------|---------|
| React Context | Built-in, no deps | Re-render issues, boilerplate for complex state | Fine for theme/locale only |
| Redux Toolkit | Mature, powerful | Overkill for this app size | Pass |
| Jotai | Atomic, composable | Similar to Zustand, less popular | Either works |
| **Zustand** | Tiny, simple, fast | None significant | **RECOMMENDED** |

**Wizard state structure example:**
```tsx
interface WizardState {
  step: number;
  inputs: {
    baseline: number;
    mde: number;
    trafficPerDay: number;
    // ...
  };
  results: {
    evpi: number;
    evsi: number;
    // ...
  };
  actions: {
    nextStep: () => void;
    prevStep: () => void;
    setInput: (key: string, value: number) => void;
  };
}
```

---

### Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | ^4.0.18 | Test runner | Native Vite integration, Jest-compatible API, 4x faster | HIGH |
| @testing-library/react | ^16.3.2 | Component testing | Standard for React, tests user behavior not implementation | HIGH |
| @testing-library/jest-dom | latest | DOM assertions | `toBeInTheDocument()`, `toHaveTextContent()`, etc. | HIGH |
| @testing-library/user-event | latest | User simulation | Realistic user interactions | HIGH |
| jsdom | latest | DOM environment | Required for Vitest React testing | HIGH |

**Why Vitest over Jest:**
- Native Vite integration (shared config)
- 4x faster cold starts
- 30% lower memory usage
- Jest-compatible API (easy migration if needed)
- Native ESM support

**Test configuration (`vite.config.ts`):**
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

---

### PNG Export (Nice-to-Have)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| html2canvas | ^1.4.1 | Export charts to PNG | Most popular solution, 2.6M weekly downloads | MEDIUM |

**Why html2canvas:**
- Works with any DOM element, including Recharts SVG charts
- Simple API: `html2canvas(element).then(canvas => ...)`
- Can trigger download or copy to clipboard

**Limitations to know:**
- Only captures visible elements
- Horizontal layouts can have issues
- Complex DOM may need workarounds

**Alternative:** `recharts-to-png` (wrapper around html2canvas) - but had breaking changes with Recharts 3.x. Recommend using html2canvas directly.

---

### Web Workers (For Monte Carlo)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vite Worker Import | built-in | Heavy computation | Native Vite support via `?worker` suffix | HIGH |

**Why Web Workers for Monte Carlo:**
- Monte Carlo simulations (1000+ iterations) block the main thread
- Target: 500ms-2s computation time = definite UI jank without workers
- Vite has native worker support: `import Worker from './monte-carlo.worker?worker'`

**Pattern:**
```typescript
// monte-carlo.worker.ts
self.onmessage = (e) => {
  const result = runSimulation(e.data);
  self.postMessage(result);
};

// Component
const worker = new Worker();
worker.postMessage(inputs);
worker.onmessage = (e) => setResults(e.data);
```

---

## Installation

```bash
# Initialize project
npm create vite@latest should-i-test-that -- --template react-swc-ts
cd should-i-test-that

# Core dependencies
npm install react react-dom zustand recharts jstat

# Styling (Tailwind 4.x simplified setup)
npm install tailwindcss @tailwindcss/vite

# shadcn/ui setup (after Tailwind)
npx shadcn@latest init

# Icons
npm install lucide-react

# PNG export (nice-to-have)
npm install html2canvas

# Dev dependencies
npm install -D typescript @types/react @types/react-dom @types/jstat
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
npm install -D prettier eslint-config-prettier
```

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| Create React App | Deprecated, slow, no longer maintained |
| Next.js | Overkill for client-side-only app; adds server complexity we don't need |
| D3.js directly | Too low-level; Recharts wraps it with better DX |
| Chart.js | Not React-native; wrapper is awkward |
| Redux | Overkill for this app's state complexity |
| styled-components | Runtime overhead, declining usage in 2025 |
| CSS Modules | More boilerplate, less design consistency than Tailwind |
| Jest | Vitest is faster and integrates better with Vite |
| Math.js | General-purpose; jStat is better for statistical distributions |

---

## Version Pinning Strategy

**Pin major versions, allow minor/patch updates:**
```json
{
  "dependencies": {
    "react": "^19.2.4",
    "recharts": "^3.7.0",
    "jstat": "^1.9.6",
    "zustand": "^5.0.10",
    "tailwindcss": "^4.1.18"
  }
}
```

**Rationale:** Major versions (^) allow bug fixes while preventing breaking changes.

---

## Sources

### Verified via npm (HIGH confidence)
- React 19.2.4: `npm view react version`
- Vite 7.3.1: `npm view vite version`
- Recharts 3.7.0: `npm view recharts version`
- jStat 1.9.6: `npm view jstat version`
- Zustand 5.0.10: `npm view zustand version`
- Tailwind CSS 4.1.18: `npm view tailwindcss version`
- Vitest 4.0.18: `npm view vitest version`
- html2canvas 1.4.1: `npm view html2canvas version`

### Official Documentation (HIGH confidence)
- [Vite Getting Started](https://vite.dev/guide/)
- [shadcn/ui](https://ui.shadcn.com/)
- [jStat Documentation](https://jstat.github.io/all.html)
- [Datadog DRUIDS Color System](https://druids.datadoghq.com/foundations/color)

### Community Research (MEDIUM confidence)
- [LogRocket: Best React Chart Libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [DEV: React State Management 2025 - Context vs Zustand](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m)
- [Medium: Vitest vs Jest 2025](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9)
- [DEV: React Web Workers for Heavy Computation](https://dev.to/hexshift/how-to-use-react-with-web-workers-for-offloading-heavy-computation-4p0m)
- [npm-compare: jstat vs simple-statistics](https://npm-compare.com/jstat,mathjs,simple-statistics)

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Core Framework (Vite/React/TS) | HIGH | Verified versions, industry consensus |
| Charting (Recharts) | HIGH | Verified version, fits use case well |
| Statistics (jStat) | HIGH | Verified version, has required functions |
| Styling (Tailwind/shadcn) | HIGH | Verified versions, well-documented |
| State (Zustand) | HIGH | Verified version, clear fit for wizard pattern |
| Testing (Vitest) | HIGH | Verified version, native Vite integration |
| PNG Export (html2canvas) | MEDIUM | Works but has known limitations |
| Web Workers | HIGH | Native Vite support, standard pattern |

---

## Open Questions for Implementation

1. **jStat types:** Verify `@types/jstat` is current and complete for our distribution needs
2. **Recharts + TypeScript:** Confirm typing works well with jStat data structures
3. **shadcn/ui theming:** Will need to define Datadog-inspired color tokens
4. **Web Worker complexity:** May need `comlink` library if worker communication becomes complex
