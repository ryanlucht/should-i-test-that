/**
 * WaterfallBlock - Tests for six-step plain-English results narrative
 *
 * Per 25.1-02-PLAN.md Task 1 behavior spec.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WaterfallBlock } from './WaterfallBlock';

const defaultProps = {
  defaultDecision: 'ship' as const,
  priorLow: -8.22,
  priorHigh: 8.22,
  pDecisionChange: 0.25,
  testValue: 12000,
  timingCost: 2500,
  netValue: 9500,
};

describe('WaterfallBlock', () => {
  it('renders heading "Why this result?" as h4 inside section with aria-label', () => {
    render(<WaterfallBlock {...defaultProps} />);

    const section = document.querySelector('section[aria-label="Why this result?"]');
    expect(section).toBeInTheDocument();

    const heading = screen.getByRole('heading', { name: 'Why this result?' });
    expect(heading.tagName).toBe('H4');
  });

  it('renders 6 numbered steps (1. through 6.)', () => {
    render(<WaterfallBlock {...defaultProps} />);

    // Check for step number prefixes
    expect(screen.getByText(/^1\./)).toBeInTheDocument();
    expect(screen.getByText(/^2\./)).toBeInTheDocument();
    expect(screen.getByText(/^3\./)).toBeInTheDocument();
    expect(screen.getByText(/^4\./)).toBeInTheDocument();
    expect(screen.getByText(/^5\./)).toBeInTheDocument();
    expect(screen.getByText(/^6\./)).toBeInTheDocument();
  });

  it('step 1 contains defaultDecision text "ship" when decision is ship', () => {
    render(<WaterfallBlock {...defaultProps} defaultDecision="ship" />);

    // Step 1 copy: "Without testing, your current best choice is to ship."
    expect(screen.getByText(/Without testing/)).toBeInTheDocument();
    expect(screen.getByText(/Without testing/).textContent).toContain('ship');
  });

  it('step 1 contains "not ship" when decision is dont-ship', () => {
    render(<WaterfallBlock {...defaultProps} defaultDecision="dont-ship" />);

    expect(screen.getByText(/Without testing/).textContent).toContain('not ship');
  });

  it('step 2 contains formatted priorLow and priorHigh values', () => {
    render(<WaterfallBlock {...defaultProps} priorLow={-8.22} priorHigh={8.22} />);

    const step2 = screen.getByText(/meaningfully uncertain/);
    expect(step2).toBeInTheDocument();
    // formatPercentage(-8.22) => "-8.22%", formatPercentage(8.22) => "8.22%"
    expect(step2.textContent).toContain('-8.22%');
    expect(step2.textContent).toContain('8.22%');
  });

  it('step 3 contains formatted pDecisionChange probability', () => {
    render(<WaterfallBlock {...defaultProps} pDecisionChange={0.25} />);

    const step3 = screen.getByText(/informative enough/);
    expect(step3).toBeInTheDocument();
    // formatProbabilityPercent(0.25) => "25%"
    expect(step3.textContent).toContain('25%');
  });

  it('step 4 contains formatted testValue as currency', () => {
    render(<WaterfallBlock {...defaultProps} testValue={12000} />);

    const step4 = screen.getByText(/better decisions enabled/);
    expect(step4).toBeInTheDocument();
    // formatSmartCurrency(12000) => "$12K"
    expect(step4.textContent).toMatch(/\$12/);
  });

  it('step 5 contains formatted timingCost as currency (always positive)', () => {
    render(<WaterfallBlock {...defaultProps} timingCost={2500} />);

    const step5 = screen.getByText(/Waiting for the test/);
    expect(step5).toBeInTheDocument();
    // formatSmartCurrency(Math.abs(2500)) => "$2.5K"
    expect(step5.textContent).toMatch(/\$2/);
  });

  it('step 6 contains formatted netValue as currency', () => {
    render(<WaterfallBlock {...defaultProps} netValue={9500} />);

    const step6 = screen.getByText(/net value of/);
    expect(step6).toBeInTheDocument();
    // formatSmartCurrency(9500) => "$9.5K"
    expect(step6.textContent).toMatch(/\$9/);
  });

  it('negative netValue renders with destructive color class on the value span', () => {
    render(<WaterfallBlock {...defaultProps} netValue={-500} />);

    const step6 = screen.getByText(/net value of/);
    expect(step6).toBeInTheDocument();
    // The netValue span is the last span inside step 6 (first is the step number)
    const allSpans = step6.querySelectorAll('span');
    const valueSpan = allSpans[allSpans.length - 1];
    expect(valueSpan).not.toBeNull();
    expect(valueSpan.className).toContain('text-destructive');
  });

  it('positive netValue renders with text-primary color class on the value span', () => {
    render(<WaterfallBlock {...defaultProps} netValue={9500} />);

    const step6 = screen.getByText(/net value of/);
    const allSpans = step6.querySelectorAll('span');
    const valueSpan = allSpans[allSpans.length - 1];
    expect(valueSpan).not.toBeNull();
    expect(valueSpan.className).toContain('text-primary');
  });

  it('component has correct card styling (bg-card border border-border rounded-xl)', () => {
    const { container } = render(<WaterfallBlock {...defaultProps} />);

    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    expect(section!.className).toContain('bg-card');
    expect(section!.className).toContain('border');
    expect(section!.className).toContain('border-border');
    expect(section!.className).toContain('rounded-xl');
  });
});
