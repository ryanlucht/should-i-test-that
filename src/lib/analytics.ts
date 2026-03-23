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
