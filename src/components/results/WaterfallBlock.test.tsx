/**
 * WaterfallBlock - Tests for six-step plain-English results narrative
 *
 * Updated for revised copy per PM feedback.
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

    expect(screen.getByText(/^1\./)).toBeInTheDocument();
    expect(screen.getByText(/^2\./)).toBeInTheDocument();
    expect(screen.getByText(/^3\./)).toBeInTheDocument();
    expect(screen.getByText(/^4\./)).toBeInTheDocument();
    expect(screen.getByText(/^5\./)).toBeInTheDocument();
    expect(screen.getByText(/^6\./)).toBeInTheDocument();
  });

  it('step 1 contains default decision text when not near-tie', () => {
    render(<WaterfallBlock {...defaultProps} defaultDecision="ship" />);

    const step1 = screen.getByText(/If you had to decide today/);
    expect(step1).toBeInTheDocument();
    expect(step1.textContent).toContain('ship');
  });

  it('step 1 contains "not ship" when decision is dont-ship', () => {
    render(<WaterfallBlock {...defaultProps} defaultDecision="dont-ship" />);

    const step1 = screen.getByText(/If you had to decide today/);
    expect(step1.textContent).toContain('not ship');
  });

  it('step 1 shows near-tie copy when isNearTie is true', () => {
    render(<WaterfallBlock {...defaultProps} isNearTie={true} />);

    const step1 = screen.getByText(/shipping and not shipping look nearly equally good/);
    expect(step1).toBeInTheDocument();
  });

  it('step 2 contains formatted priorLow and priorHigh values', () => {
    render(<WaterfallBlock {...defaultProps} priorLow={-8.22} priorHigh={8.22} />);

    const step2 = screen.getByText(/still uncertain about the true effect/);
    expect(step2).toBeInTheDocument();
    expect(step2.textContent).toContain('-8.22%');
    expect(step2.textContent).toContain('8.22%');
  });

  it('step 3 contains formatted pDecisionChange probability', () => {
    render(<WaterfallBlock {...defaultProps} pDecisionChange={0.25} />);

    const step3 = screen.getByText(/precise enough to change/);
    expect(step3).toBeInTheDocument();
    expect(step3.textContent).toContain('25%');
  });

  it('step 4 contains formatted testValue as currency', () => {
    render(<WaterfallBlock {...defaultProps} testValue={12000} />);

    const step4 = screen.getByText(/improved decision-making is worth/);
    expect(step4).toBeInTheDocument();
    expect(step4.textContent).toMatch(/\$12/);
  });

  it('step 5 contains formatted timingCost as currency (always positive)', () => {
    render(<WaterfallBlock {...defaultProps} timingCost={2500} />);

    const step5 = screen.getByText(/Running the test and waiting/);
    expect(step5).toBeInTheDocument();
    expect(step5.textContent).toMatch(/\$2/);
  });

  it('step 6 contains formatted netValue as currency', () => {
    render(<WaterfallBlock {...defaultProps} netValue={9500} />);

    const step6 = screen.getByText(/net value is/);
    expect(step6).toBeInTheDocument();
    expect(step6.textContent).toMatch(/\$9/);
  });

  it('negative netValue renders with destructive color class on the value span', () => {
    render(<WaterfallBlock {...defaultProps} netValue={-500} />);

    const step6 = screen.getByText(/net value is/);
    expect(step6).toBeInTheDocument();
    const allSpans = step6.querySelectorAll('span');
    const valueSpan = allSpans[allSpans.length - 1];
    expect(valueSpan).not.toBeNull();
    expect(valueSpan.className).toContain('text-destructive');
  });

  it('positive netValue renders with text-primary color class on the value span', () => {
    render(<WaterfallBlock {...defaultProps} netValue={9500} />);

    const step6 = screen.getByText(/net value is/);
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
