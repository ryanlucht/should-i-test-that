/**
 * Wizard Store
 *
 * Zustand store for managing wizard state including:
 * - Mode selection (basic/advanced)
 * - User inputs (shared and advanced-only)
 * - Navigation state (current section, completed sections)
 *
 * Uses persist middleware with sessionStorage to maintain state
 * within a browser session (clears on tab close).
 *
 * Key behaviors:
 * - Shared inputs persist across mode switches
 * - Advanced-only inputs are cleared when switching to Basic mode
 * - Navigation state is NOT persisted (fresh start on page refresh)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Mode,
  WizardStore,
  SharedInputs,
  AdvancedInputs,
  InputsState,
} from '@/types/wizard';
import {
  initialSharedInputs,
  initialAdvancedInputs,
} from '@/types/wizard';
import { trackModeSelected } from '@/lib/analytics';

/**
 * Initial inputs state combining shared and advanced values
 */
const initialInputs: InputsState = {
  shared: initialSharedInputs,
  advanced: initialAdvancedInputs,
};

/**
 * Zustand store for wizard state management
 *
 * Persistence: Only mode and inputs are persisted to sessionStorage.
 * Navigation state (currentSection, completedSections) resets on page refresh.
 */
export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: 'basic',
      inputs: initialInputs,
      currentSection: 0,
      completedSections: [],
      guideEnabled: true, // Default ON for new sessions (D-06)

      /**
       * Set the calculator mode
       * When switching to 'basic', saves advanced inputs AND section state to sessionStorage backup
       * and clears them from state to prevent affecting Basic calculations.
       * When switching to 'advanced', restores inputs AND section state from backup if available.
       *
       * Section state (currentSection, completedSections) is backed up per mode:
       * - wizard-advanced-backup: stores advanced inputs + section state when leaving advanced
       * - wizard-basic-backup: stores section state when leaving basic
       *
       * This allows users to resume where they left off when switching back to a mode.
       * Each mode has independent section indices (Basic: 4 sections, Advanced: 5 sections),
       * and each backup stores the correct indices for that mode.
       */
      setMode: (mode: Mode) => {
        set((state) => {
          // Skip if already in this mode
          if (state.mode === mode) {
            return state;
          }

          // Track mode selection for analytics (OBS-06)
          trackModeSelected(mode);

          // When switching to basic mode, backup advanced state and restore basic state
          if (mode === 'basic') {
            // Backup advanced inputs AND section state to sessionStorage before clearing (POL-03)
            try {
              sessionStorage.setItem(
                'wizard-advanced-backup',
                JSON.stringify({
                  advanced: state.inputs.advanced,
                  currentSection: state.currentSection,
                  completedSections: state.completedSections,
                })
              );
            } catch {
              // Ignore sessionStorage errors (private browsing, quota exceeded, etc.)
            }

            // Restore basic section state from backup if available
            let restoredCurrentSection = 0;
            let restoredCompletedSections: number[] = [];
            try {
              const basicBackup = sessionStorage.getItem('wizard-basic-backup');
              if (basicBackup) {
                const parsed = JSON.parse(basicBackup);
                restoredCurrentSection = typeof parsed.currentSection === 'number' ? parsed.currentSection : 0;
                restoredCompletedSections = Array.isArray(parsed.completedSections) ? parsed.completedSections : [];
              }
            } catch {
              // Ignore parse errors, use defaults
            }

            return {
              mode,
              inputs: {
                ...state.inputs,
                advanced: initialAdvancedInputs,
              },
              currentSection: restoredCurrentSection,
              completedSections: restoredCompletedSections,
            };
          }

          // When switching to advanced, backup basic section state and restore advanced state (POL-03)
          // First, backup current basic section state
          try {
            sessionStorage.setItem(
              'wizard-basic-backup',
              JSON.stringify({
                currentSection: state.currentSection,
                completedSections: state.completedSections,
              })
            );
          } catch {
            // Ignore sessionStorage errors
          }

          // Restore advanced inputs AND section state from backup
          let restoredAdvanced = state.inputs.advanced;
          let restoredCurrentSection = 0;
          let restoredCompletedSections: number[] = [];
          try {
            const backup = sessionStorage.getItem('wizard-advanced-backup');
            if (backup) {
              const parsed = JSON.parse(backup);
              // Restore advanced inputs (backward compatible: handle old format or new format)
              const advancedInputs = parsed.advanced ?? parsed;
              restoredAdvanced = {
                ...state.inputs.advanced,
                ...advancedInputs,
                // Ensure priorShape has a default
                priorShape: advancedInputs.priorShape ?? state.inputs.advanced.priorShape ?? 'normal',
              };
              // Restore section state (new fields, may not exist in old backups)
              restoredCurrentSection = typeof parsed.currentSection === 'number' ? parsed.currentSection : 0;
              restoredCompletedSections = Array.isArray(parsed.completedSections) ? parsed.completedSections : [];
            }
          } catch {
            // Ignore parse errors, use current state
          }

          return {
            mode,
            inputs: {
              ...state.inputs,
              advanced: {
                ...restoredAdvanced,
                priorShape: restoredAdvanced.priorShape ?? 'normal',
              },
            },
            currentSection: restoredCurrentSection,
            completedSections: restoredCompletedSections,
          };
        });
      },

      /**
       * Update a shared input value
       * These inputs persist across mode switches
       */
      setSharedInput: <K extends keyof SharedInputs>(
        key: K,
        value: SharedInputs[K]
      ) => {
        set((state) => ({
          inputs: {
            ...state.inputs,
            shared: {
              ...state.inputs.shared,
              [key]: value,
            },
          },
        }));
      },

      /**
       * Update an advanced-only input value
       * These inputs are cleared when switching to basic mode
       */
      setAdvancedInput: <K extends keyof AdvancedInputs>(
        key: K,
        value: AdvancedInputs[K]
      ) => {
        set((state) => ({
          inputs: {
            ...state.inputs,
            advanced: {
              ...state.inputs.advanced,
              [key]: value,
            },
          },
        }));
      },

      /**
       * Set the currently active section index
       */
      setCurrentSection: (section: number) => {
        set({ currentSection: section });
      },

      /**
       * Mark a section as completed
       * Uses array instead of Set for JSON serialization compatibility
       */
      markSectionComplete: (section: number) => {
        set((state) => {
          if (state.completedSections.includes(section)) {
            return state; // Already completed, no change
          }
          return {
            completedSections: [...state.completedSections, section],
          };
        });
      },

      /**
       * Check if user can access a specific section
       * User can only access section N if all sections 0..N-1 are completed
       * Section 0 is always accessible
       */
      canAccessSection: (section: number): boolean => {
        if (section === 0) return true;
        const { completedSections } = get();
        for (let i = 0; i < section; i++) {
          if (!completedSections.includes(i)) {
            return false;
          }
        }
        return true;
      },

      /**
       * Enable or disable the Learning Bits guide dialogue
       * Persisted in sessionStorage via Zustand partialize (D-06)
       */
      setGuideEnabled: (enabled: boolean) => {
        set({ guideEnabled: enabled });
      },

      /**
       * Reset all wizard state to initial values
       * Used when user wants to start over
       */
      resetWizard: () => {
        // Clear mode-switch backups so stale data doesn't repopulate after reset
        try {
          sessionStorage.removeItem('wizard-advanced-backup');
          sessionStorage.removeItem('wizard-basic-backup');
        } catch {
          // Storage may be unavailable in some environments
        }
        set({
          mode: 'basic',
          inputs: initialInputs,
          currentSection: 0,
          completedSections: [],
          guideEnabled: true, // Reset guide to default ON (D-06)
        });
      },
    }),
    {
      name: 'wizard-storage',
      storage: createJSONStorage(() => sessionStorage),
      /**
       * Only persist inputs, mode, and guideEnabled to sessionStorage.
       * Navigation state (currentSection, completedSections) is not persisted
       * so users start fresh on page refresh but keep their input values.
       * guideEnabled is persisted so dismissal state survives page navigation
       * within a session (D-06).
       */
      partialize: (state) => ({
        inputs: state.inputs,
        mode: state.mode,
        guideEnabled: state.guideEnabled,
      }),
      /**
       * Sanitize persisted state and handle top-level fields (guideEnabled).
       * Old sessionStorage snapshots that lack guideEnabled default to true (new session = guidance ON).
       */
      merge: (persistedState: unknown, currentState: WizardStore): WizardStore => {
        const persisted = persistedState as Partial<Pick<WizardStore, 'inputs' | 'mode' | 'guideEnabled'>> | undefined;
        if (!persisted) return currentState;

        // Restore inputs if present (use currentState as base to preserve any new fields)
        const restoredInputs = persisted.inputs
          ? {
              shared: { ...currentState.inputs.shared, ...persisted.inputs.shared },
              advanced: { ...currentState.inputs.advanced, ...persisted.inputs.advanced },
            }
          : currentState.inputs;

        // guideEnabled: default true if not in snapshot (new session gets guidance ON — D-06)
        const guideEnabled = persisted.guideEnabled ?? true;

        return {
          ...currentState,
          inputs: restoredInputs,
          mode: persisted.mode ?? currentState.mode,
          guideEnabled,
        };
      },
    }
  )
);
