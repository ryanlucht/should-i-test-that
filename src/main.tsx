import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { datadogRum } from '@datadog/browser-rum'
import { getOrCreateAnonymousId } from './lib/analytics'
import './index.css'
import App from './App.tsx'

// Initialize Datadog RUM SDK only in production builds
// Prevents dev/local traffic from being captured as production sessions
if (import.meta.env.PROD) {
  datadogRum.init({
    applicationId: '73ab6ec1-9c95-4732-a13a-fde33e8e4915',
    clientToken: 'pubba9c852dc22a1fa80089cd99e3029464',
    site: 'datadoghq.com',
    service: 'should-i-test-that',
    env: 'production',
    version: '1.2.0',
    // Track 100% of user sessions for full visibility
    sessionSampleRate: 100,
    // Record session replay for 20% of sessions (balances insight vs cost)
    sessionReplaySampleRate: 20,
    // Enable interaction tracking for click/input analytics
    trackUserInteractions: true,
    // Track resource loading (API calls, scripts, etc.)
    trackResources: true,
    // Track long tasks (>50ms) that may cause UI jank
    trackLongTasks: true,
    // Mask user input in replays for privacy (e.g., form fields)
    defaultPrivacyLevel: 'mask-user-input',
  })

  // Set anonymous user ID for Datadog PA Users view (DD-01).
  // Called after init() per Datadog SDK requirements — setUser()
  // requires an active session from init().
  datadogRum.setUser({
    id: getOrCreateAnonymousId(),
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
