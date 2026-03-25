/**
 * LearningBitsBubble
 *
 * Collapsed avatar button shown when the user dismisses the Learning Bits
 * dialogue overlay. Clicking reopens the overlay and sets guideEnabled=true.
 *
 * Per UI-SPEC Interaction Contract (Collapsed state D-07):
 * - Same fixed bottom-8 right-8 z-50 position as overlay
 * - 64px circle button with purple bg/border, mascot image
 * - aria-label="Open Learning Bits guidance"
 */

interface LearningBitsBubbleProps {
  onOpen: () => void;
}

export function LearningBitsBubble({ onOpen }: LearningBitsBubbleProps) {
  return (
    <button
      type="button"
      aria-label="Open Learning Bits guidance"
      className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full border-2 border-primary bg-primary overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      onClick={onOpen}
    >
      <img
        src="/learning-bits.png"
        alt=""
        aria-hidden="true"
        className="w-full h-full object-cover"
      />
    </button>
  );
}
