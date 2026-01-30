# Phase 3: Calculation Engine - Research

**Researched:** 2026-01-30
**Domain:** Statistical calculations (EVPI), TypeScript math libraries, pure function architecture
**Confidence:** HIGH

## Summary

This phase implements the EVPI (Expected Value of Perfect Information) calculation engine for Basic mode. The core challenge is implementing closed-form Normal distribution calculations (PDF/CDF) with proper truncation at L >= -1, while integrating cleanly with the existing Zustand store and React form architecture.

The research confirms that:
1. **Statistical functions** are well-supported in JavaScript via the `simple-statistics` library (already pattern-compatible with the codebase's minimal-dependency approach) or the more comprehensive `gaussian` library
2. **Closed-form EVPI formulas** from SPEC.md are mathematically sound and can be implemented directly using standard normal CDF/PDF
3. **Architecture should follow pure function patterns** - separate calculation logic from React hooks/components for testability

**Primary recommendation:** Implement calculations as pure TypeScript functions in `src/lib/`, use `simple-statistics` for normal CDF (probit inverse), hand-roll the simple phi/Phi formulas, and expose results via a dedicated hook that reads from the wizard store.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| simple-statistics | 7.8.8 | Normal CDF, probit | Lightweight (70KB), well-documented, no dependencies, 316+ npm dependents |
| Native Math | N/A | Basic arithmetic, Math.exp, Math.sqrt | Zero bundle impact, sufficient for phi/Phi |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.NumberFormat | Native | Smart dollar formatting ($127, $12.7K, $1.27M) | Output formatting only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| simple-statistics | gaussian (1.3.0) | gaussian has nicer OO API but less common, similar bundle size |
| simple-statistics | @stdlib/stats-base-dists-normal-cdf | More precise but heavier; overkill for this use case |
| Hand-rolled phi/Phi | jstat | jstat is larger, has more features we don't need |

**Installation:**
```bash
npm install simple-statistics
```

Note: For Basic mode closed-form calculations, we may not even need simple-statistics. The standard normal PDF and CDF have straightforward implementations that avoid an external dependency.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── calculations/
│   │   ├── evpi.ts         # EVPI calculation functions
│   │   ├── evpi.test.ts    # Unit tests for EVPI
│   │   ├── statistics.ts   # phi, Phi, truncation helpers
│   │   ├── statistics.test.ts
│   │   ├── derived.ts      # K, T_L, T_$ derivations
│   │   └── types.ts        # CalculationInputs, CalculationResults interfaces
│   ├── formatting.ts       # (existing) add formatSmartCurrency
│   ├── prior.ts            # (existing) PriorParameters
│   └── validation.ts       # (existing)
├── hooks/
│   └── useCalculations.ts  # React hook that computes from store
└── stores/
    └── wizardStore.ts      # (existing) inputs live here
```

### Pattern 1: Pure Calculation Functions
**What:** All calculation logic lives in pure functions with explicit input/output types
**When to use:** Always for math/business logic
**Example:**
```typescript
// src/lib/calculations/evpi.ts

import type { PriorParameters } from '../prior';

export interface EVPIInputs {
  // Business inputs
  baselineConversionRate: number;  // CR0 as decimal (0.032 for 3.2%)
  annualVisitors: number;          // N_year
  valuePerConversion: number;      // V in dollars

  // Prior parameters (from prior.ts)
  prior: PriorParameters;          // { mu_L, sigma_L }

  // Threshold (already converted to lift units internally)
  threshold_L: number;             // T_L as decimal
}

export interface EVPIResults {
  // Core results
  evpiDollars: number;            // EVPI in annual dollars
  defaultDecision: 'ship' | 'dont-ship';
  probabilityClearsThreshold: number;  // P(L >= T_L)
  chanceOfBeingWrong: number;     // P(regret)

  // Derived values (for debugging panel)
  K: number;                      // Annual dollars per unit lift
  threshold_dollars: number;      // T_$ = K * T_L
  zScore: number;                 // (T_L - mu_L) / sigma_L
  phiZ: number;                   // PDF at z
  PhiZ: number;                   // CDF at z

  // Edge case flags
  truncationApplied: boolean;     // True if L < -1 had meaningful mass
  nearZeroSigma: boolean;         // True if sigma_L is very small
  priorOneSided: boolean;         // True if prior entirely on one side
}

/**
 * Calculate EVPI and supporting metrics for Basic mode
 *
 * Uses closed-form Normal formula per SPEC.md Section 8.4:
 * If default decision is Ship:
 *   EVPI = K * [ (T_L - mu_L) * Phi(z) + sigma_L * phi(z) ]
 * If default decision is Don't ship:
 *   EVPI = K * [ (mu_L - T_L) * (1 - Phi(z)) + sigma_L * phi(z) ]
 */
export function calculateEVPI(inputs: EVPIInputs): EVPIResults {
  // Implementation here
}
```

### Pattern 2: Computation Hook (Derived State)
**What:** React hook that reads inputs from store and returns computed results
**When to use:** Connecting pure calculations to React components
**Example:**
```typescript
// src/hooks/useCalculations.ts

import { useMemo } from 'react';
import { useWizardStore } from '@/stores/wizardStore';
import { calculateEVPI, type EVPIResults } from '@/lib/calculations/evpi';
import { computePriorFromInterval, DEFAULT_PRIOR } from '@/lib/prior';

/**
 * Hook that computes EVPI results from current wizard store state
 * Returns null if inputs are incomplete/invalid
 */
export function useEVPICalculations(): EVPIResults | null {
  const inputs = useWizardStore((state) => state.inputs.shared);

  return useMemo(() => {
    // Check all required inputs are present
    if (
      inputs.baselineConversionRate === null ||
      inputs.annualVisitors === null ||
      inputs.valuePerConversion === null ||
      inputs.priorType === null ||
      inputs.thresholdScenario === null
    ) {
      return null;
    }

    // Derive prior parameters
    const prior = inputs.priorType === 'default'
      ? DEFAULT_PRIOR
      : computePriorFromInterval(
          inputs.priorIntervalLow!,
          inputs.priorIntervalHigh!
        );

    // Convert threshold to lift units (implementation in derived.ts)
    const threshold_L = deriveThresholdLift(inputs, /* K needed */);

    return calculateEVPI({
      baselineConversionRate: inputs.baselineConversionRate,
      annualVisitors: inputs.annualVisitors,
      valuePerConversion: inputs.valuePerConversion,
      prior,
      threshold_L,
    });
  }, [inputs]);
}
```

### Pattern 3: Smart Output Formatting
**What:** Intl.NumberFormat with compact notation for dollar amounts
**When to use:** Display-only (never store formatted values)
**Example:**
```typescript
// src/lib/formatting.ts (add to existing)

/**
 * Smart dollar formatting per 03-CONTEXT.md:
 * - $127 for small amounts (< 1000)
 * - $12.7K for thousands
 * - $1.27M for millions
 *
 * Uses Intl.NumberFormat compact notation for natural display
 */
export function formatSmartCurrency(value: number): string {
  // For values under $1000, show exact dollars (no decimals)
  if (Math.abs(value) < 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  // For larger values, use compact notation
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumSignificantDigits: 3,
  }).format(value);
}
```

### Anti-Patterns to Avoid
- **Calculations in components:** Never compute EVPI inside a React component render. Extract to hook/function.
- **Mutable state for calculations:** Results are derived, not stored. Don't put EVPI in Zustand.
- **String formatting during calculation:** Keep all math in numbers; format only at render time.
- **Implicit type coercion:** Always use explicit number types; prior percentages must be converted to decimals before calculation.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Normal CDF (Phi) | Taylor series approximation | simple-statistics `cumulativeStdNormalProbability` OR Abramowitz-Stegun approximation | Numerical precision edge cases, tested implementations |
| Number formatting | Custom locale logic | Intl.NumberFormat | Browser-native, handles edge cases, i18n-ready |
| Percentage to decimal | Inline `/ 100` | `percentToDecimal()` from formatting.ts | Consistency, already exists |

**Key insight:** The EVPI formula itself is simple math once you have reliable phi/Phi functions. The complexity is in those statistical primitives and in handling edge cases (truncation, near-zero sigma).

## Common Pitfalls

### Pitfall 1: Floating Point Precision in Probability Calculations
**What goes wrong:** `0.1 + 0.2 !== 0.3` in JavaScript; probabilities may sum to 1.0000000001
**Why it happens:** IEEE 754 binary floating-point can't represent all decimals exactly
**How to avoid:**
- Use `Number.EPSILON` for comparisons: `Math.abs(a - b) < Number.EPSILON`
- Round display values with `toFixed()` or `Math.round(x * 100) / 100`
- For near-zero sigma checks, use threshold like `sigma_L < 0.0001`
**Warning signs:** Tests failing intermittently, probabilities slightly > 1 or < 0

### Pitfall 2: Division by Zero with K = 0
**What goes wrong:** If CR0 = 0, N_year = 0, or V = 0, then K = 0, and T_L = T_$ / K is undefined
**Why it happens:** Form validation should prevent this, but calculation functions shouldn't assume
**How to avoid:** Per 03-CONTEXT.md, trust form validation. But add defensive check:
```typescript
if (K === 0) {
  // Return edge case result: EVPI = 0, can't calculate threshold
}
```
**Warning signs:** NaN or Infinity in results

### Pitfall 3: Threshold Unit Conversion Confusion
**What goes wrong:** Mixing up T_$ (dollars) and T_L (lift decimal) in formulas
**Why it happens:** User can enter threshold in either unit; conversion depends on K
**How to avoid:**
- Always convert to T_L internally before EVPI calculation
- Single source of truth: `deriveThresholdLift()` function
- Store only one canonical form plus the unit type
**Warning signs:** EVPI off by orders of magnitude

### Pitfall 4: Sign Convention for "Accept Loss" Scenario
**What goes wrong:** Scenario 3 threshold should be negative, but may be stored/used as positive
**Why it happens:** UI shows "acceptable loss: 5%" but internally T_L = -0.05
**How to avoid:** ThresholdScenarioForm already handles this (stores negative). Verify in tests:
```typescript
// For accept-loss with 5% loss tolerance:
expect(inputs.thresholdValue).toBe(-0.05); // NOT 0.05
```
**Warning signs:** Default decision is wrong for accept-loss scenarios

### Pitfall 5: Truncation Not Re-normalizing
**What goes wrong:** Truncating at L >= -1 without adjusting probabilities
**Why it happens:** Simply setting phi(z) = 0 for L < -1 doesn't account for probability mass
**How to avoid:** For truncated normal, the CDF must be adjusted:
```typescript
// Truncated CDF: P(L <= x | L >= -1)
function truncatedCDF(x: number, mu: number, sigma: number, lowerBound: number = -1): number {
  const PhiLower = standardNormalCDF((lowerBound - mu) / sigma);
  const PhiX = standardNormalCDF((x - mu) / sigma);
  return (PhiX - PhiLower) / (1 - PhiLower);
}
```
**Warning signs:** Probabilities don't sum to 1, EVPI inconsistent with narrow priors near -100%

### Pitfall 6: useMemo Dependencies Missing Store Fields
**What goes wrong:** Calculation doesn't update when threshold changes
**Why it happens:** Forgot to include `inputs.thresholdValue` in useMemo deps
**How to avoid:** Extract entire `inputs` object, or explicitly list all fields
**Warning signs:** Stale results after changing form inputs

## Code Examples

Verified patterns from mathematical definitions and JavaScript best practices:

### Standard Normal PDF (phi)
```typescript
// Source: Mathematical definition, verified against simple-statistics behavior
const SQRT_2_PI = Math.sqrt(2 * Math.PI); // ~2.5066

