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
          visitorUnitLabel: 'visitors',
          valuePerConversion: null,
          priorType: null,
          priorIntervalLow: null,
          priorIntervalHigh: null,
          thresholdScenario: null,
          thresholdUnit: null,
          thresholdValue: null,
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
      setAdvancedInput('testDurationDays', 14);
      setAdvancedInput('dailyTraffic', 5000);
      setAdvancedInput('conversionLatencyDays', 7);

      // Verify advanced inputs are set
      expect(useWizardStore.getState().inputs.advanced.testDurationDays).toBe(14);
      expect(useWizardStore.getState().inputs.advanced.dailyTraffic).toBe(5000);
      expect(useWizardStore.getState().inputs.advanced.conversionLatencyDays).toBe(7);

      // Switch to basic - should clear advanced inputs
      setMode('basic');
      const { inputs } = useWizardStore.getState();
      expect(inputs.advanced.testDurationDays).toBe(null);
      expect(inputs.advanced.dailyTraffic).toBe(null);
      expect(inputs.advanced.conversionLatencyDays).toBe(0);
      // trafficSplit has a default value (0.5 = 50%)
      expect(inputs.advanced.trafficSplit).toBe(0.5);
    });

    it('keeps advanced inputs when switching to advanced mode', () => {
      const { setMode, setAdvancedInput } = useWizardStore.getState();

      // Switch to advanced and set some inputs
      setMode('advanced');
      setAdvancedInput('testDurationDays', 14);

      // Switch to basic (clears advanced inputs)
      setMode('basic');

      // Set new advanced inputs
      setMode('advanced');
      setAdvancedInput('testDurationDays', 21);

      // Verify inputs are preserved when staying in advanced
      expect(useWizardStore.getState().inputs.advanced.testDurationDays).toBe(21);
    });
  });

  describe('advanced inputs for prior shape', () => {
    it('can set priorShape to normal, student-t, or uniform', () => {
      const { setAdvancedInput } = useWizardStore.getState();

      // Normal
      setAdvancedInput('priorShape', 'normal');
      expect(useWizardStore.getState().inputs.advanced.priorShape).toBe('normal');

      // Student-t
      setAdvancedInput('priorShape', 'student-t');
      expect(useWizardStore.getState().inputs.advanced.priorShape).toBe('student-t');

      // Uniform
      setAdvancedInput('priorShape', 'uniform');
      expect(useWizardStore.getState().inputs.advanced.priorShape).toBe('uniform');
    });

    it('can set studentTDf preset values', () => {
      const { setAdvancedInput } = useWizardStore.getState();

      // df=3 (heavy tails)
      setAdvancedInput('studentTDf', 3);
      expect(useWizardStore.getState().inputs.advanced.studentTDf).toBe(3);

      // df=5 (moderate)
      setAdvancedInput('studentTDf', 5);
      expect(useWizardStore.getState().inputs.advanced.studentTDf).toBe(5);

      // df=10 (near-normal)
      setAdvancedInput('studentTDf', 10);
      expect(useWizardStore.getState().inputs.advanced.studentTDf).toBe(10);
    });

    it('clears prior shape inputs when switching to basic mode', () => {
      const { setMode, setAdvancedInput } = useWizardStore.getState();

      // Set prior shape inputs in advanced mode
      setMode('advanced');
      setAdvancedInput('priorShape', 'student-t');
      setAdvancedInput('studentTDf', 5);

      // Verify they're set
      expect(useWizardStore.getState().inputs.advanced.priorShape).toBe('student-t');
      expect(useWizardStore.getState().inputs.advanced.studentTDf).toBe(5);

      // Switch to basic - should clear
      setMode('basic');
      expect(useWizardStore.getState().inputs.advanced.priorShape).toBe(null);
      expect(useWizardStore.getState().inputs.advanced.studentTDf).toBe(null);
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
      setAdvancedInput('testDurationDays', 14);
      markSectionComplete(0);

      // Reset
      resetWizard();

      const state = useWizardStore.getState();
      expect(state.mode).toBe('basic');
      expect(state.inputs.shared.baselineConversionRate).toBe(null);
      expect(state.inputs.advanced.testDurationDays).toBe(null);
      expect(state.completedSections).toHaveLength(0);
      expect(state.currentSection).toBe(0);
    });
  });
});
