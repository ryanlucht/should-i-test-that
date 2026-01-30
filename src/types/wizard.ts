/**
 * Wizard Types
 *
 * Type definitions for the wizard state management system.
 * Used by the Zustand store to track mode selection, user inputs,
 * and navigation through the calculator sections.
 */

/**
 * Calculator mode - determines which inputs and calculations are shown
 * - basic: EVPI calculation with fewer inputs (3 business inputs + prior selection)
 * - advanced: EVSI calculation with test design, cost inputs, and Cost of Delay
 */
export type Mode = 'basic' | 'advanced';

/**
 * Section identifiers for the calculator wizard
 * Used for navigation tracking and progress indicator
 */
export type SectionId =
  | 'business-inputs'
  | 'prior-selection'
  | 'threshold'
  | 'test-design' // Advanced only
  | 'costs' // Advanced only
  | 'results';

/**
 * Shared inputs that persist across mode switches
 * These values are used in both Basic and Advanced calculations
 */
export interface SharedInputs {
  /** Baseline conversion rate as a decimal (e.g., 0.05 for 5%) */
  baselineConversionRate: number | null;
  /** Annual visitors/traffic */
  annualVisitors: number | null;
  /** User-editable label for visitors (visitors/sessions/leads/etc.) */
  visitorUnitLabel: string;
  /** Revenue or value per conversion in dollars */
  valuePerConversion: number | null;
  /** Prior type selection: 'default' uses N(0, 0.05), 'custom' uses interval bounds */
  priorType: 'default' | 'custom' | null;
  /** Lower bound of 90% credible interval (percentage form, e.g., -5 for -5%) */
  priorIntervalLow: number | null;
  /** Upper bound of 90% credible interval (percentage form, e.g., 10 for 10%) */
  priorIntervalHigh: number | null;
  /** Threshold scenario: 'any-positive' | 'minimum-lift' | 'accept-loss' */
  thresholdScenario: 'any-positive' | 'minimum-lift' | 'accept-loss' | null;
  /** Threshold unit when applicable: 'dollars' | 'lift' */
  thresholdUnit: 'dollars' | 'lift' | null;
  /** Threshold value in the selected unit (can be negative for accept-loss scenario) */
  thresholdValue: number | null;
}

/**
 * Advanced-only inputs that are cleared when switching to Basic mode
 * These are only relevant for EVSI calculations
 */
export interface AdvancedInputs {
  /** Test duration in weeks */
  testDuration: number | null;
  /** Daily traffic allocated to the test */
  dailyTestTraffic: number | null;
  /** Percentage of traffic to allocate to treatment (usually 50%) */
  trafficAllocation: number | null;
  /** Fixed cost to run the test (engineering, design, etc.) */
  testFixedCost: number | null;
  /** Opportunity cost per day of delay */
  dailyCostOfDelay: number | null;
}

/**
 * Combined inputs state containing both shared and advanced-only values
 */
export interface InputsState {
  shared: SharedInputs;
  advanced: AdvancedInputs;
}

/**
 * Navigation state for tracking progress through the wizard
 * Note: This is NOT persisted to sessionStorage
 */
export interface NavigationState {
  /** Index of the currently active section */
  currentSection: number;
  /** Array of section indices that have been completed (uses array for serialization) */
  completedSections: number[];
}

/**
 * Initial values for shared inputs
 */
export const initialSharedInputs: SharedInputs = {
  baselineConversionRate: null,
  annualVisitors: null,
  visitorUnitLabel: 'visitors',
  valuePerConversion: null,
  priorType: null,
  priorIntervalLow: null,
  priorIntervalHigh: null,
  thresholdScenario: null,
  thresholdUnit: null,
  thresholdValue: null,
};

/**
 * Initial values for advanced-only inputs
 */
export const initialAdvancedInputs: AdvancedInputs = {
  testDuration: null,
  dailyTestTraffic: null,
  trafficAllocation: 50, // Default to 50/50 split
  testFixedCost: null,
  dailyCostOfDelay: null,
};

/**
 * Complete wizard state interface including mode, inputs, navigation, and actions
 */
export interface WizardState {
  // Mode
  mode: Mode;

  // Inputs
  inputs: InputsState;

  // Navigation (not persisted)
  currentSection: number;
  completedSections: number[];
}

/**
 * Wizard actions for state mutations
 */
export interface WizardActions {
  /** Set the calculator mode (basic/advanced) - clears advanced inputs when switching to basic */
  setMode: (mode: Mode) => void;

  /** Update a shared input value */
  setSharedInput: <K extends keyof SharedInputs>(
    key: K,
    value: SharedInputs[K]
  ) => void;

  /** Update an advanced-only input value */
  setAdvancedInput: <K extends keyof AdvancedInputs>(
    key: K,
    value: AdvancedInputs[K]
  ) => void;

  /** Set the current active section */
  setCurrentSection: (section: number) => void;

  /** Mark a section as completed */
  markSectionComplete: (section: number) => void;

  /** Check if user can access a specific section */
  canAccessSection: (section: number) => boolean;

  /** Reset all wizard state to initial values */
  resetWizard: () => void;
}

/**
 * Combined type for the complete Zustand store
 */
export type WizardStore = WizardState & WizardActions;