/**
 * Standard normal probability density function
 * phi(z) = (1 / sqrt(2*pi)) * exp(-z^2 / 2)
 */
export function standardNormalPDF(z: number): number {
  return Math.exp(-0.5 * z * z) / SQRT_2_PI;
}
```

### Standard Normal CDF (Phi) - Abramowitz-Stegun Approximation
```typescript
// Source: Abramowitz & Stegun approximation (error < 7.5e-8)
// Also available via simple-statistics.cumulativeStdNormalProbability()

/**
 * Standard normal cumulative distribution function
 * Uses Abramowitz-Stegun approximation for high accuracy
 */
export function standardNormalCDF(z: number): number {
  // Constants for approximation
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  // Handle sign
  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);

  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);

  return 0.5 * (1.0 + sign * y);
}
```

### EVPI Closed-Form Calculation
```typescript
// Source: SPEC.md Section 8.4

/**
 * Calculate EVPI using closed-form Normal formula
 *
 * @param K - Annual dollars per unit lift (N_year * CR0 * V)
 * @param mu_L - Prior mean of relative lift
 * @param sigma_L - Prior standard deviation of relative lift
 * @param T_L - Threshold in lift units
 */
export function calculateEVPIClosedForm(
  K: number,
  mu_L: number,
  sigma_L: number,
  T_L: number
): { evpi: number; defaultDecision: 'ship' | 'dont-ship'; z: number; phi: number; Phi: number } {
  // z-score: standardized distance from threshold to mean
  const z = (T_L - mu_L) / sigma_L;

  // Standard normal PDF and CDF at z
  const phi = standardNormalPDF(z);
  const Phi = standardNormalCDF(z);

  // Default decision based on prior mean vs threshold
  const defaultDecision = mu_L >= T_L ? 'ship' : 'dont-ship';

  let evpi: number;
  if (defaultDecision === 'ship') {
    // EVPI = K * [ (T_L - mu_L) * Phi(z) + sigma_L * phi(z) ]
    evpi = K * ((T_L - mu_L) * Phi + sigma_L * phi);
  } else {
    // EVPI = K * [ (mu_L - T_L) * (1 - Phi(z)) + sigma_L * phi(z) ]
    evpi = K * ((mu_L - T_L) * (1 - Phi) + sigma_L * phi);
  }

  return { evpi, defaultDecision, z, phi, Phi };
}
```

### Derive K and Threshold Conversions
```typescript
// Source: SPEC.md Section 4.2

