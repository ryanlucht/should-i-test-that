# Phase 5: Advanced Mode - Research

**Researched:** 2026-01-30
**Domain:** EVSI calculation (Monte Carlo), alternative prior distributions (Student-t, Uniform), Cost of Delay, Web Workers for non-blocking computation
**Confidence:** HIGH

## Summary

This phase extends Basic mode to compute EVSI (Expected Value of Sample Information) via Bayesian pre-posterior analysis, support alternative prior distributions beyond Normal, and calculate Cost of Delay. The key technical challenges are:

1. **Student-t and Uniform distribution support** - Need PDF functions for chart rendering; jStat library recommended
2. **Monte Carlo EVSI calculation** - Nested simulation (sample from prior, simulate experiment, compute posterior decision) requiring ~1000-5000 samples
3. **Web Worker for non-blocking computation** - EVSI calculation may take 500ms-2s; must not block UI
4. **Normal-Normal fast path** - Closed-form posterior update when prior is Normal; skips Monte Carlo for better performance

Per CONTEXT.md, Test Costs (hard costs, labor) are deferred. The verdict is `max(0, EVSI - CoD)` where CoD is auto-calculated from duration and daily opportunity cost.

**Primary recommendation:** Use jStat for Student-t distribution functions, implement EVSI via Monte Carlo with Web Workers using vite-plugin-comlink, implement Normal-Normal fast path for ~10x speedup when applicable.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jstat | 1.10.0+ | Student-t PDF, CDF, quantile functions | Lightweight (~18KB gzipped), well-documented, tree-shakeable |
| comlink | 4.4.1+ | Web Worker RPC abstraction | Google Chrome Labs, 1.1KB, removes postMessage boilerplate |
| vite-plugin-comlink | 5.3.0 | Vite integration for Comlink | Clean worker imports, TypeScript support, auto-expose/wrap |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Existing statistics.ts | N/A | Normal PDF/CDF (already implemented) | Normal prior calculations, Normal-Normal fast path |
| Existing chart-data.ts | N/A | Density curve generation pattern | Extend for Student-t and Uniform |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jstat | @stdlib/stats-base-dists-t | stdlib more precise but heavier; jstat sufficient for this use case |
| jstat | Hand-rolled Student-t | Student-t CDF requires incomplete beta function; error-prone to implement |
| Comlink | Raw postMessage | More boilerplate, no TypeScript type safety for worker API |
| Web Worker | Main thread with chunking | Risk of UI jank with 5000 samples; Worker is cleaner |

**Installation:**
```bash
npm install jstat comlink
npm install --save-dev vite-plugin-comlink
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── calculations/
│   │   ├── evpi.ts              # (existing) Basic mode EVPI
│   │   ├── evsi.ts              # NEW: EVSI calculation (Pure functions)
│   │   ├── evsi.test.ts         # NEW: EVSI unit tests
│   │   ├── distributions.ts     # NEW: Student-t, Uniform PDF/CDF wrappers
│   │   ├── distributions.test.ts
│   │   ├── cost-of-delay.ts     # NEW: CoD calculation
│   │   ├── sample-size.ts       # NEW: n_total, n_control, n_variant derivation
│   │   ├── statistics.ts        # (existing) Normal PDF/CDF
│   │   ├── chart-data.ts        # (existing, extend for new distributions)
│   │   ├── types.ts             # (existing, extend for Advanced mode)
│   │   └── index.ts             # (existing, add exports)
│   └── workers/
│       ├── evsi.worker.ts       # NEW: Web Worker for EVSI Monte Carlo
│       └── types.ts             # NEW: Worker input/output types
├── hooks/
│   ├── useEVPICalculations.ts   # (existing) Basic mode
│   └── useEVSICalculations.ts   # NEW: Advanced mode hook with Worker
├── components/
│   ├── forms/
│   │   ├── PriorShapeForm.tsx   # NEW: Prior shape selector (radio cards)
│   │   └── ExperimentDesignForm.tsx  # NEW: Split, duration, traffic inputs
│   └── results/
│       ├── CostOfDelayCard.tsx  # NEW: CoD breakdown card (expandable)
│       └── EVSIVerdictCard.tsx  # NEW: Advanced mode verdict
└── types/
    └── wizard.ts                # (existing, extend AdvancedInputs)
```

