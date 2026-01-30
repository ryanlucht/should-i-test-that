import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore } from './wizardStore';
import { initialAdvancedInputs } from '@/types/wizard';

describe('wizardStore', () => {
  beforeEach(() => {
    // Clear sessionStorage and reset store before each test
    sessionStorage.clear();
    useWizardStore.setState({
      mode: 'basic',
      inputs: {
        shared: {
          baselineConversionRate: null,
          annualVisitors: null,
          valuePerConversion: null,
          priorType: null,
          threshold: null,
        },
        advanced: { ...initialAdvancedInputs },
      },
      currentSection: 0,
      completedSections: [],
    });
  });

  describe('mode switching', () => {
    it('starts in basic mode', () => {
      const { mode } = useWizardStore.getState();
      expect(mode).toBe('basic');
    });

    it('can switch to advanced mode', () => {
      const { setMode } = useWizardStore.getState();
      setMode('advanced');
      expect(useWizardStore.getState().mode).toBe('advanced');
    });

    it('preserves shared inputs when switching modes', () => {
      const { setSharedInput, setMode } = useWizardStore.getState();

      // Set some shared inputs
      setSharedInput('baselineConversionRate', 5);
      setSharedInput('annualVisitors', 100000);

      // Switch to advanced
      setMode('advanced');
      expect(useWizardStore.getState().inputs.shared.baselineConversionRate).toBe(5);
      expect(useWizardStore.getState().inputs.shared.annualVisitors).toBe(100000);

      // Switch back to basic
      setMode('basic');
      expect(useWizardStore.getState().inputs.shared.baselineConversionRate).toBe(5);
      expect(useWizardStore.getState().inputs.shared.annualVisitors).toBe(100000);
    });

    it('clears advanced inputs when switching to basic mode', () => {
      const { setMode, setAdvancedInput } = useWizardStore.getState();

      // Switch to advanced and set some inputs
      setMode('advanced');
      setAdvancedInput('testDuration', 2);
      setAdvancedInput('dailyTestTraffic', 5000);
      setAdvancedInput('testFixedCost', 1000);

      // Verify advanced inputs are set
      expect(useWizardStore.getState().inputs.advanced.testDuration).toBe(2);
      expect(useWizardStore.getState().inputs.advanced.dailyTestTraffic).toBe(5000);
      expect(useWizardStore.getState().inputs.advanced.testFixedCost).toBe(1000);

      // Switch to basic - should clear advanced inputs
      setMode('basic');
      const { inputs } = useWizardStore.getState();
      expect(inputs.advanced.testDuration).toBe(null);
      expect(inputs.advanced.dailyTestTraffic).toBe(null);
      expect(inputs.advanced.testFixedCost).toBe(null);
      // trafficAllocation has a default value
      expect(inputs.advanced.trafficAllocation).toBe(50);
    });

    it('keeps advanced inputs when switching to advanced mode', () => {
      const { setMode, setAdvancedInput } = useWizardStore.getState();

      // Switch to advanced and set some inputs
      setMode('advanced');
      setAdvancedInput('testDuration', 2);

      // Switch to basic (clears advanced inputs)
      setMode('basic');

      // Set new advanced inputs
      setMode('advanced');
      setAdvancedInput('testDuration', 3);

      // Verify inputs are preserved when staying in advanced
      expect(useWizardStore.getState().inputs.advanced.testDuration).toBe(3);
    });
  });

  describe('section navigation', () => {
    it('starts at section 0', () => {
      expect(useWizardStore.getState().currentSection).toBe(0);
    });

    it('can mark sections complete', () => {
      const { markSectionComplete } = useWizardStore.getState();
      markSectionComplete(0);
      markSectionComplete(1);
      expect(useWizardStore.getState().completedSections).toContain(0);
      expect(useWizardStore.getState().completedSections).toContain(1);
    });

    it('does not duplicate completed sections', () => {
      const { markSectionComplete } = useWizardStore.getState();
      markSectionComplete(0);
      markSectionComplete(0);
      markSectionComplete(0);
      const { completedSections } = useWizardStore.getState();
      expect(completedSections.filter((s) => s === 0)).toHaveLength(1);
    });

    it('allows access to section 0 always', () => {
      const { canAccessSection } = useWizardStore.getState();
      expect(canAccessSection(0)).toBe(true);
    });

    it('blocks access to section N if prior sections incomplete', () => {
      const { canAccessSection } = useWizardStore.getState();
      expect(canAccessSection(1)).toBe(false);
      expect(canAccessSection(2)).toBe(false);
    });

    it('allows access to section N if all prior sections complete', () => {
      const { markSectionComplete, canAccessSection } = useWizardStore.getState();
      markSectionComplete(0);
      expect(canAccessSection(1)).toBe(true);
      expect(canAccessSection(2)).toBe(false);

      markSectionComplete(1);
      expect(canAccessSection(2)).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      const { setMode, setSharedInput, setAdvancedInput, markSectionComplete, resetWizard } =
        useWizardStore.getState();

      // Set various state
      setMode('advanced');
      setSharedInput('baselineConversionRate', 5);
      setAdvancedInput('testDuration', 2);
      markSectionComplete(0);

      // Reset
      resetWizard();

      const state = useWizardStore.getState();
      expect(state.mode).toBe('basic');
      expect(state.inputs.shared.baselineConversionRate).toBe(null);
      expect(state.inputs.advanced.testDuration).toBe(null);
      expect(state.completedSections).toHaveLength(0);
      expect(state.currentSection).toBe(0);
    });
  });
});
