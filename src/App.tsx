/**
 * App Component
 *
 * Root component handling page routing between Welcome and Calculator pages.
 * Uses simple state-based routing (no react-router needed for 2 pages).
 *
 * Routing decisions (D-10, D-11, D-12):
 *   - onStartWithGuidance: sets guideEnabled=true, navigates to calculator
 *   - onSkipGuidance: sets guideEnabled=false, navigates to calculator
 */

import { useState } from 'react';
import { WelcomePage } from '@/pages/WelcomePage';
import { CalculatorPage } from '@/pages/CalculatorPage';
import { useWizardStore } from '@/stores/wizardStore';

/**
 * Page identifiers for routing
 */
type Page = 'welcome' | 'calculator';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('welcome');
  const setGuideEnabled = useWizardStore((state) => state.setGuideEnabled);

  return (
    <>
      {currentPage === 'welcome' && (
        <WelcomePage
          onStartWithGuidance={() => {
            setGuideEnabled(true);
            setCurrentPage('calculator');
          }}
          onSkipGuidance={() => {
            setGuideEnabled(false);
            setCurrentPage('calculator');
          }}
        />
      )}
      {currentPage === 'calculator' && (
        <CalculatorPage onBack={() => setCurrentPage('welcome')} />
      )}
    </>
  );
}

export default App;
