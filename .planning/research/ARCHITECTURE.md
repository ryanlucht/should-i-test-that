# Architecture Patterns

**Domain:** Client-side React calculator app with wizard flow and charts
**Researched:** 2026-01-29
**Confidence:** HIGH (multiple sources, well-established patterns)

## Recommended Architecture

A feature-based architecture with clear separation between wizard orchestration, computation logic, and visualization components.

```
src/
├── app/                      # Application shell
│   ├── App.tsx              # Root component, providers
│   └── routes.tsx           # Route definitions (if needed)
│
├── features/                 # Feature-based modules
│   ├── wizard/              # Wizard orchestration
│   │   ├── components/      # WizardContainer, StepIndicator, Navigation
│   │   ├── hooks/           # useWizard, useWizardNavigation
│   │   ├── context/         # WizardContext (step state, form data)
│   │   └── types/           # WizardStep, WizardState types
│   │
│   ├── calculator/          # Core calculation feature
│   │   ├── components/      # Step forms (BasicInputs, AdvancedInputs, etc.)
│   │   ├── hooks/           # useCalculation, useComputedResults
│   │   ├── workers/         # Web Worker for heavy math
│   │   ├── utils/           # Calculation functions (pure)
│   │   └── types/           # CalculatorInputs, CalculatorResults
│   │
│   └── visualization/       # Charts and results display
│       ├── components/      # DistributionChart, ThresholdChart, ResultsSummary
│       ├── hooks/           # useChartData (transforms calc results for charts)
│       └── types/           # ChartData types
│
├── components/              # Shared UI components
│   ├── ui/                  # Buttons, Cards, Inputs, Tooltips
│   └── forms/               # Form field wrappers (with validation)
│
├── hooks/                   # Shared hooks
│   └── useDebounce.ts       # Debouncing for live calculations
│
├── lib/                     # Configured libraries
│   └── recharts.ts          # Recharts wrapper/config if needed
│
├── stores/                  # Global state (if using Zustand)
│   └── calculatorStore.ts   # Persisted wizard inputs + results
│
├── types/                   # Shared TypeScript types
│   └── index.ts
│
└── utils/                   # Shared utilities
    └── validation.ts        # Zod schemas
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `App` | Provider setup, layout shell | WizardContainer |
| `WizardContainer` | Step orchestration, navigation logic | Step components, WizardContext |
| `StepIndicator` | Visual progress display | WizardContext (read-only) |
| `Step1-5 Components` | Form inputs for each wizard step | WizardContext, Form hooks |
| `CalculationEngine` | Orchestrates computation, manages Web Worker | Web Worker, results store |
| `DistributionChart` | Renders probability distributions | Receives data via props |
| `ThresholdChart` | Renders threshold visualization | Receives data via props |
| `ResultsSummary` | Displays calculated recommendations | Receives results via props |

### Data Flow

```
User Input → Form State → Debounce (300ms) → Calculation Trigger
                                                    ↓
                                            [Main Thread?]
                                                    ↓
                              YES (simple) ─→ useMemo calculation
                              NO (complex) ─→ Web Worker
                                                    ↓
                                            Calculation Results
                                                    ↓
                              ┌──────────────────────┴──────────────────────┐
                              ↓                                              ↓
                    Chart Data Transform                           Results Summary
                              ↓                                              ↓
                    Recharts Components                            Decision Display
```

**Data flow direction:** Unidirectional, top-down.
- Wizard context holds form state
- Calculation hook reads context, produces results
- Chart components receive transformed data as props
- No upward data flow except through callbacks (user input)

## Patterns to Follow

### Pattern 1: Wizard State Machine

**What:** Centralize wizard navigation logic in a custom hook or context that manages current step, validation state, and navigation rules.

**When:** Multi-step forms with conditional steps or validation between steps.

**Why:** Keeps step logic centralized and testable. Each step component only cares about its own inputs.

**Example:**
```typescript
// hooks/useWizard.ts
interface WizardState {
  currentStep: number;
  totalSteps: number;
  formData: Record<string, unknown>;
  canProceed: boolean;
}

