/**
 * BubblyPillLogo
 *
 * "Bubbly Pill" Frutiger Aero logo: "Should I [Test] That?"
 * "Test" sits inside a glossy purple pill with glass effect.
 *
 * Per D-01: CSS/HTML (not a static image)
 * Per D-02: Noto Sans extrabold, purple gradient pill with specular highlight
 * Per D-03: Only the pill itself uses Frutiger Aero; rest is DRUIDS
 *
 * Reference: /tmp/LogoMockup/code.html, /tmp/LogoMockup/screen.png
 */

export function BubblyPillLogo() {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 logo-font">
      {/* "Should I" — Noto Sans extrabold, purple text with glow */}
      <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-glow text-primary">
        Should I
      </span>

      {/* The Bubbly Pill — "Test" inside glossy purple capsule */}
      <div className="pill-shadow">
        <div className="frutiger-glass px-6 sm:px-8 py-2 sm:py-3 rounded-full">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
            Test
          </span>
        </div>
      </div>

      {/* "That?" — Noto Sans extrabold, purple text with glow */}
      <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-glow text-primary">
        That?
      </span>
    </div>
  );
}
