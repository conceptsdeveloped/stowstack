import { useState, useEffect } from 'react'
import {
  Loader2, FileText, Trash2, Sparkles, ChevronDown, ChevronUp,
  Target, DollarSign, TrendingUp, Calendar, Zap, Plus, Mail, Phone
} from 'lucide-react'
import { Facility } from './types'

/* ── Types ── */

interface ContextDoc {
  id: string
  facility_id: string
  created_at: string
  type: string
  title: string
  content: string | null
  file_url: string | null
  metadata: Record<string, unknown>
}

interface MarketingPlan {
  id: string
  facility_id: string
  created_at: string
  version: number
  status: string
  plan_json: {
    summary?: string
    bottleneck_analysis?: string
    target_audiences?: { segment: string; description: string; messaging_angle: string; channels: string[] }[]
    messaging_pillars?: { pillar: string; rationale: string; example_headline: string }[]
    channel_strategy?: { channel: string; budget_pct: number; objective: string; tactics: string[] }[]
    content_calendar?: { week: number; focus: string; deliverables: string[]; channels: string[] }[]
    kpis?: { metric: string; target: string; timeframe: string }[]
    quick_wins?: string[]
  }
  spend_recommendation: {
    budgetTier: string
    monthlyBudget: { min: number; max: number }
    channels: Record<string, number>
    reasoning: string[]
  } | null
  assigned_playbooks: string[]
}

const CONTEXT_TYPES = [
  { id: 'competitor_info', label: 'Competitor Info' },
  { id: 'business_plan', label: 'Business Plan' },
  { id: 'pricing_sheet', label: 'Pricing / Rate Card' },
  { id: 'market_research', label: 'Market Research' },
  { id: 'branding', label: 'Branding Guidelines' },
  { id: 'other', label: 'Other' },
]

const PLAYBOOK_OPTIONS = [
  { id: 'spring-cleaning', label: 'Spring Cleaning & Declutter' },
  { id: 'summer-moves', label: 'Summer Moving Season' },
  { id: 'college-move', label: 'College Move-In/Out' },
  { id: 'holiday-storage', label: 'Holiday Decoration Storage' },
  { id: 'new-year', label: 'New Year Declutter' },
  { id: 'fall-transition', label: 'Fall Transition' },
  { id: 'home-reno', label: 'Home Renovation' },
  { id: 'divorce', label: 'Divorce / Separation' },
  { id: 'military', label: 'Military Deployment / PCS' },
  { id: 'estate', label: 'Estate / Downsizing' },
  { id: 'tax-season', label: 'Tax Season (Business Storage)' },
  { id: 'back-to-school', label: 'Back to School' },
]

const BUDGET_TIER_COLORS: Record<string, string> = {
  aggressive: 'bg-red-100 text-red-700',
  growth: 'bg-amber-100 text-amber-700',
  steady: 'bg-emerald-100 text-emerald-700',
  optimize: 'bg-blue-100 text-blue-700',
  maintain: 'bg-slate-100 text-slate-600',
}

