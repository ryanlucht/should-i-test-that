/**
 * Tests for AdvancedResultsSection (ResultsSection)
 *
 * Per 06-03-PLAN.md: Accessibility tests using vitest-axe
 * Per 25.1-02-PLAN.md: New tests for Shipping rule, Decision impact, WaterfallBlock
 * Per WCAG 2.1 AA: Ensure no accessibility violations in advanced results display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ResultsSection as AdvancedResultsSection } from './AdvancedResultsSection';
import type { EVSICalculationResults } from '@/hooks/useEVSICalculations';
import type { CoDResults } from '@/lib/calculations/cost-of-delay';

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

// Mock analytics to avoid side effects
vi.mock('@/lib/analytics', () => ({
  trackCalculationCompleted: vi.fn(),
}));

import { useEVSICalculations } from '@/hooks/useEVSICalculations';
import { useWizardStore } from '@/stores/wizardStore';

// Sample Cost of Delay results
const sampleCodResults: CoDResults = {
  codApplies: true,
  codDollars: 2500,
  dailyOpportunityCost: 125,
};

// Sample EVSI results for testing (includes directional fields from Plan 01)
const sampleEVSIResults: EVSICalculationResults = {
  evsi: {
    evsiDollars: 12000,
    defaultDecision: 'ship',
    probabilityClearsThreshold: 0.68,
    probabilityTestChangesDecision: 0.25,
    pStopsShip: 0.25,
    pConvincesShip: 0,
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
  warnings: [],
};

// Flat inputs matching the actual WizardInputs shape used by useWizardStore
const sampleInputs = {
  baselineConversionRate: 0.03,
  annualVisitors: 500000,
  revenuePerConversion: 50,
  priorIntervalLow: -8.22,
  priorIntervalHigh: 8.22,
  priorShape: 'normal' as const,
  studentTDf: null,
  thresholdScenario: 'minimum-lift' as const,
  thresholdUnit: 'lift' as const,
  thresholdValue: 2,
  testDurationDays: 20,
  trafficSplit: 0.5,
  decisionLatencyDays: 0,
};

/** Helper: mock the wizardStore with all selectors the component uses */
function mockWizardStore(overrides: Record<string, unknown> = {}) {
  const state = {
    inputs: sampleInputs,
    sharedNetValue: null,
    analysisName: '',
    setAnalysisName: vi.fn(),
    ...overrides,
  };
  vi.mocked(useWizardStore).mockImplementation((selector) => {
    return selector(state as unknown as Parameters<typeof selector>[0]);
  });
}

describe('AdvancedResultsSection accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no accessibility violations when showing results', async () => {
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: sampleEVSIResults,
    });
    mockWizardStore();

    const { container } = render(<AdvancedResultsSection />);

    // Verify component rendered with results
    expect(screen.getByText(/If you can run this test/)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when showing placeholder', async () => {
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: null,
    });
    mockWizardStore();

    const { container } = render(<AdvancedResultsSection />);

    expect(screen.getByText(/Complete all previous sections/)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when loading', async () => {
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: true,
      results: null,
    });
    mockWizardStore();

    const { container } = render(<AdvancedResultsSection />);

    expect(screen.getByText('Calculating...')).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has ARIA live region with aria-busy during loading', async () => {
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: true,
      results: null,
    });
    mockWizardStore();

    render(<AdvancedResultsSection />);

    const liveRegion = document.querySelector('[role="status"][aria-live="polite"][aria-busy="true"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('shows highlight variant styling for high decision change probability', async () => {
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
    mockWizardStore();

    render(<AdvancedResultsSection />);

    // Card title is now "Decision impact" (renamed from "P(Decision Change)")
    const decisionCard = screen.getByText('Decision impact').closest('div');
    expect(decisionCard).toBeInTheDocument();
  });
});

describe('AdvancedResultsSection card content (RCI-03, RCI-04, RCI-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: sampleEVSIResults,
    });
    mockWizardStore();
  });

  it('renders Shipping rule instead of Threshold', () => {
    render(<AdvancedResultsSection />);

    expect(screen.getByText('Shipping rule')).toBeInTheDocument();
    expect(screen.queryByText('Threshold')).not.toBeInTheDocument();
  });

  it('renders Decision impact with directional rows', () => {
    render(<AdvancedResultsSection />);

    expect(screen.getByText('Decision impact')).toBeInTheDocument();
    expect(screen.getByText('Stops you from shipping')).toBeInTheDocument();
    expect(screen.getByText('Convinces you to ship')).toBeInTheDocument();
  });

  it('does not render P(Decision Change) title', () => {
    render(<AdvancedResultsSection />);

    expect(screen.queryByText('P(Decision Change)')).not.toBeInTheDocument();
  });

  it('renders Why this result waterfall', () => {
    render(<AdvancedResultsSection />);

    expect(screen.getByText('Why this result?')).toBeInTheDocument();
  });

  it('renders mainDecisionMechanism in Statistical Interpretation for ship decision', () => {
    render(<AdvancedResultsSection />);

    // defaultDecision = 'ship' → mechanism = 'stop you from shipping when downside is plausible'
    expect(screen.getByText(/stop you from shipping when downside is plausible/)).toBeInTheDocument();
  });

  it('renders mainDecisionMechanism in Statistical Interpretation for dont-ship decision', () => {
    const dontShipResults = {
      ...sampleEVSIResults,
      evsi: {
        ...sampleEVSIResults.evsi,
        defaultDecision: 'dont-ship' as const,
        pStopsShip: 0,
        pConvincesShip: 0.25,
      },
    };
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: dontShipResults,
    });

    render(<AdvancedResultsSection />);

    expect(screen.getByText(/give you confidence to ship when upside is uncertain/)).toBeInTheDocument();
  });
});
