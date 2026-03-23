/**
 * Welcome Page
 *
 * Entry point for the calculator. Users proceed directly to
 * the EVSI calculator via the Get Started button.
 *
 * Design reference: .planning/phases/01-foundation-wizard-infrastructure/designs/welcome-screen.md
 */

import { Button } from '@/components/ui/button';

interface WelcomePageProps {
  /** Callback when user clicks "Get Started" */
  onGetStarted: () => void;
}

/**
 * Welcome Page Component
 *
 * Displays the hero section with title/description and a CTA button.
 * No mode selection -- single EVSI-based calculator experience.
 */
export function WelcomePage({ onGetStarted }: WelcomePageProps) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Main content - centered vertically and horizontally */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 md:px-12 lg:px-16">
        <div className="w-full max-w-5xl">
          {/* Hero Section - Design spec: headline 48px desktop, 36px tablet, 28px mobile */}
          <div className="text-center mb-12">
            <h1 className="text-[28px] sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight leading-tight">
              Should I Test That?
            </h1>
            {/* Subheadline can be paragraph-length per design spec */}
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Find out if your A/B test is worth running. Get a clear answer:
              &ldquo;If you can test this for less than $X, it&apos;s worth
              it.&rdquo;
            </p>
          </div>

          {/* CTA Button - Design spec: min-width 200px, height 48px, purple bg */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="min-w-[200px] h-12 px-8 text-base font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Get Started
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
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
          {' '}and 100% vibe-coded by Claude Opus 4.5, GPT-5.2 Pro, GPT-Codex-5.2, and Gemini 3 Pro.
        </p>
      </footer>
    </div>
  );
}