### Pattern 1: Distribution Abstraction Layer
**What:** Unified interface for Normal, Student-t, and Uniform distributions
**When to use:** Anywhere distribution functions are needed (PDF for charts, sampling for Monte Carlo)
**Example:**
```typescript
// src/lib/calculations/distributions.ts

import { standardNormalPDF, standardNormalCDF } from './statistics';
import jStat from 'jstat';

/**
 * Distribution type identifier
 */
export type DistributionType = 'normal' | 'student-t' | 'uniform';

/**
 * Prior distribution parameters
 *
 * For Normal: { mu_L, sigma_L }
 * For Student-t: { mu_L, sigma_L, df } where df is degrees of freedom
 * For Uniform: { low_L, high_L } bounds in lift units (decimal)
 */
export interface PriorDistribution {
  type: DistributionType;
  // Normal / Student-t parameters
  mu_L?: number;      // Location (mean for Normal)
  sigma_L?: number;   // Scale (std dev for Normal)
  df?: number;        // Degrees of freedom (Student-t only)
  // Uniform parameters
  low_L?: number;     // Lower bound (Uniform only)
  high_L?: number;    // Upper bound (Uniform only)
}

/**
 * Probability Density Function
 *
 * Returns the probability density at a given lift value.
 * Used for chart rendering.
 *
 * @param lift_L - Lift value (decimal, e.g., 0.05 for 5%)
 * @param prior - Distribution parameters
 */
export function pdf(lift_L: number, prior: PriorDistribution): number {
  switch (prior.type) {
    case 'normal': {
      const z = (lift_L - prior.mu_L!) / prior.sigma_L!;
      return standardNormalPDF(z) / prior.sigma_L!;
    }
    case 'student-t': {
      // jStat.studentt.pdf uses location=0, scale=1 by default
      // We need to adjust: f(x; mu, sigma, df) = f((x-mu)/sigma; df) / sigma
      const z = (lift_L - prior.mu_L!) / prior.sigma_L!;
      return jStat.studentt.pdf(z, prior.df!) / prior.sigma_L!;
    }
    case 'uniform': {
      // Uniform PDF is 1/(high - low) within bounds, 0 outside
      if (lift_L < prior.low_L! || lift_L > prior.high_L!) {
        return 0;
      }
      return 1 / (prior.high_L! - prior.low_L!);
    }
  }
}

/**
 * Cumulative Distribution Function
 *
 * Returns P(L <= lift_L) under the prior.
 * Used for computing probabilities and decision rules.
 */
export function cdf(lift_L: number, prior: PriorDistribution): number {
  switch (prior.type) {
    case 'normal': {
      const z = (lift_L - prior.mu_L!) / prior.sigma_L!;
      return standardNormalCDF(z);
    }
    case 'student-t': {
      const z = (lift_L - prior.mu_L!) / prior.sigma_L!;
      return jStat.studentt.cdf(z, prior.df!);
    }
    case 'uniform': {
      if (lift_L <= prior.low_L!) return 0;
      if (lift_L >= prior.high_L!) return 1;
      return (lift_L - prior.low_L!) / (prior.high_L! - prior.low_L!);
    }
  }
}

/**
 * Sample from the prior distribution
 *
 * Used in Monte Carlo EVSI simulation.
 * Returns a random draw from the prior.
 */
export function sample(prior: PriorDistribution): number {
  switch (prior.type) {
    case 'normal': {
      // Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return prior.mu_L! + prior.sigma_L! * z;
    }
    case 'student-t': {
      // Use jStat's inverse CDF (quantile) with uniform random
      const u = Math.random();
      const z = jStat.studentt.inv(u, prior.df!);
      return prior.mu_L! + prior.sigma_L! * z;
    }
    case 'uniform': {
      return prior.low_L! + Math.random() * (prior.high_L! - prior.low_L!);
    }
  }
}
```

