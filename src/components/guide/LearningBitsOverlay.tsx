/**
 * LearningBitsOverlay
 *
 * Expanded RPG-style dialogue card fixed to bottom-right of the viewport.
 * Displays the Learning Bits mascot avatar, character name, and typewriter-
 * animated dialogue text.
 *
 * Per UI-SPEC Interaction Contract:
 * - fixed bottom-8 right-8 z-50 max-w-md
 * - rpg-dialog-box class: 3px solid #7C3AED border + 6px offset shadow
 * - lb-font class: Space Grotesk for dialogue typography (D-03)
 * - aria-live="polite" on text container for screen reader announcements
 * - sr-only span with full message for screen readers
 * - Close button with aria-label="Close Learning Bits guidance"
 */

import { X } from 'lucide-react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { LearningBitsAvatar } from './LearningBitsAvatar';
import { BouncingDots } from './BouncingDots';

interface LearningBitsOverlayProps {
  messageText: string;
  onClose: () => void;
}

/**
 * Renders dialogue text with _word_ patterns converted to <em> elements.
 *
 * IMPORTANT: Receives the `displayed` slice from useTypewriter (already sliced),
 * not the full message string. This prevents typewriter reset on parent re-renders
 * (Pitfall 4 from RESEARCH.md).
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

export function LearningBitsOverlay({ messageText, onClose }: LearningBitsOverlayProps) {
  const { displayed, isComplete } = useTypewriter(messageText);

  return (
    <div className="fixed bottom-8 right-8 z-50 max-w-md bg-white p-5 rounded-lg rpg-dialog-box flex items-start gap-4">
      {/* Close button — absolute positioned in top-right */}
      <button
        type="button"
        aria-label="Close Learning Bits guidance"
        className="absolute top-2 right-2 text-primary hover:text-[#6D28D9] transition-colors p-1"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </button>

      {/* Avatar */}
      <LearningBitsAvatar />

      {/* Dialogue text area */}
      <div className="flex-1 pt-1" aria-live="polite">
        {/* Character name — Space Grotesk bold per D-03 */}
        <span className="font-bold text-primary block mb-1 text-sm lb-font">
          Learning Bits
        </span>

        {/* Screen reader: full message text (always present) */}
        <span className="sr-only">{messageText}</span>

        {/* Visual typewriter text — Space Grotesk regular per D-03 */}
        <p className="text-sm leading-relaxed text-foreground lb-font" aria-hidden="true">
          {renderDialogueText(displayed)}
          {isComplete && <BouncingDots />}
        </p>
      </div>
    </div>
  );
}
