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
      guideEnabled: true, // Default ON for new sessions (D-06)

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
        set({
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
       * Only persist inputs and guideEnabled to sessionStorage.
       * Navigation state (currentSection, completedSections) is not persisted
       * so users start fresh on page refresh but keep their input values.
       * guideEnabled is persisted so dismissal state survives page navigation
       * within a session (D-06).
       */
      partialize: (state) => ({
        inputs: state.inputs,
        guideEnabled: state.guideEnabled,
      }),
      /**
       * Sanitize persisted state: remove obsolete keys (e.g., conversionLatencyDays
       * removed in ENG-07) so old sessionStorage snapshots don't pollute the state.
       * Also handles guideEnabled — defaults to true if missing from snapshot.
       */
      merge: (persistedState: unknown, currentState: WizardStore): WizardStore => {
        const persisted = persistedState as Partial<Pick<WizardStore, 'inputs' | 'guideEnabled'>> | undefined;
        if (!persisted) return currentState;

        // Only copy keys that exist in current initialInputs (strips obsolete fields)
        let cleanInputs = currentState.inputs;
        if (persisted.inputs) {
          cleanInputs = { ...currentState.inputs };
          for (const key of Object.keys(currentState.inputs) as (keyof typeof currentState.inputs)[]) {
            if (key in persisted.inputs) {
              (cleanInputs as Record<string, unknown>)[key] =
                (persisted.inputs as Record<string, unknown>)[key];
            }
          }
        }

        // guideEnabled: default true if not in snapshot (new session gets guidance ON — D-06)
        const guideEnabled = persisted.guideEnabled ?? true;

        return { ...currentState, inputs: cleanInputs, guideEnabled };
      },
    }
  )
);
