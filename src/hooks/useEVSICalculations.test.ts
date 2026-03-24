/**
 * Tests for useEVSICalculations hook
 *
 * Tests verify:
 * - Hook returns null when inputs are incomplete
 * - Hook returns EVSI+CoD results when all inputs are valid
 * - Hook calculates CoD correctly for Ship vs Don't Ship scenarios
 * - Loading state during async calculation
 *
 * Note: Web Worker tests are limited since Vitest/JSDOM doesn't natively
 * support Web Workers. We focus on the Normal fast path (synchronous)
 * and validation logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEVSICalculations } from './useEVSICalculations';
import { useWizardStore } from '@/stores/wizardStore';

// Reset store before each test
beforeEach(() => {
  const { resetWizard } = useWizardStore.getState();
  resetWizard();
});

/**
 * Helper to set up minimal valid baseline/prior/threshold inputs
 */
const setupBaselineInputs = () => {
  const { setInput } = useWizardStore.getState();
  setInput('baselineConversionRate', 0.05);
  setInput('annualVisitors', 1000000);
  setInput('valuePerConversion', 100);
  setInput('priorIntervalLow', -8.22);
  setInput('priorIntervalHigh', 8.22);
  setInput('thresholdScenario', 'any-positive');
};

/**
 * Helper to set up valid experiment design inputs for Normal prior
 */
const setupExperimentInputs = () => {
  const { setInput } = useWizardStore.getState();
  setInput('priorShape', 'normal');
  setInput('testDurationDays', 14);
  setInput('dailyTraffic', 5000);
  setInput('trafficSplit', 0.5);
  setInput('eligibilityFraction', 1.0);
  setInput('conversionLatencyDays', 0);
  setInput('decisionLatencyDays', 0);
};