### Pattern 2: Monte Carlo EVSI Calculation
**What:** Pre-posterior analysis to value imperfect information from an A/B test
**When to use:** Advanced mode EVSI calculation
**Example:**
```typescript
// src/lib/calculations/evsi.ts

import { sample, cdf } from './distributions';
import type { PriorDistribution } from './distributions';

/**
 * EVSI inputs
 *
 * Business inputs + prior + experiment design
 */
export interface EVSIInputs {
  // Business inputs (same as EVPI)
  K: number;           // Annual dollars per unit lift
  threshold_L: number; // Threshold in lift units

  // Prior distribution
  prior: PriorDistribution;

  // Experiment design
  n_control: number;   // Sample size in control
  n_variant: number;   // Sample size in variant
  baselineCR: number;  // Baseline conversion rate (CR0)
}

/**
 * EVSI results
 */
export interface EVSIResults {
  evsiDollars: number;
  defaultDecision: 'ship' | 'dont-ship';
  probabilityClearsThreshold: number;
  probabilityTestChangesDecision: number;
}

/**
 * Calculate EVSI via Monte Carlo pre-posterior analysis
 *
 * Algorithm:
 * 1. For each simulation i = 1..numSamples:
 *    a. Sample true lift L_i from prior
 *    b. Simulate test outcome (observed lift) given L_i
 *    c. Compute posterior decision given observed lift
 *    d. Compute value of decision given true L_i
 * 2. EVSI = E[value with test] - E[value without test]
 *
 * Per SPEC.md A5.1: Feasibility requirement - reject samples where
 * CR1 = CR0 * (1 + L) is outside [0, 1]
 *
 * @param inputs - EVSI calculation inputs
 * @param numSamples - Number of Monte Carlo samples (default 5000)
 */
export function calculateEVSIMonteCarlo(
  inputs: EVSIInputs,
  numSamples: number = 5000
): EVSIResults {
  const { K, threshold_L, prior, n_control, n_variant, baselineCR } = inputs;

  // Determine default decision (without test)
  const priorMean = getPriorMean(prior);
  const defaultDecision = priorMean >= threshold_L ? 'ship' : 'dont-ship';

  // Standard error of observed lift in the experiment
  // SE(lift_hat) = sqrt( CR0*(1-CR0)/n_control + CR1*(1-CR1)/n_variant )
  // Approximation: use CR0 for both (conservative)
  const se_lift_approx = Math.sqrt(
    (baselineCR * (1 - baselineCR)) * (1/n_control + 1/n_variant)
  ) / baselineCR; // Convert to relative lift SE

  let valueWithTest = 0;
  let valueWithoutTest = 0;
  let decisionChanges = 0;
  let validSamples = 0;

  for (let i = 0; i < numSamples; i++) {
    // Sample true lift from prior
    let L_true = sample(prior);

    // Feasibility check: CR1 must be in [0, 1]
    // CR1 = CR0 * (1 + L), so L must be in [-1, (1/CR0) - 1]
    const L_min = -1;
    const L_max = (1 / baselineCR) - 1;
    if (L_true < L_min || L_true > L_max) {
      // Reject and resample
      i--;
      continue;
    }

    validSamples++;

    // Value without test: based on default decision
    const valueNoTest = defaultDecision === 'ship'
      ? K * Math.max(0, L_true - threshold_L)  // Ship: gain if L > T, 0 otherwise
      : K * Math.max(0, threshold_L - L_true); // Don't ship: avoid loss if L < T
    valueWithoutTest += valueNoTest;

    // Simulate observed lift (noisy measurement of true lift)
    const noise = sampleStandardNormal() * se_lift_approx;
    const L_observed = L_true + noise;

    // Posterior decision: based on observed lift
    // Simple rule: ship if L_observed >= threshold
    // (More sophisticated: Bayesian update, but this captures key behavior)
    const posteriorDecision = L_observed >= threshold_L ? 'ship' : 'dont-ship';

    if (posteriorDecision !== defaultDecision) {
      decisionChanges++;
    }

    // Value with test: based on posterior decision
    const valueWithTestI = posteriorDecision === 'ship'
      ? K * (L_true - threshold_L) // Ship: actual value of true lift vs threshold
      : 0;                          // Don't ship: no gain or loss
    valueWithTest += valueWithTestI;
  }

  // Average over valid samples
  const avgValueWithTest = valueWithTest / validSamples;
  const avgValueWithoutTest = valueWithoutTest / validSamples;

  // EVSI = E[value with test] - E[value without test]
  // But we need expected LOSS reduction, not value increase
  // EVSI = Prior risk - Pre-posterior risk
  const evsiDollars = Math.max(0, avgValueWithTest - avgValueWithoutTest);

  // Probability threshold is cleared (under prior)
  const probClearsThreshold = 1 - cdf(threshold_L, prior);

  return {
    evsiDollars,
    defaultDecision,
    probabilityClearsThreshold: probClearsThreshold,
    probabilityTestChangesDecision: decisionChanges / validSamples,
  };
}

/**
 * Get prior mean for default decision
 */
function getPriorMean(prior: PriorDistribution): number {
  switch (prior.type) {
    case 'normal':
    case 'student-t':
      return prior.mu_L!;
    case 'uniform':
      return (prior.low_L! + prior.high_L!) / 2;
  }
}

/**
 * Sample from standard normal (Box-Muller)
 */
function sampleStandardNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
```