function useWizard(steps: WizardStepConfig[]) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const goNext = useCallback(async () => {
    // Validate current step before proceeding
    const isValid = await validateStep(state.currentStep, state.formData);
    if (isValid) {
      dispatch({ type: 'NEXT_STEP' });
    }
  }, [state]);

  const goBack = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const updateFormData = useCallback((stepData: Partial<FormData>) => {
    dispatch({ type: 'UPDATE_DATA', payload: stepData });
  }, []);

  return { ...state, goNext, goBack, updateFormData };
}
```

**Sources:** [Lee Gillentine - Writing a Wizard in React](https://medium.com/@l_e/writing-a-wizard-in-react-8dafbce6db07), [Doctolib - Smart Multi-Step Form](https://medium.com/doctolib/how-to-build-a-smart-multi-step-form-in-react-359469c32bbe)

### Pattern 2: Computation Layering (useMemo vs Web Worker)

**What:** Use a tiered approach to computation based on complexity.

**When:**
- Simple calculations (< 10ms): `useMemo` with proper dependencies
- Medium calculations (10-100ms): `useMemo` + debounced inputs
- Heavy calculations (> 100ms): Web Worker

**Why:** Web Workers have serialization overhead. For simple math, `useMemo` is faster. For heavy math that blocks the UI, Web Workers are essential.

**Example:**
```typescript
// For simple derived values
const simpleResult = useMemo(() => {
  return inputs.sampleSize * inputs.effectSize;
}, [inputs.sampleSize, inputs.effectSize]);

// For medium complexity with debouncing
const debouncedInputs = useDebounce(inputs, 300);
const mediumResult = useMemo(() => {
  return computeDistribution(debouncedInputs);
}, [debouncedInputs]);

// For heavy computation (statistical distributions, Monte Carlo, etc.)
const { result, isLoading } = useWorkerCalculation(debouncedInputs);
```

**Sources:** [DEV Community - React with Web Workers](https://dev.to/hexshift/how-to-use-react-with-web-workers-for-offloading-heavy-computation-4p0m), [Medium - Read This before using React Memo and Web Workers](https://medium.com/@stevecunningham_15009/read-this-before-using-react-memo-and-web-workers-de628c3bb65e)

### Pattern 3: Presentational/Container Separation with Hooks

**What:** Separate data-fetching/computation logic from UI rendering, but use hooks instead of wrapper components.

**When:** You want reusable UI components that don't know about data sources.

**Why:** Chart components should receive data as props, not fetch/compute it themselves. This makes them reusable and testable.

**Example:**
```typescript
// Container: manages data
function DistributionChartContainer() {
  const { results } = useCalculation();
  const chartData = useMemo(() => transformForChart(results), [results]);

  if (!results) return <ChartSkeleton />;
  return <DistributionChart data={chartData} />;
}

// Presentational: pure rendering
function DistributionChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <XAxis dataKey="x" />
        <YAxis />
        <Area type="monotone" dataKey="y" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

