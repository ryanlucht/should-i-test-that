/**
 * BouncingDots
 *
 * Three-dot animated ellipsis indicator that appears after the typewriter
 * animation completes in the Learning Bits dialogue overlay.
 *
 * Per UI-SPEC D-04: three spans with animate-dot-bounce class; CSS handles
 * staggered delays for nth-child(2) and nth-child(3) via animation-delay.
 *
 * aria-hidden="true" because the parent overlay already has sr-only full text.
 */
export function BouncingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1" aria-hidden="true">
      <span className="animate-dot-bounce text-primary font-bold">&middot;</span>
      <span className="animate-dot-bounce text-primary font-bold">&middot;</span>
      <span className="animate-dot-bounce text-primary font-bold">&middot;</span>
    </span>
  );
}
