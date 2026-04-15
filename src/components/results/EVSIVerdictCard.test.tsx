/**
 * EVSIVerdictCard Tests
 *
 * Tests for:
 * - ENG-08: Honest negative net value display
 * - SHARE-02: Share button with clipboard copy and feedback states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EVSIVerdictCard } from './EVSIVerdictCard';
import { useWizardStore } from '@/stores/wizardStore';
import { initialInputs } from '@/types/wizard';

// Mock the url-codec module so tests don't depend on encoding logic
vi.mock('@/lib/url-codec', () => ({
  encodeWizardState: vi.fn().mockReturnValue('encoded-test-string'),
}));

// Mock useWizardStore to provide controlled inputs for share button tests
vi.mock('@/stores/wizardStore', () => ({
  useWizardStore: vi.fn(),
}));

// Mock useSharedDiff to control divergence detection in recipient mode tests
vi.mock('@/hooks/useSharedDiff', () => ({
  useSharedDiff: vi.fn().mockReturnValue({
    modifiedFields: new Set(),
    isFieldModified: () => false,
  }),
}));

import { useSharedDiff } from '@/hooks/useSharedDiff';

const mockInputs = {
  ...initialInputs,
  baselineConversionRate: 0.05,
  annualVisitors: 100000,
  valuePerConversion: 50,
};

// Default store shape for non-recipient (regular user) tests
const defaultStoreState: {
  inputs: typeof mockInputs;
  sharedBaseline: typeof mockInputs | null;
  sharedNetValue: number | null;
  setGuideEnabled: ReturnType<typeof vi.fn>;
} = {
  inputs: mockInputs,
  sharedBaseline: null,
  sharedNetValue: null,
  setGuideEnabled: vi.fn(),
};

describe('EVSIVerdictCard', () => {
  beforeEach(() => {
    // Default mock: store returns test inputs, non-recipient mode
    (useWizardStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: typeof defaultStoreState) => unknown) =>
        selector({ ...defaultStoreState })
    );

    // Default clipboard mock: resolves successfully
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
    });

    // Use fake timers for 2-second revert tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('positive net value (D-08)', () => {
    it('shows "below" and formatted positive value', () => {
      // Use value < $1000 to avoid compact formatting (e.g., "$1K")
      render(
        <EVSIVerdictCard netValueDollars={750} isLoading={false} />
      );

      expect(screen.getByText(/below/)).toBeInTheDocument();
      expect(screen.getByText(/\$750/)).toBeInTheDocument();
    });

    it('shows positive explanation text', () => {
      render(
        <EVSIVerdictCard netValueDollars={750} isLoading={false} />
      );

      expect(screen.getByText(/how much the test is worth/)).toBeInTheDocument();
    });
  });

  describe('negative net value (D-06, D-07)', () => {
    it('shows "cost you" and the absolute dollar amount', () => {
      render(
        <EVSIVerdictCard netValueDollars={-500} isLoading={false} />
      );

      expect(screen.getByText(/cost you/)).toBeInTheDocument();
      expect(screen.getByText(/\$500/)).toBeInTheDocument();
    });

    it('shows "maximum you should pay to run this test is $0"', () => {
      render(
        <EVSIVerdictCard netValueDollars={-500} isLoading={false} />
      );

      expect(
        screen.getByText(/maximum you should pay to run this test is/)
      ).toBeInTheDocument();
      expect(screen.getByText(/\$0/)).toBeInTheDocument();
    });

    it('shows "more than the information is worth" messaging', () => {
      render(
        <EVSIVerdictCard netValueDollars={-500} isLoading={false} />
      );

      expect(
        screen.getByText(/more than the information is worth/)
      ).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows calculating message when loading', () => {
      render(
        <EVSIVerdictCard netValueDollars={null} isLoading={true} />
      );

      // Visible "Calculating..." text (sr-only version also present)
      expect(screen.getAllByText(/Calculating/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('no results state', () => {
    it('shows placeholder when no results and not loading', () => {
      render(
        <EVSIVerdictCard netValueDollars={null} isLoading={false} />
      );

      expect(
        screen.getByText(/Complete all previous sections/)
      ).toBeInTheDocument();
    });
  });

  describe('zero net value', () => {
    it('treats zero as positive (shows "below" messaging)', () => {
      render(
        <EVSIVerdictCard netValueDollars={0} isLoading={false} />
      );

      expect(screen.getByText(/below/)).toBeInTheDocument();
    });
  });

  describe('Share button visibility (Tests B1-B3, per D-04)', () => {
    // Test B1: No share button when netValueDollars is null
    it('B1: Share button is NOT rendered when netValueDollars is null', () => {
      render(<EVSIVerdictCard netValueDollars={null} isLoading={false} />);
      expect(screen.queryByText(/Share This Analysis/)).not.toBeInTheDocument();
    });

    // Test B2: No share button when isLoading is true
    it('B2: Share button is NOT rendered when isLoading is true', () => {
      render(<EVSIVerdictCard netValueDollars={750} isLoading={true} />);
      expect(screen.queryByText(/Share This Analysis/)).not.toBeInTheDocument();
    });

    // Test B3: Share button IS rendered when results available
    it('B3: Share button IS rendered when netValueDollars is a number and isLoading is false', () => {
      render(<EVSIVerdictCard netValueDollars={750} isLoading={false} />);
      expect(screen.getByText(/Share This Analysis/)).toBeInTheDocument();
    });
  });

  describe('Share button text (Test B4, per D-02)', () => {
    // Test B4: Button text contains "Share This Analysis"
    it('B4: Share button text contains "Share This Analysis"', () => {
      render(<EVSIVerdictCard netValueDollars={750} isLoading={false} />);
      const button = screen.getByRole('button', { name: /Share This Analysis/ });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Share button feedback states (Tests B5-B7, per D-03)', () => {
    // Test B5: After clicking, button shows "Copied!"
    it('B5: After clicking share button, button text changes to "Copied!"', async () => {
      render(<EVSIVerdictCard netValueDollars={750} isLoading={false} />);

      const shareButton = screen.getByRole('button', { name: /Share This Analysis/ });
      await act(async () => {
        fireEvent.click(shareButton);
        // Flush microtasks (resolve the clipboard Promise)
        await Promise.resolve();
      });

      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    // Test B6: After 2 seconds, button reverts to original state
    it('B6: After 2 seconds, button text reverts to "Share This Analysis"', async () => {
      render(<EVSIVerdictCard netValueDollars={750} isLoading={false} />);

      const shareButton = screen.getByRole('button', { name: /Share This Analysis/ });
      await act(async () => {
        fireEvent.click(shareButton);
        // Flush microtasks (resolve the clipboard Promise)
        await Promise.resolve();
      });

      // Verify "Copied!" state
      expect(screen.getByText('Copied!')).toBeInTheDocument();

      // Advance past 2000ms timeout
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      // Should revert to original text
      expect(screen.getByText(/Share This Analysis/)).toBeInTheDocument();
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    });

    // Test B7: Clipboard failure shows "Unable to copy"
    it('B7: When navigator.clipboard.writeText rejects, button shows "Unable to copy" error text', async () => {
      // Override clipboard mock to reject
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
        writable: true,
      });

      render(<EVSIVerdictCard netValueDollars={750} isLoading={false} />);

      const shareButton = screen.getByRole('button', { name: /Share This Analysis/ });
      await act(async () => {
        fireEvent.click(shareButton);
        // Flush microtasks (let rejection propagate)
        await Promise.resolve();
        await Promise.resolve(); // Extra tick for rejection handler
      });

      expect(screen.getByText(/Unable to copy/)).toBeInTheDocument();
    });
  });

  describe('recipient edit exits recipient mode (CR28-04)', () => {
    it('unmodified recipient sees sender sharedNetValue', () => {
      // Mock: recipient with no edits (modifiedFields empty)
      vi.mocked(useSharedDiff).mockReturnValue({
        modifiedFields: new Set(),
        isFieldModified: () => false,
      });

      // Store: recipient mode with sharedBaseline and sharedNetValue
      (useWizardStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (selector: (state: typeof defaultStoreState) => unknown) =>
          selector({
            ...defaultStoreState,
            sharedBaseline: { ...mockInputs },
            sharedNetValue: 999,
          })
      );

      render(<EVSIVerdictCard netValueDollars={500} isLoading={false} />);

      // Should show sender's value (999), not live value (500)
      expect(screen.getByText(/\$999/)).toBeInTheDocument();
      expect(screen.queryByText(/\$500/)).not.toBeInTheDocument();
    });

    it('edited recipient sees live netValueDollars instead of sender value', () => {
      // Mock: recipient who has edited baselineConversionRate
      vi.mocked(useSharedDiff).mockReturnValue({
        modifiedFields: new Set(['baselineConversionRate'] as const),
        isFieldModified: (f) => f === 'baselineConversionRate',
      });

      // Store: recipient mode with sharedBaseline and sharedNetValue
      (useWizardStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (selector: (state: typeof defaultStoreState) => unknown) =>
          selector({
            ...defaultStoreState,
            sharedBaseline: { ...mockInputs },
            sharedNetValue: 999,
          })
      );

      render(<EVSIVerdictCard netValueDollars={500} isLoading={false} />);

      // Should show live value (500), not sender's stale value (999)
      expect(screen.getByText(/\$500/)).toBeInTheDocument();
      expect(screen.queryByText(/\$999/)).not.toBeInTheDocument();
    });

    it('divergence detection: when modifiedFields becomes empty again, recipient mode restores', () => {
      // This tests the actual implementation behavior: if the user reverts all edits
      // to exactly match the shared baseline, modifiedFields becomes empty and
      // isRecipient becomes true again. This is acceptable because:
      // (a) exact revert is extremely rare
      // (b) if inputs truly match baseline, the live computed value should match anyway
      // (c) the UX is still correct
      vi.mocked(useSharedDiff).mockReturnValue({
        modifiedFields: new Set(),
        isFieldModified: () => false,
      });

      (useWizardStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        (selector: (state: typeof defaultStoreState) => unknown) =>
          selector({
            ...defaultStoreState,
            sharedBaseline: { ...mockInputs },
            sharedNetValue: 999,
          })
      );

      render(<EVSIVerdictCard netValueDollars={500} isLoading={false} />);

      // With no modifications, recipient mode is active — shows sender's value
      expect(screen.getByText(/\$999/)).toBeInTheDocument();
    });
  });
});
