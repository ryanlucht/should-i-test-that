import { useState, useEffect } from 'react';

/**
 * Delay between revealing each word in milliseconds.
 * Word-level batching feels more natural than character-by-character because
 * the user always sees complete, readable units (similar to token streaming
 * in chat UIs). ~30ms/word keeps total duration similar to the old 6ms/char
 * approach for typical message lengths.
 */
const WORD_DELAY_MS = 30;

/**
 * Find the end index of the next word from `fromIndex`.
 * A "word" = optional leading whitespace + a run of non-whitespace chars.
 * Returns text.length when no more words remain.
 */
function nextWordEnd(text: string, fromIndex: number): number {
  let i = fromIndex;
  // Skip whitespace between words
  while (i < text.length && /\s/.test(text[i])) i++;
  // Skip word characters
  while (i < text.length && !/\s/.test(text[i])) i++;
  return i;
}

/**
 * useTypewriter
 *
 * Reveals text word-by-word at WORD_DELAY_MS intervals.
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
  // Check reduced-motion preference. matchMedia().matches is a pure synchronous
  // read — safe to call during render. Stable for the component's lifetime.
  // Guard against jsdom/test environments where matchMedia may not exist.
  const prefersReducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // Index into text: characters up to this point are visible (0 = not started)
  const [index, setIndex] = useState<number>(() =>
    prefersReducedMotion ? text.length : 0
  );

  // Reset index when text changes (new message starts)
  useEffect(() => {
    if (prefersReducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync animation state when text changes
      setIndex(text.length); // Show full text immediately
    } else {
      setIndex(0); // Restart animation from the beginning
    }
  }, [text, prefersReducedMotion]);

  // Advance by one word per tick, with cleanup on unmount/re-render
  useEffect(() => {
    if (prefersReducedMotion || index >= text.length) return;

    const timeout = setTimeout(() => {
      setIndex((i) => nextWordEnd(text, i));
    }, WORD_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [index, text, prefersReducedMotion]);

  return {
    displayed: text.slice(0, index),
    isComplete: index >= text.length,
  };
}
