# Phase 2: Basic Mode Inputs - Research

**Researched:** 2026-01-29
**Domain:** React form inputs with validation, formatting, and accessible UI patterns
**Confidence:** HIGH

## Summary

Phase 2 implements all Basic mode input forms: baseline metrics (CR0, N_year, V), uncertainty prior selection (default vs custom 90% interval), and shipping threshold scenario selection. The research focuses on form validation patterns, input formatting, tooltips, and accessible radio card patterns that integrate with the existing shadcn/ui + Zustand architecture established in Phase 1.

Key findings:
- **Form validation**: Use react-hook-form + Zod for type-safe schema validation. shadcn/ui provides a Form component wrapper that integrates seamlessly.
- **Input formatting**: Native `Intl.NumberFormat` API for currency/percentage display formatting is sufficient (no external library needed). Format on blur per CONTEXT.md decision.
- **Tooltips**: Add shadcn/ui Tooltip component (wraps Radix UI Tooltip primitive already in use).
- **Radio cards**: Extend existing RadioGroup (Radix primitive) with card styling rather than adding new library.

**Primary recommendation:** Extend existing infrastructure with react-hook-form + Zod for validation, keep formatting lightweight using native APIs, and build radio cards from existing RadioGroup primitive.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Zustand | ^5.0.10 | Form state management | Already installed |
| @radix-ui/react-radio-group | ^1.3.8 | Radio card primitives | Already installed |
| @radix-ui/react-label | ^2.1.8 | Form labels | Already installed |
| shadcn/ui Input | N/A | Text inputs | Already installed |

### To Add
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7.x | Form state & validation orchestration | Industry standard, 40M+ weekly downloads, excellent DX |
| zod | ^3.x | Schema validation | TypeScript-first, composable, integrates with react-hook-form |
| @hookform/resolvers | ^3.x | Connect Zod to react-hook-form | Official integration package |
| @radix-ui/react-tooltip | ^1.x | Tooltip primitives | Matches existing Radix primitives |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-hook-form | Formik | Formik is larger, more opinionated, react-hook-form has better DX |
| Zod | Yup | Yup older, less TypeScript-friendly, Zod is newer standard |
| Native Intl.NumberFormat | react-currency-input-field | External lib adds bundle size, native API is sufficient |
| Custom radio cards | @radix-ui/react-radio-cards | Extra dependency, can build on existing RadioGroup |

**Installation:**
```bash
npm install react-hook-form zod @hookform/resolvers
npx shadcn@latest add tooltip
```

## Architecture Patterns

### Recommended Project Structure

Building on Phase 1 structure:

```
src/
  components/
    ui/                     # shadcn/ui primitives (existing)
      input.tsx
      radio-group.tsx
      label.tsx
      tooltip.tsx           # ADD: shadcn tooltip
    wizard/                  # Wizard infrastructure (existing)
      SectionWrapper.tsx
      NavigationButtons.tsx
    forms/                   # ADD: Phase 2 form components
      BaselineMetricsForm.tsx
      UncertaintyPriorForm.tsx
      ThresholdScenarioForm.tsx
      inputs/               # Reusable specialized inputs
        PercentageInput.tsx
        CurrencyInput.tsx
        EditableLabelInput.tsx
        InfoTooltip.tsx
        RadioCard.tsx
  lib/
    utils.ts                # Existing utilities
    validation.ts           # ADD: Zod schemas
    formatting.ts           # ADD: Input formatting utilities
  stores/
    wizardStore.ts          # Existing - extend with form state
  types/
    wizard.ts               # Existing - extend with input types
```

### Pattern 1: Form Component with react-hook-form + Zod