**Sources:** [patterns.dev - Container/Presentational Pattern](https://www.patterns.dev/react/presentational-container-pattern/), [TSH - Container-Presentational Pattern](https://tsh.io/blog/container-presentational-pattern-react)

### Pattern 4: Form Validation with Zod + React Hook Form

**What:** Define validation schemas per wizard step using Zod, integrate with React Hook Form for form state management.

**When:** Multi-step forms with complex validation requirements.

**Why:** Type-safe validation, excellent TypeScript integration, minimal re-renders.

**Example:**
```typescript
// schemas/calculatorSchemas.ts
const step1Schema = z.object({
  baselineConversionRate: z.number().min(0.001).max(1),
  minimumDetectableEffect: z.number().min(0.001),
});

const step2Schema = z.object({
  sampleSize: z.number().int().positive(),
  testDuration: z.number().int().positive(),
});

// In step component
function Step1Form() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
  });
  // ...
}
```

**Sources:** [freeCodeCamp - Validate Forms with Zod and React-Hook-Form](https://www.freecodecamp.org/news/react-form-validation-zod-react-hook-form/), [LogRocket - Reusable Multi-Step Form](https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/)

### Pattern 5: Responsive Charts with Recharts

**What:** Wrap charts in ResponsiveContainer and memoize data transformations.

**When:** Charts that need to resize with viewport and update with calculation results.

**Why:** ResponsiveContainer handles resize. Memoization prevents unnecessary chart re-renders.

**Example:**
```typescript
function LiveChart({ inputs }: { inputs: CalculatorInputs }) {
  const debouncedInputs = useDebounce(inputs, 300);

  const chartData = useMemo(() => {
    return generateDistributionPoints(debouncedInputs);
  }, [debouncedInputs]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <XAxis dataKey="x" />
        <YAxis />
        <Line type="monotone" dataKey="probability" dot={false} />
        <Tooltip />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Sources:** [Recharts GitHub](https://github.com/recharts/recharts), [LogRocket - Best React Chart Libraries](https://blog.logrocket.com/best-react-chart-libraries-2025/)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Computation in Render

**What:** Performing expensive calculations directly in the render path without memoization.

**Why bad:** Causes UI jank, recalculates on every render even when inputs haven't changed.

**Instead:** Use `useMemo` for calculations, `useCallback` for handlers. Debounce inputs that change frequently.

### Anti-Pattern 2: Prop Drilling Through Wizard Steps

**What:** Passing form state and setters through multiple component layers.

**Why bad:** Makes components tightly coupled, hard to refactor, prone to bugs.

**Instead:** Use React Context for wizard state, or Zustand for more complex state. Each step reads from context directly.

### Anti-Pattern 3: Monolithic Wizard Component

**What:** Single component that handles all wizard logic, rendering, and state.

**Why bad:** Unmaintainable, hard to test, poor code organization.

**Instead:** Split into:
- `WizardContainer` (orchestration)
- `WizardNavigation` (prev/next buttons)
- `StepIndicator` (progress display)
- Individual step components (form inputs)

### Anti-Pattern 4: Web Worker for Simple Calculations

**What:** Using Web Workers for calculations that take < 50ms.

**Why bad:** Serialization overhead (postMessage) can exceed the calculation time itself.

**Instead:** Profile first. Use `useMemo` for simple math. Reserve Web Workers for operations that genuinely block the UI (> 100ms).

### Anti-Pattern 5: Uncontrolled Chart Re-renders

**What:** Charts re-rendering on every keystroke without debouncing.

**Why bad:** Janky UX, wasted computation, potential performance issues with complex SVG.

**Instead:** Debounce input changes (300ms is a good default). Memoize chart data transformation.

## Build Order (Dependencies)

Based on component dependencies, the recommended build order is:

```
Phase 1: Foundation
├── Shared UI components (Button, Input, Card)
├── Form components with Zod validation
└── useDebounce hook

Phase 2: Wizard Infrastructure
├── WizardContext and useWizard hook
├── WizardContainer shell
├── StepIndicator component
└── WizardNavigation component

Phase 3: Calculator Core
├── Step form components (inputs only, no calculations)
├── Calculation utilities (pure functions, testable)
├── Web Worker setup (if needed)
└── useCalculation hook (connects inputs to calculations)

Phase 4: Visualization
├── Chart data transformation utilities
├── DistributionChart component
├── ThresholdChart component
└── ResultsSummary component

Phase 5: Integration
├── Wire wizard steps to calculation engine
├── Connect calculation results to charts
├── Add mode switching (Basic/Advanced)
└── Polish and responsive design
```

**Rationale:**
1. **Foundation first:** Shared components are dependencies for everything else
2. **Wizard before calculator:** Need the container before filling it with steps
3. **Calculations before visualization:** Charts need data to display
4. **Integration last:** Connect the pieces once each works independently

## State Management Recommendation

**Recommendation:** Start with React Context + useReducer for wizard state. Graduate to Zustand if you need:
- State persistence (localStorage)
- State sharing across unrelated components
- DevTools for debugging

For this calculator app, a single `WizardContext` with `useReducer` is likely sufficient:

```typescript
// Simple approach: Context + useReducer
const WizardContext = createContext<WizardContextType | null>(null);

function WizardProvider({ children }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  // ...
}

// If complexity grows: Zustand
const useCalculatorStore = create<CalculatorState>((set) => ({
  inputs: initialInputs,
  results: null,
  currentStep: 0,
  setInputs: (inputs) => set({ inputs }),
  setResults: (results) => set({ results }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
}));
```

**Sources:** [DEV Community - Context API vs Zustand](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m), [Makers Den - State Management Trends 2025](https://makersden.io/blog/react-state-management-in-2025)

## Web Worker Decision Tree

For this specific application (statistical calculations with distributions):

```
Is the calculation blocking the UI (> 100ms)?
├── NO → Use useMemo with debounced inputs
└── YES → Does it need DOM access?
          ├── YES → Cannot use Web Worker, optimize differently
          └── NO → Use Web Worker
                   └── Consider: useTransition as alternative for React 18+
```

**For A/B test calculations specifically:**
- Simple power calculations: `useMemo` (typically < 10ms)
- Distribution point generation (100+ points): `useMemo` + debounce (typically < 50ms)
- Monte Carlo simulations: Web Worker (can take seconds)
- PDF/CDF calculations with high precision: Profile first, likely `useMemo` is sufficient

**Sources:** [DEV Community - React with Web Workers](https://dev.to/hexshift/how-to-use-react-with-web-workers-for-offloading-heavy-computation-4p0m), [jsdev.space - Web Workers and React](https://jsdev.space/web-workers-and-react/)

## Sources

### Project Structure
- [Robin Wieruch - React Folder Structure in 5 Steps (2025)](https://www.robinwieruch.de/react-folder-structure/) - HIGH confidence
- [Bulletproof React - Project Structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md) - HIGH confidence
- [DEV Community - Recommended Folder Structure for React 2025](https://dev.to/pramod_boda/recommended-folder-structure-for-react-2025-48mc) - MEDIUM confidence

### Wizard Patterns
- [Medium - Writing a Wizard in React](https://medium.com/@l_e/writing-a-wizard-in-react-8dafbce6db07) - MEDIUM confidence
- [Doctolib - Smart Multi-Step Form](https://medium.com/doctolib/how-to-build-a-smart-multi-step-form-in-react-359469c32bbe) - MEDIUM confidence
- [LogRocket - Reusable Multi-Step Form with React Hook Form and Zod](https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/) - MEDIUM confidence

### Computation Patterns
- [DEV Community - React with Web Workers](https://dev.to/hexshift/how-to-use-react-with-web-workers-for-offloading-heavy-computation-4p0m) - MEDIUM confidence
- [jsdev.space - Web Workers and React](https://jsdev.space/web-workers-and-react/) - MEDIUM confidence
- [developerway.com - Debouncing in React](https://www.developerway.com/posts/debouncing-in-react) - HIGH confidence

### State Management
- [DEV Community - Context API vs Zustand 2025](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m) - MEDIUM confidence
- [Makers Den - State Management Trends 2025](https://makersden.io/blog/react-state-management-in-2025) - MEDIUM confidence

### Component Patterns
- [patterns.dev - Container/Presentational Pattern](https://www.patterns.dev/react/presentational-container-pattern/) - HIGH confidence
- [TSH - Container-Presentational Pattern React](https://tsh.io/blog/container-presentational-pattern-react) - MEDIUM confidence

### Charting
- [Recharts GitHub](https://github.com/recharts/recharts) - HIGH confidence (official)
- [LogRocket - Best React Chart Libraries 2025](https://blog.logrocket.com/best-react-chart-libraries-2025/) - MEDIUM confidence
