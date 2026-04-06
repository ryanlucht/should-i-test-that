/**
 * Tests for useSharedDiff hook
 *
 * Tests verify:
 * - Returns empty Set when sharedBaseline is null (non-shared session)
 * - Returns empty Set when current inputs match sharedBaseline exactly
 * - Returns Set containing the changed key when a single field differs
 * - Returns Set with multiple keys when multiple fields are modified
 * - modifiedFields Set is memoized (same reference when inputs haven't changed)
 * - isFieldModified() convenience function returns correct boolean
 *
 * Uses the real store with resetWizard() before each test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSharedDiff } from './useSharedDiff';
import { useWizardStore } from '@/stores/wizardStore';
import { initialInputs } from '@/types/wizard';

beforeEach(() => {
  useWizardStore.getState().resetWizard();
});

describe('useSharedDiff', () => {
  it('returns empty Set when sharedBaseline is null (non-shared session)', () => {
    const { result } = renderHook(() => useSharedDiff());

    // sharedBaseline defaults to null after resetWizard
    expect(useWizardStore.getState().sharedBaseline).toBeNull();
    expect(result.current.modifiedFields.size).toBe(0);
  });

  it('returns empty Set when current inputs match sharedBaseline exactly', () => {
    // Set baseline to match initial inputs exactly
    act(() => {
      useWizardStore.getState().setSharedBaseline({ ...initialInputs });
    });

    const { result } = renderHook(() => useSharedDiff());

    // No fields changed from baseline, so set should be empty
    expect(result.current.modifiedFields.size).toBe(0);
  });

  it('returns Set containing the changed key when baselineConversionRate differs', () => {
    // Set baseline with 0.05 baseline rate
    act(() => {
      useWizardStore.getState().setSharedBaseline({
        ...initialInputs,
        baselineConversionRate: 0.05,
      });
    });

    // Change current input to a different value
    act(() => {
      useWizardStore.getState().setInput('baselineConversionRate', 0.08);
    });

    const { result } = renderHook(() => useSharedDiff());

    expect(result.current.modifiedFields.has('baselineConversionRate')).toBe(true);
    expect(result.current.modifiedFields.size).toBe(1);
  });

  it('returns Set with multiple keys when multiple fields are modified', () => {
    // Set up current inputs to match what baseline will capture, then modify two fields
    act(() => {
      useWizardStore.getState().setInput('baselineConversionRate', 0.05);
      useWizardStore.getState().setInput('annualVisitors', 100000);
      useWizardStore.getState().setInput('valuePerConversion', 50);
      // Capture baseline as a snapshot of the current state
      useWizardStore.getState().setSharedBaseline({
        ...useWizardStore.getState().inputs,
      });
      // Now modify two fields — these should show up as modified
      useWizardStore.getState().setInput('baselineConversionRate', 0.08);
      useWizardStore.getState().setInput('annualVisitors', 200000);
    });

    const { result } = renderHook(() => useSharedDiff());

    expect(result.current.modifiedFields.has('baselineConversionRate')).toBe(true);
    expect(result.current.modifiedFields.has('annualVisitors')).toBe(true);
    // valuePerConversion not changed from baseline, so not in the set
    expect(result.current.modifiedFields.has('valuePerConversion')).toBe(false);
    expect(result.current.modifiedFields.size).toBe(2);
  });

  it('modifiedFields Set is memoized - same reference returned when inputs have not changed', () => {
    act(() => {
      useWizardStore.getState().setSharedBaseline({
        ...initialInputs,
        baselineConversionRate: 0.05,
      });
      useWizardStore.getState().setInput('baselineConversionRate', 0.08);
    });

    const { result, rerender } = renderHook(() => useSharedDiff());
    const firstRef = result.current.modifiedFields;

    // Re-render without changing any store state
    rerender();
    const secondRef = result.current.modifiedFields;

    // useMemo should return the same Set reference when deps haven't changed
    expect(firstRef).toBe(secondRef);
  });

  it('isFieldModified returns true for a modified field and false for an unmodified field', () => {
    act(() => {
      // Set the current inputs to match what baseline will be (same values)
      useWizardStore.getState().setInput('baselineConversionRate', 0.05);
      useWizardStore.getState().setInput('annualVisitors', 100000);
      // Now set the baseline to the same values as current
      useWizardStore.getState().setSharedBaseline({
        ...useWizardStore.getState().inputs,
      });
      // Then modify only baselineConversionRate
      useWizardStore.getState().setInput('baselineConversionRate', 0.10);
    });

    const { result } = renderHook(() => useSharedDiff());

    expect(result.current.isFieldModified('baselineConversionRate')).toBe(true);
    expect(result.current.isFieldModified('annualVisitors')).toBe(false);
    expect(result.current.isFieldModified('valuePerConversion')).toBe(false);
  });

  it('returns empty Set when no sharedBaseline is set (isFieldModified always returns false)', () => {
    // Do not set a baseline (default null)
    const { result } = renderHook(() => useSharedDiff());

    expect(result.current.modifiedFields.size).toBe(0);
    expect(result.current.isFieldModified('baselineConversionRate')).toBe(false);
    expect(result.current.isFieldModified('annualVisitors')).toBe(false);
  });
});
