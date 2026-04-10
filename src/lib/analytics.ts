/**
 * Analytics utility module
 *
 * Provides centralized tracking functions for Datadog RUM custom events.
 * Uses datadogRum.addAction() for custom event tracking.
 *
 * Events tracked:
 * - step_completed: User completes a wizard step (OBS-05)
 * - calculation_completed: EVSI calculation renders (OBS-07)
 * - export_png: User exports results as PNG (OBS-08)
 */

import { datadogRum } from '@datadog/browser-rum';

/**
 * Anonymous user identification for Datadog Product Analytics (DD-01).
 *
 * Generates a cryptographically random UUID on first visit and stores it
 * in localStorage under 'dd_anonymous_id'. Subsequent visits return the
 * same UUID, giving Datadog PA a stable user identifier without PII.
 *
 * Uses crypto.randomUUID() (available in all modern browsers).
 * Falls back to a timestamp-based ID if crypto API is unavailable.
 */
const ANONYMOUS_ID_KEY = 'dd_anonymous_id';

/** Ephemeral fallback ID when localStorage is unavailable (private browsing, etc.) */
let ephemeralId: string | null = null;

function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateAnonymousId(): string {
  try {
    const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing) return existing;

    const id = generateId();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
    return id;
  } catch {
    // localStorage unavailable (private browsing, storage quota, iframe restrictions)
    if (!ephemeralId) {
      ephemeralId = generateId();
    }
    return ephemeralId;
  }
}

/**
 * Track wizard step completion (OBS-05)
 *
 * @param stepName - The name/id of the completed step (e.g., 'baseline', 'uncertainty')
 * @param stepIndex - Zero-based index of the step in the wizard
 */
export function trackStepCompleted(stepName: string, stepIndex: number): void {
  datadogRum.addAction('step_completed', {
    step_name: stepName,
    step_index: stepIndex,
  });
}

/**
 * Track calculation completion (OBS-07)
 *
 * @param calculationType - The type of calculation (always 'EVSI' now)
 * @param valueDollars - The calculated value in dollars (net value)
 */
export function trackCalculationCompleted(
  calculationType: 'EVSI',
  valueDollars: number
): void {
  datadogRum.addAction('calculation_completed', {
    type: calculationType,
    value_dollars: valueDollars,
  });
}

/**
 * Track PNG export (OBS-08)
 *
 * @param hasCustomTitle - Whether user provided a custom title
 */
export function trackExportPng(hasCustomTitle: boolean): void {
  datadogRum.addAction('export_png', {
    has_custom_title: hasCustomTitle,
  });
}
