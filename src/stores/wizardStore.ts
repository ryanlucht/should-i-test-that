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
    }
  )
);