### Pattern 3: Normal-Normal Fast Path
**What:** Closed-form EVSI calculation when prior is Normal (avoids Monte Carlo)
**When to use:** Performance optimization for Normal priors
**Example:**
```typescript
// src/lib/calculations/evsi.ts (continued)

import { standardNormalPDF, standardNormalCDF } from './statistics';

/**
 * Calculate EVSI using Normal-Normal conjugate prior fast path
 *
 * When the prior is Normal and the likelihood is Normal (which it is for
 * the observed lift), the posterior is also Normal with closed-form update.
 *
 * This avoids Monte Carlo and computes EVSI in O(1) time.
 *
 * Mathematical background:
 * - Prior: L ~ Normal(mu_prior, sigma_prior^2)
 * - Likelihood: L_hat | L ~ Normal(L, se^2) where se is standard error
 * - Posterior: L | L_hat ~ Normal(mu_post, sigma_post^2)
 *
 * Posterior parameters:
 *   precision_post = 1/sigma_prior^2 + 1/se^2
 *   mu_post = (mu_prior/sigma_prior^2 + L_hat/se^2) / precision_post
 *   sigma_post^2 = 1 / precision_post
 *
 * Pre-posterior mean:
 *   E[mu_post] = mu_prior (since E[L_hat] = mu_prior under prior)
 *
 * Pre-posterior variance of mu_post:
 *   Var[mu_post] = sigma_post^2 * (sigma_prior^2 / se^2) / (sigma_prior^2/se^2 + 1)
 *
 * @param inputs - EVSI inputs (must have Normal prior)
 */
export function calculateEVSINormalFastPath(inputs: EVSIInputs): EVSIResults {
  const { K, threshold_L, prior, n_control, n_variant, baselineCR } = inputs;

  if (prior.type !== 'normal') {
    throw new Error('Normal fast path requires Normal prior');
  }

  const mu_prior = prior.mu_L!;
  const sigma_prior = prior.sigma_L!;

  // Standard error of observed lift
  const se_lift = Math.sqrt(
    (baselineCR * (1 - baselineCR)) * (1/n_control + 1/n_variant)
  ) / baselineCR;

  // Posterior precision (inverse variance)
  const precision_prior = 1 / (sigma_prior * sigma_prior);
  const precision_data = 1 / (se_lift * se_lift);
  const precision_post = precision_prior + precision_data;
  const sigma_post = 1 / Math.sqrt(precision_post);

  // Pre-posterior distribution of posterior mean
  // The posterior mean is a function of the observed data
  // Var[mu_post | prior] = weight_data^2 * Var[L_hat] = weight_data^2 * se^2
  // where weight_data = precision_data / precision_post
  const weight_data = precision_data / precision_post;
  const sigma_preposterior = weight_data * se_lift;

  // Default decision
  const defaultDecision = mu_prior >= threshold_L ? 'ship' : 'dont-ship';

  // EVSI using closed form (similar to EVPI but with pre-posterior sigma)
  // z = (T - mu_prior) / sigma_preposterior
  const z = (threshold_L - mu_prior) / sigma_preposterior;
  const phi_z = standardNormalPDF(z);
  const Phi_z = standardNormalCDF(z);

  let evsiDollars: number;
  if (defaultDecision === 'ship') {
    evsiDollars = K * ((threshold_L - mu_prior) * Phi_z + sigma_preposterior * phi_z);
  } else {
    evsiDollars = K * ((mu_prior - threshold_L) * (1 - Phi_z) + sigma_preposterior * phi_z);
  }

  evsiDollars = Math.max(0, evsiDollars);

  // Probability threshold cleared
  const probClearsThreshold = 1 - standardNormalCDF((threshold_L - mu_prior) / sigma_prior);

  // Probability test changes decision (approximation)
  // When SE is large relative to sigma_prior, test is noisy and may change decision
  const probChangesDecision = defaultDecision === 'ship' ? Phi_z : (1 - Phi_z);

  return {
    evsiDollars,
    defaultDecision,
    probabilityClearsThreshold: probClearsThreshold,
    probabilityTestChangesDecision: probChangesDecision,
  };
}
```

