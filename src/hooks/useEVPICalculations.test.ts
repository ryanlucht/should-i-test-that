/**
 * Tests for useEVPICalculations hook
 *
 * Tests verify:
 * - Hook returns null for incomplete inputs
 * - Hook returns EVPI results when all inputs are valid
 * - Hook correctly derives prior from interval values
 * - Hook correctly converts threshold units
 * - Hook recomputes when inputs change
 */

import { renderHook, act } from '@testing-library/react';
import { useEVPICalculations } from './useEVPICalculations';
import { useWizardStore } from '@/stores/wizardStore';

// Reset store before each test
beforeEach(() => {
  const { resetWizard } = useWizardStore.getState();
  resetWizard();
});

describe('useEVPICalculations', () => {
  describe('when inputs are incomplete', () => {
    it('returns null when no inputs are set', () => {
      const { result } = renderHook(() => useEVPICalculations());
      expect(result.current).toBeNull();
    });

    it('returns null when only some business inputs are set', () => {
      const { setSharedInput } = useWizardStore.getState();

      act(() => {
        setSharedInput('baselineConversionRate', 0.05);
        setSharedInput('annualVisitors', 1000000);
        // valuePerConversion not set
      });

      const { result } = renderHook(() => useEVPICalculations());
      expect(result.current).toBeNull();
    });

    it('returns null when threshold scenario not selected', () => {
      const { setSharedInput } = useWizardStore.getState();

      act(() => {
        setSharedInput('baselineConversionRate', 0.05);
        setSharedInput('annualVisitors', 1000000);
        setSharedInput('valuePerConversion', 100);
        setSharedInput('priorIntervalLow', -8.22);
        setSharedInput('priorIntervalHigh', 8.22);
        // thresholdScenario not set
      });

      const { result } = renderHook(() => useEVPICalculations());
      expect(result.current).toBeNull();
    });

    it('returns null when minimum-lift selected but no threshold value', () => {
      const { setSharedInput } = useWizardStore.getState();

      act(() => {
        setSharedInput('baselineConversionRate', 0.05);
        setSharedInput('annualVisitors', 1000000);
        setSharedInput('valuePerConversion', 100);
        setSharedInput('priorIntervalLow', -8.22);
        setSharedInput('priorIntervalHigh', 8.22);
        setSharedInput('thresholdScenario', 'minimum-lift');
        // thresholdValue and thresholdUnit not set
      });

      const { result } = renderHook(() => useEVPICalculations());
      expect(result.current).toBeNull();
    });

    it('returns null when minimum-lift selected but only value is set (no unit)', () => {
      const { setSharedInput } = useWizardStore.getState();

      act(() => {
        setSharedInput('baselineConversionRate', 0.05);
        setSharedInput('annualVisitors', 1000000);
        setSharedInput('valuePerConversion', 100);
        setSharedInput('priorIntervalLow', -8.22);
        setSharedInput('priorIntervalHigh', 8.22);
        setSharedInput('thresholdScenario', 'minimum-lift');
        setSharedInput('thresholdValue', 5);
        // thresholdUnit not set
      });

      const { result } = renderHook(() => useEVPICalculations());
      expect(result.current).toBeNull();
    });

    it('returns null when accept-loss selected but no threshold', () => {
      const { setSharedInput } = useWizardStore.getState();

      act(() => {
        setSharedInput('baselineConversionRate', 0.05);
        setSharedInput('annualVisitors', 1000000);
        setSharedInput('valuePerConversion', 100);
        setSharedInput('thresholdScenario', 'accept-loss');
        // thresholdValue and thresholdUnit not set
      });

      const { result } = renderHook(() => useEVPICalculations());
      expect(result.current).toBeNull();
    });
  });

  describe('when all inputs are valid', () => {
    const setupValidInputs = () => {
      const { setSharedInput } = useWizardStore.getState();
      setSharedInput('baselineConversionRate', 0.05);
      setSharedInput('annualVisitors', 1000000);
      setSharedInput('valuePerConversion', 100);
      setSharedInput('priorIntervalLow', -8.22);
      setSharedInput('priorIntervalHigh', 8.22);
      setSharedInput('thresholdScenario', 'any-positive');
    };

    it('returns EVPI results for any-positive threshold', () => {
      act(() => {
        setupValidInputs();
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      expect(result.current!.evpiDollars).toBeGreaterThan(0);
      // With default prior mu=0 and T=0, default decision is "ship" (tie goes to ship)
      expect(result.current!.defaultDecision).toBe('ship');
      // K = 1000000 * 0.05 * 100 = 5,000,000
      expect(result.current!.K).toBe(5000000);
    });

    it('returns EVPI results for minimum-lift threshold in lift units', () => {
      act(() => {
        setupValidInputs();
        const { setSharedInput } = useWizardStore.getState();
        setSharedInput('thresholdScenario', 'minimum-lift');
        setSharedInput('thresholdUnit', 'lift');
        setSharedInput('thresholdValue', 5); // 5% lift
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      // threshold_L = 0.05 (5% as decimal)
      // threshold_dollars = K * threshold_L = 5000000 * 0.05 = 250000
      expect(result.current!.threshold_dollars).toBeCloseTo(250000, -2);
      // With T_L > mu_L (0.05 > 0), default decision should be "dont-ship"
      expect(result.current!.defaultDecision).toBe('dont-ship');
    });

    it('returns EVPI results for minimum-lift threshold in dollars', () => {
      act(() => {
        setupValidInputs();
        const { setSharedInput } = useWizardStore.getState();
        setSharedInput('thresholdScenario', 'minimum-lift');
        setSharedInput('thresholdUnit', 'dollars');
        setSharedInput('thresholdValue', 100000); // $100K
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      // T_L = 100000 / 5000000 = 0.02 (2% lift)
      // threshold_dollars should match input (within rounding)
      expect(result.current!.threshold_dollars).toBeCloseTo(100000, -2);
    });

    it('returns EVPI results for accept-loss threshold (negative)', () => {
      act(() => {
        setupValidInputs();
        const { setSharedInput } = useWizardStore.getState();
        setSharedInput('thresholdScenario', 'accept-loss');
        setSharedInput('thresholdUnit', 'lift');
        setSharedInput('thresholdValue', -5); // -5% lift (stored negative per sign convention)
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      // threshold_L = -0.05 (negative)
      // threshold_dollars = K * threshold_L = 5000000 * -0.05 = -250000
      expect(result.current!.threshold_dollars).toBeCloseTo(-250000, -2);
      // With T_L < mu_L (-0.05 < 0), default decision should be "ship"
      expect(result.current!.defaultDecision).toBe('ship');
    });

    it('returns EVPI results for accept-loss threshold in dollars', () => {
      act(() => {
        setupValidInputs();
        const { setSharedInput } = useWizardStore.getState();
        setSharedInput('thresholdScenario', 'accept-loss');
        setSharedInput('thresholdUnit', 'dollars');
        setSharedInput('thresholdValue', -50000); // -$50K (stored negative per sign convention)
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      // threshold_dollars should match input
      expect(result.current!.threshold_dollars).toBeCloseTo(-50000, -2);
    });

    it('includes edge case flags in results', () => {
      act(() => {
        setupValidInputs();
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      expect(result.current!.edgeCases).toBeDefined();
      expect(typeof result.current!.edgeCases.nearZeroSigma).toBe('boolean');
      expect(typeof result.current!.edgeCases.priorOneSided).toBe('boolean');
      expect(typeof result.current!.edgeCases.truncationApplied).toBe('boolean');
    });
  });

  describe('prior derivation', () => {
    const setupBusinessInputs = () => {
      const { setSharedInput } = useWizardStore.getState();
      setSharedInput('baselineConversionRate', 0.05);
      setSharedInput('annualVisitors', 1000000);
      setSharedInput('valuePerConversion', 100);
      setSharedInput('thresholdScenario', 'any-positive');
    };

    it('uses default prior when interval matches defaults', () => {
      act(() => {
        setupBusinessInputs();
        const { setSharedInput } = useWizardStore.getState();
        setSharedInput('priorIntervalLow', -8.22);
        setSharedInput('priorIntervalHigh', 8.22);
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      // Default prior: N(0, 0.05)
      // With z=0 and threshold=0, we expect z-score to be 0
      expect(result.current!.zScore).toBeCloseTo(0, 4);
    });

    it('uses default prior when interval values are null', () => {
      act(() => {
        setupBusinessInputs();
        // Don't set interval values - they stay null
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      // Should still calculate with default prior
      expect(result.current!.zScore).toBeCloseTo(0, 4);
    });

    it('computes custom prior from asymmetric interval', () => {
      act(() => {
        setupBusinessInputs();
        const { setSharedInput } = useWizardStore.getState();
        setSharedInput('priorIntervalLow', -5);  // -5%
        setSharedInput('priorIntervalHigh', 15); // +15%
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      // Custom prior: mu_L = (-.05 + .15)/2 = 0.05 (5% expected lift)
      // With threshold=0 and mu_L=0.05, z = (0 - 0.05) / sigma = negative
      // (threshold is below the mean)
      expect(result.current!.zScore).toBeLessThan(0);
    });

    it('computes custom prior from wider symmetric interval', () => {
      act(() => {
        setupBusinessInputs();
        const { setSharedInput } = useWizardStore.getState();
        setSharedInput('priorIntervalLow', -20);  // -20%
        setSharedInput('priorIntervalHigh', 20);  // +20%
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      // Wider interval means larger sigma
      // mu should still be 0, so z-score should still be ~0
      expect(result.current!.zScore).toBeCloseTo(0, 4);
      // But EVPI should be higher due to more uncertainty
      // We can't easily test this without comparing to default
    });

    it('computes custom prior from narrow interval', () => {
      act(() => {
        setupBusinessInputs();
        const { setSharedInput } = useWizardStore.getState();
        setSharedInput('priorIntervalLow', -1);  // -1%
        setSharedInput('priorIntervalHigh', 1);   // +1%
      });

      const { result } = renderHook(() => useEVPICalculations());

      expect(result.current).not.toBeNull();
      // Very narrow interval = high certainty
      // EVPI should be relatively low (less value from perfect info)
      expect(result.current!.evpiDollars).toBeLessThan(100000);
    });
  });

  describe('reactivity', () => {
    it('recomputes when inputs change', () => {
      const { setSharedInput } = useWizardStore.getState();

      // Setup initial valid state
      act(() => {
        setSharedInput('baselineConversionRate', 0.05);
        setSharedInput('annualVisitors', 1000000);
        setSharedInput('valuePerConversion', 100);
        setSharedInput('priorIntervalLow', -8.22);
        setSharedInput('priorIntervalHigh', 8.22);
        setSharedInput('thresholdScenario', 'any-positive');
      });

      const { result, rerender } = renderHook(() => useEVPICalculations());
      const initialEVPI = result.current!.evpiDollars;
      const initialK = result.current!.K;

      // Change value per conversion
      act(() => {
        setSharedInput('valuePerConversion', 200);
      });
      rerender();

      // EVPI should increase (higher K)
      expect(result.current!.evpiDollars).toBeGreaterThan(initialEVPI);
      // K should have doubled
      expect(result.current!.K).toBe(initialK * 2);
    });

    it('recomputes when threshold scenario changes', () => {
      const { setSharedInput } = useWizardStore.getState();

      // Setup with any-positive
      act(() => {
        setSharedInput('baselineConversionRate', 0.05);
        setSharedInput('annualVisitors', 1000000);
        setSharedInput('valuePerConversion', 100);
        setSharedInput('priorIntervalLow', -8.22);
        setSharedInput('priorIntervalHigh', 8.22);
        setSharedInput('thresholdScenario', 'any-positive');
      });

      const { result, rerender } = renderHook(() => useEVPICalculations());
      const anyPositiveEVPI = result.current!.evpiDollars;

      // Change to minimum-lift with 5% threshold
      act(() => {
        setSharedInput('thresholdScenario', 'minimum-lift');
        setSharedInput('thresholdUnit', 'lift');
        setSharedInput('thresholdValue', 5);
      });
      rerender();

      // EVPI should be different with a higher threshold
      expect(result.current!.evpiDollars).not.toEqual(anyPositiveEVPI);
      // Default decision changes from ship to dont-ship
      expect(result.current!.defaultDecision).toBe('dont-ship');
    });

    it('recomputes when prior interval changes', () => {
      const { setSharedInput } = useWizardStore.getState();

      // Setup initial state
      act(() => {
        setSharedInput('baselineConversionRate', 0.05);
        setSharedInput('annualVisitors', 1000000);
        setSharedInput('valuePerConversion', 100);
        setSharedInput('priorIntervalLow', -8.22);
        setSharedInput('priorIntervalHigh', 8.22);
        setSharedInput('thresholdScenario', 'any-positive');
      });

      const { result, rerender } = renderHook(() => useEVPICalculations());
      const initialZScore = result.current!.zScore;

      // Change to asymmetric prior (expecting positive lift)
      act(() => {
        setSharedInput('priorIntervalLow', -5);
        setSharedInput('priorIntervalHigh', 15);
      });
      rerender();

      // z-score should change (now threshold is below mean)
      expect(result.current!.zScore).not.toEqual(initialZScore);
      expect(result.current!.zScore).toBeLessThan(0);
    });

    it('becomes null when required input is cleared', () => {
      const { setSharedInput } = useWizardStore.getState();

      // Setup valid state
      act(() => {
        setSharedInput('baselineConversionRate', 0.05);
        setSharedInput('annualVisitors', 1000000);
        setSharedInput('valuePerConversion', 100);
        setSharedInput('thresholdScenario', 'any-positive');
      });

      const { result, rerender } = renderHook(() => useEVPICalculations());
      expect(result.current).not.toBeNull();

      // Clear a required input
      act(() => {
        setSharedInput('valuePerConversion', null);
      });
      rerender();

      // Should return null now
      expect(result.current).toBeNull();
    });
  });
});