**What:** Each section form uses react-hook-form with Zod schema for validation
**When to use:** All form sections in the wizard
**Example:**
```typescript
// Source: react-hook-form + Zod best practices
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define schema (in lib/validation.ts)
const baselineMetricsSchema = z.object({
  // Baseline conversion rate: percentage input, stored as decimal
  baselineConversionRate: z
    .number({ required_error: 'Conversion rate is required' })
    .min(0.001, 'Must be greater than 0%')
    .max(100, 'Must be 100% or less'),
  // Annual visitors
  annualVisitors: z
    .number({ required_error: 'Annual visitors is required' })
    .min(1, 'Must be at least 1'),
  // Unit label for visitors
  visitorUnitLabel: z.string().default('visitors'),
  // Value per conversion
  valuePerConversion: z
    .number({ required_error: 'Value per conversion is required' })
    .min(0.01, 'Must be greater than $0'),
});

type BaselineMetrics = z.infer<typeof baselineMetricsSchema>;

// Form component pattern
function BaselineMetricsForm({ onComplete }: { onComplete: () => void }) {
  const { setSharedInput } = useWizardStore();

  const form = useForm<BaselineMetrics>({
    resolver: zodResolver(baselineMetricsSchema),
    mode: 'onBlur', // Validate on blur per CONTEXT.md decision
    defaultValues: {
      visitorUnitLabel: 'visitors',
    },
  });

  const onSubmit = (data: BaselineMetrics) => {
    // Store as decimal internally
    setSharedInput('baselineConversionRate', data.baselineConversionRate / 100);
    setSharedInput('annualVisitors', data.annualVisitors);
    setSharedInput('valuePerConversion', data.valuePerConversion);
    onComplete();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields with validation */}
    </form>
  );
}
```

### Pattern 2: Input Formatting (Native API)

**What:** Use `Intl.NumberFormat` for display formatting
**When to use:** Currency and percentage display
**Example:**
```typescript
// Source: MDN Intl.NumberFormat, native JS API
// lib/formatting.ts

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100); // Input is percentage (e.g., 5), output is "5%"
}

export function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function parsePercentage(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}
```

### Pattern 3: Radio Card Selection

**What:** Styled card variant of RadioGroup using existing Radix primitives
**When to use:** Threshold scenario selection, prior type selection
**Example:**
```typescript
// Source: Radix UI RadioGroup + custom styling
// components/forms/inputs/RadioCard.tsx

import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '@/lib/utils';

interface RadioCardProps {
  value: string;
  title: string;
  description: string;
  children?: React.ReactNode; // For inline inputs when selected
}

function RadioCard({ value, title, description, children }: RadioCardProps) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      className={cn(
        // Base card styles
        'relative flex cursor-pointer flex-col rounded-xl border-2 p-4',
        'transition-all duration-200',
        // Default state
        'border-border bg-card hover:border-border/80 hover:shadow-sm',
        // Selected state (data attribute from Radix)
        'data-[state=checked]:border-primary data-[state=checked]:bg-selected',
        // Focus state
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Custom radio indicator */}
        <div className={cn(
          'mt-0.5 h-4 w-4 rounded-full border-2',
          'data-[state=checked]:border-primary data-[state=checked]:bg-primary'
        )}>
          <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-primary-foreground" />
          </RadioGroupPrimitive.Indicator>
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {/* Inline content when selected */}
      {children && (
        <div className="mt-4 pl-7 data-[state=unchecked]:hidden">
          {children}
        </div>
      )}
    </RadioGroupPrimitive.Item>
  );
}
```

### Pattern 4: Info Tooltip

