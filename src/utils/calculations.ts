/**
 * Core EVI/EVPI Calculations
 * Based on Douglas Hubbard's "How to Measure Anything" Chapter 7
 *
 * Key concepts from Hubbard:
 * - "Expected Opportunity Loss (EOL) for a particular strategy is
 *    the chance of being wrong times the cost of being wrong"
 * - "The expected value of perfect information (EVPI) simply equals
 *    the EOL of whatever alternative you choose when you don't
 *    have perfect information"
 */

import type { BinaryInputs, BinaryResults, RangeInputs, RangeResults, EOLSlice } from '../types';
import {
  normalCDF,
  ciToParams,
  tDistributionCDF,
  ciToTDistributionParams,
} from './distributions';

/**
 * Calculate Expected Opportunity Loss for a binary decision
 *
 * From Hubbard: "EOL = chance of being wrong × cost of being wrong"
 *
 * @param probabilityWrong - Probability that this decision is wrong (0-1)
 * @param costIfWrong - The cost incurred if the decision turns out to be wrong
 * @returns Expected Opportunity Loss
 */
export function calculateBinaryEOL(probabilityWrong: number, costIfWrong: number): number {
  return probabilityWrong * costIfWrong;
}

/**
 * Calculate EVPI and related metrics for a binary decision
 *
 * Example from Hubbard (Exhibit 7.1):
 * - 60% chance campaign succeeds (P(success) = 0.6)
 * - If successful: $40M profit
 * - If fails: $5M loss
 *
 * EOL if approved = P(failure) × cost of failure = 0.4 × $5M = $2M
 * EOL if rejected = P(success) × foregone profit = 0.6 × $40M = $24M
 * Best decision: Approve (lower EOL)
 * EVPI = $2M (EOL of chosen alternative)
 *
 * @param inputs - Binary decision inputs
 * @returns Calculated results including EVPI
 */
export function calculateBinaryEVPI(inputs: BinaryInputs): BinaryResults {
  const { probabilitySuccess, valueIfSuccess, costIfFailure } = inputs;
  const probabilityFailure = 1 - probabilitySuccess;

  // EOL if we approve: we're wrong if it fails
  // "chance of being wrong" = probability of failure
  // "cost of being wrong" = cost if it fails
  const eolIfApproved = calculateBinaryEOL(probabilityFailure, costIfFailure);

  // EOL if we reject: we're wrong if it would have succeeded
  // "chance of being wrong" = probability of success
  // "cost of being wrong" = foregone value (opportunity cost)
  const eolIfRejected = calculateBinaryEOL(probabilitySuccess, valueIfSuccess);

  // Best decision has lower EOL
  const bestDecision = eolIfApproved <= eolIfRejected ? 'approve' : 'reject';

  // EVPI equals EOL of chosen alternative
  // From Hubbard: "The expected value of perfect information (EVPI)
  // simply equals the EOL of whatever alternative you choose when
  // you don't have perfect information"
  const evpi = bestDecision === 'approve' ? eolIfApproved : eolIfRejected;

  return {
    eolIfApproved,
    eolIfRejected,
    bestDecision,
    evpi,
  };
}

/**
 * Calculate the Relative Threshold (RT) for range-based decisions
 *
 * From Hubbard: RT = (Threshold - Worst Bound) / (Best Bound - Worst Bound)
 *
 * The RT tells us where the threshold falls within our uncertainty range,
 * normalized to 0-1. This is used for EOLF chart lookup.
 *
 * @param threshold - The decision threshold/breakeven point
 * @param lowerBound - Lower bound of 90% CI
 * @param upperBound - Upper bound of 90% CI
 * @param higherIsBetter - Whether higher values are better (default true)
 * @returns Relative threshold (0-1)
 */
export function calculateRelativeThreshold(
  threshold: number,
  lowerBound: number,
  upperBound: number,
  higherIsBetter: boolean = true
): number {
  const worstBound = higherIsBetter ? lowerBound : upperBound;
  const bestBound = higherIsBetter ? upperBound : lowerBound;

  // Handle edge case where bounds are equal
  if (bestBound === worstBound) return 0;

  const rt = (threshold - worstBound) / (bestBound - worstBound);

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, rt));
}

