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
  priorMean: 0.0,
  shippingRuleLabel: 'any positive impact',
  directionSentence: 'the test is valuable mainly as a guardrail: it often helps you avoid shipping when the downside is still plausible.',
  pDecisionChange: 0.25,
  testValue: 12000,
  timingCost: 2500,
  netValue: 9500,
};

describe('WaterfallBlock', () => {
  it('renders heading "Plain English explanation" as h4 inside section with aria-label', () => {
    render(<WaterfallBlock {...defaultProps} />);

    const section = document.querySelector('section[aria-label="Plain English explanation"]');
    expect(section).toBeInTheDocument();

    const heading = screen.getByRole('heading', { name: 'Plain English explanation' });
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

  it('step 1 shows explicit comparison when not near-tie (ship)', () => {
    render(<WaterfallBlock {...defaultProps} defaultDecision="ship" priorMean={3.0} shippingRuleLabel="any positive impact" directionSentence="the test is valuable mainly as a guardrail." />);

    const steps = document.querySelectorAll('li');
    const step1Text = steps[0].textContent ?? '';
    expect(step1Text).toContain('+3.0%');
    expect(step1Text).toContain('meets');
    expect(step1Text).toContain('ship');
    expect(step1Text).toContain('guardrail');
  });

  it('step 1 shows "doesn\u2019t meet" when decision is dont-ship', () => {
    render(<WaterfallBlock {...defaultProps} defaultDecision="dont-ship" priorMean={1.0} shippingRuleLabel="minimum lift of +2%" directionSentence="the test is valuable mainly as a confidence builder." />);

    const steps = document.querySelectorAll('li');
    const step1Text = steps[0].textContent ?? '';
    expect(step1Text).toContain('doesn\u2019t meet');
    expect(step1Text).toContain('not ship');
    expect(step1Text).toContain('confidence builder');
  });

  it('step 1 shows tie-break copy when isTie is true', () => {
    render(<WaterfallBlock {...defaultProps} isTie={true} />);

    const steps = document.querySelectorAll('li');
    const step1Text = steps[0].textContent ?? '';
    expect(step1Text).toContain('right at the boundary');
    expect(step1Text).toContain('perfect tie');
    expect(step1Text).toContain('math is equivalent');
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

  it('component has blue info panel styling', () => {
    const { container } = render(<WaterfallBlock {...defaultProps} />);

    const section = container.querySelector('section');
    expect(section).toBeInTheDocument();
    expect(section!.className).toContain('bg-blue-50');
    expect(section!.className).toContain('border-blue-200');
    expect(section!.className).toContain('rounded-lg');
  });

  // ---------------------------------------------------------------------------
  // SA-4/CR-4: Effective prior mean in waterfall step 1
  // ---------------------------------------------------------------------------

  it('step 1 shows adjusted prior text when effectivePriorMeanPercent differs from priorMean (SA-4/CR-4)', () => {
    // priorMean = 5.0% but effective = 3.2% after truncation (differs by >0.1pp)
    render(
      <WaterfallBlock
        {...defaultProps}
        priorMean={5.0}
        defaultDecision="ship"
        effectivePriorMeanPercent={3.2}
      />
    );

    const steps = document.querySelectorAll('li');
    const step1Text = steps[0].textContent ?? '';
    // Should mention the raw expected effect and the adjusted value
    expect(step1Text).toContain('+5.0%');
    expect(step1Text).toContain('+3.2%');
    expect(step1Text).toContain('adjusted');
    expect(step1Text).toContain('feasible outcomes');
  });

  it('step 1 shows normal text when effectivePriorMeanPercent is not provided', () => {
    render(
      <WaterfallBlock
        {...defaultProps}
        priorMean={5.0}
        defaultDecision="ship"
      />
    );

    const steps = document.querySelectorAll('li');
    const step1Text = steps[0].textContent ?? '';
    expect(step1Text).toContain('+5.0%');
    expect(step1Text).toContain('meets');
    expect(step1Text).not.toContain('adjusted');
  });

  it('step 1 shows normal text when effectivePriorMeanPercent is within 0.1pp of priorMean', () => {
    // priorMean = 5.0, effective = 5.05 (only 0.05pp difference, < 0.1 threshold)
    render(
      <WaterfallBlock
        {...defaultProps}
        priorMean={5.0}
        defaultDecision="ship"
        effectivePriorMeanPercent={5.05}
      />
    );

    const steps = document.querySelectorAll('li');
    const step1Text = steps[0].textContent ?? '';
    expect(step1Text).not.toContain('adjusted');
  });
});
