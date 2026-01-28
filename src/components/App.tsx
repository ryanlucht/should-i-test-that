import { useState } from 'react';
import { LandingPage } from './LandingPage';
import { ABTestCalculator } from './ABTestCalculator';

type Screen = 'landing' | 'calculator';

/**
 * Main App Shell
 *
 * Simple 2-screen navigation:
 * - Landing page: Introduction to the concept
 * - Calculator: Full-featured calculator with helpful guidance
 */
export function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');

  const handleStart = () => {
    setCurrentScreen('calculator');
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1
            className="text-xl font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={handleBackToLanding}
          >
            Should I Run an A/B Test?
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {currentScreen === 'landing' ? (
          <LandingPage onStart={handleStart} />
        ) : (
          <ABTestCalculator onBack={handleBackToLanding} />
        )}
      </main>
    </div>
  );
}
