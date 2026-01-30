/**
 * App Component
 *
 * Root component handling page routing between Welcome and Calculator pages.
 * Uses simple state-based routing (no react-router needed for 2 pages).
 */

import { useState } from 'react';
import { WelcomePage } from '@/pages/WelcomePage';

/**
 * Page identifiers for routing
 */
type Page = 'welcome' | 'calculator';

/**
 * Placeholder Calculator Page
 * Will be implemented in plan 01-04
 */
function CalculatorPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Calculator</h1>
        <p className="text-muted-foreground mb-4">
          Calculator page placeholder. Wizard sections will be implemented in
          plan 01-04.
        </p>
        <button
          onClick={onBack}
          className="text-primary hover:underline"
        >
          Back to Welcome
        </button>
      </div>
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('welcome');

  return (
    <>
      {currentPage === 'welcome' && (
        <WelcomePage onGetStarted={() => setCurrentPage('calculator')} />
      )}
      {currentPage === 'calculator' && (
        <CalculatorPage onBack={() => setCurrentPage('welcome')} />
      )}
    </>
  );
}

export default App;
