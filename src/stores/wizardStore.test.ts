import { describe, it, expect, beforeEach } from 'vitest';
import { useWizardStore } from './wizardStore';
import { initialInputs } from '@/types/wizard';

describe('wizardStore', () => {
  beforeEach(() => {
    // Clear sessionStorage and reset store before each test
    sessionStorage.clear();
    useWizardStore.setState({
      inputs: { ...initialInputs },
      currentSection: 0,
      completedSections: [],
    });
  });

  describe('inputs', () => {
    it('starts with initial input values', () => {
      const { inputs } = useWizardStore.getState();
      expect(inputs.baselineConversionRate).toBe(null);
      expect(inputs.annualVisitors).toBe(null);
      expect(inputs.visitorUnitLabel).toBe('visitors');
      expect(inputs.valuePerConversion).toBe(null);
      expect(inputs.priorType).toBe(null);
      expect(inputs.priorShape).toBe('normal');
      expect(inputs.testDurationDays).toBe(null);
      expect(inputs.trafficSplit).toBe(0.5);
      expect(inputs.eligibilityFraction).toBe(1.0);
      expect(inputs.decisionLatencyDays).toBe(0);
    });

    it('can set baseline inputs via setInput', () => {
      const { setInput } = useWizardStore.getState();

      setInput('baselineConversionRate', 0.05);
      expect(useWizardStore.getState().inputs.baselineConversionRate).toBe(0.05);

      setInput('annualVisitors', 1000000);
      expect(useWizardStore.getState().inputs.annualVisitors).toBe(1000000);

      setInput('valuePerConversion', 100);
      expect(useWizardStore.getState().inputs.valuePerConversion).toBe(100);

      setInput('visitorUnitLabel', 'sessions');
      expect(useWizardStore.getState().inputs.visitorUnitLabel).toBe('sessions');
    });

    it('can set prior inputs via setInput', () => {
      const { setInput } = useWizardStore.getState();

      setInput('priorType', 'custom');
      expect(useWizardStore.getState().inputs.priorType).toBe('custom');

      setInput('priorIntervalLow', -3);
      expect(useWizardStore.getState().inputs.priorIntervalLow).toBe(-3);

      setInput('priorIntervalHigh', 8);
      expect(useWizardStore.getState().inputs.priorIntervalHigh).toBe(8);
    });

    it('can set threshold inputs via setInput', () => {
      const { setInput } = useWizardStore.getState();

      setInput('thresholdScenario', 'minimum-lift');
      expect(useWizardStore.getState().inputs.thresholdScenario).toBe('minimum-lift');

      setInput('thresholdUnit', 'lift');
      expect(useWizardStore.getState().inputs.thresholdUnit).toBe('lift');

      setInput('thresholdValue', 2);
      expect(useWizardStore.getState().inputs.thresholdValue).toBe(2);
    });

    it('can set experiment design inputs via setInput', () => {
      const { setInput } = useWizardStore.getState();

      setInput('testDurationDays', 14);
      expect(useWizardStore.getState().inputs.testDurationDays).toBe(14);

      setInput('dailyTraffic', 5000);
      expect(useWizardStore.getState().inputs.dailyTraffic).toBe(5000);

      setInput('trafficSplit', 0.7);
      expect(useWizardStore.getState().inputs.trafficSplit).toBe(0.7);

      setInput('eligibilityFraction', 0.8);
      expect(useWizardStore.getState().inputs.eligibilityFraction).toBe(0.8);

      setInput('decisionLatencyDays', 3);
      expect(useWizardStore.getState().inputs.decisionLatencyDays).toBe(3);
    });
  });

  describe('prior shape inputs', () => {
    it('can set priorShape to normal, student-t, or uniform', () => {
      const { setInput } = useWizardStore.getState();

      // Normal
      setInput('priorShape', 'normal');
      expect(useWizardStore.getState().inputs.priorShape).toBe('normal');

      // Student-t
      setInput('priorShape', 'student-t');
      expect(useWizardStore.getState().inputs.priorShape).toBe('student-t');

      // Uniform
      setInput('priorShape', 'uniform');
      expect(useWizardStore.getState().inputs.priorShape).toBe('uniform');
    });

    it('can set studentTDf preset values', () => {
      const { setInput } = useWizardStore.getState();

      // df=3 (heavy tails)
      setInput('studentTDf', 3);
      expect(useWizardStore.getState().inputs.studentTDf).toBe(3);

      // df=5 (moderate)
      setInput('studentTDf', 5);
      expect(useWizardStore.getState().inputs.studentTDf).toBe(5);

      // df=10 (near-normal)
      setInput('studentTDf', 10);
      expect(useWizardStore.getState().inputs.studentTDf).toBe(10);
    });

    it('defaults priorShape to normal', () => {
      const { inputs } = useWizardStore.getState();
      expect(inputs.priorShape).toBe('normal');
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
      const { setInput, markSectionComplete, resetWizard } =
        useWizardStore.getState();

      // Set various state
      setInput('baselineConversionRate', 0.05);
      setInput('testDurationDays', 14);
      setInput('priorShape', 'student-t');
      markSectionComplete(0);

      // Reset
      resetWizard();

      const state = useWizardStore.getState();
      expect(state.inputs.baselineConversionRate).toBe(null);
      expect(state.inputs.testDurationDays).toBe(null);
      expect(state.inputs.priorShape).toBe('normal');
      expect(state.completedSections).toHaveLength(0);
      expect(state.currentSection).toBe(0);
    });
  });
});
