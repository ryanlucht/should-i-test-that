/**
 * Types for the "Should I Run an A/B Test?" Calculator
 * Based on Douglas Hubbard's "How to Measure Anything" Chapter 7
 */

// Screen navigation state
export type ScreenId = 'landing' | 'scenario' | 'calculator';

export interface AppState {
  currentScreen: ScreenId;
}

// Distribution types including fat-tailed t-distribution
export type DistributionType = 'normal' | 'uniform' | 't-distribution';

// Binary decision inputs (Scenario 1)
export interface BinaryInputs {
  probabilitySuccess: number; // 0-1
  valueIfSuccess: number;     // $ value if decision succeeds
  costIfFailure: number;      // $ cost if decision fails
}

// Binary decision results
export interface BinaryResults {
  eolIfApproved: number;  // Expected Opportunity Loss if we approve
  eolIfRejected: number;  // Expected Opportunity Loss if we reject
  bestDecision: 'approve' | 'reject';
  evpi: number;           // Expected Value of Perfect Information
}

// Range-based inputs (Scenario 2 / A/B Test)
export interface RangeInputs {
  lowerBound: number;           // Lower bound of 90% CI
  upperBound: number;           // Upper bound of 90% CI
  threshold: number;            // Breakeven point / decision threshold
  lossPerUnit: number;          // $ loss per unit below threshold
  distribution: DistributionType;
  degreesOfFreedom?: number;    // For t-distribution (default: 5)
}

// Range-based results
export interface RangeResults {
  mean: number;
  stdDev: number;
  relativeThreshold: number;  // RT = (Threshold - WB) / (BB - WB)
  eolf: number;               // Expected Opportunity Loss Factor
  evpi: number;
  probabilityBelowThreshold: number;
}

// For visualization data
export interface DistributionPoint {
  x: number;
  y: number;  // probability density
}

export interface LossPoint {
  x: number;
  y: number;  // loss amount
}

// EOL slice for discrete approximation (Exhibit 7.3)
export interface EOLSlice {
  value: number;           // midpoint of segment
  loss: number;            // opportunity loss at this value
  probability: number;     // incremental probability
  expectedLoss: number;    // loss × probability
}

// Scenario metadata
export interface ScenarioConfig {
  id: number;
  title: string;
  description: string;
  quote: string;           // Direct quote from Hubbard
  quoteAttribution: string;
}

// Tooltip content from Hubbard definitions
export interface TooltipDefinition {
  term: string;
  definition: string;
  source: string;  // e.g., "Hubbard, Chapter 7"
}

// ============================================================================
// A/B Test Specific Types
// ============================================================================

// Revenue calculation modes
export type RevenueInputMode = 'simple' | 'calculator';

// Inputs for calculator mode
export interface RevenueCalculatorInputs {
  baselineConversionRate: number;  // 0.05 = 5%
  averageOrderValue: number;       // $
  annualTraffic: number;          // Visitors per year
}

// A/B Test specific inputs (extends RangeInputs)
export interface ABTestInputs extends Omit<RangeInputs, 'lossPerUnit'> {
  revenueMode: RevenueInputMode;

  // Simple mode: direct input
  revenuePerPercentPoint?: number;

  // Calculator mode: computed from business metrics
  revenueCalculator?: RevenueCalculatorInputs;
}

// A/B Test results
export interface ABTestResults extends RangeResults {
  maxTestBudget: number;  // Alias for evpi - clearer for A/B test context
}
