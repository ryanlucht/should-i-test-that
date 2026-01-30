/**
 * Mode Toggle Component
 *
 * Segmented control for switching between Basic and Advanced calculator modes.
 * Placed in the sticky header on the Calculator page.
 *
 * Design spec:
 * - Container: inline-flex, rounded, subtle background
 * - Inactive: transparent background, secondary text
 * - Active: white background, primary text, subtle shadow
 *
 * Behavior:
 * - Switching to Basic clears advanced-only inputs (handled by store)
 * - Switching to Advanced preserves all existing inputs
 */

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useWizardStore } from '@/stores/wizardStore';
import type { Mode } from '@/types/wizard';

/**
 * Segmented toggle for Basic/Advanced mode selection
 *
 * Reads and updates mode from Zustand store.
 * Store handles clearing advanced inputs when switching to Basic.
 */
export function ModeToggle() {
  const mode = useWizardStore((state) => state.mode);
  const setMode = useWizardStore((state) => state.setMode);

  const handleValueChange = (value: string) => {
    // ToggleGroup can return empty string if clicking same value
    // Only update if valid mode
    if (value === 'basic' || value === 'advanced') {
      setMode(value as Mode);
    }
  };

  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={handleValueChange}
      className="rounded-lg bg-muted p-1"
      aria-label="Calculator mode"
    >
      <ToggleGroupItem
        value="basic"
        aria-label="Basic Mode"
        className="rounded-md px-4 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-xs"
      >
        Basic
      </ToggleGroupItem>
      <ToggleGroupItem
        value="advanced"
        aria-label="Advanced Mode"
        className="rounded-md px-4 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-xs"
      >
        Advanced
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
