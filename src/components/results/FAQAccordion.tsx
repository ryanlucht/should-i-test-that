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
        <p>This result is mainly driven by four things:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Decision stakes:</strong> with {formatNumber(traffic)} daily users and{' '}
            {formatSmartCurrency(valuePerConversion)} per conversion, this decision has real
            economic weight.
          </li>
          <li>
            <strong>Remaining uncertainty:</strong> before testing, the true effect could still
            be meaningfully negative or positive (range: {formatPercentage(priorLow)} to{' '}
            {formatPercentage(priorHigh)}).
          </li>
          <li>
            <strong>Test precision:</strong> with this traffic and duration, the experiment is
            often strong enough to change what you&apos;d do (about{' '}
            {formatProbabilityPercent(pDecisionChange)} of the time).
          </li>
          <li>
            <strong>Delay cost:</strong> waiting for results reduces the value by about{' '}
            {formatSmartCurrency(Math.abs(timingCost))}.
          </li>
        </ul>
        <p>
          <strong>Why the test is worth anything at all:</strong> if the result can change what
          you do, and the decision has real business stakes, the information has value.
        </p>
      </AccordionItem>

      {/* Accordion 2: How is the value calculated? */}
      <AccordionItem
        label="How is the value of better decisions calculated?"
        isOpen={open2}
        onToggle={() => setOpen2(!open2)}
      >
        <p>The calculator compares two options:</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li><strong>Decide today</strong> without running a test</li>
          <li><strong>Run this test</strong>, then decide after seeing the results</li>
        </ol>
        <p>
          It estimates how much better option 2 is, on average, across many plausible outcomes.
          That average improvement is the <strong>value of better decisions</strong>, shown here
          as {formatSmartCurrency(testValue)}.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>this is <strong>before</strong> subtracting delay costs</li>
          <li>it reflects the value of <strong>this specific test design</strong></li>
          <li>bigger stakes and more decision-changing tests usually make this number larger</li>
        </ul>
      </AccordionItem>

      {/* Accordion 3: What would change the result? (no dynamic values per D-04) */}
      <AccordionItem
        label="What would make this test worth more? Worth less?"
        isOpen={open3}
        onToggle={() => setOpen3(!open3)}
      >
        <p>This test would usually be worth <strong>more</strong> if:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>more users were affected</li>
          <li>each conversion were worth more</li>
          <li>you were more uncertain about the true effect</li>
          <li>the test had a better chance of changing your decision</li>
          <li>results came back faster</li>
        </ul>
        <p>This test would usually be worth <strong>less</strong> if:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>fewer users were affected</li>
          <li>each conversion were worth less</li>
          <li>you were already quite sure about the effect</li>
          <li>the test were unlikely to change your decision</li>
          <li>the test or readout took longer</li>
        </ul>
      </AccordionItem>

      {/* Accordion 4: Why does waiting reduce the value? */}
      <AccordionItem
        label="Why does waiting reduce the value?"
        isOpen={open4}
        onToggle={() => setOpen4(!open4)}
      >
        <p>Running the test takes time:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>during the experiment, not all users get the eventual best experience</li>
          <li>during readout and decision time, you are still waiting to act</li>
          <li>that lost time has a real opportunity cost</li>
        </ul>
        <p>
          In this case, that cost is about {formatSmartCurrency(Math.abs(timingCost))}.
        </p>
      </AccordionItem>
    </div>
  );
}