### Pattern 4: Web Worker with Comlink
**What:** Offload Monte Carlo EVSI to background thread
**When to use:** Any EVSI calculation that uses Monte Carlo (non-Normal priors)
**Example:**
```typescript
// src/lib/workers/evsi.worker.ts

import { calculateEVSIMonteCarlo, calculateEVSINormalFastPath } from '../calculations/evsi';
import type { EVSIInputs, EVSIResults } from '../calculations/evsi';

/**
 * Calculate EVSI in a Web Worker
 *
 * Uses fast path for Normal priors, Monte Carlo otherwise.
 * This function is exposed via Comlink for main thread to call.
 */
export async function computeEVSI(
  inputs: EVSIInputs,
  numSamples: number = 5000
): Promise<EVSIResults> {
  if (inputs.prior.type === 'normal') {
    // Fast path: closed-form for Normal prior
    return calculateEVSINormalFastPath(inputs);
  }

  // Monte Carlo for Student-t and Uniform priors
  return calculateEVSIMonteCarlo(inputs, numSamples);
}

// Comlink expose happens automatically with vite-plugin-comlink
```

```typescript
// src/hooks/useEVSICalculations.ts

import { useState, useEffect } from 'react';
import { useWizardStore } from '@/stores/wizardStore';
import type { EVSIResults } from '@/lib/calculations/evsi';

// Import worker with Comlink (vite-plugin-comlink handles typing)
const worker = new ComlinkWorker<typeof import('../lib/workers/evsi.worker')>(
  new URL('../lib/workers/evsi.worker.ts', import.meta.url),
  { name: 'evsiWorker', type: 'module' }
);

/**
 * Hook for EVSI calculations in Advanced mode
 *
 * Runs calculation in Web Worker to avoid blocking UI.
 * Returns loading state while calculation is in progress.
 */
export function useEVSICalculations() {
  const inputs = useWizardStore((state) => state.inputs);
  const mode = useWizardStore((state) => state.mode);

  const [results, setResults] = useState<EVSIResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (mode !== 'advanced') {
      setResults(null);
      return;
    }

    // Validate required inputs
    if (!areAdvancedInputsComplete(inputs)) {
      setResults(null);
      return;
    }

    // Build EVSI inputs from wizard state
    const evsiInputs = buildEVSIInputs(inputs);
    if (!evsiInputs) {
      setResults(null);
      return;
    }

    // Run calculation in worker
    setIsLoading(true);
    setError(null);

    worker.computeEVSI(evsiInputs, 5000)
      .then(setResults)
      .catch(setError)
      .finally(() => setIsLoading(false));

  }, [inputs, mode]);

  return { results, isLoading, error };
}

// Helper to check if all Advanced inputs are complete
function areAdvancedInputsComplete(inputs: InputsState): boolean {
  // Check shared inputs
  if (
    inputs.shared.baselineConversionRate === null ||
    inputs.shared.annualVisitors === null ||
    inputs.shared.valuePerConversion === null ||
    inputs.shared.thresholdScenario === null
  ) {
    return false;
  }

  // Check advanced-specific inputs
  if (
    inputs.advanced.testDuration === null ||
    inputs.advanced.dailyTestTraffic === null
  ) {
    return false;
  }

  return true;
}

// Helper to build EVSIInputs from wizard state
function buildEVSIInputs(inputs: InputsState): EVSIInputs | null {
  // ... conversion logic
  return null; // Placeholder
}
```

