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

      // Verify advanced inputs are set
      expect(useWizardStore.getState().inputs.advanced.testDurationDays).toBe(14);
      expect(useWizardStore.getState().inputs.advanced.dailyTraffic).toBe(5000);

      // Switch to basic - should clear advanced inputs
      setMode('basic');
      const { inputs } = useWizardStore.getState();
      expect(inputs.advanced.testDurationDays).toBe(null);
      expect(inputs.advanced.dailyTraffic).toBe(null);
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

    it('POL-03: A->B->A mode switch - advanced inputs should persist via sessionStorage backup', () => {
      const { setMode, setSharedInput, setAdvancedInput } = useWizardStore.getState();

      // Clear any previous backup
      sessionStorage.removeItem('wizard-advanced-backup');

      // Step 1: Start in Advanced mode and fill inputs
      setMode('advanced');
      setSharedInput('baselineConversionRate', 0.05);
      setSharedInput('annualVisitors', 1000000);
      setSharedInput('valuePerConversion', 100);
      setSharedInput('thresholdScenario', 'any-positive');
      setAdvancedInput('priorShape', 'normal');
      setAdvancedInput('testDurationDays', 14);
      setAdvancedInput('dailyTraffic', 2740);

      // Verify all inputs are set
      let state = useWizardStore.getState();
      expect(state.inputs.advanced.priorShape).toBe('normal');
      expect(state.inputs.advanced.testDurationDays).toBe(14);
      expect(state.inputs.advanced.dailyTraffic).toBe(2740);

      // Step 2: Switch to Basic mode
      setMode('basic');
      state = useWizardStore.getState();

      // Advanced inputs should be cleared from state
      expect(state.inputs.advanced.testDurationDays).toBe(null);
      expect(state.inputs.advanced.dailyTraffic).toBe(null);
      expect(state.inputs.advanced.priorShape).toBe(null);

      // But backup should exist in sessionStorage
      expect(sessionStorage.getItem('wizard-advanced-backup')).not.toBe(null);

      // Shared inputs should be preserved
      expect(state.inputs.shared.baselineConversionRate).toBe(0.05);
      expect(state.inputs.shared.annualVisitors).toBe(1000000);

      // Step 3: Switch back to Advanced mode - inputs should be RESTORED (POL-03)
      setMode('advanced');
      state = useWizardStore.getState();

      // priorShape should be restored to 'normal'
      expect(state.inputs.advanced.priorShape).toBe('normal');
      // Other advanced inputs should be restored from backup
      expect(state.inputs.advanced.testDurationDays).toBe(14);
      expect(state.inputs.advanced.dailyTraffic).toBe(2740);
      // Default values should be preserved
      expect(state.inputs.advanced.trafficSplit).toBe(0.5);
      expect(state.inputs.advanced.eligibilityFraction).toBe(1.0);

      // All inputs needed for EVSI calculation should be non-null
      expect(state.inputs.advanced.priorShape).not.toBe(null);
      expect(state.inputs.advanced.testDurationDays).not.toBe(null);
      expect(state.inputs.advanced.dailyTraffic).not.toBe(null);
      expect(state.inputs.advanced.trafficSplit).not.toBe(null);
      expect(state.inputs.advanced.eligibilityFraction).not.toBe(null);
    });

    it('persists section state when switching A->B->A', () => {
      const { setMode, markSectionComplete, setCurrentSection } = useWizardStore.getState();

      // Clear any previous backups
      sessionStorage.removeItem('wizard-advanced-backup');
      sessionStorage.removeItem('wizard-basic-backup');

      // Start in advanced mode
      setMode('advanced');

      // Mark sections 0,1,2 complete and set currentSection to 2
      markSectionComplete(0);
      markSectionComplete(1);
      markSectionComplete(2);
      setCurrentSection(2);

      // Verify state before switch
      expect(useWizardStore.getState().completedSections).toEqual([0, 1, 2]);
      expect(useWizardStore.getState().currentSection).toBe(2);

      // Switch to basic mode - advanced state should be backed up
      setMode('basic');

      // Progress in basic mode
      markSectionComplete(0);
      markSectionComplete(1);
      setCurrentSection(1);

      expect(useWizardStore.getState().completedSections).toEqual([0, 1]);
      expect(useWizardStore.getState().currentSection).toBe(1);

      // Switch back to advanced - should restore advanced section state
      setMode('advanced');

      expect(useWizardStore.getState().currentSection).toBe(2);
      expect(useWizardStore.getState().completedSections).toEqual([0, 1, 2]);
    });

    it('persists section state when switching B->A->B', () => {
      const { setMode, markSectionComplete, setCurrentSection } = useWizardStore.getState();

      // Clear any previous backups
      sessionStorage.removeItem('wizard-advanced-backup');
      sessionStorage.removeItem('wizard-basic-backup');

      // Start in basic mode (default)
      // Mark sections 0,1 complete and set currentSection to 1
      markSectionComplete(0);
      markSectionComplete(1);
      setCurrentSection(1);

      // Verify state before switch
      expect(useWizardStore.getState().completedSections).toEqual([0, 1]);
      expect(useWizardStore.getState().currentSection).toBe(1);

      // Switch to advanced mode - basic state should be backed up
      setMode('advanced');

      // Progress in advanced mode
      markSectionComplete(0);
      setCurrentSection(0);

      expect(useWizardStore.getState().completedSections).toEqual([0]);
      expect(useWizardStore.getState().currentSection).toBe(0);

      // Switch back to basic - should restore basic section state
      setMode('basic');

      expect(useWizardStore.getState().currentSection).toBe(1);
      expect(useWizardStore.getState().completedSections).toEqual([0, 1]);
    });

    it('handles missing backup gracefully with defaults', () => {
      const { setMode } = useWizardStore.getState();

      // Clear all backups
      sessionStorage.removeItem('wizard-advanced-backup');
      sessionStorage.removeItem('wizard-basic-backup');

      // Switch to advanced (no backup exists)
      setMode('advanced');

      // Should use defaults
      expect(useWizardStore.getState().currentSection).toBe(0);
      expect(useWizardStore.getState().completedSections).toEqual([]);

      // Switch to basic (no backup exists)
      setMode('basic');

      // Should use defaults
      expect(useWizardStore.getState().currentSection).toBe(0);
      expect(useWizardStore.getState().completedSections).toEqual([]);
    });

    it('resets section state when no backup exists for target mode', () => {
      const { setMode, markSectionComplete, setCurrentSection } = useWizardStore.getState();

      // Clear any previous backups
      sessionStorage.removeItem('wizard-advanced-backup');
      sessionStorage.removeItem('wizard-basic-backup');

      // Complete some sections in basic mode (default)
      markSectionComplete(0);
      markSectionComplete(1);
      markSectionComplete(2);
      markSectionComplete(3);
      setCurrentSection(3);

      // Verify sections are completed
      expect(useWizardStore.getState().completedSections).toEqual([0, 1, 2, 3]);

      // Switch to advanced mode (no backup exists for advanced)
      setMode('advanced');

      // Section state should reset to defaults because there's no advanced backup
      expect(useWizardStore.getState().completedSections).toEqual([]);
      expect(useWizardStore.getState().currentSection).toBe(0);
    });

    it('does not change state when switching to same mode', () => {
      const { setMode, markSectionComplete, setAdvancedInput } = useWizardStore.getState();

      // Set up state in advanced mode
      setMode('advanced');
      markSectionComplete(0);
      markSectionComplete(1);
      setAdvancedInput('testDurationDays', 14);

      const stateBeforeSwitch = useWizardStore.getState();

      // Try to switch to advanced again
      setMode('advanced');

      const stateAfterSwitch = useWizardStore.getState();

      // State should be unchanged
      expect(stateAfterSwitch.completedSections).toEqual(stateBeforeSwitch.completedSections);
      expect(stateAfterSwitch.currentSection).toBe(stateBeforeSwitch.currentSection);
      expect(stateAfterSwitch.inputs.advanced.testDurationDays).toBe(14);
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

    it('clears mode-switch backups so stale data does not repopulate after reset', () => {
      const { setMode, setSharedInput, setAdvancedInput, resetWizard } =
        useWizardStore.getState();

      // Build up state in advanced mode
      setMode('advanced');
      setSharedInput('baselineConversionRate', 5);
      setAdvancedInput('testDurationDays', 14);

      // Switch to basic — this creates a backup of advanced state
      setMode('basic');

      // Reset the wizard (should clear backups)
      resetWizard();

      // Now switch back to advanced — stale backup should NOT repopulate
      setMode('advanced');

      const state = useWizardStore.getState();
      expect(state.inputs.shared.baselineConversionRate).toBe(null);
      expect(state.inputs.advanced.testDurationDays).toBe(null);
    });
  });
});
