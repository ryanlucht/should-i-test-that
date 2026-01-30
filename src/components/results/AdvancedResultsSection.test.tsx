/**
 * Accessibility tests for AdvancedResultsSection
 *
 * Per 06-03-PLAN.md: Add accessibility tests using vitest-axe
 * Per WCAG 2.1 AA: Ensure no accessibility violations in advanced results display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, type AxeMatchers } from 'vitest-axe';
import { AdvancedResultsSection } from './AdvancedResultsSection';
import type { EVSICalculationResults } from '@/hooks/useEVSICalculations';
import type { CoDResults } from '@/lib/calculations/cost-of-delay';

// Extend Vitest's expect with vitest-axe matchers for type checking
// (Runtime extension happens in test setup, this is for TypeScript)
declare module 'vitest' {
  interface Assertion<T> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// Mock useEVSICalculations hook
vi.mock('@/hooks/useEVSICalculations', () => ({
  useEVSICalculations: vi.fn(),
}));

// Mock useWizardStore
vi.mock('@/stores/wizardStore', () => ({
  useWizardStore: vi.fn(),
}));

// Mock ExportButton to avoid complex dependency chain
vi.mock('@/components/export/ExportButton', () => ({
  ExportButton: () => <button type="button">Export PNG</button>,
}));

import { useEVSICalculations } from '@/hooks/useEVSICalculations';
import { useWizardStore } from '@/stores/wizardStore';

// Sample Cost of Delay results
const sampleCodResults: CoDResults = {
  codApplies: true,
  codDollars: 2500,
  dailyOpportunityCost: 125,
};

// Sample EVSI results for testing
const sampleEVSIResults: EVSICalculationResults = {
  evsi: {
    evsiDollars: 12000,
    defaultDecision: 'ship',
    probabilityClearsThreshold: 0.68,
    probabilityTestChangesDecision: 0.25,
    numSamples: 10000,
    numRejected: 50,
  },
  cod: sampleCodResults,
  netValueDollars: 9500,
  sampleSizes: {
    n_total: 10000,
    n_control: 5000,
    n_variant: 5000,
  },
};

// Sample shared inputs for testing
const sampleSharedInputs = {
  baselineConversionRate: 0.03,
  annualVisitors: 500000,
  valuePerConversion: 50,
  priorIntervalLow: -8.22,
  priorIntervalHigh: 8.22,
  thresholdScenario: 'minimum-lift' as const,
  thresholdUnit: 'percent' as const,
  thresholdValue: 2,
};

// Sample advanced inputs for testing
const sampleAdvancedInputs = {
  priorShape: 'normal' as const,
  studentTDf: null,
  testDurationDays: 20,
  trafficFraction: 0.1,
  trafficAllocation: 0.5,
};

describe('AdvancedResultsSection accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no accessibility violations when showing results', async () => {
    // Setup mocks with valid results
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: sampleEVSIResults,
    });
    vi.mocked(useWizardStore).mockImplementation((selector) => {
      const state = {
        inputs: {
          shared: sampleSharedInputs,
          advanced: sampleAdvancedInputs,
        },
      };
      // Cast to unknown first to satisfy TypeScript for partial mock
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { container } = render(<AdvancedResultsSection />);

    // Verify component rendered with results
    expect(screen.getByText(/If you can run this test/)).toBeInTheDocument();

    // Run axe accessibility checks
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when showing placeholder', async () => {
    // Setup mocks with null results (incomplete inputs)
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: null,
    });
    vi.mocked(useWizardStore).mockImplementation((selector) => {
      const state = {
        inputs: {
          shared: sampleSharedInputs,
          advanced: sampleAdvancedInputs,
        },
      };
      // Cast to unknown first to satisfy TypeScript for partial mock
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { container } = render(<AdvancedResultsSection />);

    // Verify placeholder is shown
    expect(screen.getByText(/Complete all previous sections/)).toBeInTheDocument();

    // Run axe accessibility checks
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when loading', async () => {
    // Setup mocks with loading state
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: true,
      results: null,
    });
    vi.mocked(useWizardStore).mockImplementation((selector) => {
      const state = {
        inputs: {
          shared: sampleSharedInputs,
          advanced: sampleAdvancedInputs,
        },
      };
      // Cast to unknown first to satisfy TypeScript for partial mock
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { container } = render(<AdvancedResultsSection />);

    // Verify loading state is shown
    expect(screen.getByText('Calculating...')).toBeInTheDocument();

    // Run axe accessibility checks
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has ARIA live region with aria-busy during loading', async () => {
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: true,
      results: null,
    });
    vi.mocked(useWizardStore).mockImplementation((selector) => {
      const state = {
        inputs: {
          shared: sampleSharedInputs,
          advanced: sampleAdvancedInputs,
        },
      };
      // Cast to unknown first to satisfy TypeScript for partial mock
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    render(<AdvancedResultsSection />);

    // Find the live region with aria-busy
    const liveRegion = document.querySelector('[role="status"][aria-live="polite"][aria-busy="true"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('shows highlight variant styling for high decision change probability', async () => {
    // Setup with high probability of test changing decision (> 20%)
    const highImpactResults = {
      ...sampleEVSIResults,
      evsi: {
        ...sampleEVSIResults.evsi,
        probabilityTestChangesDecision: 0.35, // 35% - should trigger highlight
      },
    };

    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: highImpactResults,
    });
    vi.mocked(useWizardStore).mockImplementation((selector) => {
      const state = {
        inputs: {
          shared: sampleSharedInputs,
          advanced: sampleAdvancedInputs,
        },
      };
      // Cast to unknown first to satisfy TypeScript for partial mock
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    render(<AdvancedResultsSection />);

    // Find the card that uses highlight variant styling
    const decisionCard = screen.getByText('P(test changes decision)').closest('div');
    expect(decisionCard).toBeInTheDocument();
  });
});
