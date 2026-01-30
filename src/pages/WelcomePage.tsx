/**
 * Welcome Page
 *
 * Entry point for the calculator. Users select between Basic and Advanced
 * modes before proceeding to the calculator.
 *
 * Design reference: .planning/phases/01-foundation-wizard-infrastructure/designs/welcome-screen.md
 */

import { Button } from '@/components/ui/button';
import { ModeSelection } from '@/components/welcome/ModeCard';
import { useWizardStore } from '@/stores/wizardStore';

interface WelcomePageProps {
  /** Callback when user clicks "Get Started" */
  onGetStarted: () => void;
}

/**
 * Welcome Page Component
 *
 * Displays the hero section with title/description and mode selection cards.
 * Users must select a mode (Basic or Advanced) before proceeding.
 */
export function WelcomePage({ onGetStarted }: WelcomePageProps) {
  const { mode, setMode } = useWizardStore();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content - centered vertically and horizontally */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-8 lg:px-16">
        <div className="w-full max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Should I Test That?
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Find out if your A/B test is worth running. Get a clear answer:
              &ldquo;If you can test this for less than $X, it&apos;s worth
              it.&rdquo;
            </p>
          </div>

          {/* Mode Selection */}
          <div className="mb-12">
            <ModeSelection selectedMode={mode} onModeSelect={setMode} />
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="min-w-[200px] h-12 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
            >
              Get Started
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>
          Based on decision theory from{' '}
          <span className="font-medium">&ldquo;How to Measure Anything&rdquo;</span>{' '}
          by Douglas Hubbard
        </p>
      </footer>
    </div>
  );
}
