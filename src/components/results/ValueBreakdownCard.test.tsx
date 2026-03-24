/**
 * ValueBreakdownCard Tests
 *
 * Tests for ENG-08: Unclamped net value display in breakdown card
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValueBreakdownCard } from './ValueBreakdownCard';

describe('ValueBreakdownCard', () => {
  const defaultProps = {
    evsiDollars: 800,
    testDurationDays: 14,
    variantFraction: 0.5,
    decisionLatencyDays: 7,
  };

  describe('positive net value', () => {
    it('displays positive net value with primary color', () => {
      const { container } = render(
        <ValueBreakdownCard {...defaultProps} netValueDollars={500} />
      );

      // The net value span should have text-primary class
      const netValueSpan = container.querySelector('.text-primary');
      expect(netValueSpan).toBeInTheDocument();
      expect(netValueSpan?.textContent).toContain('$500');
    });
  });

  describe('negative net value (unclamped display)', () => {
    it('displays negative net value without clamping to $0', () => {
      render(
        <ValueBreakdownCard {...defaultProps} netValueDollars={-200} />
      );

      // Should show the negative value, not $0
      expect(screen.getByText(/-\$200/)).toBeInTheDocument();
    });

    it('displays negative net value with destructive color', () => {
      const { container } = render(
        <ValueBreakdownCard {...defaultProps} netValueDollars={-200} />
      );

      // The net value span should have text-destructive class
      const netValueSpan = container.querySelector('.text-destructive');
      expect(netValueSpan).toBeInTheDocument();
    });

    it('shows minus sign for negative values', () => {
      const { container } = render(
        <ValueBreakdownCard {...defaultProps} netValueDollars={-200} />
      );

      // The formatted display should include the minus sign
      const netValueSpan = container.querySelector('.text-destructive');
      expect(netValueSpan?.textContent).toMatch(/^-/);
    });
  });

  describe('description text', () => {
    it('shows updated description about timing costs', () => {
      render(
        <ValueBreakdownCard {...defaultProps} netValueDollars={500} />
      );

      expect(
        screen.getByText(/expected benefit of testing after accounting for timing costs/)
      ).toBeInTheDocument();
    });
  });
});
