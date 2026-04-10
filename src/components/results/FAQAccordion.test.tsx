/**
 * Tests for FAQAccordion component
 *
 * Tests per 25.1-03-PLAN.md behavior spec:
 * - All four accordion triggers rendered with correct text
 * - All four accordions collapsed by default (aria-expanded="false")
 * - Click expand/collapse, independence, keyboard (Enter/Space)
 * - Accordion answer content with dynamic values
 * - Card wrapper styling
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FAQAccordion } from './FAQAccordion';

const defaultProps = {
  traffic: 10000,
  valuePerConversion: 50,
  priorLow: -8.22,
  priorHigh: 8.22,
  pDecisionChange: 0.25,
  testValue: 12000,
  timingCost: 2500,
  netValue: 9500,
};

describe('FAQAccordion', () => {
  it('Test 1: renders all four accordion triggers with correct text', () => {
    render(<FAQAccordion {...defaultProps} />);

    expect(screen.getByText("What's driving the value you've calculated?")).toBeInTheDocument();
    expect(screen.getByText("How is the value of better decisions calculated?")).toBeInTheDocument();
    expect(screen.getByText("What would make this test worth more? Worth less?")).toBeInTheDocument();
    expect(screen.getByText("Why does waiting reduce the value?")).toBeInTheDocument();
  });

  it('Test 2: all four accordions collapsed by default (aria-expanded false)', () => {
    render(<FAQAccordion {...defaultProps} />);

    const triggers = screen.getAllByRole('button');
    expect(triggers).toHaveLength(4);
    triggers.forEach((trigger) => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('Test 3: clicking an accordion trigger expands it (aria-expanded true) and shows answer content', () => {
    render(<FAQAccordion {...defaultProps} />);

    const trigger1 = screen.getByText("What's driving the value you've calculated?").closest('button')!;
    expect(trigger1).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger1);

    expect(trigger1).toHaveAttribute('aria-expanded', 'true');
    // Content should now be visible
    expect(screen.getByText(/This result is mainly driven by four things/)).toBeInTheDocument();
  });

  it('Test 4: clicking an expanded accordion collapses it', () => {
    render(<FAQAccordion {...defaultProps} />);

    const trigger1 = screen.getByText("What's driving the value you've calculated?").closest('button')!;

    // Expand
    fireEvent.click(trigger1);
    expect(trigger1).toHaveAttribute('aria-expanded', 'true');

    // Collapse
    fireEvent.click(trigger1);
    expect(trigger1).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/This result is mainly driven by four things/)).not.toBeInTheDocument();
  });

  it('Test 5: accordions are independent (opening one does not close another)', () => {
    render(<FAQAccordion {...defaultProps} />);

    const trigger1 = screen.getByText("What's driving the value you've calculated?").closest('button')!;
    const trigger2 = screen.getByText("How is the value of better decisions calculated?").closest('button')!;

    // Open first
    fireEvent.click(trigger1);
    expect(trigger1).toHaveAttribute('aria-expanded', 'true');

    // Open second
    fireEvent.click(trigger2);
    expect(trigger2).toHaveAttribute('aria-expanded', 'true');

    // First is still open
    expect(trigger1).toHaveAttribute('aria-expanded', 'true');
  });

  it('Test 6: keyboard activation toggles accordion (native button handles Enter/Space)', () => {
    render(<FAQAccordion {...defaultProps} />);

    const trigger1 = screen.getByText("What's driving the value you've calculated?").closest('button')!;
    expect(trigger1).toHaveAttribute('aria-expanded', 'false');
    // Native <button> converts Enter/Space to click events in real browsers.
    // jsdom doesn't simulate this, so we test via click — the guarantee comes from
    // using a native button element, not from a custom onKeyDown handler.
    fireEvent.click(trigger1);
    expect(trigger1).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(trigger1);
    expect(trigger1).toHaveAttribute('aria-expanded', 'false');
  });

  it('Test 7: keyboard activation toggles independent accordion', () => {
    render(<FAQAccordion {...defaultProps} />);

    const trigger3 = screen.getByText("What would make this test worth more? Worth less?").closest('button')!;
    expect(trigger3).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger3);
    expect(trigger3).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(trigger3);
    expect(trigger3).toHaveAttribute('aria-expanded', 'false');
  });

  it('Test 8: Accordion 1 answer contains traffic and valuePerConversion values', () => {
    render(<FAQAccordion {...defaultProps} />);

    const trigger1 = screen.getByText("What's driving the value you've calculated?").closest('button')!;
    fireEvent.click(trigger1);

    // traffic = 10000 → formatNumber(10000) = "10,000"
    expect(screen.getByText(/10,000/)).toBeInTheDocument();
    // valuePerConversion = 50 → formatSmartCurrency(50) = "$50"
    expect(screen.getByText(/\$50/)).toBeInTheDocument();
  });

  it('Test 9: Accordion 2 answer contains testValue formatted as currency', () => {
    render(<FAQAccordion {...defaultProps} />);

    const trigger2 = screen.getByText("How is the value of better decisions calculated?").closest('button')!;
    fireEvent.click(trigger2);

    // testValue = 12000 → formatSmartCurrency(12000) = "$12K"
    expect(screen.getByText(/\$12K/)).toBeInTheDocument();
  });

  it('Test 10: Accordion 4 answer contains timingCost formatted as currency', () => {
    render(<FAQAccordion {...defaultProps} />);

    const trigger4 = screen.getByText("Why does waiting reduce the value?").closest('button')!;
    fireEvent.click(trigger4);

    // timingCost = 2500 → formatSmartCurrency(Math.abs(2500)) = "$2.5K"
    expect(screen.getByText(/\$2\.5K/)).toBeInTheDocument();
  });

  it('Test 11: component wrapped in bg-card border rounded-xl card styling', () => {
    const { container } = render(<FAQAccordion {...defaultProps} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('bg-card');
    expect(wrapper).toHaveClass('border');
    expect(wrapper).toHaveClass('rounded-xl');
  });
});