**What:** Info icon (i) with tooltip for help text
**When to use:** Unfamiliar terms (prior, 90% interval, threshold concepts)
**Example:**
```typescript
// Source: shadcn/ui Tooltip + Radix Tooltip
// components/forms/inputs/InfoTooltip.tsx

import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InfoTooltipProps {
  content: React.ReactNode;
}

function InfoTooltip({ content }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="More information"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### Anti-Patterns to Avoid

- **Hand-rolling validation logic:** Use Zod schemas, don't write custom validation functions
- **Formatting on every keystroke:** Format on blur only, per CONTEXT.md decision
- **Disabling Continue button:** Per CONTEXT.md, button always enabled; clicking shows errors
- **Hidden custom inputs:** Prior interval inputs always visible, not behind toggles
- **Dropdown for scenarios:** Use horizontal radio cards, not dropdown selector

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom if/else checks | Zod schemas + react-hook-form | Type safety, declarative, reusable |
| Currency formatting | Regex-based formatter | `Intl.NumberFormat` | Browser-native, locale-aware, well-tested |
| Percentage validation | Manual range checks | Zod `.min()/.max()` | Composable, automatic error messages |
| Tooltip positioning | Custom absolute positioning | Radix Tooltip | Handles edge cases, collision detection |
| Radio group accessibility | ARIA attributes manually | Radix RadioGroup | Full WAI-ARIA compliance, keyboard nav |
| Blur/focus event handling | Manual event listeners | react-hook-form `mode: 'onBlur'` | Built-in, tested, handles edge cases |

**Key insight:** Form libraries have solved edge cases (async validation, touched/dirty state, focus management, error timing) that are easy to get wrong when building custom.

## Common Pitfalls

### Pitfall 1: Storing Percentage vs Decimal

**What goes wrong:** UI shows "5%" but internal state stores 5 instead of 0.05
**Why it happens:** Confusion between display format and storage format
**How to avoid:**
- SPEC.md is explicit: `CR0` stored as decimal in `(0, 1)`
- UI accepts percent (e.g., "3.2%"), convert to decimal (0.032) before storing
- Create clear conversion functions: `percentToDecimal(5) => 0.05`
**Warning signs:** Calculations return unexpected values, chart axes off by 100x

### Pitfall 2: Error Display Timing

**What goes wrong:** Errors flash while typing, frustrating users
**Why it happens:** Default `mode: 'onChange'` validates every keystroke
**How to avoid:**
- Per CONTEXT.md: validation on blur only
- Set `mode: 'onBlur'` in react-hook-form
- Clear errors when field gains focus (optional, improves UX)
**Warning signs:** Error messages appear/disappear rapidly during input

### Pitfall 3: Prior Interval Math

**What goes wrong:** Custom 90% interval produces wrong sigma
**Why it happens:** Forgetting the z-score conversion formula
**How to avoid:**
- SPEC.md formula: `sigma_L = (L_high - L_low) / 3.289707`
- Document the z_0.95 constant clearly in code
- Test with known values (e.g., interval [-5%, 5%] should give sigma ~0.0304)
**Warning signs:** Distribution looks wrong in visualization phase

### Pitfall 4: Threshold Sign Convention

**What goes wrong:** "Accept small loss" scenario stores positive instead of negative
**Why it happens:** Scenario 3 asks for "acceptable loss magnitude" but T_$ should be negative
**How to avoid:**
- Per SPEC.md: set `T_$ = -Loss_$` for scenario 3
- Keep scenario logic explicit in code comments
**Warning signs:** "Accept small loss" behaves same as "Ship any positive"

### Pitfall 5: Unit Label State

**What goes wrong:** Editable unit label ("visitors"/"sessions") not persisting correctly
**Why it happens:** Forgetting to include in wizard store, or not wiring to inputs
**How to avoid:**
- Add `visitorUnitLabel: string` to SharedInputs type
- Wire to both the label text AND the helper text interpolation
**Warning signs:** Helper text shows default "visitors" when user changed label

### Pitfall 6: Tooltip Trigger on Disabled Elements

**What goes wrong:** Tooltip doesn't appear on info icon when inside disabled fieldset
**Why it happens:** `<fieldset disabled>` affects all descendants
**How to avoid:**
- Position info icons outside the disabled fieldset OR
- Use `pointer-events: auto` on tooltip triggers
**Warning signs:** Tooltips work in enabled sections but not disabled ones

## Code Examples

Verified patterns for implementation:

### Zod Schema for Prior Selection

```typescript
// Source: Zod documentation + SPEC.md requirements
// lib/validation.ts

