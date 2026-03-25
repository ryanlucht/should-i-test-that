/**
 * LearningBitsAvatar
 *
 * 64px circular avatar displaying the Learning Bits mascot image.
 * Used inside LearningBitsOverlay (expanded dialogue state).
 *
 * Per UI-SPEC: w-16 h-16 rounded-full border-2 border-primary bg-primary overflow-hidden
 */

interface LearningBitsAvatarProps {
  className?: string;
}

export function LearningBitsAvatar({ className }: LearningBitsAvatarProps) {
  return (
    <div
      className={`flex-shrink-0 w-16 h-16 rounded-full border-2 border-primary overflow-hidden bg-primary shadow-sm${className ? ` ${className}` : ''}`}
    >
      <img
        src="/learning-bits.png"
        alt=""
        aria-hidden="true"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
