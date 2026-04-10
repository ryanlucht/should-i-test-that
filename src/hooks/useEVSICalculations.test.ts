/**
 * Tests for useEVSICalculations hook
 *
 * Tests verify:
 * - Hook returns null when inputs are incomplete
 * - Hook returns EVSI+CoD results when all inputs are valid
 * - Hook calculates CoD correctly for Ship vs Don't Ship scenarios
 * - Hook includes directional probability fields
 * - Reactivity on input changes
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
 * Helper to set up minimal valid inputs for EVSI calculation.
 * The store uses a flat setInput(key, value) API.
 */
const setupBaseInputs = () => {
  const { setInput } = useWizardStore.getState();
  setInput('baselineConversionRate', 0.05);
  setInput('annualVisitors', 1000000);
  setInput('valuePerConversion', 100);
  setInput('priorIntervalLow', -8.22);
  setInput('priorIntervalHigh', 8.22);
  setInput('thresholdScenario', 'any-positive');
};

/**
 * Helper to set up experiment design inputs for Normal prior
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

/**
 * Helper to set up all valid inputs at once
 */
const setupAllInputs = () => {
  setupBaseInputs();
  setupExperimentInputs();
};

describe('useEVSICalculations', () => {
  describe('incomplete inputs', () => {
    it('returns null when base inputs missing', () => {
      act(() => {
        setupExperimentInputs();
        // Don't setup base inputs
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when experiment inputs missing', () => {
      act(() => {
        setupBaseInputs();
        // Don't setup experiment inputs
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when priorShape is null', () => {
      act(() => {
        setupAllInputs();
        const { setInput } = useWizardStore.getState();
        setInput('priorShape', null);
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when testDurationDays is null', () => {
      act(() => {
        setupAllInputs();
        const { setInput } = useWizardStore.getState();
        setInput('testDurationDays', null);
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when dailyTraffic is null', () => {
      act(() => {
        setupAllInputs();
        const { setInput } = useWizardStore.getState();
        setInput('dailyTraffic', null);
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when student-t selected but df not set', () => {
      act(() => {
        setupAllInputs();
        const { setInput } = useWizardStore.getState();
        setInput('priorShape', 'student-t');
        // studentTDf stays null
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });

    it('returns null when minimum-lift selected but no threshold value', () => {
      act(() => {
        setupAllInputs();
        const { setInput } = useWizardStore.getState();
        setInput('thresholdScenario', 'minimum-lift');
        // thresholdValue and thresholdUnit not set
      });

      const { result } = renderHook(() => useEVSICalculations());
      expect(result.current.results).toBeNull();
    });
  });

  describe('complete inputs (Normal prior - fast path)', () => {
    it('returns EVSI results synchronously for Normal prior', async () => {
      act(() => {
        setupAllInputs();
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
        setupAllInputs();
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

    it('returns dont-ship default when threshold above prior mean', async () => {
      act(() => {
        setupAllInputs();
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

      expect(result.current.results!.evsi.defaultDecision).toBe('dont-ship');
    });

    it('returns ship default when prior mean above threshold', async () => {
      act(() => {
        setupAllInputs();
        const { setInput } = useWizardStore.getState();
        // Use asymmetric prior with positive mean
        setInput('priorIntervalLow', -5);
        setInput('priorIntervalHigh', 15);
        // Prior mean = (-5 + 15) / 2 = 5%
        // Threshold = 0 (any-positive), so 5% > 0 means Ship
      });

      const { result } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      expect(result.current.results!.evsi.defaultDecision).toBe('ship');
    });

    it('calculates net value via integrated calculation (COD-03)', async () => {
      act(() => {
        setupAllInputs();
        const { setInput } = useWizardStore.getState();
        // Use asymmetric prior to get non-zero timing costs
        setInput('priorIntervalLow', -5);
        setInput('priorIntervalHigh', 15);
      });

      const { result } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      const { evsi, netValueDollars } = result.current.results!;

      // Net value should be a reasonable positive value
      expect(netValueDollars).toBeGreaterThanOrEqual(0);

      // EVSI should be available for UI decomposition
      expect(evsi.evsiDollars).toBeGreaterThan(0);
    });

    it('includes probability metrics', async () => {
      act(() => {
        setupAllInputs();
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

    it('includes directional probability fields (pStopsShip / pConvincesShip)', async () => {
      act(() => {
        setupAllInputs();
        const { setInput } = useWizardStore.getState();
        // Use asymmetric prior so default=ship and pStopsShip is the active direction
        setInput('priorIntervalLow', -5);
        setInput('priorIntervalHigh', 15);
      });

      const { result } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      const { evsi } = result.current.results!;
      // Directional fields should be defined (fast-path always sets them)
      expect(evsi.pStopsShip).toBeDefined();
      expect(evsi.pConvincesShip).toBeDefined();
      // Identity: pStopsShip + pConvincesShip === probabilityTestChangesDecision
      expect(evsi.pStopsShip! + evsi.pConvincesShip!).toBeCloseTo(
        evsi.probabilityTestChangesDecision,
        5
      );
      // For default=ship: only pStopsShip is non-zero
      expect(evsi.defaultDecision).toBe('ship');
      expect(evsi.pConvincesShip).toBe(0);
    });

    it('includes effectivePriorMean field in results (Test 8)', async () => {
      act(() => {
        setupAllInputs();
      });

      const { result } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      // effectivePriorMean should be a finite number
      expect(result.current.results!.effectivePriorMean).toBeDefined();
      expect(typeof result.current.results!.effectivePriorMean).toBe('number');
      expect(Number.isFinite(result.current.results!.effectivePriorMean)).toBe(true);
    });
  });

  describe('reactivity', () => {
    it('recomputes when inputs change', async () => {
      act(() => {
        setupAllInputs();
      });

      const { result, rerender } = renderHook(() => useEVSICalculations());

      await waitFor(() => {
        expect(result.current.results).not.toBeNull();
      });

      const initialEVSI = result.current.results!.evsi.evsiDollars;

      // Change test duration (longer test = more data)
      act(() => {
        const { setInput } = useWizardStore.getState();
        setInput('testDurationDays', 28);
      });
      rerender();

      await waitFor(() => {
        expect(result.current.results!.evsi.evsiDollars).not.toBeCloseTo(initialEVSI, 0);
      });
    });

    it('becomes null when required input is cleared', async () => {
      act(() => {
        setupAllInputs();
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
        setupAllInputs();
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
      // In JSDOM, Worker creation fails → sync fallback runs on main thread.
      act(() => {
        setupAllInputs();
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
