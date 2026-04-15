import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import App from './App';
import { useWizardStore } from '@/stores/wizardStore';
import { initialInputs } from '@/types/wizard';

// Mock the url-codec module so tests control what decodeWizardState returns.
// Import the real validateThresholdSign since App.tsx uses it for section validation.
vi.mock('@/lib/url-codec', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/url-codec')>();
  return {
    ...actual,
    decodeWizardState: vi.fn(),
    encodeWizardState: vi.fn().mockReturnValue('encoded-test-string'),
  };
});

import { decodeWizardState } from '@/lib/url-codec';

describe('App', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test to reset wizard state
    sessionStorage.clear();
    // Reset Zustand store to defaults between tests
    useWizardStore.setState({
      inputs: { ...initialInputs },
      guideEnabled: true,
      currentSection: 0,
      completedSections: [],
      sharedBaseline: null,
    });
    // Reset URL hash to empty
    window.location.hash = '';
    // Reset mock
    vi.mocked(decodeWizardState).mockReset();
    // Mock replaceState
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('renders the Bubbly Pill logo text', () => {
    render(<App />);
    // Logo renders "Should We", "Test", "That?" as separate spans
    expect(screen.getByText('Should We')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('That?')).toBeInTheDocument();
  });

  it('renders Start (with Guidance) button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Start (with Guidance)' })).toBeInTheDocument();
  });

  it('renders skip guidance link', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /I know what I'm doing/i })).toBeInTheDocument();
  });

  it('navigates to calculator when Start (with Guidance) is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start (with Guidance)' }));
    expect(screen.getByLabelText('Form progress')).toBeInTheDocument();
  });

  it('sets guideEnabled=true when Start (with Guidance) is clicked', () => {
    // First set guideEnabled to false to verify it gets set back to true
    useWizardStore.setState({ guideEnabled: false });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start (with Guidance)' }));
    expect(useWizardStore.getState().guideEnabled).toBe(true);
  });

  it('navigates to calculator and sets guideEnabled=false when skip link is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /I know what I'm doing/i }));
    expect(screen.getByLabelText('Form progress')).toBeInTheDocument();
    expect(useWizardStore.getState().guideEnabled).toBe(false);
  });

  it('can navigate back from calculator to welcome', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start (with Guidance)' }));
    expect(screen.getByLabelText('Form progress')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Should We Test That?' }));
    expect(screen.getByRole('button', { name: 'Start (with Guidance)' })).toBeInTheDocument();
  });

  describe('URL hydration', () => {
    // Test H1: No hash = welcome page (already covered by above tests, verified here explicitly)
    it('H1: When URL has no hash fragment, App renders the welcome page normally', () => {
      window.location.hash = '';
      render(<App />);
      expect(screen.getByRole('button', { name: 'Start (with Guidance)' })).toBeInTheDocument();
    });

    // Test H2: Invalid hash = welcome page (decodeWizardState returns null)
    it('H2: When URL hash has invalid encoded string, App renders the welcome page normally', () => {
      window.location.hash = '#s=garbage';
      vi.mocked(decodeWizardState).mockReturnValue(null);

      render(<App />);
      expect(screen.getByRole('button', { name: 'Start (with Guidance)' })).toBeInTheDocument();
    });

    // Test H3: Valid hash = calculator page directly (skip welcome)
    it('H3: When URL hash is "#s={validEncoded}", App skips the welcome page and renders the calculator page directly', () => {
      window.location.hash = '#s=validEncoded';
      vi.mocked(decodeWizardState).mockReturnValue({ inputs: { ...initialInputs } });

      render(<App />);
      expect(screen.getByLabelText('Form progress')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Start (with Guidance)' })).not.toBeInTheDocument();
    });

    // Test H4: Valid hash = guideEnabled set to true
    it('H4: When URL hash is "#s={validEncoded}", guideEnabled is set to true in the store', () => {
      window.location.hash = '#s=validEncoded';
      // Start with guideEnabled=false to verify it gets set
      useWizardStore.setState({ guideEnabled: false });
      vi.mocked(decodeWizardState).mockReturnValue({ inputs: { ...initialInputs } });

      render(<App />);
      expect(useWizardStore.getState().guideEnabled).toBe(true);
    });

    // Test H5: All section fields populated = sections 0-3 marked complete
    it('H5: When URL hash has all baseline fields populated, sections 0-3 are marked complete', () => {
      window.location.hash = '#s=validEncoded';
      // Decoded inputs with all required fields for sections 0-3
      const allFieldsInputs = {
        ...initialInputs,
        // Section 0 (Baseline): baselineConversionRate, annualVisitors, valuePerConversion
        baselineConversionRate: 0.05,
        annualVisitors: 100000,
        valuePerConversion: 50,
        // Section 1 (Uncertainty): priorType
        priorType: 'default' as const,
        // Section 2 (Threshold): thresholdScenario
        thresholdScenario: 'any-positive' as const,
        // Section 3 (Test Design): testDurationDays, dailyTraffic
        testDurationDays: 14,
        dailyTraffic: 2000,
      };
      vi.mocked(decodeWizardState).mockReturnValue({ inputs: allFieldsInputs });

      render(<App />);

      const { completedSections } = useWizardStore.getState();
      expect(completedSections).toContain(0);
      expect(completedSections).toContain(1);
      expect(completedSections).toContain(2);
      expect(completedSections).toContain(3);
    });

    // Test H6: Only section 0 fields populated = only section 0 marked complete (smart completion)
    it('H6: When only section 0 fields are populated, only section 0 is marked complete', () => {
      window.location.hash = '#s=validEncoded';
      // Only section 0 fields provided; sections 1-3 fields remain null
      const section0OnlyInputs = {
        ...initialInputs,
        baselineConversionRate: 0.05,
        annualVisitors: 100000,
        valuePerConversion: 50,
        // priorType, thresholdScenario, testDurationDays, dailyTraffic all remain null
      };
      vi.mocked(decodeWizardState).mockReturnValue({ inputs: section0OnlyInputs });

      render(<App />);

      const { completedSections } = useWizardStore.getState();
      expect(completedSections).toContain(0);
      expect(completedSections).not.toContain(1);
      expect(completedSections).not.toContain(2);
      expect(completedSections).not.toContain(3);
    });

    // Test H7: setSharedBaseline called with decoded inputs
    it('H7: When URL hash is valid, setSharedBaseline is called with the decoded inputs', () => {
      window.location.hash = '#s=validEncoded';
      const decodedInputs = { ...initialInputs, baselineConversionRate: 0.05 };
      vi.mocked(decodeWizardState).mockReturnValue({ inputs: decodedInputs });

      render(<App />);

      expect(useWizardStore.getState().sharedBaseline).toEqual(decodedInputs);
    });

    // Test H8: URL hash cleaned after successful hydration
    it('H8: After successful hydration, URL hash is cleaned (window.history.replaceState called)', () => {
      window.location.hash = '#s=validEncoded';
      vi.mocked(decodeWizardState).mockReturnValue({ inputs: { ...initialInputs } });

      render(<App />);

      expect(window.history.replaceState).toHaveBeenCalledWith(
        null,
        '',
        window.location.pathname
      );
    });

    // Test H9 (CR-2): Custom prior with missing intervals does NOT mark section 1 complete
    it('H9: does not mark section 1 complete when priorType is custom but intervals are missing', () => {
      window.location.hash = '#s=validEncoded';
      const customPriorNoIntervals = {
        ...initialInputs,
        baselineConversionRate: 0.05,
        annualVisitors: 100000,
        valuePerConversion: 50,
        priorType: 'custom' as const,
        priorIntervalLow: null,
        priorIntervalHigh: null,
        thresholdScenario: 'any-positive' as const,
        testDurationDays: 14,
        dailyTraffic: 2000,
      };
      vi.mocked(decodeWizardState).mockReturnValue({ inputs: customPriorNoIntervals });

      render(<App />);

      const { completedSections } = useWizardStore.getState();
      // Section 0, 2, 3 should be complete (all their fields are present)
      expect(completedSections).toContain(0);
      expect(completedSections).toContain(2);
      expect(completedSections).toContain(3);
      // Section 1 should NOT be complete (custom prior but missing intervals)
      expect(completedSections).not.toContain(1);
    });

    // Test H10 (CR-2): minimum-lift with missing value does NOT mark section 2 complete
    it('H10: does not mark section 2 complete when thresholdScenario is minimum-lift but value is null', () => {
      window.location.hash = '#s=validEncoded';
      const minLiftNoValue = {
        ...initialInputs,
        baselineConversionRate: 0.05,
        annualVisitors: 100000,
        valuePerConversion: 50,
        priorType: 'default' as const,
        thresholdScenario: 'minimum-lift' as const,
        thresholdUnit: null,
        thresholdValue: null,
        testDurationDays: 14,
        dailyTraffic: 2000,
      };
      vi.mocked(decodeWizardState).mockReturnValue({ inputs: minLiftNoValue });

      render(<App />);

      const { completedSections } = useWizardStore.getState();
      // Section 0, 1, 3 should be complete
      expect(completedSections).toContain(0);
      expect(completedSections).toContain(1);
      expect(completedSections).toContain(3);
      // Section 2 should NOT be complete (minimum-lift but no unit/value)
      expect(completedSections).not.toContain(2);
    });

    // Test H11 (CR-2): Custom prior with inverted intervals does NOT mark section 1 complete
    it('H11: does not mark section 1 complete when custom prior has low >= high', () => {
      window.location.hash = '#s=validEncoded';
      const invertedIntervals = {
        ...initialInputs,
        baselineConversionRate: 0.05,
        annualVisitors: 100000,
        valuePerConversion: 50,
        priorType: 'custom' as const,
        priorIntervalLow: 10,
        priorIntervalHigh: 5,
        thresholdScenario: 'any-positive' as const,
        testDurationDays: 14,
        dailyTraffic: 2000,
      };
      vi.mocked(decodeWizardState).mockReturnValue({ inputs: invertedIntervals });

      render(<App />);

      const { completedSections } = useWizardStore.getState();
      expect(completedSections).not.toContain(1);
    });

    // Test H12 (CR28-02): accept-loss with negative thresholdValue marks section 2 complete
    it('H12: marks section 2 complete for accept-loss with negative thresholdValue', () => {
      window.location.hash = '#s=validEncoded';
      const acceptLossInputs = {
        ...initialInputs,
        baselineConversionRate: 0.05,
        annualVisitors: 100000,
        valuePerConversion: 50,
        priorType: 'default' as const,
        thresholdScenario: 'accept-loss' as const,
        thresholdUnit: 'dollars' as const,
        thresholdValue: -5, // Negative per sign convention: stored as -acceptableLoss
        testDurationDays: 14,
        dailyTraffic: 2000,
      };
      vi.mocked(decodeWizardState).mockReturnValue({ inputs: acceptLossInputs });

      render(<App />);

      const { completedSections } = useWizardStore.getState();
      // All sections should be complete including section 2 (threshold)
      expect(completedSections).toContain(0);
      expect(completedSections).toContain(1);
      expect(completedSections).toContain(2);
      expect(completedSections).toContain(3);
    });
  });
});
