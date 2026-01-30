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

      /**
       * Set the calculator mode
       * When switching to 'basic', clears all advanced-only inputs
       * to prevent stale data from affecting calculations
       *
       * Also clears completedSections when switching modes, because:
       * - Basic mode has 4 sections: baseline(0), uncertainty(1), threshold(2), results(3)
       * - Advanced mode has 5 sections: baseline(0), uncertainty(1), threshold(2), test-design(3), results(4)
       * - Section indices don't align between modes (index 3 is results in Basic but test-design in Advanced)
       * - Preserving completedSections would incorrectly mark test-design as complete when switching B->A
       */
      setMode: (mode: Mode) => {
        set((state) => {
          // Skip if already in this mode
          if (state.mode === mode) {
            return state;
          }

          // When switching to basic mode, clear advanced inputs
          if (mode === 'basic') {
            return {
              mode,
              inputs: {
                ...state.inputs,
                advanced: initialAdvancedInputs,
              },
              // Clear completedSections when switching modes
              // Section indices don't align between Basic (4 sections) and Advanced (5 sections)
              completedSections: [],
              currentSection: 0,
            };
          }
          // When switching to advanced, initialize priorShape if not set
          // This ensures the default "Normal" selection in the UI is reflected in state
          return {
            mode,
            inputs: {
              ...state.inputs,
              advanced: {
                ...state.inputs.advanced,
                priorShape: state.inputs.advanced.priorShape ?? 'normal',
              },
            },
            // Clear completedSections when switching modes
            // Section indices don't align between Basic (4 sections) and Advanced (5 sections)
            completedSections: [],
            currentSection: 0,
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
       * Reset all wizard state to initial values
       * Used when user wants to start over
       */
      resetWizard: () => {
        set({
          mode: 'basic',
          inputs: initialInputs,
          currentSection: 0,
          completedSections: [],
        });
      },
    }),
    {
      name: 'wizard-storage',
      storage: createJSONStorage(() => sessionStorage),
      /**
       * Only persist inputs and mode to sessionStorage
       * Navigation state (currentSection, completedSections) is not persisted
       * so users start fresh on page refresh but keep their input values
       */
      partialize: (state) => ({
        inputs: state.inputs,
        mode: state.mode,
      }),
    }
  )
);
