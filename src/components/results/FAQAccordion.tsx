/**
 * FAQ Accordion — Four collapsed explainer items for the results section.
 *
 * Answers the four follow-up questions a non-statistician might ask:
 * 1. What's driving the value you've calculated?
 * 2. How is the value of better decisions calculated?
 * 3. What would make this test worth more? Worth less?
 * 4. Why does waiting reduce the value?
 *
 * All items start collapsed (default per D-02). Each item toggles independently.
 * Reuses the ChevronDown/ChevronUp + aria-expanded + keyboard pattern from
 * ValueBreakdownCard.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatSmartCurrency,
  formatProbabilityPercent,
  formatPercentage,
  formatNumber,
} from '@/lib/formatting';

/** Props for the FAQ accordion section */
export interface FAQAccordionProps {
  /** Daily traffic value for Accordion 1 */
  traffic: number;
  /** Revenue per conversion for Accordion 1 */
  valuePerConversion: number;
  /** Prior interval low (percentage form) for Accordion 1 */
  priorLow: number;
  /** Prior interval high (percentage form) for Accordion 1 */
  priorHigh: number;
  /** Probability test changes decision (decimal 0-1) for Accordion 1 */
  pDecisionChange: number;
  /** EVSI in dollars for Accordion 2 and 4 */
  testValue: number;
  /** Timing cost in dollars for Accordion 4 */
  timingCost: number;
  /** Net value in dollars for context */
  netValue: number;
}

/**
 * Internal reusable accordion item.
 * Handles toggle state via injected isOpen/onToggle (state lives in parent).
 */
function AccordionItem({
  label,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={cn(
          'flex justify-between items-center cursor-pointer rounded px-1 -mx-1 py-2 transition-colors',
          'hover:bg-muted/50'
        )}
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      {isOpen && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 space-y-2 mt-1">
          {children}
        </div>
      )}
    </div>
  );
}

/** FAQ accordion section with four collapsed explainer items */
export function FAQAccordion({
  traffic,
  valuePerConversion,
  priorLow,
  priorHigh,
  pDecisionChange,
  testValue,
  timingCost,
}: FAQAccordionProps) {
  // Each accordion item has independent open state (per D-02: no accordion exclusivity)
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);
  const [open4, setOpen4] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-1">
      {/* Accordion 1: What's driving the value? */}
      <AccordionItem
        label="What's driving the value you've calculated?"
        isOpen={open1}
        onToggle={() => setOpen1(!open1)}
      >
        <p>This result is driven by four things:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Decision stakes: with {formatNumber(traffic)} daily traffic and{' '}
            {formatSmartCurrency(valuePerConversion)} value per conversion, the decision matters
            economically.
          </li>
          <li>
            Uncertainty: your prior range of {formatPercentage(priorLow)} to{' '}
            {formatPercentage(priorHigh)} means there is still meaningful downside and upside
            uncertainty.
          </li>
          <li>
            Test informativeness: this experiment changes your action in about{' '}
            {formatProbabilityPercent(pDecisionChange)} of similar cases.
          </li>
          <li>
            Delay costs: waiting for results subtracts about{' '}
            {formatSmartCurrency(Math.abs(timingCost))} from the value of testing.
          </li>
        </ul>
        <p>
          Why this test is worth something at all: If the test can meaningfully improve what
          you do, and the decision has real economic stakes, then information itself has value.
        </p>
      </AccordionItem>

      {/* Accordion 2: How is the value calculated? */}
      <AccordionItem
        label="How is the value of better decisions calculated?"
        isOpen={open2}
        onToggle={() => setOpen2(!open2)}
      >
        <p>We estimate the value of this test by asking:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>What do you believe about the true effect before seeing data?</li>
          <li>What results could this specific test plausibly produce?</li>
          <li>After seeing each possible result, what action would be best?</li>
          <li>How much better are those actions than deciding today without testing?</li>
        </ol>
        <p>
          The calculator averages that improvement across many possible outcomes. That average
          improvement is the value of better decisions, shown here as{' '}
          {formatSmartCurrency(testValue)}.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>this is before subtracting delay costs</li>
          <li>it reflects the value of this specific test design, not perfect certainty</li>
          <li>larger stakes and more informative tests usually increase this number</li>
        </ul>
      </AccordionItem>

      {/* Accordion 3: What would change the result? (no dynamic values per D-04) */}
      <AccordionItem
        label="What would make this test worth more? Worth less?"
        isOpen={open3}
        onToggle={() => setOpen3(!open3)}
      >
        <p>This test would generally be worth more if:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>traffic were higher</li>
          <li>value per conversion were higher</li>
          <li>you were more uncertain about the true effect</li>
          <li>the test had a better chance of changing the decision</li>
          <li>delay costs were smaller</li>
        </ul>
        <p>This test would generally be worth less if:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>traffic were lower</li>
          <li>value per conversion were lower</li>
          <li>your prior were already very tight</li>
          <li>the test were unlikely to change your action</li>
          <li>the test or readout took longer</li>
        </ul>
      </AccordionItem>

      {/* Accordion 4: Why does waiting reduce the value? */}
      <AccordionItem
        label="Why does waiting reduce the value?"
        isOpen={open4}
        onToggle={() => setOpen4(!open4)}
      >
        <p>Running the test is not free in time:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>during the test, not all users receive the best eventual experience</li>
          <li>during readout / decision latency, you are still waiting to act</li>
          <li>that lost time creates an opportunity cost</li>
        </ul>
        <p>
          In this case, that cost is estimated at{' '}
          {formatSmartCurrency(Math.abs(timingCost))}.
        </p>
      </AccordionItem>
    </div>
  );
}
