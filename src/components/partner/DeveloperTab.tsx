import { useState, useEffect, useCallback } from 'react'
import {
  Key, Copy, CheckCircle2, Loader2, Trash2,
  Webhook, Send, AlertCircle, Activity, ChevronDown, ChevronRight,
  Zap,
} from 'lucide-react'

interface ApiKey {
  id: string; name: string; key_prefix: string; scopes: string[]
  rate_limit: number; last_used_at: string | null; expires_at: string | null
  revoked: boolean; created_at: string
}

interface WebhookEntry {
  id: string; url: string; events: string[]; active: boolean
  failure_count: number; last_triggered_at: string | null; last_status: number | null
  created_at: string
}

interface UsageSummary {
  total_requests: number; success_count: number; error_count: number
  avg_duration_ms: number; active_keys: number
}

interface DailyUsage { date: string; requests: number; errors: number }

export default function DeveloperTab({ orgToken, primaryColor }: { orgToken: string; primaryColor: string }) {
  const [tab, setTab] = useState<'keys' | 'webhooks' | 'usage' | 'docs'>('keys')
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([])
  const [usage, setUsage] = useState<{ summary: UsageSummary | null; daily: DailyUsage[] }>({ summary: null, daily: [] })
  const [loading, setLoading] = useState(false)
  const createdKey = useState('')[0]
  const [copied, setCopied] = useState(false)
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([])
  const [webhookSecret, setWebhookSecret] = useState('')
  const [testResult, setTestResult] = useState<{ id: string; success?: boolean; error?: string } | null>(null)
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null)

  const headers = { 'Content-Type': 'application/json', 'X-Org-Token': orgToken }

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/api-keys', { headers: { Authorization: `Bearer ${orgToken}`, ...headers } })
      if (res.ok) { const data = await res.json(); setKeys(data.keys || []) }
    } catch { /* silent */ }
  }, [orgToken])

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/webhooks', { headers: { Authorization: `Bearer ${orgToken}` } })
      if (res.ok) { const data = await res.json(); setWebhooks(data.webhooks || []) }
    } catch { /* silent */ }
  }, [orgToken])

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/usage?days=30', { headers: { Authorization: `Bearer ${orgToken}` } })
      if (res.ok) { const data = await res.json(); setUsage({ summary: data.summary, daily: data.daily || [] }) }
    } catch { /* silent */ }
  }, [orgToken])

  useEffect(() => { fetchKeys(); fetchWebhooks(); fetchUsage() }, [fetchKeys, fetchWebhooks, fetchUsage])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const testWebhook = async (id: string) => {
    setTestResult({ id })
    try {
      const res = await fetch(`/api/v1/webhooks?id=${id}&action=test`, {
        method: 'POST', headers: { Authorization: `Bearer ${orgToken}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      setTestResult({ id, success: data.success, error: data.error })
    } catch {
      setTestResult({ id, success: false, error: 'Network error' })
    }
    setTimeout(() => setTestResult(null), 5000)
  }

  const deleteWebhook = async (id: string) => {
    await fetch(`/api/v1/webhooks?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${orgToken}` } })
    fetchWebhooks()
  }

  const createWebhook = async () => {
    if (!newWebhookUrl || !newWebhookEvents.length) return
    setLoading(true)
    try {
      const res = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${orgToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newWebhookUrl, events: newWebhookEvents }),
      })
      const data = await res.json()
      if (data.webhook?.secret) { setWebhookSecret(data.webhook.secret) }
      setNewWebhookUrl(''); setNewWebhookEvents([])
      fetchWebhooks()
    } catch { /* silent */ }
    setLoading(false)
  }

  const EVENTS = ['lead.created', 'lead.updated', 'unit.updated', 'facility.updated', 'special.created', 'special.updated']

  const subtabs = [
    { id: 'keys' as const, label: 'API Keys', icon: Key },
    { id: 'webhooks' as const, label: 'Webhooks', icon: Webhook },
    { id: 'usage' as const, label: 'Usage', icon: Activity },
    { id: 'docs' as const, label: 'Docs', icon: Zap },
  ]

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {subtabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          ><Icon size={14} />{label}</button>
        ))}
      </div>

      {/* ── API Keys Tab ── */}
      {tab === 'keys' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">API keys are managed by StowStack administrators.</p>
            <p className="mt-1 text-amber-600">Contact support to create, modify, or revoke API keys for your organization.</p>
          </div>

          {createdKey && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 mb-2">New API Key Created — copy it now, it won't be shown again:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-green-300 rounded px-3 py-2 text-sm font-mono break-all">{createdKey}</code>
                <button onClick={() => copyToClipboard(createdKey)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg">
                  {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {keys.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No API keys yet</p>
            ) : keys.map(k => (
              <div key={k.id} className={`border rounded-lg p-4 ${k.revoked ? 'bg-red-50 border-red-200 opacity-60' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{k.name}</span>
                      <code className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{k.key_prefix}...</code>
                      {k.revoked && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Revoked</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{k.scopes.length} scopes</span>
                      <span>{k.rate_limit} req/min</span>
                      {k.last_used_at && <span>Last used {new Date(k.last_used_at).toLocaleDateString()}</span>}
                      <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {k.scopes.map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Webhooks Tab ── */}
      {tab === 'webhooks' && (
        <div className="space-y-4">
          {webhookSecret && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 mb-2">Webhook signing secret — copy it now:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-green-300 rounded px-3 py-2 text-xs font-mono break-all">{webhookSecret}</code>
                <button onClick={() => copyToClipboard(webhookSecret)} className="p-2 text-green-600 hover:bg-green-100 rounded-lg">
                  {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p className="text-xs text-green-600 mt-2">Use this to verify webhook signatures via HMAC-SHA256. Payloads are signed with X-StowStack-Signature header.</p>
            </div>
          )}

          {/* Create webhook form */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold">Register Webhook</h3>
            <input type="url" placeholder="https://your-system.com/webhooks/stowstack" value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Events</p>
              <div className="flex flex-wrap gap-1.5">
                {EVENTS.map(evt => (
                  <button key={evt} onClick={() => setNewWebhookEvents(prev => prev.includes(evt) ? prev.filter(e => e !== evt) : [...prev, evt])}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      newWebhookEvents.includes(evt) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >{evt}</button>
                ))}
              </div>
            </div>
            <button onClick={createWebhook} disabled={loading || !newWebhookUrl || !newWebhookEvents.length}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
              style={{ backgroundColor: primaryColor }}
            >{loading ? 'Creating...' : 'Register Webhook'}</button>
          </div>

          {/* Webhook list */}
          <div className="space-y-2">
            {webhooks.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No webhooks registered</p>
            ) : webhooks.map(wh => (
              <div key={wh.id} className={`border rounded-lg ${wh.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <button onClick={() => setExpandedWebhook(expandedWebhook === wh.id ? null : wh.id)} className="text-slate-400">
                        {expandedWebhook === wh.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${wh.active ? (wh.failure_count > 5 ? 'bg-amber-500' : 'bg-green-500') : 'bg-slate-300'}`} />
                      <code className="text-sm font-mono truncate">{wh.url}</code>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      <button onClick={() => testWebhook(wh.id)} title="Send test ping"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        {testResult?.id === wh.id && !testResult.success && testResult.success !== undefined ? <AlertCircle size={14} className="text-red-500" /> :
                         testResult?.id === wh.id && testResult.success ? <CheckCircle2 size={14} className="text-green-500" /> :
                         testResult?.id === wh.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                      <button onClick={() => deleteWebhook(wh.id)} title="Delete webhook"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 ml-6 text-xs text-slate-400">
                    <span>{wh.events.length} events</span>
                    {wh.failure_count > 0 && <span className="text-amber-600">{wh.failure_count} failures</span>}
                    {wh.last_triggered_at && <span>Last fired {new Date(wh.last_triggered_at).toLocaleDateString()}</span>}
                    {wh.last_status && <span>HTTP {wh.last_status}</span>}
                  </div>
                </div>
                {expandedWebhook === wh.id && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
                    <p className="text-xs font-medium text-slate-500 mb-1.5">Subscribed Events</p>
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map(e => <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-mono">{e}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Usage Tab ── */}
      {tab === 'usage' && (
        <div className="space-y-4">
          {usage.summary ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Requests', value: usage.summary.total_requests.toLocaleString() },
                  { label: 'Success Rate', value: usage.summary.total_requests ? `${((usage.summary.success_count / usage.summary.total_requests) * 100).toFixed(1)}%` : '—' },
                  { label: 'Avg Latency', value: `${usage.summary.avg_duration_ms}ms` },
                  { label: 'Active Keys', value: String(usage.summary.active_keys) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
                    <p className="text-xl font-bold mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {usage.daily.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3">Daily Requests (30 days)</h3>
                  <div className="space-y-1">
                    {usage.daily.slice(0, 14).map(d => {
                      const max = Math.max(...usage.daily.map(x => x.requests), 1)
                      return (
                        <div key={d.date} className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-slate-400 flex-shrink-0">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full flex items-center" style={{ width: `${(d.requests / max) * 100}%`, backgroundColor: primaryColor }}>
                              {d.errors > 0 && <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${(d.errors / d.requests) * 100}%` }} />}
                            </div>
                          </div>
                          <span className="w-12 text-right text-slate-500 tabular-nums">{d.requests}</span>
                          {d.errors > 0 && <span className="w-10 text-right text-red-500 tabular-nums">{d.errors} err</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 py-8 text-center">No usage data yet. Start making API calls to see analytics here.</p>
          )}
        </div>
      )}

      {/* ── Docs Tab ── */}
      {tab === 'docs' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-base font-bold mb-3">API Reference</h3>
            <p className="text-sm text-slate-600 mb-4">
              The StowStack API v1 lets PMS vendors and other tools integrate programmatically.
              All endpoints require a Bearer token (API key) passed in the Authorization header.
            </p>

            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <p className="text-xs text-slate-400 mb-1">Authentication</p>
              <code className="text-sm text-green-400 font-mono">Authorization: Bearer sk_live_your_key_here</code>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">Endpoints</h4>
              {[
                { method: 'GET', path: '/api/v1/facilities', desc: 'List your facilities', scope: 'facilities:read' },
                { method: 'POST', path: '/api/v1/facilities', desc: 'Create a facility', scope: 'facilities:write' },
                { method: 'PATCH', path: '/api/v1/facilities?id=', desc: 'Update a facility', scope: 'facilities:write' },
                { method: 'GET', path: '/api/v1/facility-units?facilityId=', desc: 'List unit types', scope: 'units:read' },
                { method: 'POST', path: '/api/v1/facility-units?facilityId=', desc: 'Upsert units (bulk)', scope: 'units:write' },
                { method: 'GET', path: '/api/v1/facility-availability?facilityId=', desc: 'Available units + specials', scope: 'units:read' },
                { method: 'GET', path: '/api/v1/facility-specials?facilityId=', desc: 'List promotions', scope: 'units:read' },
                { method: 'POST', path: '/api/v1/facility-specials?facilityId=', desc: 'Create/update specials', scope: 'units:write' },
                { method: 'GET', path: '/api/v1/facility-snapshots?facilityId=', desc: 'Occupancy snapshots', scope: 'facilities:read' },
                { method: 'POST', path: '/api/v1/facility-snapshots?facilityId=', desc: 'Push daily snapshot', scope: 'facilities:write' },
                { method: 'GET', path: '/api/v1/leads', desc: 'List leads', scope: 'leads:read' },
                { method: 'POST', path: '/api/v1/leads', desc: 'Create a lead', scope: 'leads:write' },
                { method: 'PATCH', path: '/api/v1/leads?id=', desc: 'Update lead status', scope: 'leads:write' },
                { method: 'GET', path: '/api/v1/tenants?facilityId=', desc: 'List tenants', scope: 'tenants:read' },
                { method: 'POST', path: '/api/v1/tenants', desc: 'Bulk import tenants', scope: 'tenants:write' },
                { method: 'PATCH', path: '/api/v1/tenants?id=', desc: 'Update tenant', scope: 'tenants:write' },
                { method: 'GET', path: '/api/v1/landing-pages?facilityId=', desc: 'List landing pages', scope: 'pages:read' },
                { method: 'GET', path: '/api/v1/call-logs?facilityId=', desc: 'Call logs + stats', scope: 'calls:read' },
                { method: 'GET', path: '/api/v1/webhooks', desc: 'List webhooks', scope: 'webhooks:manage' },
                { method: 'POST', path: '/api/v1/webhooks', desc: 'Register webhook', scope: 'webhooks:manage' },
                { method: 'GET', path: '/api/v1/usage', desc: 'API usage analytics', scope: '(any key)' },
              ].map(({ method, path, desc, scope }) => (
                <div key={method + path} className="flex items-start gap-2 text-sm border-b border-slate-100 pb-2">
                  <span className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0 mt-0.5 ${
                    method === 'GET' ? 'bg-blue-100 text-blue-700' :
                    method === 'POST' ? 'bg-green-100 text-green-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{method}</span>
                  <code className="text-xs text-slate-600 font-mono flex-1">{path}</code>
                  <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:inline">{desc}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono flex-shrink-0">{scope}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">Webhook Events</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EVENTS.map(evt => (
                  <div key={evt} className="bg-slate-50 border border-slate-200 rounded px-3 py-2">
                    <code className="text-xs font-mono text-indigo-600">{evt}</code>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Webhook payloads are signed with HMAC-SHA256. Verify the <code className="text-slate-500">X-StowStack-Signature</code> header
                against the signing secret provided when you registered the webhook.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Full OpenAPI 3.1 spec available at <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">/api/openapi.json</code>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
