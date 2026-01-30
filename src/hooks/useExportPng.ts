/**
 * useExportPng Hook
 *
 * Provides PNG export functionality using html-to-image library.
 * Captures a referenced DOM element and triggers a download.
 *
 * Features:
 * - High DPI export (2x pixel ratio for retina displays)
 * - Fixed 1080x1080 square format per EXPORT-01 requirement
 * - Loading state tracking for UI feedback
 * - Filename sanitization for custom titles
 *
 * Per 06-RESEARCH.md: Uses html-to-image (simpler than recharts-to-png,
 * works on any HTML element including composed cards with charts).
 */

import { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';

/**
 * Return type for the useExportPng hook
 */
interface UseExportPngReturn {
  /** Ref to attach to the export target element */
  exportRef: React.RefObject<HTMLDivElement | null>;
  /** Async function to trigger PNG export */
  exportPng: (customTitle?: string) => Promise<void>;
  /** Whether export is currently in progress */
  isExporting: boolean;
}

/**
 * Sanitize filename by replacing spaces with dashes and removing special chars
 *
 * @param title - User-provided title string
 * @returns Sanitized string safe for use in filenames
 */
function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, '') // Remove special characters
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
}

/**
 * Generate timestamp in YYYYMMDD-HHmmss format
 *
 * @returns Timestamp string for filename uniqueness
 */
function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Generate export filename based on custom title
 *
 * Per 06-RESEARCH.md filename convention:
 * - If custom title provided: {sanitized-title}-{timestamp}.png
 * - Default: should-i-test-{timestamp}.png
 *
 * @param customTitle - Optional user-provided title
 * @returns Complete filename with .png extension
 */
function generateFilename(customTitle?: string): string {
  const timestamp = generateTimestamp();

  if (customTitle && customTitle.trim()) {
    const sanitized = sanitizeFilename(customTitle.trim());
    if (sanitized) {
      return `${sanitized}-${timestamp}.png`;
    }
  }

  return `should-i-test-${timestamp}.png`;
}

/**
 * Hook for exporting DOM elements as PNG images
 *
 * Usage:
 * ```tsx
 * const { exportRef, exportPng, isExporting } = useExportPng();
 *
 * return (
 *   <>
 *     <div ref={exportRef}>Content to export</div>
 *     <button onClick={() => exportPng('My Analysis')} disabled={isExporting}>
 *       {isExporting ? 'Exporting...' : 'Export PNG'}
 *     </button>
 *   </>
 * );
 * ```
 *
 * @returns Object with exportRef, exportPng function, and isExporting state
 */
export function useExportPng(): UseExportPngReturn {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Export the referenced element as a PNG image
   *
   * Uses html-to-image toPng with options:
   * - pixelRatio: 2 for retina/high DPI quality
   * - backgroundColor: white for consistent output
   * - Fixed 1080x1080 dimensions per EXPORT-01 requirement
   *
   * Triggers download using native <a download> pattern
   * (no file-saver dependency needed per 06-RESEARCH.md)
   *
   * @param customTitle - Optional custom title for filename
   */
  const exportPng = useCallback(async (customTitle?: string) => {
    if (!exportRef.current) {
      console.warn('Export ref not attached to any element');
      return;
    }

    setIsExporting(true);

    try {
      // Generate PNG data URL from the referenced element
      // Per 06-RESEARCH.md: pixelRatio 2 for crisp retina output
      const dataUrl = await toPng(exportRef.current, {
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        width: 1080,
        height: 1080,
      });

      // Generate filename based on custom title
      const filename = generateFilename(customTitle);

      // Trigger download using native <a download> pattern
      // Per 06-RESEARCH.md: This works for data URLs without file-saver
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export PNG:', error);
      // Re-throw so caller can handle if needed
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportRef, exportPng, isExporting };
}
