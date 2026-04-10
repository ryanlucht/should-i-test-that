import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypewriter } from './useTypewriter';

/**
 * Helper: advance fake timers by one word-reveal tick (30ms) n times.
 * Each step allows React to process the state update and schedule the next setTimeout.
 */
function advanceWords(n: number) {
  for (let i = 0; i < n; i++) {
    act(() => {
      vi.advanceTimersByTime(30);
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
    const { result } = renderHook(() => useTypewriter('Hello world'));
    expect(result.current.displayed).toBe('');
    expect(result.current.isComplete).toBe(false);
  });

  it('reveals text word by word at 30ms intervals', () => {
    const { result } = renderHook(() => useTypewriter('Hello world foo'));

    // Initially empty
    expect(result.current.displayed).toBe('');

    // After 1 tick: first word
    advanceWords(1);
    expect(result.current.displayed).toBe('Hello');

    // After 2nd tick: first two words (includes the space before "world")
    advanceWords(1);
    expect(result.current.displayed).toBe('Hello world');

    // After 3rd tick: all three words
    advanceWords(1);
    expect(result.current.displayed).toBe('Hello world foo');
  });

  it('shows full text and isComplete=true after sufficient ticks', () => {
    const text = 'one two three';
    const { result } = renderHook(() => useTypewriter(text));

    // 3 words → 3 ticks
    advanceWords(3);

    expect(result.current.displayed).toBe(text);
    expect(result.current.isComplete).toBe(true);
  });

  it('resets displayed text when input text changes', () => {
    const { result, rerender } = renderHook(
      ({ text }: { text: string }) => useTypewriter(text),
      { initialProps: { text: 'First message' } }
    );

    // Complete first message (2 words)
    advanceWords(2);
    expect(result.current.displayed).toBe('First message');
    expect(result.current.isComplete).toBe(true);

    // Change the text — should reset
    act(() => {
      rerender({ text: 'Second one' });
    });

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

  it('handles single-word text', () => {
    const { result } = renderHook(() => useTypewriter('Hello'));

    advanceWords(1);
    expect(result.current.displayed).toBe('Hello');
    expect(result.current.isComplete).toBe(true);
  });
});
