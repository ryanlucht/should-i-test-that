/**
 * Accessibility tests for ResultsSection
 *
 * Per 06-03-PLAN.md: Add accessibility tests using vitest-axe
 * Per WCAG 2.1 AA: Ensure no accessibility violations in results display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, type AxeMatchers } from 'vitest-axe';
import { ResultsSection } from './ResultsSection';
import type { EVPIResults } from '@/lib/calculations/types';

// Extend Vitest's expect with vitest-axe matchers for type checking
// (Runtime extension happens in test setup, this is for TypeScript)
declare module 'vitest' {
  interface Assertion<T> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

// Mock useEVPICalculations hook
vi.mock('@/hooks/useEVPICalculations', () => ({
  useEVPICalculations: vi.fn(),
}));

// Mock useWizardStore
vi.mock('@/stores/wizardStore', () => ({
  useWizardStore: vi.fn(),
}));

// Mock ExportButton to avoid complex dependency chain
vi.mock('@/components/export/ExportButton', () => ({
  ExportButton: () => <button type="button">Export PNG</button>,
}));

import { useEVPICalculations } from '@/hooks/useEVPICalculations';
import { useWizardStore } from '@/stores/wizardStore';

// Sample EVPI results for testing
const sampleEVPIResults: EVPIResults = {
  evpiDollars: 15000,
  defaultDecision: 'ship',
  probabilityClearsThreshold: 0.72,
  chanceOfBeingWrong: 0.28,
  K: 500000,
  threshold_L: 0.02,
  threshold_dollars: 10000,
  zScore: -0.5,
  phiZ: 0.352,
  PhiZ: 0.308,
  edgeCases: {
    truncationApplied: false,
    nearZeroSigma: false,
    priorOneSided: false,
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

describe('ResultsSection accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no accessibility violations when showing results', async () => {
    // Setup mocks with valid results
    vi.mocked(useEVPICalculations).mockReturnValue(sampleEVPIResults);
    vi.mocked(useWizardStore).mockImplementation((selector) => {
      const state = {
        inputs: { shared: sampleSharedInputs },
      };
      // Cast to unknown first to satisfy TypeScript for partial mock
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { container } = render(<ResultsSection />);

    // Verify component rendered with results
    expect(screen.getByText(/If you can A\/B test this idea/)).toBeInTheDocument();

    // Run axe accessibility checks
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when showing placeholder', async () => {
    // Setup mocks with null results (incomplete inputs)
    vi.mocked(useEVPICalculations).mockReturnValue(null);
    vi.mocked(useWizardStore).mockImplementation((selector) => {
      const state = {
        inputs: { shared: sampleSharedInputs },
      };
      // Cast to unknown first to satisfy TypeScript for partial mock
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    const { container } = render(<ResultsSection />);

    // Verify placeholder is shown
    expect(screen.getByText(/Complete all previous sections/)).toBeInTheDocument();

    // Run axe accessibility checks
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has ARIA live region on verdict card', async () => {
    vi.mocked(useEVPICalculations).mockReturnValue(sampleEVPIResults);
    vi.mocked(useWizardStore).mockImplementation((selector) => {
      const state = {
        inputs: { shared: sampleSharedInputs },
      };
      // Cast to unknown first to satisfy TypeScript for partial mock
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    render(<ResultsSection />);

    // Find the verdict headline container with ARIA live region
    const liveRegion = document.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('shows highlight variant styling for high regret chance', async () => {
    // Setup with high chance of being wrong (> 20%)
    const highRegretResults = {
      ...sampleEVPIResults,
      chanceOfBeingWrong: 0.35, // 35% - should trigger highlight
    };

    vi.mocked(useEVPICalculations).mockReturnValue(highRegretResults);
    vi.mocked(useWizardStore).mockImplementation((selector) => {
      const state = {
        inputs: { shared: sampleSharedInputs },
      };
      // Cast to unknown first to satisfy TypeScript for partial mock
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    render(<ResultsSection />);

    // Find the regret card - it should have highlight styling
    const regretCard = screen.getByText('Chance you\'d regret not testing').closest('div');
    expect(regretCard).toBeInTheDocument();
  });
});
