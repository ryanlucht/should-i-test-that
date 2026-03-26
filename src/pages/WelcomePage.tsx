/**
 * Welcome Page
 *
 * Homepage with the "Bubbly Pill" logo, Learning Bits welcome dialogue,
 * dual start/skip CTAs, and footer.
 *
 * Phase 23: Homepage & Welcome Experience
 * Design decisions: 23-CONTEXT.md D-05 through D-13
 *
 * Layout:
 *   BubblyPillLogo
 *   +---------------------------------------------------------+
 *   | [Avatar]  Learning Bits                                 |
 *   |           [typewriter welcome text...]                  |
 *   |           [bouncing dots when complete]                 |
 *   +---------------------------------------------------------+
 *   [ Start (with Guidance) ]
 *   I know what I'm doing, just let me use the calculator...
 *
 *   Footer: Created by Ryan Lucht...
 */

import React from 'react';
import { BubblyPillLogo } from '@/components/BubblyPillLogo';
import { useTypewriter } from '@/hooks/useTypewriter';
import { LearningBitsAvatar } from '@/components/guide/LearningBitsAvatar';
import { BouncingDots } from '@/components/guide/BouncingDots';
import { Button } from '@/components/ui/button';

interface WelcomePageProps {
  /** Navigate to calculator WITH guidance enabled (D-10) */
  onStartWithGuidance: () => void;
  /** Navigate to calculator WITHOUT guidance (D-11) */
  onSkipGuidance: () => void;
}

/**
 * Welcome text for Learning Bits' opening monologue.
 * Verbatim copy per D-06. _vibes_ renders as italic via renderDialogueText.
 */
const WELCOME_TEXT =
  "You have a new idea to try, or some code that needs to be deployed. Should you go through the effort of A/B testing it first?\n\nDon't answer that question with _vibes_! We can make that determination empirically, by calculating the actual dollar value of the information we'd gain with a test. All we have to do is define the stakes of the decision, and come up with a plausible range of possible outcomes.\n\nI'll walk you through the entire calculation. Ready to start?";

/**
 * Renders dialogue text with _word_ patterns converted to <em> elements.
 *
 * Receives the `displayed` slice from useTypewriter (already sliced),
 * not the full message string. This prevents typewriter reset on re-renders.
 *
 * Splits on /_([^_]+)_/g: text before match → plain span, match → <em>.
 */
function renderDialogueText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /_([^_]+)_/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Text before the italic marker
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }
    // Italic word
    parts.push(
      <em key={`em-${match.index}`} className="font-italic">
        {match[1]}
      </em>
    );
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

/**
 * Splits text on double-newlines into <p> elements, applying renderDialogueText
 * to each paragraph for italic markup support.
 */
function renderDialogueParagraphs(text: string, keyPrefix: string): React.ReactNode[] {
  const paragraphs = text.split('\n\n');
  return paragraphs.map((para, i) => (
    <p key={`${keyPrefix}-p-${i}`} className={i > 0 ? 'mt-2' : undefined}>
      {renderDialogueText(para)}
    </p>
  ));
}

/**
 * Welcome Page Component
 *
 * Displays the Bubbly Pill logo, Learning Bits dialogue card with typewriter
 * animation, dual CTA buttons (start with guidance / skip), and footer.
 *
 * CTAs are always visible from the start — users can click anytime without
 * waiting for the typewriter to finish (D-09).
 */
export function WelcomePage({ onStartWithGuidance, onSkipGuidance }: WelcomePageProps) {
  const { displayed, isComplete } = useTypewriter(WELCOME_TEXT);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Main content — centered vertically and horizontally */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 md:px-12">
        <div className="w-full max-w-2xl flex flex-col items-center">

          {/* Logo section — Bubbly Pill logo above dialogue (D-05) */}
          <div className="mb-8 sm:mb-12">
            <BubblyPillLogo />
          </div>

          {/* Dialogue card — inline/centered RPG dialog box (D-07)
           * Same rpg-dialog-box styling as LearningBitsOverlay but NOT fixed positioned.
           * Uses a hidden full-text div to reserve height so the card doesn't
           * grow/shrink as the typewriter reveals characters. */}
          <div className="w-full bg-white p-5 sm:p-6 rounded-lg rpg-dialog-box flex items-start gap-4 mb-8">
            {/* Avatar — 64px circular mascot image */}
            <LearningBitsAvatar />

            {/* Dialogue text area — relative container for height reservation */}
            <div className="flex-1 pt-1 relative" aria-live="polite">
              {/* Character name — Space Grotesk bold per D-03/D-07 */}
              <span className="font-bold text-primary block mb-1 text-sm lb-font">
                Learning Bits
              </span>

              {/* Screen reader: full welcome text (strip markdown underscores) */}
              <span className="sr-only">
                {WELCOME_TEXT.replace(/_([^_]+)_/g, '$1')}
              </span>

              {/* Hidden full text — reserves the card's final height from the start,
                * preventing layout shifts as the typewriter reveals characters */}
              <div className="text-sm leading-relaxed lb-font invisible" aria-hidden="true">
                {renderDialogueParagraphs(WELCOME_TEXT.replace(/_([^_]+)_/g, '$1'), 'reserve')}
              </div>

              {/* Visible typewriter text — absolutely positioned over the hidden text */}
              <div className="text-sm leading-relaxed text-foreground lb-font absolute top-0 left-0 right-0 pt-[calc(1.25rem+0.25rem)]" aria-hidden="true">
                {renderDialogueParagraphs(displayed, 'visible')}
                {isComplete && <BouncingDots />}
              </div>
            </div>
          </div>

          {/* CTA section — always visible from the start (D-09) */}
          <div className="flex flex-col items-center gap-3">
            {/* Primary CTA — big purple button to start with guidance (D-10) */}
            <Button
              size="lg"
              onClick={onStartWithGuidance}
              className="min-w-[240px] h-12 px-8 text-base font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Start (with Guidance)
            </Button>

            {/* Skip link — casual text link to skip guidance (D-11) */}
            <button
              type="button"
              onClick={onSkipGuidance}
              className="text-sm text-muted-foreground hover:text-foreground underline transition-colors max-w-sm text-center"
            >
              I know what I&apos;m doing, just let me use the calculator without Bits&apos; guidance
            </button>
          </div>
        </div>
      </main>

      {/* Footer — credits Ryan Lucht and frontier AI models (D-13) */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>
          Created by{' '}
          <a
            href="https://ryanlucht.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            Ryan Lucht
          </a>
          {' '}with the assistance of frontier Claude Opus, GPT-Pro, Codex, and Gemini Pro models.
        </p>
      </footer>
    </div>
  );
}
