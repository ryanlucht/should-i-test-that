import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGuideMessages, GUIDE_MESSAGES, GuideTrigger } from './useGuideMessages';

describe('useGuideMessages', () => {
  it('returns message index 0 and first message when activeSection is baseline', () => {
    const { result } = renderHook(() =>
      useGuideMessages('baseline', GuideTrigger.None)
    );
    expect(result.current.currentMessageIndex).toBe(0);
    expect(result.current.currentMessage).toBe(GUIDE_MESSAGES[0]);
  });

  it('returns message index 0 for empty/initial activeSection', () => {
    const { result } = renderHook(() =>
      useGuideMessages('', GuideTrigger.None)
    );
    expect(result.current.currentMessageIndex).toBe(0);
  });

  it('returns message index 1 when activeSection is uncertainty', () => {
    const { result, rerender } = renderHook(
      ({ section, trigger }: { section: string; trigger: GuideTrigger }) =>
        useGuideMessages(section, trigger),
      { initialProps: { section: 'baseline', trigger: GuideTrigger.None as GuideTrigger } }
    );
    expect(result.current.currentMessageIndex).toBe(0);

    act(() => {
      rerender({ section: 'uncertainty', trigger: GuideTrigger.None as GuideTrigger });
    });
    expect(result.current.currentMessageIndex).toBe(1);
  });

  it('returns message index 2 when GuideTrigger.PriorShapeAccordionOpen fires', () => {
    const { result, rerender } = renderHook(
      ({ section, trigger }: { section: string; trigger: GuideTrigger }) =>
        useGuideMessages(section, trigger),
      { initialProps: { section: 'uncertainty', trigger: GuideTrigger.None as GuideTrigger } }
    );

    act(() => {
      rerender({ section: 'uncertainty', trigger: GuideTrigger.PriorShapeAccordionOpen });
    });
    expect(result.current.currentMessageIndex).toBe(2);
  });

  it('returns message index 3 when GuideTrigger.PriorBoundFocus fires', () => {
    const { result, rerender } = renderHook(
      ({ section, trigger }: { section: string; trigger: GuideTrigger }) =>
        useGuideMessages(section, trigger),
      { initialProps: { section: 'uncertainty', trigger: GuideTrigger.None as GuideTrigger } }
    );

    act(() => {
      rerender({ section: 'uncertainty', trigger: GuideTrigger.PriorBoundFocus });
    });
    expect(result.current.currentMessageIndex).toBe(3);
  });

  it('returns message index 4 when activeSection is threshold', () => {
    const { result, rerender } = renderHook(
      ({ section, trigger }: { section: string; trigger: GuideTrigger }) =>
        useGuideMessages(section, trigger),
      { initialProps: { section: 'baseline', trigger: GuideTrigger.None as GuideTrigger } }
    );

    act(() => {
      rerender({ section: 'threshold', trigger: GuideTrigger.None as GuideTrigger });
    });
    expect(result.current.currentMessageIndex).toBe(4);
  });

  it('returns message index 5 when activeSection is test-design', () => {
    const { result, rerender } = renderHook(
      ({ section, trigger }: { section: string; trigger: GuideTrigger }) =>
        useGuideMessages(section, trigger),
      { initialProps: { section: 'baseline', trigger: GuideTrigger.None as GuideTrigger } }
    );

    act(() => {
      rerender({ section: 'test-design', trigger: GuideTrigger.None as GuideTrigger });
    });
    expect(result.current.currentMessageIndex).toBe(5);
  });

  it('returns message index 6 when GuideTrigger.AdvancedTimingOpen fires', () => {
    const { result, rerender } = renderHook(
      ({ section, trigger }: { section: string; trigger: GuideTrigger }) =>
        useGuideMessages(section, trigger),
      { initialProps: { section: 'test-design', trigger: GuideTrigger.None as GuideTrigger } }
    );

    act(() => {
      rerender({ section: 'test-design', trigger: GuideTrigger.AdvancedTimingOpen });
    });
    expect(result.current.currentMessageIndex).toBe(6);
  });

  it('returns message index 7 when activeSection is results', () => {
    const { result, rerender } = renderHook(
      ({ section, trigger }: { section: string; trigger: GuideTrigger }) =>
        useGuideMessages(section, trigger),
      { initialProps: { section: 'baseline', trigger: GuideTrigger.None as GuideTrigger } }
    );

    act(() => {
      rerender({ section: 'results', trigger: GuideTrigger.None as GuideTrigger });
    });
    expect(result.current.currentMessageIndex).toBe(7);
    expect(result.current.currentMessage).toContain("Here's your results");
  });

  it('GUIDE_MESSAGES array has exactly 8 entries', () => {
    expect(GUIDE_MESSAGES).toHaveLength(8);
  });

  it('GUIDE_MESSAGES[0] contains expected content about calculating value of running a test', () => {
    expect(GUIDE_MESSAGES[0]).toContain('calculate the value of running a test');
  });

  it('GUIDE_MESSAGES[6] contains expected content about metrics taking time to mature', () => {
    expect(GUIDE_MESSAGES[6]).toContain('Some metrics take time to mature');
  });

  it('does NOT advance message when scrolling to a disabled section', () => {
    // Bug: scrolling past disabled sections triggered dialogue advancement.
    // Only enabled (accessible) sections should trigger new messages.
    const onlyBaselineEnabled = new Set(['baseline']);

    const { result, rerender } = renderHook(
      ({ section, trigger, enabled }: { section: string; trigger: GuideTrigger; enabled: Set<string> }) =>
        useGuideMessages(section, trigger, enabled),
      { initialProps: { section: 'baseline', trigger: GuideTrigger.None, enabled: onlyBaselineEnabled } }
    );
    expect(result.current.currentMessageIndex).toBe(0);

    // Scroll to 'uncertainty' while it's still disabled — should NOT advance
    act(() => {
      rerender({ section: 'uncertainty', trigger: GuideTrigger.None, enabled: onlyBaselineEnabled });
    });
    expect(result.current.currentMessageIndex).toBe(0);

    // Now enable uncertainty and scroll to it — should advance
    const baselineAndUncertainty = new Set(['baseline', 'uncertainty']);
    act(() => {
      rerender({ section: 'uncertainty', trigger: GuideTrigger.None, enabled: baselineAndUncertainty });
    });
    expect(result.current.currentMessageIndex).toBe(1);
  });

  it('does NOT regress message index when scrolling back to earlier section', () => {
    const { result, rerender } = renderHook(
      ({ section, trigger }: { section: string; trigger: GuideTrigger }) =>
        useGuideMessages(section, trigger),
      { initialProps: { section: 'baseline', trigger: GuideTrigger.None as GuideTrigger } }
    );

    // Advance to threshold (index 4)
    act(() => {
      rerender({ section: 'threshold', trigger: GuideTrigger.None as GuideTrigger });
    });
    expect(result.current.currentMessageIndex).toBe(4);

    // Scroll back to uncertainty — should NOT regress below 4
    act(() => {
      rerender({ section: 'uncertainty', trigger: GuideTrigger.None as GuideTrigger });
    });
    expect(result.current.currentMessageIndex).toBe(4);
  });

  it('M3 (PriorShapeAccordionOpen) is re-triggerable: fires even after advancing past index 2', () => {
    const { result, rerender } = renderHook(
      ({ section, trigger }: { section: string; trigger: GuideTrigger }) =>
        useGuideMessages(section, trigger),
      { initialProps: { section: 'baseline', trigger: GuideTrigger.None as GuideTrigger } }
    );

    // Advance to index 5 (test-design)
    act(() => {
      rerender({ section: 'test-design', trigger: GuideTrigger.None as GuideTrigger });
    });
    expect(result.current.currentMessageIndex).toBe(5);

    // Fire PriorShapeAccordionOpen — re-triggerable, should go back to 2
    act(() => {
      rerender({ section: 'test-design', trigger: GuideTrigger.PriorShapeAccordionOpen });
    });
    expect(result.current.currentMessageIndex).toBe(2);
  });
});