/**
 * EOLF (Expected Opportunity Loss Factor) lookup for normal distribution
 *
 * From Hubbard's Exhibit 7.5 - simplified approximation
 * The EOLF is multiplied by (loss per unit × range width) / 1000 to get EVPI
 *
 * This function approximates the EOLF values from the chart.
 * For RT near 0.5, EOLF is highest (~80 for normal distribution)
 * For RT near 0 or 1, EOLF approaches 0
 *
 * @param relativeThreshold - RT value (0-1)
 * @returns EOLF value (typically 0-80 for normal distribution)
 */
export function getEOLF(relativeThreshold: number): number {
  // Approximation based on Hubbard's EOLF chart (Exhibit 7.5)
  // The curve peaks around RT=0.5 and tapers to 0 at RT=0 and RT=1

  // Using the actual formula for normal distribution EOLF:
  // This is derived from the standard loss integral
  const rt = relativeThreshold;

  // Handle edge cases
  if (rt <= 0 || rt >= 1) return 0;

  // EOLF lookup table approximation for normal distribution
  // Based on values from Hubbard's Exhibit 7.5
  const eolfTable: [number, number][] = [
    [0.05, 8],
    [0.10, 17],
    [0.15, 26],
    [0.20, 35],
    [0.25, 43],
    [0.30, 50],
    [0.33, 53],  // Example from book
    [0.35, 56],
    [0.40, 63],
    [0.45, 69],
    [0.50, 74],  // Maximum for normal
    [0.55, 69],
    [0.60, 63],
    [0.65, 56],
    [0.67, 53],
    [0.70, 50],
    [0.75, 43],
    [0.80, 35],
    [0.85, 26],
    [0.90, 17],
    [0.95, 8],
  ];

  // Linear interpolation between table values
  for (let i = 0; i < eolfTable.length - 1; i++) {
    const [rt1, eolf1] = eolfTable[i];
    const [rt2, eolf2] = eolfTable[i + 1];

    if (rt >= rt1 && rt <= rt2) {
      const t = (rt - rt1) / (rt2 - rt1);
      return eolf1 + t * (eolf2 - eolf1);
    }
  }

  // Fallback for values outside table
  if (rt < 0.05) return rt * 160; // Linear approach to 0
  if (rt > 0.95) return (1 - rt) * 160;

  return 0;
}

/**
 * Calculate EVPI using the EOLF shortcut method
 *
 * From Hubbard: EVPI = (EOLF / 1000) × Loss Per Unit × Range Width
 *
 * Example from book:
 * - Range: 150K to 300K units (width = 150K)
 * - Threshold: 200K units
 * - RT = (200K - 150K) / (300K - 150K) = 50K / 150K = 0.33
 * - EOLF at RT=0.33 ≈ 53
 * - Loss per unit = $25
 * - EVPI = (53/1000) × $25 × 150,000 = $198,750
 *
 * @param inputs - Range-based decision inputs
 * @returns EVPI value
 */
export function calculateRangeEVPIQuick(inputs: RangeInputs): number {
  const { lowerBound, upperBound, threshold, lossPerUnit } = inputs;

  const rangeWidth = upperBound - lowerBound;
  const rt = calculateRelativeThreshold(threshold, lowerBound, upperBound);
  const eolf = getEOLF(rt);

  // EVPI = (EOLF / 1000) × loss per unit × range width
  return (eolf / 1000) * lossPerUnit * rangeWidth;
}

/**
 * Calculate EVPI using discrete approximation (Exhibit 7.3 method)
 *
 * This is the more transparent/educational method that shows how
 * EVPI is computed by slicing the distribution into segments.
 *
 * For each slice:
 * 1. Calculate the midpoint value
 * 2. Calculate the opportunity loss at that value
 * 3. Calculate the probability of that slice
 * 4. Multiply loss × probability
 * 5. Sum all slices
 *
 * Supports normal, uniform, and t-distribution.
 *
 * @param inputs - Range-based decision inputs
 * @param numSlices - Number of slices for approximation (default 1000)
 * @returns Object with EVPI and breakdown by slice
 */
