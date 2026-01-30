# Phase 4: Visualization & Results - Research

**Researched:** 2026-01-30
**Domain:** React data visualization (density charts), results display, Recharts integration
**Confidence:** HIGH

## Summary

This phase implements the live-updating distribution chart and the results display for Basic mode. The visualization shows the user's prior distribution as a smooth density curve with threshold line, regret shading, and interactive tooltips. The results section displays the EVPI verdict with supporting explanation cards.

Key findings:
1. **Recharts is the recommended charting library** - well-established, excellent React integration, supports all required features (AreaChart with smooth curves, ReferenceLine, ReferenceArea, custom tooltips), and is already Datadog-style compatible
2. **Density curve data generation** - Use the existing `standardNormalPDF` function to generate smooth curve points; no external kernel density estimation needed since we know the distribution parameters
3. **Chart lives in the Prior section** - Per 04-CONTEXT.md, the chart visualizes the user's uncertainty input, not the result
4. **Results use existing calculation hook** - `useEVPICalculations` already returns all needed values

**Primary recommendation:** Use Recharts AreaChart with `type="monotone"` for smooth curves, generate PDF data points from prior parameters using the existing statistics functions, apply gradient fill and hide Y-axis per design specs.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 2.15+ | React charting library | 24.8K+ GitHub stars, 3.6M+ npm downloads, declarative API, built on D3.js, excellent React integration |
| Native Math + existing statistics.ts | N/A | Generate density curve data points | Already implemented, no additional dependencies needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | (existing) | Icons for results cards | Already in project dependencies |
| Tailwind CSS | (existing) | Styling for results cards | Already configured |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Victory | Victory has React Native support but slightly steeper learning curve; Recharts more popular |
| Recharts | Visx (Airbnb) | Visx offers more control but requires more code; overkill for this use case |
| Recharts | D3.js directly | D3 is lower-level; Recharts wraps D3 with React components |
| Pre-built density component | Custom AreaChart | No React density component matches our exact needs; custom is cleaner |

**Installation:**
```bash
npm install recharts
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── charts/
│   │   ├── PriorDistributionChart.tsx    # Main chart component
│   │   ├── ChartTooltip.tsx              # Custom tooltip component
│   │   └── types.ts                      # Chart-specific types
│   ├── results/
│   │   ├── ResultsSection.tsx            # Results section wrapper
│   │   ├── VerdictCard.tsx               # Primary EVPI verdict
│   │   ├── SupportingCard.tsx            # Reusable supporting card
│   │   └── index.ts                      # Barrel export
│   └── forms/
│       └── UncertaintyPriorForm.tsx      # (existing, add chart integration)
├── lib/
│   ├── calculations/
│   │   └── chart-data.ts                 # Generate density curve data
│   └── formatting.ts                     # (existing, add percentage formatting for chart)
└── hooks/
    └── useEVPICalculations.ts            # (existing, already has needed values)
```

### Pattern 1: Density Curve Data Generation
**What:** Generate array of {x, y} points for the normal PDF curve
**When to use:** When rendering the prior distribution chart
**Example:**
```typescript
// src/lib/calculations/chart-data.ts

import { standardNormalPDF } from './statistics';

interface ChartDataPoint {
  /** Lift value as percentage (e.g., -10 for -10%) */
  liftPercent: number;
  /** Probability density at this lift */
  density: number;
}

/**
 * Generate data points for a normal distribution density curve
 *
 * Generates points from mu - 4*sigma to mu + 4*sigma (covers 99.99% of distribution)
 * Uses existing standardNormalPDF for computation
 *
 * @param mu_L - Prior mean (decimal, e.g., 0.05 for 5%)
 * @param sigma_L - Prior standard deviation (decimal)
 * @param numPoints - Number of points to generate (default 100 for smooth curve)
 * @returns Array of chart data points
 */
export function generateDensityCurveData(
  mu_L: number,
  sigma_L: number,
  numPoints: number = 100
): ChartDataPoint[] {
  const points: ChartDataPoint[] = [];

  // Cover +/- 4 standard deviations (99.99% of distribution)
  const minLift = mu_L - 4 * sigma_L;
  const maxLift = mu_L + 4 * sigma_L;
  const step = (maxLift - minLift) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const lift = minLift + i * step;
    // Convert lift to z-score, then compute PDF
    const z = (lift - mu_L) / sigma_L;
    const density = standardNormalPDF(z) / sigma_L; // Scale by 1/sigma for proper PDF

    points.push({
      liftPercent: lift * 100, // Convert decimal to percentage for display
      density,
    });
  }

  return points;
}
```

