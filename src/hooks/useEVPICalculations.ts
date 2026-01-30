/**
 * EVPI Calculations Hook
 *
 * React hook that computes EVPI results from the current wizard store state.
 * Returns null if inputs are incomplete or invalid.
 *
 * Key behaviors:
 * - Reads inputs from Zustand store via selector
 * - Validates all required inputs are present
 * - Derives prior parameters from interval or uses default
 * - Converts threshold to lift units
 * - Memoizes calculation to avoid unnecessary recomputation
 *
 * Per 03-CONTEXT.md: Results section hidden until all inputs are valid.
 */

import { useMemo } from 'react';
import { useWizardStore } from '@/stores/wizardStore';
import { calculateEVPI, normalizeThresholdToLift, deriveK } from '@/lib/calculations';
import { computePriorFromInterval, DEFAULT_PRIOR, DEFAULT_INTERVAL } from '@/lib/prior';
import type { EVPIResults } from '@/lib/calculations/types';

/**
 * Hook that computes EVPI results from current wizard store state.
 *
 * @returns EVPIResults if all inputs are valid, null otherwise
 *
 * @example
 * const results = useEVPICalculations();
 * if (results) {
 *   console.log(`EVPI: $${results.evpiDollars}`);
 *   console.log(`Decision: ${results.defaultDecision}`);
 * }
 */
export function useEVPICalculations(): EVPIResults | null {
  // Select only the shared inputs we need for Basic mode
  const inputs = useWizardStore((state) => state.inputs.shared);

  return useMemo(() => {
    // ===========================================
    // Step 1: Validate all required inputs are present
    // ===========================================
    // Per 03-CONTEXT.md: "Incomplete inputs: Results section hidden"
    if (
      inputs.baselineConversionRate === null ||
      inputs.annualVisitors === null ||
      inputs.valuePerConversion === null ||
      inputs.thresholdScenario === null
    ) {
      return null;
    }

    // For "minimum-lift" and "accept-loss" scenarios,
    // we need a threshold value and unit
    if (
      inputs.thresholdScenario !== 'any-positive' &&
      (inputs.thresholdValue === null || inputs.thresholdUnit === null)
    ) {
      return null;
    }

    // ===========================================
    // Step 2: Derive prior parameters
    // ===========================================
    // Per SPEC.md Section 6.2: Use default N(0, 0.05) or compute from interval
    let prior;

    // Determine if using default prior
    // Per STATE.md decision "Derive priorType at validation time":
    // Compare interval values to defaults, don't track as separate UI state
    const isDefaultPrior =
      inputs.priorIntervalLow !== null &&
      inputs.priorIntervalHigh !== null &&
      Math.abs(inputs.priorIntervalLow - DEFAULT_INTERVAL.low) < 0.01 &&
      Math.abs(inputs.priorIntervalHigh - DEFAULT_INTERVAL.high) < 0.01;

    if (isDefaultPrior || inputs.priorIntervalLow === null || inputs.priorIntervalHigh === null) {
      // Use default prior when:
      // 1. Interval values match defaults (within tolerance)
      // 2. Interval values are not yet set
      prior = DEFAULT_PRIOR;
    } else {
      // Compute custom prior from user-specified interval
      prior = computePriorFromInterval(
        inputs.priorIntervalLow,
        inputs.priorIntervalHigh
      );
    }

    // ===========================================
    // Step 3: Calculate K (needed for threshold conversion)
    // ===========================================
    // K = N_year * CR0 * V
    // This is the scaling constant that converts lift (decimal) to dollars
    const K = deriveK(
      inputs.annualVisitors,
      inputs.baselineConversionRate,
      inputs.valuePerConversion
    );

    // ===========================================
    // Step 4: Convert threshold to lift units (decimal)
    // ===========================================
    // Per SPEC.md Section 7.3: Handle different threshold scenarios
    let threshold_L: number;

    if (inputs.thresholdScenario === 'any-positive') {
      // T_L = 0 for "ship any positive impact"
      threshold_L = 0;
    } else if (inputs.thresholdUnit === null || inputs.thresholdValue === null) {
      // Should not reach here due to validation above, but defensive
      return null;
    } else {
      // For "minimum-lift" and "accept-loss" scenarios
      // Note: thresholdValue is already negative for "accept-loss" (per 02-03 sign convention)
      threshold_L = normalizeThresholdToLift(
        inputs.thresholdValue,
        inputs.thresholdUnit,
        K
      );
    }

    // ===========================================
    // Step 5: Calculate EVPI
    // ===========================================
    return calculateEVPI({
      baselineConversionRate: inputs.baselineConversionRate,
      annualVisitors: inputs.annualVisitors,
      valuePerConversion: inputs.valuePerConversion,
      prior,
      threshold_L,
    });
  }, [
    // Explicitly list all input fields in dependencies to avoid stale results
    // Per 03-RESEARCH.md pitfall #6
    inputs.baselineConversionRate,
    inputs.annualVisitors,
    inputs.valuePerConversion,
    inputs.priorIntervalLow,
    inputs.priorIntervalHigh,
    inputs.thresholdScenario,
    inputs.thresholdUnit,
    inputs.thresholdValue,
  ]);
}