### Pattern 5: Cost of Delay Calculation
**What:** Calculate CoD from experiment design parameters
**When to use:** Advanced mode results display
**Example:**
```typescript
// src/lib/calculations/cost-of-delay.ts

/**
 * Cost of Delay inputs
 */
export interface CoDInputs {
  /** K = N_year * CR0 * V (annual dollars per unit lift) */
  K: number;
  /** Prior mean lift (mu_L) */
  mu_L: number;
  /** Threshold in lift units (T_L) */
  threshold_L: number;
  /** Test duration in days */
  testDurationDays: number;
  /** Variant traffic fraction during test (e.g., 0.5 for 50/50 split) */
  variantFraction: number;
  /** Decision latency after test ends (days) */
  decisionLatencyDays: number;
}

/**
 * Cost of Delay results
 */
export interface CoDResults {
  /** Total cost of delay in dollars */
  codDollars: number;
  /** Daily opportunity cost (for breakdown display) */
  dailyOpportunityCost: number;
  /** Whether CoD applies (only if default decision is Ship) */
  codApplies: boolean;
}

/**
 * Calculate Cost of Delay per SPEC.md A6
 *
 * CoD represents the opportunity cost of delaying the roll-out decision
 * while running the test. It only applies when the default decision is Ship.
 *
 * Formula (if default Ship):
 *   EV_ship_annual = K * (mu_L - T_L)
 *   EV_ship_day = EV_ship_annual / 365
 *   CoD = (1 - f_var) * EV_ship_day * D_test + EV_ship_day * D_latency
 *
 * Interpretation:
 * - During the test: Only variant fraction gets the feature, so we lose
 *   (1 - f_var) of the expected daily value
 * - After test ends: We lose the full daily value for D_latency days
 *
 * If default decision is Don't Ship, CoD = 0 (no opportunity cost of waiting).
 */
export function calculateCostOfDelay(inputs: CoDInputs): CoDResults {
  const {
    K,
    mu_L,
    threshold_L,
    testDurationDays,
    variantFraction,
    decisionLatencyDays,
  } = inputs;

  // Expected annual value of shipping = K * (expected lift - threshold)
  // This is positive when default decision is Ship (mu_L >= threshold_L)
  const EV_ship_annual = K * (mu_L - threshold_L);

  // If expected value is non-positive, default decision is Don't Ship
  // No opportunity cost of waiting
  if (EV_ship_annual <= 0) {
    return {
      codDollars: 0,
      dailyOpportunityCost: 0,
      codApplies: false,
    };
  }

  // Daily opportunity cost
  const EV_ship_day = EV_ship_annual / 365;

  // Cost of delay during test:
  // Only (1 - variantFraction) of users are missing out on the feature
  const codDuringTest = (1 - variantFraction) * EV_ship_day * testDurationDays;

  // Cost of delay after test (decision latency):
  // All users missing out until decision is made
  const codAfterTest = EV_ship_day * decisionLatencyDays;

  const codDollars = codDuringTest + codAfterTest;

  return {
    codDollars,
    dailyOpportunityCost: EV_ship_day,
    codApplies: true,
  };
}
```

### Anti-Patterns to Avoid
- **Running Monte Carlo on main thread:** Always use Web Worker for 1000+ samples
- **Sampling without feasibility check:** Must reject samples where CR1 is outside [0,1]
- **Using Student-t without location/scale:** jStat's studentt functions default to location=0, scale=1; must transform
- **Calculating CoD when default is Don't Ship:** CoD = 0 in this case, don't show misleading values
- **Storing EVSI results in Zustand:** Results are derived; store only inputs

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Student-t PDF/CDF | Taylor series or incomplete beta | jStat studentt functions | Numerical precision, edge cases handled |
| Web Worker communication | postMessage/onmessage | Comlink | Type safety, cleaner API, less boilerplate |
| Inverse CDF sampling | Custom implementation | jStat studentt.inv | Tested, handles edge cases |
| Normal-Normal posterior | Manual derivation | Closed-form formulas | Mathematical literature has optimal formulas |

**Key insight:** The EVSI Monte Carlo loop itself is simple once you have reliable distribution primitives and Worker infrastructure. Focus implementation effort on the integration layer, not the math primitives.

## Common Pitfalls

### Pitfall 1: jStat studentt Functions Use Standardized Form
**What goes wrong:** Using jStat.studentt.pdf(x, df) directly without location/scale adjustment
**Why it happens:** jStat implements the standard Student-t (location=0, scale=1)
**How to avoid:**
```typescript
// WRONG: jStat.studentt.pdf(lift, df) assumes location=0, scale=1

// CORRECT: Transform to z-score and scale density
const z = (lift - mu) / sigma;
const density = jStat.studentt.pdf(z, df) / sigma;
```
**Warning signs:** Chart curve doesn't match expected location/spread

### Pitfall 2: Seeding Math.random() in Workers
**What goes wrong:** Expecting deterministic results for testing
**Why it happens:** Web Workers have their own random state, Math.random() is unseeded
**How to avoid:**
- For production: Accept non-determinism, use sufficient sample size
- For testing: Mock Math.random() or use seedrandom library
```typescript
// In tests, use a seeded PRNG
import seedrandom from 'seedrandom';
const rng = seedrandom('test-seed');
// Replace Math.random calls with rng()
```
**Warning signs:** Tests fail intermittently with slightly different values