### Pattern 2: Recharts AreaChart with Gradient Fill
**What:** Smooth density curve with purple gradient fill, hidden Y-axis
**When to use:** Rendering the prior distribution visualization
**Example:**
```tsx
// src/components/charts/PriorDistributionChart.tsx

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';

interface PriorDistributionChartProps {
  data: ChartDataPoint[];
  mu_L: number;         // For mean marker
  threshold_L: number;  // For threshold line
  defaultDecision: 'ship' | 'dont-ship';  // For regret shading direction
  K: number;           // For dollar conversion in tooltip
  lowBound: number;    // 5th percentile (percentage)
  highBound: number;   // 95th percentile (percentage)
}

export function PriorDistributionChart({
  data,
  mu_L,
  threshold_L,
  defaultDecision,
  K,
  lowBound,
  highBound,
}: PriorDistributionChartProps) {
  // Find peak density for mean marker positioning
  const meanPercent = mu_L * 100;
  const thresholdPercent = threshold_L * 100;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        {/* Gradient definition */}
        <defs>
          <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        {/* X-axis: Lift percentage */}
        <XAxis
          dataKey="liftPercent"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(val) => `${val > 0 ? '+' : ''}${val.toFixed(0)}%`}
          stroke="#6B7280"
          fontSize={12}
        />

        {/* Y-axis: Hidden per design spec */}
        <YAxis hide domain={[0, 'auto']} />

        {/* 90% interval shading */}
        <ReferenceArea
          x1={lowBound}
          x2={highBound}
          fill="#7C3AED"
          fillOpacity={0.15}
        />

        {/* Regret shading */}
        {defaultDecision === 'ship' ? (
          // Shade below threshold when default is Ship
          <ReferenceArea
            x1={data[0].liftPercent}
            x2={thresholdPercent}
            fill="#EF4444"
            fillOpacity={0.15}
          />
        ) : (
          // Shade above threshold when default is Don't Ship
          <ReferenceArea
            x1={thresholdPercent}
            x2={data[data.length - 1].liftPercent}
            fill="#EF4444"
            fillOpacity={0.15}
          />
        )}

        {/* Threshold line (dashed) */}
        <ReferenceLine
          x={thresholdPercent}
          stroke="#6B7280"
          strokeDasharray="5 5"
          label={{
            value: `Threshold: ${thresholdPercent > 0 ? '+' : ''}${thresholdPercent.toFixed(1)}%`,
            position: 'top',
            fontSize: 11,
            fill: '#6B7280',
          }}
        />

        {/* Density curve */}
        <Area
          type="monotone"
          dataKey="density"
          stroke="#7C3AED"
          strokeWidth={2}
          fill="url(#densityGradient)"
          isAnimationActive={false}
        />

        {/* Custom tooltip */}
        <Tooltip content={<ChartTooltip K={K} />} />

        {/* Mean marker (dot on curve) */}
        <ReferenceDot
          x={meanPercent}
          y={/* find density at mean */}
          r={6}
          fill="#7C3AED"
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 3: Custom Tooltip with Dollar Conversion
**What:** Tooltip showing lift % and dollar equivalent
**When to use:** On hover over the density curve
**Example:**
```tsx
// src/components/charts/ChartTooltip.tsx

import { formatSmartCurrency } from '@/lib/formatting';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { liftPercent: number; density: number } }>;
  K: number; // Annual dollars per unit lift
}

