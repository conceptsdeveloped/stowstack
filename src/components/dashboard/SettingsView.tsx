import { useState, useEffect } from 'react'
import { Building2, Bell, Settings, Sun, Moon, Loader2, Phone } from 'lucide-react'

export default function SettingsView({ adminKey, darkMode, onToggleDarkMode }: {
  adminKey: string; darkMode: boolean; onToggleDarkMode: () => void
}) {
  const [settings, setSettings] = useState({
    companyName: 'StowStack',
    companyEmail: 'anna@storepawpaw.com',
    companyPhone: '',
    notifyNewLeads: true,
    notifyOverdue: true,
    notifyMessages: true,
    notifyAlerts: true,
    emailSignature: '',
    defaultFollowUpDays: 3,
    twilioAccountSid: '',
    twilioAuthToken: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch('/api/admin-settings', { headers: { 'X-Admin-Key': adminKey } })
        if (res.ok) {
          const data = await res.json()
          setSettings(prev => ({ ...prev, ...data.settings }))
        }
      } catch { /* silent */ }
      setLoading(false)
    }
    fetch_()
  }, [adminKey])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(settings),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } catch { /* silent */ }
    setSaving(false)
  }

  const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputClass = darkMode
    ? 'bg-slate-700 border-slate-600 text-slate-200 focus:ring-emerald-500/30'
    : 'bg-white border-slate-200 text-slate-900 focus:ring-emerald-500/20'
  const labelClass = `text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Company Info */}
      <div className={`rounded-xl border p-5 ${cardClass}`}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Building2 size={16} /> Company Information</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Company Name</label>
            <input type="text" value={settings.companyName} onChange={e => setSettings({ ...settings, companyName: e.target.value })}
              className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${inputClass}`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={settings.companyEmail} onChange={e => setSettings({ ...settings, companyEmail: e.target.value })}
                className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${inputClass}`} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="text" value={settings.companyPhone} onChange={e => setSettings({ ...settings, companyPhone: e.target.value })}
                className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${inputClass}`} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email Signature</label>
            <textarea value={settings.emailSignature} onChange={e => setSettings({ ...settings, emailSignature: e.target.value })}
              rows={3} placeholder="Custom email signature..."
              className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 resize-none ${inputClass}`} />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className={`rounded-xl border p-5 ${cardClass}`}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Bell size={16} /> Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { key: 'notifyNewLeads', label: 'New lead submissions', desc: 'Get notified when a new lead comes in' },
            { key: 'notifyOverdue', label: 'Overdue follow-ups', desc: 'Alert when a follow-up date has passed' },
            { key: 'notifyMessages', label: 'Client messages', desc: 'Notify on new client messages' },
            { key: 'notifyAlerts', label: 'Campaign alerts', desc: 'CPL spikes, ROAS drops, lead droughts' },
          ].map(item => (
            <label key={item.key} className="flex items-center justify-between cursor-pointer">
              <div>
                <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{item.label}</p>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.desc}</p>
              </div>
              <div className="relative">
                <input type="checkbox" checked={(settings as any)[item.key]}
                  onChange={e => setSettings({ ...settings, [item.key]: e.target.checked })}
                  className="sr-only peer" />
                <div className={`w-9 h-5 rounded-full transition-colors peer-checked:bg-emerald-500 ${darkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Defaults */}
      <div className={`rounded-xl border p-5 ${cardClass}`}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Settings size={16} /> Defaults</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Default follow-up (days after submission)</label>
            <input type="number" min="1" max="30" value={settings.defaultFollowUpDays}
              onChange={e => setSettings({ ...settings, defaultFollowUpDays: Number(e.target.value) })}
              className={`w-24 mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${inputClass}`} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Dark Mode</p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Toggle dark theme for the admin dashboard</p>
            </div>
            <button onClick={onToggleDarkMode}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                darkMode ? 'border-amber-600 text-amber-400 hover:bg-amber-900/20' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}>
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Call Tracking (Twilio) */}
      <div className={`rounded-xl border p-5 ${cardClass}`}>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Phone size={16} /> Call Tracking (Twilio)</h3>
        <p className={`text-xs mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Connect your Twilio account to provision tracking phone numbers and attribute inbound calls to campaigns.
        </p>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Account SID</label>
            <input type="text" value={settings.twilioAccountSid}
              onChange={e => setSettings({ ...settings, twilioAccountSid: e.target.value })}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 font-mono ${inputClass}`} />
          </div>
          <div>
            <label className={labelClass}>Auth Token</label>
            <input type="password" value={settings.twilioAuthToken}
              onChange={e => setSettings({ ...settings, twilioAuthToken: e.target.value })}
              placeholder="Your Twilio auth token"
              className={`w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 font-mono ${inputClass}`} />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={saveSettings} disabled={saving}
          className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
        {saved && <span className="text-xs text-emerald-600 font-medium">Settings saved successfully</span>}
      </div>
    </div>
  )
}