### Pitfall 3: Forgetting Feasibility Bounds for Large Lifts
**What goes wrong:** Simulated CR1 = CR0 * (1 + L) exceeds 1 or goes negative
**Why it happens:** Fat-tailed priors (Student-t df=3) can sample extreme values
**How to avoid:**
```typescript
// Reject and resample if CR1 outside [0, 1]
const L_min = -1;                    // CR1 = 0 when L = -1
const L_max = (1 / baselineCR) - 1;  // CR1 = 1 when L = (1/CR0) - 1

if (L_sample < L_min || L_sample > L_max) {
  // Reject this sample
  continue;
}
```
**Warning signs:** NaN or Infinity in EVSI results, especially with low baseline CR

### Pitfall 4: Worker Not Terminating on Component Unmount
**What goes wrong:** Orphan workers continue running after navigation
**Why it happens:** Forgot cleanup in useEffect
**How to avoid:**
```typescript
useEffect(() => {
  // ... setup worker call

  return () => {
    // Cleanup: Comlink workers should be terminated if created per-component
    // For singleton worker (recommended), skip termination
  };
}, [deps]);
```
**Warning signs:** Memory leaks, CPU usage after leaving page

### Pitfall 5: CoD Calculation Using Wrong Time Basis
**What goes wrong:** CoD is orders of magnitude off
**Why it happens:** Mixing annual K with daily duration without dividing by 365
**How to avoid:**
```typescript
// K is annual dollars per unit lift
// EV_ship_day = K * (mu_L - T_L) / 365
// NOT: K * (mu_L - T_L) * duration_days
```
**Warning signs:** CoD in millions when it should be thousands

### Pitfall 6: Uniform Prior Mean Calculation
**What goes wrong:** Using mu_L from store when prior is Uniform
**Why it happens:** Uniform doesn't have mu_L; mean is (low + high) / 2
**How to avoid:**
```typescript
function getPriorMean(prior: PriorDistribution): number {
  if (prior.type === 'uniform') {
    return (prior.low_L! + prior.high_L!) / 2;
  }
  return prior.mu_L!;
}
```
**Warning signs:** Wrong default decision with Uniform prior

## Code Examples

### vite.config.ts Configuration for Comlink
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { comlink } from 'vite-plugin-comlink';

export default defineConfig({
  plugins: [
    comlink(),  // Must be before react
    react(),
  ],
  worker: {
    plugins: () => [comlink()],
  },
});
```

### TypeScript Types for vite-plugin-comlink
```typescript
// src/vite-env.d.ts (add to existing)
/// <reference types="vite/client" />
/// <reference types="vite-plugin-comlink/client" />
```

### Extended Wizard Types for Advanced Mode
```typescript
// src/types/wizard.ts (extend existing)

export interface AdvancedInputs {
  // Prior shape (NEW)
  priorShape: 'normal' | 'student-t' | 'uniform' | null;
  studentTDf: number | null;  // degrees of freedom for Student-t

  // Experiment design (UPDATED)
  testDuration: number | null;          // Duration in days (was weeks)
  dailyTestTraffic: number | null;      // Daily eligible traffic
  trafficSplit: number | null;          // Variant fraction 0-1 (default 0.5)
  eligibilityFraction: number | null;   // Fraction of traffic eligible (default 1)
  conversionLatencyDays: number | null; // Conversion latency (default 0)
  decisionLatencyDays: number | null;   // Days after test to decide (default 0)

  // Costs (REMOVED per CONTEXT.md - deferred)
  // testFixedCost: number | null;
  // laborHours: number | null;
  // hourlyRate: number | null;
}

export const initialAdvancedInputs: AdvancedInputs = {
  priorShape: null,
  studentTDf: null,
  testDuration: null,
  dailyTestTraffic: null,
  trafficSplit: 0.5,         // Default 50/50
  eligibilityFraction: 1,    // Default 100%
  conversionLatencyDays: 0,  // Default 0
  decisionLatencyDays: 0,    // Default 0
};
```

### Sample Size Derivation
```typescript
// src/lib/calculations/sample-size.ts

export interface SampleSizeInputs {
  dailyTraffic: number;
  testDurationDays: number;
  eligibilityFraction: number;  // 0-1
  variantFraction: number;      // 0-1
}

