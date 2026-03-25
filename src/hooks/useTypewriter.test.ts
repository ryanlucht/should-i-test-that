import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypewriter } from './useTypewriter';

/**
 * Helper: advance fake timers by 30ms per step, n times.
 * Each step allows React to process the state update and schedule the next setTimeout.
 */
function advanceChars(n: number) {
  for (let i = 0; i < n; i++) {
    act(() => {
      vi.advanceTimersByTime(12);
    });
  }
}

describe('useTypewriter', () => {
  beforeEach(() => {
    // Mock window.matchMedia to return non-reduced-motion by default
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns empty string initially for non-empty input text', () => {
    const { result } = renderHook(() => useTypewriter('Hello'));
    expect(result.current.displayed).toBe('');
    expect(result.current.isComplete).toBe(false);
  });

  it('reveals text character by character at 12ms intervals', () => {
    const { result } = renderHook(() => useTypewriter('Hello'));

    // Initially empty
    expect(result.current.displayed).toBe('');

    // After 1 step: 1 character
    advanceChars(1);
    expect(result.current.displayed).toBe('H');

    // After 2nd step: 2 characters
    advanceChars(1);
    expect(result.current.displayed).toBe('He');
  });

  it('shows full text and isComplete=true after sufficient time', () => {
    const text = 'Hi!';
    const { result } = renderHook(() => useTypewriter(text));

    // Advance one step per character
    advanceChars(text.length);

    expect(result.current.displayed).toBe(text);
    expect(result.current.isComplete).toBe(true);
  });

  it('resets displayed text when input text changes', () => {
    const { result, rerender } = renderHook(
      ({ text }: { text: string }) => useTypewriter(text),
      { initialProps: { text: 'First' } }
    );

    // Advance to complete first message (5 chars)
    advanceChars('First'.length);
    expect(result.current.displayed).toBe('First');
    expect(result.current.isComplete).toBe(true);

    // Change the text — should reset
    act(() => {
      rerender({ text: 'Second' });
    });

    // After reset, displayed should start fresh (empty — index=0 was reset)
    expect(result.current.isComplete).toBe(false);
    expect(result.current.displayed).toBe('');
  });

  it('shows full text immediately with isComplete=true when prefers-reduced-motion is active', () => {
    // Override matchMedia to return reduced-motion = true
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const text = 'Hello world';
    const { result } = renderHook(() => useTypewriter(text));

    // Should immediately show full text — no timers needed
    expect(result.current.displayed).toBe(text);
    expect(result.current.isComplete).toBe(true);
  });
});
