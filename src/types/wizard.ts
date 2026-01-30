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
 *
 * Per 05-CONTEXT.md:
 * Prior shape inputs:
 * - priorShape: 'normal' (default when switching to Advanced), 'student-t', or 'uniform'
 * - studentTDf: Degrees of freedom for Student-t (3=Heavy, 5=Moderate, 10=Near-normal)
 *
 * Experiment design inputs:
 * - testDurationDays: required, user must enter
 * - dailyTraffic: required, can auto-derive from annual visitors / 365
 * - trafficSplit: 0.5 default (50/50 split)
 * - eligibilityFraction: 1.0 default (100% eligible)
 * - conversionLatencyDays: 0 default (days from exposure to expected conversion)
 * - decisionLatencyDays: 0 default (days after test ends before shipping)
 */
export interface AdvancedInputs {
  /** Prior distribution shape (normal, student-t, or uniform) - defaults to 'normal' in Advanced mode */
  priorShape: 'normal' | 'student-t' | 'uniform' | null;
  /** Degrees of freedom for Student-t distribution (3=Heavy, 5=Moderate, 10=Near-normal) */
  studentTDf: 3 | 5 | 10 | null;
  /** Test duration in days */
  testDurationDays: number | null;
  /** Daily traffic eligible for the experiment */
  dailyTraffic: number | null;
  /** Fraction of traffic seeing the variant (e.g., 0.5 for 50/50 split) */
  trafficSplit: number | null;
  /** Fraction of all traffic eligible for the experiment (e.g., 1.0 for 100%) */
  eligibilityFraction: number | null;
  /** Days from exposure to expected conversion (e.g., 7 for weekly purchases) */
  conversionLatencyDays: number | null;
  /** Days after test ends before you can ship the decision */
  decisionLatencyDays: number | null;
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
 * Per 05-CONTEXT.md defaults:
 * - priorShape: null (set to 'normal' when switching Basic -> Advanced)
 * - studentTDf: null (only relevant when priorShape is 'student-t')
 * - trafficSplit: 0.5 (50/50 default, pre-filled)
 * - eligibilityFraction: 1.0 (100% default, pre-filled)
 * - latency fields: 0 (default, pre-filled)
 * - duration and daily traffic: null (user must enter)
 */
export const initialAdvancedInputs: AdvancedInputs = {
  priorShape: null, // Set to 'normal' when switching to Advanced mode
  studentTDf: null, // Only used when priorShape is 'student-t'
  testDurationDays: null,
  dailyTraffic: null,
  trafficSplit: 0.5, // Default to 50/50 split
  eligibilityFraction: 1.0, // Default to 100% eligible
  conversionLatencyDays: 0, // Default to 0 days
  decisionLatencyDays: 0, // Default to 0 days
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
