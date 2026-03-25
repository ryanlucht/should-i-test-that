import { useState, useEffect, useRef } from 'react';

/**
 * Character delay for typewriter animation in milliseconds.
 * Per CONTEXT.md D-03: speed is executor discretion; 30ms chosen for readable pacing.
 */
const CHAR_DELAY_MS = 30;

/**
 * useTypewriter
 *
 * Reveals text character-by-character at CHAR_DELAY_MS intervals.
 * Respects prefers-reduced-motion: if active, renders full text immediately.
 *
 * @param text - The message string to animate
 * @returns { displayed: string, isComplete: boolean }
 *   - displayed: the currently visible portion of text
 *   - isComplete: true when all characters have been revealed
 *
 * Usage: const { displayed, isComplete } = useTypewriter(message);
 */
export function useTypewriter(text: string): { displayed: string; isComplete: boolean } {
  // Cache the reduced-motion preference on mount using a ref to avoid
  // calling matchMedia on every render (perf optimization).
  // Guard against jsdom/test environments where matchMedia may not exist.
  const prefersReducedMotionRef = useRef<boolean>(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  const prefersReducedMotion = prefersReducedMotionRef.current;

  // Index of the next character to reveal (0 = not started)
  const [index, setIndex] = useState<number>(() =>
    prefersReducedMotion ? text.length : 0
  );

  // Reset index when text changes (new message starts)
  useEffect(() => {
    if (prefersReducedMotion) {
      setIndex(text.length); // Show full text immediately
    } else {
      setIndex(0); // Restart animation from the beginning
    }
  }, [text, prefersReducedMotion]);

  // Increment index one character at a time, with cleanup on unmount/re-render
  useEffect(() => {
    if (prefersReducedMotion || index >= text.length) return;

    const timeout = setTimeout(() => {
      setIndex((i) => i + 1);
    }, CHAR_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [index, text, prefersReducedMotion]);

  return {
    displayed: text.slice(0, index),
    isComplete: index >= text.length,
  };
}
