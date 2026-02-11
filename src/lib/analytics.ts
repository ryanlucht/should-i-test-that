/**
 * Analytics utility module
 *
 * Provides centralized tracking functions for Datadog RUM custom events.
 * Uses datadogRum.addAction() for custom event tracking.
 *
 * Events tracked:
 * - step_completed: User completes a wizard step (OBS-05)
 * - mode_selected: User selects Basic/Advanced mode (OBS-06)
 * - calculation_completed: EVPI or EVSI calculation renders (OBS-07)
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
 * Track mode selection (OBS-06)
 *
 * @param mode - The selected mode ('basic' or 'advanced')
 */
export function trackModeSelected(mode: 'basic' | 'advanced'): void {
  datadogRum.addAction('mode_selected', {
    mode: mode,
  });
}

/**
 * Track calculation completion (OBS-07)
 *
 * @param calculationType - The type of calculation ('EVPI' for Basic, 'EVSI' for Advanced)
 * @param valueDollars - The calculated value in dollars (EVPI or net value)
 */
export function trackCalculationCompleted(
  calculationType: 'EVPI' | 'EVSI',
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
 * @param mode - The mode at time of export ('basic' or 'advanced')
 * @param hasCustomTitle - Whether user provided a custom title
 */
export function trackExportPng(mode: 'basic' | 'advanced', hasCustomTitle: boolean): void {
  datadogRum.addAction('export_png', {
    mode: mode,
    has_custom_title: hasCustomTitle,
  });
}
