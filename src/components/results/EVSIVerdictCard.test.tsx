/**
 * EVSIVerdictCard Tests
 *
 * Tests for ENG-08: Honest negative net value display
 * - D-06: Show actual negative dollar value (not clamped)
 * - D-07: Negative messaging + max test budget $0
 * - D-08: Positive messaging preserved
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EVSIVerdictCard } from './EVSIVerdictCard';

describe('EVSIVerdictCard', () => {
  describe('positive net value (D-08)', () => {
    it('shows "up to" and formatted positive value', () => {
      // Use value < $1000 to avoid compact formatting (e.g., "$1K")
      render(
        <EVSIVerdictCard netValueDollars={750} isLoading={false} />
      );

      expect(screen.getByText(/up to/)).toBeInTheDocument();
      expect(screen.getByText(/\$750/)).toBeInTheDocument();
    });

    it('shows positive explanation text', () => {
      render(
        <EVSIVerdictCard netValueDollars={750} isLoading={false} />
      );

      expect(screen.getByText(/net value of testing/)).toBeInTheDocument();
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
    it('treats zero as positive (shows "up to" messaging)', () => {
      render(
        <EVSIVerdictCard netValueDollars={0} isLoading={false} />
      );

      expect(screen.getByText(/up to/)).toBeInTheDocument();
    });
  });
});