export interface SampleSizeResults {
  n_total: number;    // Total samples in experiment
  n_control: number;  // Samples in control group
  n_variant: number;  // Samples in variant group
}

/**
 * Derive sample sizes from experiment design inputs
 *
 * Per SPEC.md A3.3:
 * - n_total = N_day * D_test * f_eligible
 * - n_control = n_total * f_control
 * - n_variant = n_total * f_variant
 */
export function deriveSampleSizes(inputs: SampleSizeInputs): SampleSizeResults {
  const { dailyTraffic, testDurationDays, eligibilityFraction, variantFraction } = inputs;

  const n_total = Math.floor(dailyTraffic * testDurationDays * eligibilityFraction);
  const n_variant = Math.floor(n_total * variantFraction);
  const n_control = n_total - n_variant;

  return { n_total, n_control, n_variant };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full nested Monte Carlo for EVSI | Moment matching / Normal-Normal fast path | Research 2017+ | 10-100x speedup for Normal priors |
| Main thread heavy computation | Web Workers with Comlink | 2020+ standard | Non-blocking UI |
| Custom distribution implementations | jStat / stdlib | Mature libraries | Numerical accuracy |
| postMessage API for Workers | Comlink RPC abstraction | 2018+ | Type safety, cleaner code |

**Deprecated/outdated:**
- `worker-loader` for Webpack: Vite has native worker support + vite-plugin-comlink
- Synchronous EVSI calculation: Always use async + Worker for >100ms operations
- Full Monte Carlo for Normal priors: Normal-Normal conjugacy gives closed-form

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal Monte Carlo sample size**
   - What we know: 5000 samples provides ~1.4% standard error; 10000 provides ~1%
   - What's unclear: User tolerance for calculation time vs. accuracy
   - Recommendation: Start with 5000 samples (~500ms-1s), expose as tunable parameter later

2. **Student-t df presets**
   - What we know: CONTEXT.md says "df=3 Heavy tails, df=5 Moderate, df=10 Near-normal"
   - What's unclear: Whether to include df=30 (very near-normal) or if it's redundant
   - Recommendation: Use df=3, df=5, df=10 per CONTEXT.md; df=30 adds little value over Normal

3. **Loading state UX during Monte Carlo**
   - What we know: Calculation takes 500ms-2s
   - What's unclear: Best loading indicator (spinner, skeleton, progress bar)
   - Recommendation: Spinner with "Calculating..." text; results card skeleton if >1s

4. **Chart update behavior during calculation**
   - What we know: Chart shows prior distribution (doesn't depend on EVSI result)
   - What's unclear: Whether to show any indication that EVSI is recalculating
   - Recommendation: Chart updates immediately on prior change; only verdict card shows loading

## Sources

### Primary (HIGH confidence)
- jStat documentation (https://jstat.github.io/all.html) - Student-t PDF, CDF, quantile functions
- Comlink GitHub (https://github.com/GoogleChromeLabs/comlink) - Web Worker abstraction API
- vite-plugin-comlink npm (https://www.npmjs.com/package/vite-plugin-comlink) - Vite integration
- SPEC.md Sections A1-A7 - EVSI formulas, Cost of Delay, experiment design inputs
- 05-CONTEXT.md - User decisions on prior shape UX, verdict wording, CoD display

### Secondary (MEDIUM confidence)
- Wikipedia EVSI (https://en.wikipedia.org/wiki/Expected_value_of_sample_information) - Mathematical definition
- Wikipedia Conjugate Prior (https://en.wikipedia.org/wiki/Conjugate_prior) - Normal-Normal update formulas
- johnnyreilly Vite + Comlink blog (https://johnnyreilly.com/web-workers-comlink-vite-tanstack-query) - Vite integration patterns
- A/B test statistics formulas (various) - Standard error of proportions

### Tertiary (LOW confidence)
- WebSearch results on Monte Carlo EVSI efficiency - Academic papers, may need adaptation
- Web Worker best practices 2025 - General guidance, project-specific needs may differ

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - jStat and Comlink are mature, well-documented libraries
- Architecture: HIGH - Follows existing codebase patterns, clean separation of concerns
- EVSI algorithm: MEDIUM - Algorithm is sound, but Monte Carlo tuning may need iteration
- Normal fast path: HIGH - Closed-form math from established statistical literature
- Pitfalls: HIGH - Common issues identified from research and existing codebase patterns

**Research date:** 2026-01-30
**Valid until:** 60 days (stable domain, libraries have infrequent releases)