export default function OverviewTab({ facility, adminKey, darkMode }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
}) {
  const [contextDocs, setContextDocs] = useState<ContextDoc[]>([])
  const [plan, setPlan] = useState<MarketingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [addingDoc, setAddingDoc] = useState(false)
  const [newDocType, setNewDocType] = useState('competitor_info')
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [selectedPlaybooks, setSelectedPlaybooks] = useState<string[]>([])
  const [showPlaybooks, setShowPlaybooks] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>('summary')

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  useEffect(() => {
    Promise.all([
      fetch(`/api/facility-context?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
      fetch(`/api/marketing-plan?facilityId=${facility.id}`, { headers: { 'X-Admin-Key': adminKey } }).then(r => r.json()),
    ]).then(([ctxData, planData]) => {
      if (ctxData.docs) setContextDocs(ctxData.docs)
      if (planData.plan) {
        setPlan(planData.plan)
        if (planData.plan.assigned_playbooks?.length) setSelectedPlaybooks(planData.plan.assigned_playbooks)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [facility.id, adminKey])

  async function addContextDoc() {
    if (!newDocTitle.trim()) return
    try {
      const res = await fetch('/api/facility-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          facilityId: facility.id,
          type: newDocType,
          title: newDocTitle.trim(),
          content: newDocContent.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.doc) setContextDocs(prev => [data.doc, ...prev])
      setNewDocTitle('')
      setNewDocContent('')
      setAddingDoc(false)
    } catch {}
  }

  async function deleteDoc(docId: string) {
    try {
      await fetch('/api/facility-context', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ docId }),
      })
      setContextDocs(prev => prev.filter(d => d.id !== docId))
    } catch {}
  }

  async function generatePlan() {
    setGenerating(true)
    try {
      const res = await fetch('/api/marketing-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ facilityId: facility.id, playbooks: selectedPlaybooks }),
      })
      const data = await res.json()
      if (data.plan) setPlan(data.plan)
      else if (data.error) alert(data.error)
    } catch (err) {
      console.error('Plan generation failed:', err)
    } finally {
      setGenerating(false)
    }
  }

  function togglePlaybook(id: string) {
    setSelectedPlaybooks(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  function Section({ id, title, icon: Icon, children }: { id: string; title: string; icon: typeof Target; children: React.ReactNode }) {
    const isOpen = expandedSection === id
    return (
      <div className={`border rounded-lg overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <button
          onClick={() => setExpandedSection(isOpen ? null : id)}
          className={`w-full flex items-center gap-2 px-4 py-3 text-left ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}
        >
          <Icon size={14} className={sub} />
          <span className={`text-sm font-medium flex-1 ${text}`}>{title}</span>
          {isOpen ? <ChevronUp size={14} className={sub} /> : <ChevronDown size={14} className={sub} />}
        </button>
        {isOpen && <div className={`px-4 pb-4 ${darkMode ? 'border-t border-slate-700' : 'border-t border-slate-100'}`}>{children}</div>}
      </div>
    )
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>

  const p = plan?.plan_json

  return (
    <div className="space-y-6">
      {/* Facility Info (existing) */}
      <div className={`border rounded-xl ${card}`}>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Contact</p>
              <div className="space-y-1">
                <p className={text}>{facility.contact_name}</p>
                <p className={`flex items-center gap-1.5 ${sub}`}><Mail size={13} />{facility.contact_email}</p>
                <p className={`flex items-center gap-1.5 ${sub}`}><Phone size={13} />{facility.contact_phone}</p>
              </div>
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Facility Info</p>
              <div className="space-y-1">
                <p className={text}>Occupancy: {facility.occupancy_range}</p>
                <p className={text}>Units: {facility.total_units}</p>
                <p className={text}>Issue: {facility.biggest_issue}</p>
              </div>
            </div>
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${sub} mb-2`}>Google Data</p>
              {facility.google_address ? (
                <div className="space-y-1">
                  <p className={sub}>{facility.google_address}</p>
                  {facility.google_rating && <p className="text-amber-500 text-sm font-semibold">★ {facility.google_rating} ({facility.review_count} reviews)</p>}
                  <div className="flex gap-2">
                    {facility.website && <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline text-xs">Website ↗</a>}
                    {facility.google_maps_url && <a href={facility.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline text-xs">Maps ↗</a>}
                  </div>
                </div>
              ) : <p className={sub}>Not scraped yet</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Business Context Documents */}
      <div className={`border rounded-xl ${card}`}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <h4 className={`text-sm font-semibold ${text}`}>Business Context</h4>
            <p className={`text-xs ${sub} mt-0.5`}>Upload competitor info, pricing sheets, branding docs — anything that informs the marketing strategy</p>
          </div>
          <button
            onClick={() => setAddingDoc(!addingDoc)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700"
          >
            <Plus size={12} /> Add Context
          </button>
        </div>

        {addingDoc && (
          <div className={`px-5 pb-4 space-y-3 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Type</label>
                <select value={newDocType} onChange={e => setNewDocType(e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}>
                  {CONTEXT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`text-xs ${sub} block mb-1`}>Title</label>
                <input value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} placeholder="e.g., Local competitor analysis" className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`} />
              </div>
            </div>
            <div>
              <label className={`text-xs ${sub} block mb-1`}>Content</label>
              <textarea value={newDocContent} onChange={e => setNewDocContent(e.target.value)} rows={4} placeholder="Paste competitor info, pricing details, market notes, branding guidelines, or any business context that should inform the marketing plan..." className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`} />
            </div>
            <div className="flex gap-2">
              <button onClick={addContextDoc} disabled={!newDocTitle.trim()} className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40">Save</button>
              <button onClick={() => setAddingDoc(false)} className={`px-4 py-1.5 text-xs ${sub} hover:underline`}>Cancel</button>
            </div>
          </div>
        )}

        {contextDocs.length > 0 && (
          <div className={`px-5 pb-4 space-y-2 ${addingDoc ? '' : 'border-t ' + (darkMode ? 'border-slate-700' : 'border-slate-100') + ' pt-3'}`}>
            {contextDocs.map(doc => (
              <div key={doc.id} className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <FileText size={16} className={sub} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${text}`}>{doc.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                      {CONTEXT_TYPES.find(t => t.id === doc.type)?.label || doc.type}
                    </span>
                  </div>
                  {doc.content && <p className={`text-xs ${sub} mt-1 line-clamp-2`}>{doc.content}</p>}
                </div>
                <button onClick={() => deleteDoc(doc.id)} className="p-1 text-red-500 hover:text-red-600"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Playbook Assignment */}
      <div className={`border rounded-xl ${card}`}>
        <button
          onClick={() => setShowPlaybooks(!showPlaybooks)}
          className="w-full px-5 py-4 flex items-center justify-between"
        >
          <div className="text-left">
            <h4 className={`text-sm font-semibold ${text}`}>Seasonal Playbooks</h4>
            <p className={`text-xs ${sub} mt-0.5`}>
              {selectedPlaybooks.length ? `${selectedPlaybooks.length} active` : 'Assign seasonal strategies to include in the marketing plan'}
            </p>
          </div>
          {showPlaybooks ? <ChevronUp size={14} className={sub} /> : <ChevronDown size={14} className={sub} />}
        </button>
        {showPlaybooks && (
          <div className={`px-5 pb-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
              {PLAYBOOK_OPTIONS.map(pb => (
                <button
                  key={pb.id}
                  onClick={() => togglePlaybook(pb.id)}
                  className={`text-left px-3 py-2 text-xs rounded-lg border transition-colors ${
                    selectedPlaybooks.includes(pb.id)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pb.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate Marketing Plan Button */}
      <button
        onClick={generatePlan}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40"
      >
        {generating ? (
          <><Loader2 size={16} className="animate-spin" /> Generating Marketing Plan...</>
        ) : (
          <><Sparkles size={16} /> {plan ? 'Regenerate Marketing Plan' : 'Generate Marketing Plan'}</>
        )}
      </button>
      <p className={`text-[10px] ${sub} text-center -mt-4`}>Uses facility data, business context, reviews, playbooks, and spend analysis</p>

      {/* Marketing Plan Display */}
      {plan && p && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-semibold ${text}`}>Marketing Plan v{plan.version}</h4>
            <span className={`text-[10px] ${sub}`}>{new Date(plan.created_at).toLocaleDateString()}</span>
          </div>

          {/* Spend Recommendation Banner */}
          {plan.spend_recommendation && (
            <div className={`border rounded-xl p-4 ${card}`}>
              <div className="flex items-center gap-3 mb-3">
                <DollarSign size={16} className="text-emerald-500" />
                <h5 className={`text-sm font-semibold ${text}`}>Ad Spend Recommendation</h5>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${BUDGET_TIER_COLORS[plan.spend_recommendation.budgetTier] || ''}`}>
                  {plan.spend_recommendation.budgetTier}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <p className={`text-[10px] uppercase ${sub}`}>Monthly Budget</p>
                  <p className={`text-lg font-bold ${text}`}>${plan.spend_recommendation.monthlyBudget.min.toLocaleString()} - ${plan.spend_recommendation.monthlyBudget.max.toLocaleString()}</p>
                </div>
                {Object.entries(plan.spend_recommendation.channels).map(([ch, pct]) => (
                  <div key={ch}>
                    <p className={`text-[10px] uppercase ${sub}`}>{ch.replace(/_/g, ' ')}</p>
                    <p className={`text-sm font-semibold ${text}`}>{pct}%</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {plan.spend_recommendation.reasoning.map((r, i) => (
                  <p key={i} className={`text-xs ${sub}`}>• {r}</p>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {p.summary && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-emerald-900/20 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'}`}>
              <p className={`text-sm ${text} leading-relaxed`}>{p.summary}</p>
            </div>
          )}

          {/* Bottleneck */}
          {p.bottleneck_analysis && (
            <Section id="bottleneck" title="Bottleneck Analysis" icon={Target}>
              <p className={`text-sm ${text} mt-3 leading-relaxed`}>{p.bottleneck_analysis}</p>
            </Section>
          )}

          {/* Quick Wins */}
          {p.quick_wins?.length ? (
            <Section id="quick-wins" title={`Quick Wins (${p.quick_wins.length})`} icon={Zap}>
              <div className="mt-3 space-y-1.5">
                {p.quick_wins.map((w, i) => (
                  <div key={i} className={`flex items-start gap-2 text-sm ${text}`}>
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Target Audiences */}
          {p.target_audiences?.length ? (
            <Section id="audiences" title={`Target Audiences (${p.target_audiences.length})`} icon={Target}>
              <div className="mt-3 space-y-3">
                {p.target_audiences.map((a, i) => (
                  <div key={i} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <p className={`text-sm font-semibold ${text}`}>{a.segment}</p>
                    <p className={`text-xs ${sub} mt-1`}>{a.description}</p>
                    <p className={`text-xs ${text} mt-1`}><span className={sub}>Angle:</span> {a.messaging_angle}</p>
                    <div className="flex gap-1 mt-1.5">
                      {a.channels.map(ch => <span key={ch} className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{ch}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Messaging Pillars */}
          {p.messaging_pillars?.length ? (
            <Section id="messaging" title={`Messaging Pillars (${p.messaging_pillars.length})`} icon={Target}>
              <div className="mt-3 space-y-3">
                {p.messaging_pillars.map((m, i) => (
                  <div key={i} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <p className={`text-sm font-semibold ${text}`}>{m.pillar}</p>
                    <p className={`text-xs ${sub} mt-1`}>{m.rationale}</p>
                    <p className={`text-xs italic ${text} mt-1`}>"{m.example_headline}"</p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Channel Strategy */}
          {p.channel_strategy?.length ? (
            <Section id="channels" title="Channel Strategy" icon={TrendingUp}>
              <div className="mt-3 space-y-3">
                {p.channel_strategy.map((ch, i) => (
                  <div key={i} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-semibold ${text}`}>{ch.channel}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold`}>{ch.budget_pct}%</span>
                    </div>
                    <p className={`text-xs ${sub}`}>{ch.objective}</p>
                    <ul className={`text-xs ${text} mt-1.5 space-y-0.5`}>
                      {ch.tactics.map((t, j) => <li key={j}>• {t}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* Content Calendar */}
          {p.content_calendar?.length ? (
            <Section id="calendar" title="Content Calendar" icon={Calendar}>
              <div className="mt-3 space-y-2">
                {p.content_calendar.map((w, i) => (
                  <div key={i} className={`flex gap-3 p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                      <span className={`text-xs font-bold ${text}`}>W{w.week}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${text}`}>{w.focus}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {w.deliverables.map((d, j) => <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded ${darkMode ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>{d}</span>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* KPIs */}
          {p.kpis?.length ? (
            <Section id="kpis" title="KPIs & Targets" icon={TrendingUp}>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {p.kpis.map((kpi, i) => (
                  <div key={i} className={`p-3 rounded-lg text-center ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <p className={`text-lg font-bold ${text}`}>{kpi.target}</p>
                    <p className={`text-[10px] uppercase ${sub}`}>{kpi.metric}</p>
                    <p className={`text-[10px] ${sub}`}>{kpi.timeframe}</p>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      )}
    </div>
  )
}