export function calculateRangeEVPIDiscrete(
  inputs: RangeInputs,
  numSlices: number = 1000
): { evpi: number; slices: EOLSlice[] } {
  const { lowerBound, upperBound, threshold, lossPerUnit, distribution, degreesOfFreedom = 5 } = inputs;

  // Get distribution parameters based on distribution type
  let mean: number;
  let scaleParam: number; // stdDev for normal, scale for t-distribution

  if (distribution === 't-distribution') {
    const tParams = ciToTDistributionParams(lowerBound, upperBound, degreesOfFreedom);
    mean = tParams.mean;
    scaleParam = tParams.scale;
  } else {
    const normalParams = ciToParams(lowerBound, upperBound);
    mean = normalParams.mean;
    scaleParam = normalParams.stdDev;
  }

  // Calculate slice width
  // Extend range beyond 90% CI to capture tails
  // Use wider range for t-distribution to capture fat tails
  const tailMultiplier = distribution === 't-distribution' && degreesOfFreedom < 10 ? 6 : 4;
  const extendedLower = mean - tailMultiplier * scaleParam;
  const extendedUpper = mean + tailMultiplier * scaleParam;
  const sliceWidth = (extendedUpper - extendedLower) / numSlices;

  const slices: EOLSlice[] = [];
  let totalEOL = 0;

  for (let i = 0; i < numSlices; i++) {
    const sliceStart = extendedLower + i * sliceWidth;
    const sliceEnd = sliceStart + sliceWidth;
    const midpoint = (sliceStart + sliceEnd) / 2;

    // Calculate incremental probability for this slice
    let probability: number;

    if (distribution === 'uniform') {
      // Uniform: constant probability within CI bounds
      if (midpoint >= lowerBound && midpoint <= upperBound) {
        probability = 1 / (upperBound - lowerBound) * sliceWidth;
      } else {
        probability = 0;
      }
    } else if (distribution === 't-distribution') {
      // t-distribution: use t-distribution CDF difference
      probability = tDistributionCDF(sliceEnd, degreesOfFreedom, mean, scaleParam)
                  - tDistributionCDF(sliceStart, degreesOfFreedom, mean, scaleParam);
    } else {
      // Normal distribution: use normal CDF difference
      probability = normalCDF(sliceEnd, mean, scaleParam) - normalCDF(sliceStart, mean, scaleParam);
    }

    // Calculate opportunity loss at this value
    // Loss only occurs when actual value is below threshold
    // (assuming higher is better and we're committed to a decision that
    // requires the threshold to be met)
    let loss = 0;
    if (midpoint < threshold) {
      // Linear loss: loss per unit × shortfall
      loss = (threshold - midpoint) * lossPerUnit;
    }

    const expectedLoss = loss * probability;
    totalEOL += expectedLoss;

    // Store slice data (for visualization)
    if (probability > 0.0001) {  // Only store significant slices
      slices.push({
        value: midpoint,
        loss,
        probability,
        expectedLoss,
      });
    }
  }

  return {
    evpi: totalEOL,
    slices,
  };
}

/**
 * Full range-based EVPI calculation with all results
 *
 * Supports normal, uniform, and t-distribution.
 *
 * @param inputs - Range-based decision inputs
 * @returns Complete results including both methods
 */
export function calculateRangeEVPI(inputs: RangeInputs): RangeResults {
  const { lowerBound, upperBound, threshold, distribution, degreesOfFreedom = 5 } = inputs;

  // Get distribution parameters based on distribution type
  let mean: number;
  let stdDev: number;

  if (distribution === 't-distribution') {
    const tParams = ciToTDistributionParams(lowerBound, upperBound, degreesOfFreedom);
    mean = tParams.mean;
    stdDev = tParams.scale; // Use scale as stdDev equivalent for display
  } else {
    const normalParams = ciToParams(lowerBound, upperBound);
    mean = normalParams.mean;
    stdDev = normalParams.stdDev;
  }

  // Calculate relative threshold
  const relativeThreshold = calculateRelativeThreshold(threshold, lowerBound, upperBound);

  // Get EOLF (note: EOLF chart is for normal distribution, but still useful as reference)
  const eolf = getEOLF(relativeThreshold);

  // Calculate EVPI using discrete method (more accurate, supports all distributions)
  const { evpi } = calculateRangeEVPIDiscrete(inputs);

  // Calculate probability below threshold
  let probabilityBelowThreshold: number;
  if (distribution === 'uniform') {
    if (threshold <= lowerBound) {
      probabilityBelowThreshold = 0;
    } else if (threshold >= upperBound) {
      probabilityBelowThreshold = 1;
    } else {
      probabilityBelowThreshold = (threshold - lowerBound) / (upperBound - lowerBound);
    }
  } else if (distribution === 't-distribution') {
    probabilityBelowThreshold = tDistributionCDF(threshold, degreesOfFreedom, mean, stdDev);
  } else {
    probabilityBelowThreshold = normalCDF(threshold, mean, stdDev);
  }

  return {
    mean,
    stdDev,
    relativeThreshold,
    eolf,
    evpi,
    probabilityBelowThreshold,
  };
}
