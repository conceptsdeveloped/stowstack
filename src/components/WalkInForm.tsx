import { useState } from 'react'
import { Check, ClipboardList } from 'lucide-react'

const SOURCES = [
  { value: 'facebook_instagram_ad', label: 'Facebook / Instagram ad' },
  { value: 'google_search', label: 'Google search' },
  { value: 'drove_by_signage', label: 'Drove by / signage' },
  { value: 'friend_family_referral', label: 'Friend / family referral' },
  { value: 'repeat_customer', label: 'Repeat customer' },
  { value: 'other', label: 'Other' },
]

export default function WalkInForm({ accessCode }: { accessCode: string }) {
  const [source, setSource] = useState('')
  const [sawOnlineAd, setSawOnlineAd] = useState<boolean | null>(null)
  const [tenantName, setTenantName] = useState('')
  const [unitRented, setUnitRented] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!source) {
      setError('Please select how the tenant heard about you.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/walkin-attribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode,
          source,
          sawOnlineAd,
          tenantName: tenantName.trim() || undefined,
          unitRented: unitRented.trim() || undefined,
          loggedBy: 'facility_manager',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setSubmitted(true)
      // Reset for next entry after 2 seconds
      setTimeout(() => {
        setSubmitted(false)
        setSource('')
        setSawOnlineAd(null)
        setTenantName('')
        setUnitRented('')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-100 flex items-center justify-center">
            <ClipboardList size={24} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Walk-In Attribution</h1>
          <p className="text-sm text-slate-500 mt-1">Log how each walk-in tenant heard about you.</p>
        </div>

        {submitted ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Logged.</h2>
            <p className="text-sm text-slate-500">Ready for the next walk-in.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">How did the tenant hear about us? *</label>
              <div className="space-y-2">
                {SOURCES.map(s => (
                  <label key={s.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    source === s.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="source"
                      value={s.value}
                      checked={source === s.value}
                      onChange={() => setSource(s.value)}
                      className="accent-emerald-600"
                    />
                    <span className="text-sm text-slate-700">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">Did they see any online ads before coming in?</label>
              <div className="flex gap-3">
                {[
                  { val: true, label: 'Yes' },
                  { val: false, label: 'No' },
                  { val: null, label: 'Not sure' },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => setSawOnlineAd(opt.val)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      sawOnlineAd === opt.val ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tenant name (optional)</label>
              <input
                type="text"
                value={tenantName}
                onChange={e => setTenantName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-transparent"
                placeholder="For matching to move-in data later"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit rented (optional)</label>
              <input
                type="text"
                value={unitRented}
                onChange={e => setUnitRented(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-transparent"
                placeholder="e.g., 10x10 Climate #204"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Log Walk-In'}
            </button>
          </form>
        )}

        <p className="text-xs text-slate-400 text-center mt-4">
          Powered by <span className="text-emerald-500">StowStack</span> — data feeds into your attribution dashboard.
        </p>
      </div>
    </div>
  )
}
