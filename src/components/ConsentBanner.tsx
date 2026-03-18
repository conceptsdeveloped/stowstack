import { useState, useEffect } from 'react'
import { getConsentStatus, setConsent, type ConsentStatus } from '../utils/consent'

/**
 * Cookie consent banner for GDPR/CCPA compliance.
 * Shows a bottom-of-screen banner until the user accepts or declines tracking.
 * Persists the decision in localStorage for 1 year.
 */
export default function ConsentBanner() {
  const [status, setStatus] = useState<ConsentStatus>('granted') // default to hide on SSR/initial

  useEffect(() => {
    setStatus(getConsentStatus())
  }, [])

  if (status !== 'pending') return null

  const accept = () => {
    setConsent('granted')
    setStatus('granted')
  }

  const decline = () => {
    setConsent('denied')
    setStatus('denied')
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-4 shadow-lg sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm text-slate-600">
          We use cookies and tracking pixels (Meta, Google) to measure ad performance and improve your experience.
          You can change your preference anytime.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={decline}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
