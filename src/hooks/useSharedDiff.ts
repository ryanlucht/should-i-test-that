/**
 * useSharedDiff Hook
 *
 * Returns a Set of WizardInputs keys that differ between the current inputs
 * and the shared URL baseline, plus an isFieldModified convenience function.
 *
 * When a user arrives via a shared URL, App.tsx calls setSharedBaseline with
 * the decoded inputs snapshot. This hook compares live inputs against that
 * snapshot so typed-input components can show a visual "(edited)" indicator
 * on fields the recipient has changed (D-08).
 *
 * Returns an empty Set when:
 * - sharedBaseline is null (normal session, not from a shared URL)
 * - All current input values still match the shared baseline exactly
 *
 * Uses narrow Zustand selectors to minimize re-renders:
 * - Only subscribes to `inputs` and `sharedBaseline`
 * - useMemo prevents recalculating when neither changes
 */

import { useMemo } from 'react';
import { useWizardStore } from '@/stores/wizardStore';
import type { WizardInputs } from '@/types/wizard';

/**
 * Diff tracker for shared URL visual indicators.
 *
 * @returns modifiedFields - Set of WizardInputs keys that differ from the
 *   shared baseline (empty if no baseline or no modifications)
 * @returns isFieldModified - Convenience function: true if the given field
 *   key is in modifiedFields
 */
export function useSharedDiff(): {
  modifiedFields: Set<keyof WizardInputs>;
  isFieldModified: (field: keyof WizardInputs) => boolean;
} {
  // Narrow selectors — only re-renders when inputs or baseline change
  const inputs = useWizardStore((state) => state.inputs);
  const sharedBaseline = useWizardStore((state) => state.sharedBaseline);

  /**
   * Compute the set of field keys where the current value differs from
   * the shared baseline snapshot.
   *
   * Uses strict equality (===) — sufficient for the primitive/null types
   * in WizardInputs (numbers, strings, null, and small literal unions).
   */
  const modifiedFields = useMemo(() => {
    // No baseline means this is a normal (non-shared) session — no indicators
    if (!sharedBaseline) return new Set<keyof WizardInputs>();

    const changed = new Set<keyof WizardInputs>();
    for (const key of Object.keys(sharedBaseline) as (keyof WizardInputs)[]) {
      if (inputs[key] !== sharedBaseline[key]) {
        changed.add(key);
      }
    }
    return changed;
  }, [inputs, sharedBaseline]);

  /**
   * Convenience function for per-field modified check.
   * Memoized so that components calling isFieldModified('fieldName')
   * don't get a new function reference on every render.
   */
  const isFieldModified = useMemo(
    () => (field: keyof WizardInputs) => modifiedFields.has(field),
    [modifiedFields]
  );

  return { modifiedFields, isFieldModified };
}
