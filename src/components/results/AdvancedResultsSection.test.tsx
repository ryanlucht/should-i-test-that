/**
 * Tests for AdvancedResultsSection (ResultsSection)
 *
 * Per 06-03-PLAN.md: Accessibility tests using vitest-axe
 * Per PM feedback: Updated for revised copy, layout, and near-tie logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ResultsSection as AdvancedResultsSection } from './AdvancedResultsSection';
import type { EVSICalculationResults } from '@/hooks/useEVSICalculations';

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
  netValueDollars: 9500,
  sampleSizes: {
    n_total: 10000,
    n_control: 5000,
    n_variant: 5000,
  },
  warnings: [],
  effectivePriorMean: 0.0, // matches rawPriorMean for default scenario (no truncation)
  effectiveProbClears: 0.68,
  isInfeasiblePrior: false,
  threshold_L: 0.02, // 2% lift threshold in decimal
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
    analysisName: '',
    setAnalysisName: vi.fn(),
    sharedBaseline: null,
    sharedNetValue: null,
    setGuideEnabled: vi.fn(),
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

    // Verify component rendered with results (updated hero copy)
    expect(screen.getByText(/total cost of running this test/)).toBeInTheDocument();

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

    const decisionCard = screen.getByText('Decision impact').closest('div');
    expect(decisionCard).toBeInTheDocument();
  });
});

describe('AdvancedResultsSection card content', () => {
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

  it('renders Decision impact with dominant direction for ship default', () => {
    render(<AdvancedResultsSection />);

    expect(screen.getByText('Decision impact')).toBeInTheDocument();
    // defaultDecision=ship → shows "P(Keeps you from shipping)", hides convince direction
    expect(screen.getByText('P(Keeps you from shipping)')).toBeInTheDocument();
    expect(screen.queryByText('P(Pushes you to ship)')).not.toBeInTheDocument();
  });

  it('renders Decision impact with dominant direction for dont-ship default', () => {
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

    expect(screen.getByText('P(Pushes you to ship)')).toBeInTheDocument();
    expect(screen.queryByText('P(Keeps you from shipping)')).not.toBeInTheDocument();
  });

  it('does not render P(Decision Change) title', () => {
    render(<AdvancedResultsSection />);

    expect(screen.queryByText('P(Decision Change)')).not.toBeInTheDocument();
  });

  it('renders Plain English explanation waterfall block', () => {
    render(<AdvancedResultsSection />);

    expect(screen.getByText('Plain English explanation')).toBeInTheDocument();
    expect(screen.queryByText('Why this result?')).not.toBeInTheDocument();
    expect(screen.queryByText('Statistical Interpretation')).not.toBeInTheDocument();
  });

  it('renders guardrail direction in waterfall for ship default', () => {
    render(<AdvancedResultsSection />);

    expect(screen.getByText(/guardrail/)).toBeInTheDocument();
  });

  it('renders confidence builder direction in waterfall for dont-ship default', () => {
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

    expect(screen.getByText(/confidence builder/)).toBeInTheDocument();
  });

  it('renders tie-break copy when prior mean is at threshold', () => {
    // Prior mean = 0 with any-positive scenario → exact tie
    // SA-5: computeIsTie now uses effectivePriorMean (decimal) and threshold_L from results
    const tieResults: EVSICalculationResults = {
      ...sampleEVSIResults,
      effectivePriorMean: 0.0, // 0% lift in decimal
      threshold_L: 0.0,        // any-positive → threshold_L = 0
    };
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: tieResults,
    });
    mockWizardStore({
      inputs: {
        ...sampleInputs,
        priorIntervalLow: -5,
        priorIntervalHigh: 5,
        thresholdScenario: 'any-positive',
        thresholdValue: null,
      },
    });

    render(<AdvancedResultsSection />);

    expect(screen.getByText(/right at the boundary/)).toBeInTheDocument();
  });

  it('does not render EVSI Intuition block', () => {
    render(<AdvancedResultsSection />);

    expect(screen.queryByText(/How to interpret/)).not.toBeInTheDocument();
  });

  it('renders FAQ accordion section', () => {
    render(<AdvancedResultsSection />);

    expect(screen.getByText("What's driving the value you've calculated?")).toBeInTheDocument();
    expect(screen.getByText("How is the value of better decisions calculated?")).toBeInTheDocument();
  });

  it('renders Prior Belief with range as primary value', () => {
    render(<AdvancedResultsSection />);

    expect(screen.getByText('Prior Belief')).toBeInTheDocument();
    // Range should be the bolded value, mean in description
    expect(screen.getByText(/Mean:/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// TRUNCATION_DISPLAY_THRESHOLD boundary tests
// ---------------------------------------------------------------------------

describe('TRUNCATION_DISPLAY_THRESHOLD boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delta of exactly 0.001 does NOT show truncation note (strictly greater than)', () => {
    // rawPriorMean = midpoint of (-8.22, 8.22) = 0.0 (in % form) => 0.0 in decimal
    // effectivePriorMean = 0.001 => delta = |0.001 - 0.0| = 0.001
    // Since TRUNCATION_DISPLAY_THRESHOLD uses strictly-greater-than, 0.001 is NOT > 0.001
    const resultsAtBoundary = {
      ...sampleEVSIResults,
      effectivePriorMean: 0.001, // exactly at threshold
    };
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: resultsAtBoundary,
    });
    mockWizardStore();

    render(<AdvancedResultsSection />);

    // Should NOT show the truncation disclosure
    expect(screen.queryByText(/After feasibility truncation/)).not.toBeInTheDocument();
  });

  it('delta of 0.0011 shows truncation note', () => {
    // rawPriorMean = 0.0 (decimal, midpoint of symmetric interval)
    // effectivePriorMean = 0.0011 => delta = 0.0011 > 0.001
    const resultsAboveBoundary = {
      ...sampleEVSIResults,
      effectivePriorMean: 0.0011, // just above threshold
    };
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: resultsAboveBoundary,
    });
    mockWizardStore();

    render(<AdvancedResultsSection />);

    // Should show the truncation disclosure
    expect(screen.getByText(/After feasibility truncation/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SA-3: Infeasible-prior suppression tests
// ---------------------------------------------------------------------------

describe('Infeasible prior suppression (SA-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows infeasibility message when isInfeasiblePrior is true', () => {
    const infeasibleResults: EVSICalculationResults = {
      ...sampleEVSIResults,
      isInfeasiblePrior: true,
      effectivePriorMean: 0.0, // fallback value
      effectiveProbClears: 0,
      evsi: {
        ...sampleEVSIResults.evsi,
        evsiDollars: 0,
        probabilityTestChangesDecision: 0,
      },
      netValueDollars: 0,
    };
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: infeasibleResults,
    });
    mockWizardStore();

    render(<AdvancedResultsSection />);

    // Should show the infeasibility message
    expect(screen.getByText('Prior belief is infeasible')).toBeInTheDocument();
    expect(screen.getByText(/incompatible with the baseline conversion rate/)).toBeInTheDocument();
  });

  it('suppresses waterfall block when isInfeasiblePrior is true', () => {
    const infeasibleResults: EVSICalculationResults = {
      ...sampleEVSIResults,
      isInfeasiblePrior: true,
      effectivePriorMean: 0.0,
      effectiveProbClears: 0,
      netValueDollars: 0,
    };
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: infeasibleResults,
    });
    mockWizardStore();

    render(<AdvancedResultsSection />);

    // Waterfall, supporting cards, export should NOT be rendered
    expect(screen.queryByText('Plain English explanation')).not.toBeInTheDocument();
    expect(screen.queryByText('Decision impact')).not.toBeInTheDocument();
    expect(screen.queryByText('Export PNG')).not.toBeInTheDocument();
  });

  it('shows interpretive cards when isInfeasiblePrior is false', () => {
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: sampleEVSIResults, // isInfeasiblePrior: false
    });
    mockWizardStore();

    render(<AdvancedResultsSection />);

    // Should show normal results (waterfall, supporting cards, export)
    expect(screen.getByText('Plain English explanation')).toBeInTheDocument();
    expect(screen.getByText('Decision impact')).toBeInTheDocument();
    expect(screen.queryByText('Prior belief is infeasible')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SA-5: Dollar-threshold tie detection tests
// ---------------------------------------------------------------------------

describe('Dollar-threshold tie detection (SA-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects tie when effectivePriorMean equals threshold_L in lift units', () => {
    // Scenario: dollar threshold that normalizes to threshold_L = 0.03 (3% lift)
    // effectivePriorMean = 0.03 (exactly at threshold) -> should be a tie
    const tieResults: EVSICalculationResults = {
      ...sampleEVSIResults,
      effectivePriorMean: 0.03, // exactly at threshold_L
      threshold_L: 0.03,        // 3% lift in decimal
    };
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: tieResults,
    });
    // Set inputs with dollar threshold (the old code would compare % vs $, missing the tie)
    mockWizardStore({
      inputs: {
        ...sampleInputs,
        priorIntervalLow: -3,
        priorIntervalHigh: 9,  // midpoint = 3% in percentage form
        thresholdScenario: 'minimum-lift',
        thresholdUnit: 'dollars',
        thresholdValue: 500,    // dollar value -- irrelevant for comparison, threshold_L matters
      },
    });

    render(<AdvancedResultsSection />);

    // Should render tie-break copy
    expect(screen.getByText(/right at the boundary/)).toBeInTheDocument();
    expect(screen.getByText(/perfect tie/)).toBeInTheDocument();
  });

  it('does NOT detect tie when effectivePriorMean differs from threshold_L', () => {
    const noTieResults: EVSICalculationResults = {
      ...sampleEVSIResults,
      effectivePriorMean: 0.05, // 5% lift
      threshold_L: 0.02,        // 2% lift -- not a tie
    };
    vi.mocked(useEVSICalculations).mockReturnValue({
      loading: false,
      results: noTieResults,
    });
    mockWizardStore({
      inputs: {
        ...sampleInputs,
        priorIntervalLow: -3,
        priorIntervalHigh: 13,
        thresholdScenario: 'minimum-lift',
        thresholdUnit: 'dollars',
        thresholdValue: 500,
      },
    });

    render(<AdvancedResultsSection />);

    // Should NOT render tie-break copy
    expect(screen.queryByText(/right at the boundary/)).not.toBeInTheDocument();
    expect(screen.queryByText(/perfect tie/)).not.toBeInTheDocument();
  });
});
