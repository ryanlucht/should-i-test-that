/**
 * useScrollSpy Hook
 *
 * Tracks which section is currently in view using IntersectionObserver.
 * Used by the StickyProgressIndicator to highlight the active section.
 *
 * IntersectionObserver config:
 * - rootMargin: "-128px 0px -50% 0px" triggers when section crosses
 *   128px from viewport top (accounts for header + indicator)
 * - Tracks multiple thresholds for smooth transitions
 *
 * Cleanup: Disconnects all observers on unmount to prevent memory leaks.
 */

import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Hook to track which section is currently visible in the viewport
 *
 * @param sectionIds - Array of section element IDs to observe
 * @returns The ID of the currently active/visible section
 *
 * @example
 * const activeSection = useScrollSpy(['section-1', 'section-2', 'section-3']);
 */
export function useScrollSpy(sectionIds: string[]): string {
  // Default to first section if no sections provided
  const [activeSection, setActiveSection] = useState<string>(
    sectionIds[0] ?? ''
  );

  // Track intersection entries for each section
  // Using ref to avoid re-creating observer on entry updates
  const entriesRef = useRef<Map<string, IntersectionObserverEntry>>(new Map());

  /**
   * Determine which section should be considered "active"
   * Prefers sections in the upper portion of the viewport
   */
  const updateActiveSection = useCallback(() => {
    const entries = entriesRef.current;

    // Find sections that are intersecting
    const intersecting: { id: string; ratio: number; top: number }[] = [];

    entries.forEach((entry, id) => {
      if (entry.isIntersecting) {
        intersecting.push({
          id,
          ratio: entry.intersectionRatio,
          top: entry.boundingClientRect.top,
        });
      }
    });

    if (intersecting.length === 0) {
      // No sections intersecting - keep current active
      // This handles scroll past all sections edge case
      return;
    }

    // Sort by position: prefer sections closest to top of viewport
    // After sticky elements (128px offset)
    intersecting.sort((a, b) => {
      // Prefer section with top closer to (but below) the sticky header
      const aDistance = Math.abs(a.top - 128);
      const bDistance = Math.abs(b.top - 128);
      return aDistance - bDistance;
    });

    // Set the section closest to ideal position as active
    setActiveSection(intersecting[0].id);
  }, []);

  useEffect(() => {
    // Bail early if no section IDs
    if (sectionIds.length === 0) return;

    // IntersectionObserver config
    // rootMargin: top offset accounts for sticky header (56px) + indicator (64px) + buffer (8px) = 128px
    // bottom at 50% ensures we switch to next section when current is halfway scrolled out
    const observerOptions: IntersectionObserverOptions = {
      root: null, // viewport
      rootMargin: '-128px 0px -50% 0px',
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    };

    const observer = new IntersectionObserver((entries) => {
      // Update stored entries
      entries.forEach((entry) => {
        entriesRef.current.set(entry.target.id, entry);
      });

      // Recalculate active section
      updateActiveSection();
    }, observerOptions);

    // Observe each section element
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    // Capture ref value for cleanup (React lint rule)
    const entries = entriesRef.current;

    // Cleanup: disconnect observer on unmount
    return () => {
      observer.disconnect();
      entries.clear();
    };
  }, [sectionIds, updateActiveSection]);

  return activeSection;
}
