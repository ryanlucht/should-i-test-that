/**
 * App Component
 *
 * Root component handling page routing between Welcome and Calculator pages.
 * Uses simple state-based routing (no react-router needed for 2 pages).
 */

import { useState } from 'react';
import { WelcomePage } from '@/pages/WelcomePage';
import { CalculatorPage } from '@/pages/CalculatorPage';

/**
 * Page identifiers for routing
 */
type Page = 'welcome' | 'calculator';

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