/**
 * Derive K (annual dollars per unit lift)
 * K = N_year * CR0 * V
 */
export function deriveK(
  annualVisitors: number,
  baselineConversionRate: number,
  valuePerConversion: number
): number {
  return annualVisitors * baselineConversionRate * valuePerConversion;
}

/**
 * Convert threshold from stored format to lift units
 *
 * The store may have threshold in dollars or lift depending on user selection.
 * This normalizes to T_L (decimal lift).
 */
export function normalizeThresholdToLift(
  thresholdValue: number,
  thresholdUnit: 'dollars' | 'lift' | null,
  K: number
): number {
  if (thresholdUnit === 'dollars') {
    // T_L = T_$ / K
    return K > 0 ? thresholdValue / K : 0;
  } else {
    // Already in lift units (percentage form in store, e.g., 5 for 5%)
    // Convert to decimal
    return thresholdValue / 100;
  }
}
```

### Edge Case Detection
```typescript
/**
 * Detect edge cases that require special messaging
 */
export function detectEdgeCases(
  sigma_L: number,
  T_L: number,
  mu_L: number,
  Phi: number
): { nearZeroSigma: boolean; priorOneSided: boolean; truncationApplied: boolean } {
  // Near-zero sigma: interval is so narrow it's essentially certain
  const nearZeroSigma = sigma_L < 0.001; // Less than 0.1% SD

  // Prior one-sided: essentially all mass on one side of threshold
  // If Phi > 0.9999 or Phi < 0.0001
  const priorOneSided = Phi > 0.9999 || Phi < 0.0001;

  // Truncation applied: check if untruncated prior has mass below L = -1
  // P(L < -1) = Phi((-1 - mu_L) / sigma_L)
  const probBelowMinus1 = standardNormalCDF((-1 - mu_L) / sigma_L);
  const truncationApplied = probBelowMinus1 > 0.001; // More than 0.1% mass truncated

  return { nearZeroSigma, priorOneSided, truncationApplied };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monte Carlo for all EVPI | Closed-form for Normal prior | Always available | 10-100x faster, exact for Normal |
| Custom statistics implementations | Use established libraries (simple-statistics, stdlib) | N/A | Better precision, fewer bugs |
| Inline calculations in components | Pure functions + hooks | React best practice since hooks (2019) | Testability, reusability |

**Deprecated/outdated:**
- `@types/simple-statistics`: simple-statistics now ships its own TypeScript types (since v7.0.0)
- `jstat` for simple normal calculations: Overkill; simple-statistics or hand-rolled is sufficient

## Open Questions

Things that couldn't be fully resolved:

1. **Truncated Normal EVPI: Closed-form vs. Numerical?**
   - What we know: Untruncated Normal has closed-form EVPI. Truncated Normal complicates this.
   - What's unclear: Whether the truncation at L >= -1 is significant enough to require numerical integration, or if closed-form with adjustment is sufficient.
   - Recommendation: Start with closed-form. If truncation mass > 1%, add a note. Only implement numerical integration if accuracy issues arise.

2. **Should results be memoized in a store or always derived?**
   - What we know: React 19 compiler can auto-memoize; useMemo is sufficient for most cases.
   - What's unclear: Whether calculation performance warrants caching in store.
   - Recommendation: Start with derived (useMemo in hook). Profile later if needed.

3. **Probability display precision**
   - What we know: 03-CONTEXT.md says "Claude's discretion (likely whole percentage)"
   - What's unclear: Whether sub-1% probabilities should show decimals (e.g., 0.3% vs <1%)
   - Recommendation: Display whole percentages (e.g., "12%"), show "< 1%" for small probabilities

## Sources

### Primary (HIGH confidence)
- SPEC.md Section 4 (Notation), Section 8 (Calculations) - Formulas and requirements
- 03-CONTEXT.md - User decisions on edge cases, formatting, performance
- simple-statistics docs (https://simple-statistics.github.io/docs/) - CDF/probit function signatures
- MDN Intl.NumberFormat (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - Compact notation API
- gaussian GitHub (https://github.com/errcw/gaussian) - Alternative library API reference

### Secondary (MEDIUM confidence)
- Analytica docs on EVPI (https://docs.analytica.com/index.php/Expected_value_of_information_--_EVI,_EVPI,_and_ESVI) - EVPI calculation patterns
- React docs on pure functions (https://react.dev/reference/rules/components-and-hooks-must-be-pure) - Architecture guidance

### Tertiary (LOW confidence)
- WebSearch results on truncated normal - Mathematical formulas need verification against textbook

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - simple-statistics is well-established, native Intl is browser standard
- Architecture: HIGH - Pure functions + hooks is established React pattern, matches existing codebase
- Pitfalls: HIGH - Well-known JavaScript issues, verified against SPEC.md requirements
- Truncation handling: MEDIUM - Mathematical approach is sound, implementation details may need iteration

**Research date:** 2026-01-30
**Valid until:** 60 days (stable domain, no fast-moving dependencies)
