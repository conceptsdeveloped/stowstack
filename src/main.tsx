import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initPlugins } from './plugins'
import './index.css'
import App from './App.tsx'

// Initialize all opt-in plugins (PostHog, Umami, Chatwoot, Cal.com, Formbricks, Novu, Langfuse)
initPlugins()

// Global handler for unhandled promise rejections (catches async errors that ErrorBoundary misses)
window.addEventListener('unhandledrejection', (event) => {
  console.error('[StowStack] Unhandled promise rejection:', event.reason)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
)