const priorSelectionSchema = z.discriminatedUnion('priorType', [
  // Default prior: N(0, 0.05)
  z.object({
    priorType: z.literal('default'),
  }),
  // Custom 90% interval
  z.object({
    priorType: z.literal('custom'),
    // L_low and L_high in percentage form (-50 to 100+)
    intervalLow: z
      .number({ required_error: 'Lower bound is required' })
      .min(-100, 'Cannot be less than -100%'),
    intervalHigh: z
      .number({ required_error: 'Upper bound is required' })
      .max(1000, 'Unrealistic upper bound'), // Allow high values but warn
  }),
]).refine(
  (data) => {
    if (data.priorType === 'custom') {
      return data.intervalLow < data.intervalHigh;
    }
    return true;
  },
  { message: 'Lower bound must be less than upper bound' }
);
```

### Threshold Scenario Schema

```typescript
// Source: SPEC.md Section 7.3
// lib/validation.ts

const thresholdScenarioSchema = z.discriminatedUnion('scenario', [
  // Scenario 1: Ship any positive
  z.object({
    scenario: z.literal('any-positive'),
    // T_$ = 0, T_L = 0 (no additional input needed)
  }),
  // Scenario 2: Minimum lift required
  z.object({
    scenario: z.literal('minimum-lift'),
    thresholdUnit: z.enum(['dollars', 'lift']),
    thresholdValue: z
      .number({ required_error: 'Threshold value is required' })
      .positive('Must be a positive value'),
  }),
  // Scenario 3: Accept small loss
  z.object({
    scenario: z.literal('accept-loss'),
    thresholdUnit: z.enum(['dollars', 'lift']),
    // User enters positive "acceptable loss", stored as negative threshold
    acceptableLoss: z
      .number({ required_error: 'Acceptable loss is required' })
      .positive('Enter as positive value'),
  }),
]);
```

### Currency Input Component

```typescript
// Source: Native APIs + CONTEXT.md formatting decisions
// components/forms/inputs/CurrencyInput.tsx

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrency, parseCurrency } from '@/lib/formatting';

interface CurrencyInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
}

function CurrencyInput({ value, onChange, onBlur, placeholder, error }: CurrencyInputProps) {
  // Display value (formatted or raw during editing)
  const [displayValue, setDisplayValue] = useState(
    value !== null ? formatCurrency(value) : ''
  );
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw number during editing (remove $ and commas)
    if (value !== null) {
      setDisplayValue(value.toString());
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const parsed = parseCurrency(displayValue);
    onChange(parsed);
    // Format for display
    if (parsed !== null) {
      setDisplayValue(formatCurrency(parsed));
    }
    onBlur?.();
  }, [displayValue, onChange, onBlur]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  }, []);

  return (
    <div>
      <Input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder ?? '$0.00'}
        aria-invalid={!!error}
      />
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
```

### Computing Prior Parameters from Interval

```typescript
// Source: SPEC.md Section 6.2
// lib/validation.ts or calculations module

/**
 * Compute Normal prior parameters from a 90% credible interval
 *
 * Given L_low and L_high as the 5th and 95th percentiles,
 * compute mu_L (mean) and sigma_L (standard deviation).
 *
 * Formula from SPEC.md:
 *   mu_L = (L_low + L_high) / 2
 *   sigma_L = (L_high - L_low) / (2 * z_0.95)
 *
 * Where z_0.95 = 1.6448536 (95th percentile of standard normal)
 */
const Z_95 = 1.6448536;
const SIGMA_DIVISOR = 2 * Z_95; // 3.289707

interface PriorParameters {
  mu_L: number;    // Mean of prior distribution (decimal)
  sigma_L: number; // Standard deviation (decimal)
}