export function ChartTooltip({ active, payload, K }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const { liftPercent } = payload[0].payload;
  const liftDecimal = liftPercent / 100;
  const dollarImpact = K * liftDecimal;

  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-foreground">
        {liftPercent > 0 ? '+' : ''}{liftPercent.toFixed(1)}% lift
      </p>
      <p className="text-xs text-muted-foreground">
        {dollarImpact >= 0 ? '+' : ''}{formatSmartCurrency(dollarImpact)}/year
      </p>
    </div>
  );
}
```

### Pattern 4: Results Cards Layout
**What:** Stacked supporting cards below the primary verdict
**When to use:** Displaying EVPI results and supporting metrics
**Example:**
```tsx
// src/components/results/VerdictCard.tsx

import { formatSmartCurrency } from '@/lib/formatting';

interface VerdictCardProps {
  evpiDollars: number;
}

export function VerdictCard({ evpiDollars }: VerdictCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      {/* Primary verdict */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          If you can A/B test this idea for less than{' '}
          <span className="text-primary">{formatSmartCurrency(evpiDollars)}</span>,
          it's worth testing.
        </h3>
      </div>

      {/* EVPI optimism warning */}
      <div className="bg-muted/50 border border-muted rounded-lg px-4 py-3">
        <p className="text-sm text-muted-foreground">
          This is EVPI: the value of perfect information. Real A/B tests are not perfect
          — so this is an optimistic ceiling.{' '}
          <a href="#" className="text-primary hover:underline">
            For a more realistic estimate, try Advanced mode.
          </a>
        </p>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Generating chart data on every render:** Memoize density curve data generation with useMemo
- **Hard-coded chart dimensions:** Use ResponsiveContainer for responsive sizing
- **Showing Y-axis values:** Per design spec, Y-axis is hidden (users don't need to interpret density)
- **Dollar values on X-axis:** Per 04-CONTEXT.md, X-axis shows lift % only; dollars in tooltip
- **Overly complex regret shading:** Keep it subtle (low opacity) to not overwhelm the chart

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth curve rendering | Custom SVG path generation | Recharts Area with type="monotone" | Handles interpolation, animation, and edge cases |
| Responsive chart sizing | Manual resize listeners | Recharts ResponsiveContainer | Handles debouncing, performance |
| Gradient fills | Manual SVG gradient | Recharts defs + linearGradient | Cleaner integration with chart |
| Reference lines/areas | Custom SVG overlays | Recharts ReferenceLine/ReferenceArea | Automatically scales with data domain |
| Tooltip positioning | Manual mouse tracking | Recharts Tooltip | Handles viewport boundaries, smart positioning |

**Key insight:** Recharts provides all the building blocks needed for this chart. Custom SVG work is only needed for the mean indicator dot positioning (which can use ReferenceDot).

## Common Pitfalls

### Pitfall 1: Chart Data Not Updating on Prior Change
**What goes wrong:** Chart shows stale data when user changes interval bounds
**Why it happens:** Forgot to include prior parameters in useMemo dependencies
**How to avoid:**
```typescript
const chartData = useMemo(
  () => generateDensityCurveData(prior.mu_L, prior.sigma_L),
  [prior.mu_L, prior.sigma_L] // Include all dependencies
);
```
**Warning signs:** Chart doesn't change when adjusting interval inputs

### Pitfall 2: ReferenceDot Y-Value Calculation
**What goes wrong:** Mean marker floats above or below the curve
**Why it happens:** Using wrong formula to find density at mean
**How to avoid:**
```typescript
// For standard normal, density at mean is maximum
// But we need the scaled density for our chart
const meanDensity = standardNormalPDF(0) / prior.sigma_L;
```
**Warning signs:** Dot visually disconnected from curve

### Pitfall 3: X-Axis Domain Not Auto-Scaling
**What goes wrong:** Chart clips the curve or shows too much whitespace
**Why it happens:** Hard-coded domain instead of using data bounds
**How to avoid:**
```tsx
<XAxis
  dataKey="liftPercent"
  type="number"
  domain={['dataMin', 'dataMax']} // Let Recharts compute bounds
/>
```
**Warning signs:** Curve cut off at edges or excessive padding

### Pitfall 4: Regret Shading Extends Beyond Curve
**What goes wrong:** Regret shading extends past the visible curve area
**Why it happens:** ReferenceArea x1/x2 not constrained to data range
**How to avoid:**
```typescript
// Constrain regret area to data bounds
const x1 = Math.max(data[0].liftPercent, regretStart);
const x2 = Math.min(data[data.length - 1].liftPercent, regretEnd);
```
**Warning signs:** Red shading extends to chart edges inappropriately

### Pitfall 5: Threshold Line Label Overlapping
**What goes wrong:** Threshold label collides with chart elements
**Why it happens:** Default label positioning doesn't account for chart density
**How to avoid:** Use custom label positioning or a separate tooltip
**Warning signs:** Label text cut off or overlapping curve

### Pitfall 6: Results Cards Not Re-rendering on Calculation Change
**What goes wrong:** Results show stale EVPI after input changes
**Why it happens:** Not using the hook properly or stale closure
**How to avoid:** Use `useEVPICalculations()` hook directly in results component
**Warning signs:** Results don't update until page refresh

## Code Examples

### Generate Density Curve Data Points
```typescript
// Source: Mathematical definition + existing statistics.ts

import { standardNormalPDF } from './statistics';

export interface ChartDataPoint {
  liftPercent: number;
  density: number;
}

/**
 * Generate smooth density curve data from Normal prior parameters
 *
 * Mathematical approach:
 * - For Normal(mu, sigma), PDF is f(x) = phi((x-mu)/sigma) / sigma
 * - Generate points across 4 standard deviations from mean
 * - 100 points provides smooth visual without performance impact
 */
export function generateDensityCurveData(
  mu_L: number,
  sigma_L: number,
  numPoints: number = 100
): ChartDataPoint[] {
  // Handle edge case: very small sigma
  if (sigma_L < 0.0001) {
    // Return spike at mean
    return [
      { liftPercent: mu_L * 100 - 0.1, density: 0 },
      { liftPercent: mu_L * 100, density: 1 },
      { liftPercent: mu_L * 100 + 0.1, density: 0 },
    ];
  }

  const points: ChartDataPoint[] = [];

  // Cover +/- 4 standard deviations
  const minLift = mu_L - 4 * sigma_L;
  const maxLift = mu_L + 4 * sigma_L;
  const step = (maxLift - minLift) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const lift = minLift + i * step;
    const z = (lift - mu_L) / sigma_L;
    // PDF of Normal(mu, sigma) at x is phi(z) / sigma where z = (x - mu) / sigma
    const density = standardNormalPDF(z) / sigma_L;

    points.push({
      liftPercent: lift * 100,
      density,
    });
  }

  return points;
}

/**
 * Find density value at a specific lift
 * Used for positioning the mean marker
 */
export function getDensityAtLift(
  lift_L: number,
  mu_L: number,
  sigma_L: number
): number {
  const z = (lift_L - mu_L) / sigma_L;
  return standardNormalPDF(z) / sigma_L;
}
```

### Format Percentage for Chart Display
```typescript
// Add to src/lib/formatting.ts

/**
 * Format lift percentage for chart axis/tooltip display
 *
 * Examples:
 * - formatLiftPercent(5.0) => "+5.0%"
 * - formatLiftPercent(-2.5) => "-2.5%"
 * - formatLiftPercent(0) => "0%"
 */
export function formatLiftPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Format probability as whole percentage
 *
 * Per 03-CONTEXT.md: Display whole percentages, show "< 1%" for small values
 *
 * Examples:
 * - formatProbabilityPercent(0.127) => "13%"
 * - formatProbabilityPercent(0.005) => "< 1%"
 * - formatProbabilityPercent(0.998) => "> 99%"
 */
export function formatProbabilityPercent(decimal: number): string {
  const percent = decimal * 100;

  if (percent < 1) {
    return '< 1%';
  }
  if (percent > 99) {
    return '> 99%';
  }

  return `${Math.round(percent)}%`;
}
```

### Results Supporting Card Component
```tsx
// src/components/results/SupportingCard.tsx

import { cn } from '@/lib/utils';

interface SupportingCardProps {
  title: string;
  value: string;
  description?: string;
  variant?: 'default' | 'highlight';
}

export function SupportingCard({
  title,
  value,
  description,
  variant = 'default',
}: SupportingCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        variant === 'default' && 'bg-card border-border',
        variant === 'highlight' && 'bg-primary/5 border-primary/20'
      )}
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-lg font-semibold text-foreground mt-1">{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas-based charts | SVG-based (Recharts) | Recharts default | Better accessibility, easier styling, smaller bundle for simple charts |
| D3 direct DOM manipulation | React declarative components | Since Recharts/Victory adoption | Better React integration, no DOM conflicts |
| Fixed chart dimensions | ResponsiveContainer | Standard practice | Works on all screen sizes |

**Deprecated/outdated:**
- `react-vis` (Uber): Last major release 2021, low maintenance activity
- `nivo` for simple charts: Overkill for single density chart; Recharts is lighter
- D3 direct usage in React: React 18+ strict mode causes issues with D3's DOM mutations

## Open Questions

Things that couldn't be fully resolved:

1. **Exact regret shading color and opacity**
   - What we know: 04-CONTEXT.md says "Claude's discretion on prominence and color"
   - What's unclear: Whether to use red (error color) or a different color for regret
   - Recommendation: Use subtle red (#EF4444) at 15% opacity; matches error semantic but doesn't dominate

2. **Supporting cards layout: stacked vs tabbed**
   - What we know: 04-CONTEXT.md says "Claude decides based on content density"
   - What's unclear: Exact number of cards and content amount
   - Recommendation: Start with stacked grid (2x2 for 4 cards); tabbed only if >5 cards

3. **Chart animation behavior**
   - What we know: Live-updating required per requirements
   - What's unclear: Whether animation should be enabled during live updates
   - Recommendation: Disable animation (`isAnimationActive={false}`) for live updates to avoid jarring transitions; consider initial load animation only

4. **Mobile chart height**
   - What we know: Responsive sizing required
   - What's unclear: Exact height on mobile (200px might be too cramped)
   - Recommendation: Use 200px on desktop, 160px on mobile (via Tailwind classes on container)

## Sources

### Primary (HIGH confidence)
- Recharts official documentation (https://recharts.github.io/en-US/) - API reference for AreaChart, ReferenceLine, ReferenceArea, Tooltip
- Recharts GitHub examples (https://recharts.github.io/en-US/examples/) - CustomizedDotLineChart, CustomContentOfTooltip
- SPEC.md Section 6.3, 8.6 - Chart requirements and regret shading specification
- 04-CONTEXT.md - User decisions on chart design (density curve, gradient fill, hidden Y-axis)
- Existing src/lib/calculations/statistics.ts - standardNormalPDF implementation

### Secondary (MEDIUM confidence)
- React Graph Gallery (https://www.react-graph-gallery.com/density-plot) - D3.js density chart approach
- LogRocket best React chart libraries 2025 (https://blog.logrocket.com/best-react-chart-libraries-2025/) - Library comparison
- NPM trends (https://npmtrends.com/) - Download statistics for Recharts vs Victory vs D3

### Tertiary (LOW confidence)
- WebSearch results for Recharts customization - Various StackOverflow and GitHub issues
- CodeSandbox examples - Custom tooltip implementations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts is well-established and matches project requirements
- Architecture: HIGH - Follows existing codebase patterns, uses existing calculation hook
- Pitfalls: HIGH - Common React charting issues, verified against Recharts documentation
- Chart data generation: HIGH - Mathematical approach verified against existing statistics.ts

**Research date:** 2026-01-30
**Valid until:** 60 days (stable domain, Recharts releases are infrequent)
