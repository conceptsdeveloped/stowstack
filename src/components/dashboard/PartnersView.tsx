import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Users, Loader2, Palette } from 'lucide-react'

interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  accent_color: string
  contact_email: string | null
  plan: string
  white_label: boolean
  facility_limit: number
  status: string
  facility_count: number
  user_count: number
  created_at: string
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-600',
  growth: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

export default function PartnersView({ adminKey, darkMode }: { adminKey: string; darkMode?: boolean }) {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [plan, setPlan] = useState('starter')
  const [whiteLabel, setWhiteLabel] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#16a34a')
  const [accentColor, setAccentColor] = useState('#4f46e5')

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch('/api/organizations', { headers: { 'X-Admin-Key': adminKey } })
      if (res.ok) {
        const data = await res.json()
        setOrgs(data.organizations || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [adminKey])

  useEffect(() => { fetchOrgs() }, [fetchOrgs])

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ name, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''), contactEmail, plan, whiteLabel, primaryColor, accentColor }),
      })
      if (res.ok) {
        setShowCreate(false)
        setName(''); setSlug(''); setContactEmail(''); setPlan('starter'); setWhiteLabel(false)
        setPrimaryColor('#16a34a'); setAccentColor('#4f46e5')
        fetchOrgs()
      }
    } catch { /* silent */ }
    setCreating(false)
  }

  const dm = darkMode

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-bold ${dm ? 'text-white' : ''}`}>Partner Organizations</h2>
          <p className={`text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
            Management companies with white-label access
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} /> New Partner
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createOrg} className={`rounded-xl border p-5 mb-5 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-sm font-semibold mb-3 ${dm ? 'text-white' : ''}`}>Create Partner Organization</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Storage Management"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Slug</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="acme-storage"
                className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Contact Email</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="admin@acme.com"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`} />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Plan</label>
              <select value={plan} onChange={e => setPlan(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`}>
                <option value="starter">Starter (10 facilities)</option>
                <option value="growth">Growth (50 facilities)</option>
                <option value="enterprise">Enterprise (unlimited)</option>
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded border" />
                <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-mono ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`} />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${dm ? 'text-slate-300' : 'text-slate-600'}`}>Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-8 h-8 rounded border" />
                <input value={accentColor} onChange={e => setAccentColor(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-mono ${dm ? 'bg-slate-900 border-slate-600 text-white' : 'border-slate-200'}`} />
              </div>
            </div>
            <div className="flex items-end">
              <label className={`flex items-center gap-2 text-sm cursor-pointer ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                <input type="checkbox" checked={whiteLabel} onChange={e => setWhiteLabel(e.target.checked)} className="rounded" />
                White-label (remove StowStack branding)
              </label>
            </div>
          </div>
          <button type="submit" disabled={creating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Organization'}
          </button>
        </form>
      )}

      {orgs.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
          <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>No partner organizations yet</p>
          <p className={`text-xs mt-1 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Create one to start onboarding management companies</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map(org => (
            <div key={org.id} className={`rounded-xl border p-4 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: org.primary_color }}>
                    {org.logo_url ? (
                      <img src={org.logo_url} alt="" className="h-6 object-contain" />
                    ) : (
                      <Building2 size={18} className="text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>{org.name}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PLAN_COLORS[org.plan] || 'bg-slate-100 text-slate-600'}`}>
                        {org.plan}
                      </span>
                      {org.white_label && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">
                          <Palette size={8} className="inline mr-0.5" /> White-label
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-3 text-xs mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="font-mono">{org.slug}</span>
                      {org.contact_email && <span>{org.contact_email}</span>}
                      <span className="flex items-center gap-1"><Building2 size={10} /> {org.facility_count} facilities</span>
                      <span className="flex items-center gap-1"><Users size={10} /> {org.user_count} users</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ background: org.primary_color }} title="Primary" />
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ background: org.accent_color }} title="Accent" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