export function computePriorFromInterval(
  intervalLowPercent: number,
  intervalHighPercent: number
): PriorParameters {
  // Convert from percentage to decimal
  const L_low = intervalLowPercent / 100;
  const L_high = intervalHighPercent / 100;

  const mu_L = (L_low + L_high) / 2;
  const sigma_L = (L_high - L_low) / SIGMA_DIVISOR;

  return { mu_L, sigma_L };
}

// Default prior values per SPEC.md Section 6.2
export const DEFAULT_PRIOR: PriorParameters = {
  mu_L: 0,
  sigma_L: 0.05,
};

// Default interval values that produce the default prior (for pre-populating fields)
// If sigma = 0.05, interval width = 0.05 * 3.289707 = 0.1645
// Centered at 0: L_low = -8.22%, L_high = +8.22%
export const DEFAULT_INTERVAL = {
  low: -8.22,  // percentage
  high: 8.22,  // percentage
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Formik | react-hook-form | ~2020-2022 | Smaller bundle, better performance, simpler API |
| Yup | Zod | ~2021-2023 | Full TypeScript inference, better composition |
| moment.js number formatting | Intl.NumberFormat | Native since ES2015 | Zero dependencies, better i18n |
| Custom tooltip positioning | Radix UI Tooltip | ~2021+ | Collision detection, accessibility built-in |

**Deprecated/outdated:**
- `react-input-mask` for simple formatting: Native APIs sufficient for currency/percentage
- Manual `aria-*` attributes on radio groups: Use Radix primitives for automatic compliance
- `onChange` validation timing: `onBlur` is current UX best practice

## Open Questions

Things that couldn't be fully resolved:

1. **Prior Interval Default Display**
   - What we know: Default prior is N(0, 0.05), equivalent to ~[-8.2%, +8.2%] interval
   - What's unclear: Should we display these computed bounds or different "nice" rounded values?
   - Recommendation: Use exactly [-8.2%, +8.2%] with a note explaining these produce the default N(0, 0.05)

2. **Asymmetric Interval Messaging**
   - What we know: CONTEXT.md says "highlight that this implies a directional prediction"
   - What's unclear: Exact wording and threshold for "asymmetric" (mean != 0 by how much?)
   - Recommendation: Show message when |mean| > 1% (i.e., implied mu_L > 0.01 or < -0.01)

3. **Threshold Unit Toggle Implementation**
   - What we know: User can toggle between $ and % for threshold input
   - What's unclear: Should both values persist (so user can switch back) or recalculate on toggle?
   - Recommendation: Store the "primary" input and derive the other from K (requires K from baseline inputs)

## Sources

### Primary (HIGH confidence)
- [Radix UI RadioGroup Documentation](https://www.radix-ui.com/primitives/docs/components/radio-group) - Full API reference
- [shadcn/ui Form Documentation](https://ui.shadcn.com/docs/components/form) - Integration guide
- [shadcn/ui Tooltip](https://ui.shadcn.com/docs/components/tooltip) - Installation and usage
- MDN Intl.NumberFormat - Native formatting API

### Secondary (MEDIUM confidence)
- [Wasp Blog: Advanced React Forms](https://wasp.sh/blog/2025/01/22/advanced-react-hook-form-zod-shadcn) - react-hook-form + Zod + shadcn patterns
- [FreeCodeCamp: Zod + React Hook Form](https://www.freecodecamp.org/news/react-form-validation-zod-react-hook-form/) - Integration tutorial
- [react-hook-form/resolvers GitHub](https://github.com/react-hook-form/resolvers) - Official resolver package

### Tertiary (LOW confidence)
- Community patterns for radio cards - validated against Radix docs
- Currency input patterns - verified with native API documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Well-established libraries with official documentation
- Architecture patterns: HIGH - Based on existing Phase 1 patterns + official docs
- Pitfalls: HIGH - Derived directly from SPEC.md requirements and CONTEXT.md decisions
- Code examples: MEDIUM - Patterns verified but not tested in this specific codebase

**Research date:** 2026-01-29
**Valid until:** 2026-03-01 (stable libraries, 30+ days validity)
