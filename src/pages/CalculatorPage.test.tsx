/**
 * CalculatorPage Tests (CR28-03)
 *
 * Tests for:
 * - Section completion does not immediately re-invalidate the section
 * - Multi-cycle dirty-state lifecycle: complete -> edit -> re-complete -> edit
 *
 * Strategy: Test the dirty-callback + invalidation logic in isolation rather than
 * rendering the full CalculatorPage (which has heavy dependencies). We simulate
 * the useEffect behavior by directly testing that wasDirtyRef prevents
 * re-invalidation when onSectionDirty identity changes while isDirty remains true,
 * and that it correctly re-fires on a new clean-to-dirty transition.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Test harness: isolated dirty-detection hook
// ---------------------------------------------------------------------------

/**
 * Minimal reproduction of the form dirty-detection pattern (CR28-03).
 * This mirrors the wasDirtyRef pattern used in BaselineMetricsForm et al.
 */
function useDirtyDetection(isDirty: boolean, onSectionDirty: (() => void) | undefined) {
  const wasDirtyRef = useRef(isDirty);

  useEffect(() => {
    // Only fire on the clean-to-dirty transition (false -> true)
    if (isDirty && !wasDirtyRef.current && onSectionDirty) {
      onSectionDirty();
    }
    wasDirtyRef.current = isDirty;
  }, [isDirty, onSectionDirty]);
}

/**
 * Minimal reproduction of the CalculatorPage dirty-callback pattern (CR28-03).
 * Uses completedSectionsRef to keep callback identity stable.
 */
function useDirtyCallback(
  sectionIndex: number,
  completedSections: number[],
  invalidateSection: (section: number) => void
) {
  const completedSectionsRef = useRef(completedSections);
  // eslint-disable-next-line react-hooks/refs -- Intentional: synchronous ref update mirrors CalculatorPage production pattern
  completedSectionsRef.current = completedSections;

  return useCallback(() => {
    if (completedSectionsRef.current.includes(sectionIndex)) {
      invalidateSection(sectionIndex);
    }
  }, [invalidateSection, sectionIndex]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CalculatorPage dirty-detection (CR28-03)', () => {
  let invalidateSection: (section: number) => void;

  beforeEach(() => {
    invalidateSection = vi.fn<(section: number) => void>();
  });

  describe('basic section completion does not re-invalidate', () => {
    it('does not fire onSectionDirty when isDirty stays true and callback identity changes', () => {
      // Simulate: form starts clean, becomes dirty, then onSectionDirty identity changes
      // (as happens when completedSections updates after Continue click)
      const onDirty1 = vi.fn();
      const onDirty2 = vi.fn();

      // Start clean (isDirty=false), as forms do before user interaction
      const { rerender } = renderHook(
        ({ isDirty, onSectionDirty }) => useDirtyDetection(isDirty, onSectionDirty),
        { initialProps: { isDirty: false, onSectionDirty: onDirty1 } }
      );
      expect(onDirty1).not.toHaveBeenCalled();

      // User edits a field: isDirty becomes true (false->true transition fires)
      rerender({ isDirty: true, onSectionDirty: onDirty1 });
      expect(onDirty1).toHaveBeenCalledTimes(1);

      // User clicks Continue -> completedSections updates -> callback identity changes.
      // isDirty is STILL true (RHF does not reset isDirty after submit).
      rerender({ isDirty: true, onSectionDirty: onDirty2 });

      // Should NOT fire again — wasDirtyRef prevents re-fire since isDirty was already true
      expect(onDirty2).not.toHaveBeenCalled();
    });

    it('does not fire when isDirty is false', () => {
      const onDirty = vi.fn();

      renderHook(
        ({ isDirty, onSectionDirty }) => useDirtyDetection(isDirty, onSectionDirty),
        { initialProps: { isDirty: false, onSectionDirty: onDirty } }
      );

      expect(onDirty).not.toHaveBeenCalled();
    });
  });

  describe('multi-cycle dirty-state lifecycle', () => {
    it('complete -> edit -> re-complete -> edit fires invalidation on each clean-to-dirty transition', () => {
      const onDirty = vi.fn();

      // Cycle 1: Start clean (isDirty=false)
      const { rerender } = renderHook(
        ({ isDirty, onSectionDirty }) => useDirtyDetection(isDirty, onSectionDirty),
        { initialProps: { isDirty: false, onSectionDirty: onDirty } }
      );
      expect(onDirty).toHaveBeenCalledTimes(0);

      // Cycle 1: User edits (isDirty becomes true) — first clean-to-dirty transition
      rerender({ isDirty: true, onSectionDirty: onDirty });
      expect(onDirty).toHaveBeenCalledTimes(1);

      // Cycle 1: User clicks Continue / re-complete (isDirty becomes false via form reset)
      rerender({ isDirty: false, onSectionDirty: onDirty });
      expect(onDirty).toHaveBeenCalledTimes(1); // No additional call

      // Cycle 2: User edits again (isDirty becomes true) — second clean-to-dirty transition
      rerender({ isDirty: true, onSectionDirty: onDirty });
      expect(onDirty).toHaveBeenCalledTimes(2);

      // Cycle 2: User re-completes again
      rerender({ isDirty: false, onSectionDirty: onDirty });
      expect(onDirty).toHaveBeenCalledTimes(2); // No additional call

      // Cycle 3: User edits yet again — third clean-to-dirty transition
      rerender({ isDirty: true, onSectionDirty: onDirty });
      expect(onDirty).toHaveBeenCalledTimes(3);
    });

    it('wasDirtyRef resets correctly: isDirty staying true does not fire again', () => {
      const onDirty = vi.fn();

      const { rerender } = renderHook(
        ({ isDirty, onSectionDirty }) => useDirtyDetection(isDirty, onSectionDirty),
        { initialProps: { isDirty: false, onSectionDirty: onDirty } }
      );

      // Transition to dirty
      rerender({ isDirty: true, onSectionDirty: onDirty });
      expect(onDirty).toHaveBeenCalledTimes(1);

      // Multiple re-renders while still dirty (simulating rapid typing)
      rerender({ isDirty: true, onSectionDirty: onDirty });
      rerender({ isDirty: true, onSectionDirty: onDirty });
      rerender({ isDirty: true, onSectionDirty: onDirty });

      // Still only 1 call — no re-fire while isDirty stays true
      expect(onDirty).toHaveBeenCalledTimes(1);
    });
  });

  describe('dirty callback uses ref for stable identity', () => {
    it('callback identity does not change when completedSections changes', () => {
      const { result, rerender } = renderHook(
        ({ completedSections }) =>
          useDirtyCallback(0, completedSections, invalidateSection),
        { initialProps: { completedSections: [] as number[] } }
      );

      const callback1 = result.current;

      // completedSections changes (section 0 completed)
      rerender({ completedSections: [0] });
      const callback2 = result.current;

      // Callback identity should be stable (same reference)
      expect(callback1).toBe(callback2);
    });

    it('callback reads latest completedSections from ref', () => {
      const { result, rerender } = renderHook(
        ({ completedSections }) =>
          useDirtyCallback(0, completedSections, invalidateSection),
        { initialProps: { completedSections: [] as number[] } }
      );

      // Call when section 0 not yet completed — should NOT invalidate
      result.current();
      expect(invalidateSection).not.toHaveBeenCalled();

      // completedSections changes (section 0 completed)
      rerender({ completedSections: [0] });

      // Now call — should invalidate because ref reads latest value
      result.current();
      expect(invalidateSection).toHaveBeenCalledWith(0);
    });
  });
});
