/**
 * Wizard Types
 *
 * Type definitions for the wizard state management system.
 * Used by the Zustand store to track user inputs
 * and navigation through the calculator sections.
 */

/**
 * Section identifiers for the calculator wizard
 * Used for navigation tracking and progress indicator
 *
 * Sections: Baseline, Uncertainty, Threshold, Test Design, Results
 */
export type SectionId =
  | 'business-inputs'
  | 'prior-selection'
  | 'threshold'
  | 'test-design'
  | 'costs'
  | 'results';

/**
 * All wizard inputs in a single flat structure.
 * Combines what was previously SharedInputs and AdvancedInputs
 * since there is only one calculator mode (EVSI).
 */
export interface WizardInputs {
  // --- Baseline Metrics ---

  /** Baseline conversion rate as a decimal (e.g., 0.05 for 5%) */
  baselineConversionRate: number | null;
  /** Annual visitors/traffic */
  annualVisitors: number | null;
  /** User-editable label for visitors (visitors/sessions/leads/etc.) */
  visitorUnitLabel: string;
  /** Revenue or value per conversion in dollars */
  valuePerConversion: number | null;

  // --- Prior / Uncertainty ---

  /** Prior type selection: 'default' uses N(0, 0.05), 'custom' uses interval bounds */
  priorType: 'default' | 'custom' | null;
  /** Lower bound of 90% credible interval (percentage form, e.g., -5 for -5%) */
  priorIntervalLow: number | null;
  /** Upper bound of 90% credible interval (percentage form, e.g., 10 for 10%) */
  priorIntervalHigh: number | null;
  /** Prior distribution shape (normal, student-t, or uniform) */
  priorShape: 'normal' | 'student-t' | 'uniform' | null;
  /** Degrees of freedom for Student-t distribution (3=Heavy, 5=Moderate, 10=Near-normal) */
  studentTDf: 3 | 5 | 10 | null;

  // --- Threshold ---

  /** Threshold scenario: 'any-positive' | 'minimum-lift' | 'accept-loss' */
  thresholdScenario: 'any-positive' | 'minimum-lift' | 'accept-loss' | null;
  /** Threshold unit when applicable: 'dollars' | 'lift' */
  thresholdUnit: 'dollars' | 'lift' | null;
  /** Threshold value in the selected unit (can be negative for accept-loss scenario) */
  thresholdValue: number | null;

  // --- Experiment Design ---

  /** Test duration in days */
  testDurationDays: number | null;
  /** Daily traffic eligible for the experiment */
  dailyTraffic: number | null;
  /** Fraction of traffic seeing the variant (e.g., 0.5 for 50/50 split) */
  trafficSplit: number | null;
  /** Fraction of all traffic eligible for the experiment (e.g., 1.0 for 100%) */
  eligibilityFraction: number | null;
  /** Days after test ends before you can ship the decision (include data maturation time) */
  decisionLatencyDays: number | null;
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
 * Initial values for all wizard inputs
 *
 * Defaults:
 * - priorShape: 'normal' (always in EVSI mode)
 * - studentTDf: null (only relevant when priorShape is 'student-t')
 * - trafficSplit: 0.5 (50/50 default, pre-filled)
 * - eligibilityFraction: 1.0 (100% default, pre-filled)
 * - latency fields: 0 (default, pre-filled)
 * - duration and daily traffic: null (user must enter)
 */
export const initialInputs: WizardInputs = {
  baselineConversionRate: null,
  annualVisitors: null,
  visitorUnitLabel: 'visitors',
  valuePerConversion: null,
  priorType: null,
  priorIntervalLow: null,
  priorIntervalHigh: null,
  priorShape: 'normal', // Always in EVSI mode, default to Normal
  studentTDf: null, // Only used when priorShape is 'student-t'
  thresholdScenario: null,
  thresholdUnit: null,
  thresholdValue: null,
  testDurationDays: null,
  dailyTraffic: null,
  trafficSplit: 0.5, // Default to 50/50 split
  eligibilityFraction: 1.0, // Default to 100% eligible
  decisionLatencyDays: 0, // Default to 0 days (include data maturation time)
};

/**
 * Complete wizard state interface including inputs, navigation, and actions
 */
export interface WizardState {
  // Inputs
  inputs: WizardInputs;

  // Navigation (not persisted)
  currentSection: number;
  completedSections: number[];

  // Guide state (persisted in sessionStorage via Zustand — D-06)
  guideEnabled: boolean; // Per D-06: defaults ON for new sessions

  /**
   * Snapshot of inputs from a shared URL, used for modified-field visual
   * indicators (D-08). Transient -- not persisted to sessionStorage.
   * Set during URL hydration in App.tsx; null for regular sessions.
   */
  sharedBaseline: WizardInputs | null;
}

/**
 * Wizard actions for state mutations
 */
export interface WizardActions {
  /** Update an input value */
  setInput: <K extends keyof WizardInputs>(
    key: K,
    value: WizardInputs[K]
  ) => void;

  /** Enable or disable the Learning Bits guide dialogue (D-06) */
  setGuideEnabled: (enabled: boolean) => void;

  /** Set the current active section */
  setCurrentSection: (section: number) => void;

  /** Mark a section as completed */
  markSectionComplete: (section: number) => void;

  /** Check if user can access a specific section */
  canAccessSection: (section: number) => boolean;

  /** Reset all wizard state to initial values */
  resetWizard: () => void;

  /** Store the shared URL's inputs as the baseline for diff tracking (D-08) */
  setSharedBaseline: (baseline: WizardInputs | null) => void;
}

/**
 * Combined type for the complete Zustand store
 */
export type WizardStore = WizardState & WizardActions;