describe('useEVSICalculations', () => {
  describe('when inputs are incomplete', () => {
    it('returns null when baseline inputs missing', () => {
      act(() => {
        setupExperimentInputs();
        // Don't setup baseline inputs
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when experiment design inputs missing', () => {
      act(() => {
        setupBaselineInputs();
        // Don't setup experiment inputs (except priorShape defaults to 'normal')
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when priorShape is null', () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
        const { setInput } = useWizardStore.getState();
        setInput('priorShape', null);
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when testDurationDays is null', () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
        const { setInput } = useWizardStore.getState();
        setInput('testDurationDays', null);
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when dailyTraffic is null', () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
        const { setInput } = useWizardStore.getState();
        setInput('dailyTraffic', null);
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when student-t selected but df not set', () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
        const { setInput } = useWizardStore.getState();
        setInput('priorShape', 'student-t');
        // studentTDf stays null
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when minimum-lift selected but no threshold value', () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
        const { setInput } = useWizardStore.getState();
        setInput('thresholdScenario', 'minimum-lift');
        // thresholdValue and thresholdUnit not set
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });
  });

  describe('when all inputs are complete (Normal prior - fast path)', () => {
    it('returns EVSI results synchronously for Normal prior', async () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
      });

      const { result } = renderHook(() => useEVSICalculations());

      // Normal prior uses fast path (no Worker), should have results immediately
      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.results!.evsi.evsiDollars).toBeGreaterThanOrEqual(0);
      expect(result.current.results!.evsi.defaultDecision).toBeDefined();
    });

    it('calculates sample sizes correctly', async () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
      });

      const { result } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      // n_total = dailyTraffic * testDurationDays * eligibilityFraction
      // = 5000 * 14 * 1.0 = 70000
      expect(result.current.results!.sampleSizes.n_total).toBe(70000);
      // n_variant = n_total * trafficSplit = 70000 * 0.5 = 35000
      expect(result.current.results!.sampleSizes.n_variant).toBe(35000);
      // n_control = n_total - n_variant = 35000
      expect(result.current.results!.sampleSizes.n_control).toBe(35000);
    });

    it('calculates CoD = 0 when default is Don\'t Ship', async () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
        const { setInput } = useWizardStore.getState();
        // Set threshold above prior mean (0) so default is Don't Ship
        setInput('thresholdScenario', 'minimum-lift');
        setInput('thresholdUnit', 'lift');
        setInput('thresholdValue', 5); // 5% lift required
      });

      const { result } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      // Default decision should be Don't Ship (threshold > prior mean)
      expect(result.current.results!.evsi.defaultDecision).toBe('dont-ship');
      // CoD should be 0 when default is Don't Ship
      expect(result.current.results!.cod.codDollars).toBe(0);
      expect(result.current.results!.cod.codApplies).toBe(false);
    });

    it('calculates CoD > 0 when default is Ship', async () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
        // Use asymmetric prior with positive mean
        const { setInput } = useWizardStore.getState();
        setInput('priorIntervalLow', -5);
        setInput('priorIntervalHigh', 15);
        // Prior mean = (-.05 + .15) / 2 = 0.05 (5%)
        // Threshold = 0 (any-positive), so 5% > 0 means Ship
      });

      const { result } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      // Default decision should be Ship (prior mean > threshold)
      expect(result.current.results!.evsi.defaultDecision).toBe('ship');
      // CoD should apply when default is Ship
      expect(result.current.results!.cod.codApplies).toBe(true);
      expect(result.current.results!.cod.codDollars).toBeGreaterThan(0);
    });

    it('calculates net value via integrated calculation (COD-03)', async () => {
      // Per audit recommendation COD-03:
      // Net value is computed via integrated Monte Carlo simulation,
      // NOT as evsiDollars - codDollars (which has timing inconsistency).
      // The integrated calculation accounts for timing effects coherently.
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
        // Use asymmetric prior to get non-zero CoD
        const { setInput } = useWizardStore.getState();
        setInput('priorIntervalLow', -5);
        setInput('priorIntervalHigh', 15);
      });

      const { result } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      const { evsi, cod, netValueDollars } = result.current.results!;

      // Net value can be negative (timing costs can exceed information value per ENG-08)
      expect(Number.isFinite(netValueDollars)).toBe(true);

      // EVSI and CoD should still be available for UI decomposition
      expect(evsi.evsiDollars).toBeGreaterThan(0);
      expect(cod.codDollars).toBeGreaterThanOrEqual(0);

      // Net value is NOT simply EVSI - CoD (that's the old calculation)
      // Due to Monte Carlo variance, it will typically differ from simple subtraction
      // The integrated calculation computes value with timing effects coherently
    });

    it('includes probability metrics', async () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
      });

      const { result } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      const { evsi } = result.current.results!;
      expect(evsi.probabilityClearsThreshold).toBeGreaterThanOrEqual(0);
      expect(evsi.probabilityClearsThreshold).toBeLessThanOrEqual(1);
      expect(evsi.probabilityTestChangesDecision).toBeGreaterThanOrEqual(0);
      expect(evsi.probabilityTestChangesDecision).toBeLessThanOrEqual(1);
    });
  });

  describe('reactivity', () => {
    it('recomputes when inputs change', async () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
      });

      const { result, rerender } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      const initialEVSI = result.current.results!.evsi.evsiDollars;

      // Change test duration (longer test = more data = lower EVSI relative variance)
      act(() => {
        const { setInput } = useWizardStore.getState();
        setInput('testDurationDays', 28);
      });
      rerender();

      await waitFor(() => {
        // EVSI should change with different sample size
        // Note: we don't predict direction, just that it changes
        expect(result.current.results!.evsi.evsiDollars).not.toBeCloseTo(initialEVSI, 0);
      });
    });

    it('becomes null when required input is cleared', async () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
      });

      const { result, rerender } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      // Clear a required input
      act(() => {
        const { setInput } = useWizardStore.getState();
        setInput('testDurationDays', null);
      });
      rerender();

      expect(result.current.results).toBeNull();
    });
  });

  describe('uniform prior support', () => {
    it('returns results for uniform prior', async () => {
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
        const { setInput } = useWizardStore.getState();
        setInput('priorShape', 'uniform');
        // Uniform uses interval bounds directly
        setInput('priorIntervalLow', -10);
        setInput('priorIntervalHigh', 10);
      });

      const { result } = renderHook(() => useEVSICalculations());

      // Uniform requires Worker (async) but ComlinkWorker isn't available in JSDOM.
      // The Worker will fail, then the sync fallback computes results on the main thread.
      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 5000 }
      );

      // With sync fallback, uniform prior should now produce results
      expect(result.current.results).not.toBeNull();
      expect(result.current.results!.evsi.evsiDollars).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Worker sync fallback', () => {
    it('computes results via sync fallback when Worker is unavailable', async () => {
      // Student-t prior requires Worker path (not fast path).
      // In JSDOM, Worker creation fails -> sync fallback runs on main thread.
      act(() => {
        setupBaselineInputs();
        setupExperimentInputs();
        const { setInput } = useWizardStore.getState();
        setInput('priorShape', 'student-t');
        setInput('studentTDf', 5);
      });

      const { result } = renderHook(() => useEVSICalculations());

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 5000 }
      );

      // Sync fallback should produce valid results
      expect(result.current.results).not.toBeNull();
      expect(result.current.results!.evsi.evsiDollars).toBeGreaterThanOrEqual(0);
      expect(result.current.results!.netValueDollars).toBeDefined();
    });
  });
});
