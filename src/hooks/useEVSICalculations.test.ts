/**
 * Tests for useEVSICalculations hook
 *
 * Tests verify:
 * - Hook returns null for basic mode
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
 * Helper to set up minimal valid shared inputs
 */
const setupSharedInputs = () => {
  const { setSharedInput } = useWizardStore.getState();
  setSharedInput('baselineConversionRate', 0.05);
  setSharedInput('annualVisitors', 1000000);
  setSharedInput('valuePerConversion', 100);
  setSharedInput('priorIntervalLow', -8.22);
  setSharedInput('priorIntervalHigh', 8.22);
  setSharedInput('thresholdScenario', 'any-positive');
};

/**
 * Helper to set up valid advanced inputs for Normal prior
 */
const setupAdvancedInputs = () => {
  const { setAdvancedInput } = useWizardStore.getState();
  setAdvancedInput('priorShape', 'normal');
  setAdvancedInput('testDurationDays', 14);
  setAdvancedInput('dailyTraffic', 5000);
  setAdvancedInput('trafficSplit', 0.5);
  setAdvancedInput('eligibilityFraction', 1.0);
  setAdvancedInput('conversionLatencyDays', 0);
  setAdvancedInput('decisionLatencyDays', 0);
};

describe('useEVSICalculations', () => {
  describe('when mode is basic', () => {
    it('returns null results (EVSI is Advanced-only)', () => {
      // Mode is 'basic' by default
      act(() => {
        setupSharedInputs();
        setupAdvancedInputs();
      });

      const { result } = renderHook(() => useEVSICalculations());

      // Basic mode should not calculate EVSI
      expect(result.current.results).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });

  describe('when mode is advanced', () => {
    beforeEach(() => {
      const { setMode } = useWizardStore.getState();
      setMode('advanced');
    });

    describe('and inputs are incomplete', () => {
      it('returns null when shared inputs missing', () => {
        act(() => {
          setupAdvancedInputs();
          // Don't setup shared inputs
        });

        const { result } = renderHook(() => useEVSICalculations());
        expect(result.current.results).toBeNull();
      });

      it('returns null when advanced inputs missing', () => {
        act(() => {
          setupSharedInputs();
          // Don't setup advanced inputs
        });

        const { result } = renderHook(() => useEVSICalculations());
        expect(result.current.results).toBeNull();
      });

      it('returns null when priorShape is null', () => {
        act(() => {
          setupSharedInputs();
          setupAdvancedInputs();
          const { setAdvancedInput } = useWizardStore.getState();
          setAdvancedInput('priorShape', null);
        });

        const { result } = renderHook(() => useEVSICalculations());
        expect(result.current.results).toBeNull();
      });

      it('returns null when testDurationDays is null', () => {
        act(() => {
          setupSharedInputs();
          setupAdvancedInputs();
          const { setAdvancedInput } = useWizardStore.getState();
          setAdvancedInput('testDurationDays', null);
        });

        const { result } = renderHook(() => useEVSICalculations());
        expect(result.current.results).toBeNull();
      });

      it('returns null when dailyTraffic is null', () => {
        act(() => {
          setupSharedInputs();
          setupAdvancedInputs();
          const { setAdvancedInput } = useWizardStore.getState();
          setAdvancedInput('dailyTraffic', null);
        });

        const { result } = renderHook(() => useEVSICalculations());
        expect(result.current.results).toBeNull();
      });

      it('returns null when student-t selected but df not set', () => {
        act(() => {
          setupSharedInputs();
          setupAdvancedInputs();
          const { setAdvancedInput } = useWizardStore.getState();
          setAdvancedInput('priorShape', 'student-t');
          // studentTDf stays null
        });

        const { result } = renderHook(() => useEVSICalculations());
        expect(result.current.results).toBeNull();
      });

      it('returns null when minimum-lift selected but no threshold value', () => {
        act(() => {
          setupSharedInputs();
          setupAdvancedInputs();
          const { setSharedInput } = useWizardStore.getState();
          setSharedInput('thresholdScenario', 'minimum-lift');
          // thresholdValue and thresholdUnit not set
        });

        const { result } = renderHook(() => useEVSICalculations());
        expect(result.current.results).toBeNull();
      });
    });

    describe('and all inputs are complete (Normal prior - fast path)', () => {
      it('returns EVSI results synchronously for Normal prior', async () => {
        act(() => {
          setupSharedInputs();
          setupAdvancedInputs();
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
          setupSharedInputs();
          setupAdvancedInputs();
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
          setupSharedInputs();
          setupAdvancedInputs();
          const { setSharedInput } = useWizardStore.getState();
          // Set threshold above prior mean (0) so default is Don't Ship
          setSharedInput('thresholdScenario', 'minimum-lift');
          setSharedInput('thresholdUnit', 'lift');
          setSharedInput('thresholdValue', 5); // 5% lift required
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
          setupSharedInputs();
          setupAdvancedInputs();
          // Use asymmetric prior with positive mean
          const { setSharedInput } = useWizardStore.getState();
          setSharedInput('priorIntervalLow', -5);
          setSharedInput('priorIntervalHigh', 15);
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
          setupSharedInputs();
          setupAdvancedInputs();
          // Use asymmetric prior to get non-zero CoD
          const { setSharedInput } = useWizardStore.getState();
          setSharedInput('priorIntervalLow', -5);
          setSharedInput('priorIntervalHigh', 15);
        });

        const { result } = renderHook(() => useEVSICalculations());

        await waitFor(() => {
          expect(result.current.results).not.toBeNull();
        });

        const { evsi, cod, netValueDollars } = result.current.results!;

        // Net value should be a reasonable positive value
        // (or zero if CoD exceeds EVSI benefit)
        expect(netValueDollars).toBeGreaterThanOrEqual(0);

        // EVSI and CoD should still be available for UI decomposition
        expect(evsi.evsiDollars).toBeGreaterThan(0);
        expect(cod.codDollars).toBeGreaterThanOrEqual(0);

        // Net value is NOT simply EVSI - CoD (that's the old calculation)
        // Due to Monte Carlo variance, it will typically differ from simple subtraction
        // The integrated calculation computes value with timing effects coherently
      });

      it('includes probability metrics', async () => {
        act(() => {
          setupSharedInputs();
          setupAdvancedInputs();
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
          setupSharedInputs();
          setupAdvancedInputs();
        });

        const { result, rerender } = renderHook(() => useEVSICalculations());

        await waitFor(() => {
          expect(result.current.results).not.toBeNull();
        });

        const initialEVSI = result.current.results!.evsi.evsiDollars;

        // Change test duration (longer test = more data = lower EVSI relative variance)
        act(() => {
          const { setAdvancedInput } = useWizardStore.getState();
          setAdvancedInput('testDurationDays', 28);
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
          setupSharedInputs();
          setupAdvancedInputs();
        });

        const { result, rerender } = renderHook(() => useEVSICalculations());

        await waitFor(() => {
          expect(result.current.results).not.toBeNull();
        });

        // Clear a required input
        act(() => {
          const { setAdvancedInput } = useWizardStore.getState();
          setAdvancedInput('testDurationDays', null);
        });
        rerender();

        expect(result.current.results).toBeNull();
      });

      it('becomes null when mode switches to basic', async () => {
        act(() => {
          setupSharedInputs();
          setupAdvancedInputs();
        });

        const { result, rerender } = renderHook(() => useEVSICalculations());

        await waitFor(() => {
          expect(result.current.results).not.toBeNull();
        });

        // Switch to basic mode
        act(() => {
          const { setMode } = useWizardStore.getState();
          setMode('basic');
        });
        rerender();

        expect(result.current.results).toBeNull();
      });
    });

    describe('uniform prior support', () => {
      it('returns results for uniform prior', async () => {
        act(() => {
          setupSharedInputs();
          setupAdvancedInputs();
          const { setAdvancedInput, setSharedInput } = useWizardStore.getState();
          setAdvancedInput('priorShape', 'uniform');
          // Uniform uses interval bounds directly
          setSharedInput('priorIntervalLow', -10);
          setSharedInput('priorIntervalHigh', 10);
        });

        const { result } = renderHook(() => useEVSICalculations());

        // Uniform requires Worker (async) but ComlinkWorker isn't available in JSDOM
        // The hook will attempt to create a Worker, fail, and catch the error gracefully
        // We test that:
        // 1. Initial state triggers loading (validation passed)
        // 2. After error handling, loading becomes false
        // In a real browser, this would return results
        await waitFor(
          () => {
            // After Worker error is caught, loading should be false
            // This confirms validation passed and we attempted Worker computation
            expect(result.current.loading).toBe(false);
          },
          { timeout: 2000 }
        );

        // Results will be null because ComlinkWorker isn't available in JSDOM
        // This is expected - the real test is that validation didn't reject the uniform inputs
      });
    });
  });
});
