/**
 * Wizard Store
 *
 * Zustand store for managing wizard state including:
 * - User inputs (flat WizardInputs structure)
 * - Navigation state (current section, completed sections)
 *
 * Uses persist middleware with sessionStorage to maintain state
 * within a browser session (clears on tab close).
 *
 * Key behaviors:
 * - Single EVSI-based calculator mode (no mode switching)
 * - Navigation state is NOT persisted (fresh start on page refresh)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WizardStore, WizardInputs } from '@/types/wizard';
import { initialInputs } from '@/types/wizard';

/**
 * Zustand store for wizard state management
 *
 * Persistence: Only inputs are persisted to sessionStorage.
 * Navigation state (currentSection, completedSections) resets on page refresh.
 */
export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      // Initial state
      inputs: initialInputs,
      currentSection: 0,
      completedSections: [],

      /**
       * Update an input value in the flat inputs object
       */
      setInput: <K extends keyof WizardInputs>(
        key: K,
        value: WizardInputs[K]
      ) => {
        set((state) => ({
          inputs: { ...state.inputs, [key]: value },
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
       * Only persist inputs to sessionStorage
       * Navigation state (currentSection, completedSections) is not persisted
       * so users start fresh on page refresh but keep their input values
       */
      partialize: (state) => ({
        inputs: state.inputs,
      }),
      /**
       * Sanitize persisted state: remove obsolete keys that would cause type errors.
       * This handles the conversionLatencyDays removal (ENG-07) gracefully --
       * old sessionStorage snapshots containing conversionLatencyDays are silently
       * ignored on rehydration instead of polluting the state.
       */
      merge: (persistedState: unknown, currentState: WizardStore): WizardStore => {
        const persisted = persistedState as Partial<Pick<WizardStore, 'inputs' | 'mode'>> | undefined;
        if (!persisted) return currentState;

        // Start with current state as base
        const merged = { ...currentState };

        // Restore mode if present
        if (persisted.mode) {
          merged.mode = persisted.mode;
        }

        // Restore inputs, but only keep keys that exist in current initial state
        if (persisted.inputs) {
          // Sanitize shared inputs: only copy known keys
          if (persisted.inputs.shared) {
            const cleanShared = { ...currentState.inputs.shared };
            for (const key of Object.keys(currentState.inputs.shared) as (keyof typeof currentState.inputs.shared)[]) {
              if (key in persisted.inputs.shared) {
                (cleanShared as Record<string, unknown>)[key] =
                  (persisted.inputs.shared as Record<string, unknown>)[key];
              }
            }
            merged.inputs = { ...merged.inputs, shared: cleanShared };
          }

          // Sanitize advanced inputs: only copy known keys (strips obsolete conversionLatencyDays etc.)
          if (persisted.inputs.advanced) {
            const cleanAdvanced = { ...currentState.inputs.advanced };
            for (const key of Object.keys(currentState.inputs.advanced) as (keyof typeof currentState.inputs.advanced)[]) {
              if (key in persisted.inputs.advanced) {
                (cleanAdvanced as Record<string, unknown>)[key] =
                  (persisted.inputs.advanced as Record<string, unknown>)[key];
              }
            }
            merged.inputs = { ...merged.inputs, advanced: cleanAdvanced };
          }
        }

        return merged;
      },
    }
  )
);
