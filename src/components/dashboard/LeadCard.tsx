import { useState, useEffect } from 'react'
import { Building2, MapPin, Clock, ChevronUp, ChevronDown, Mail, Phone, Calendar, CalendarClock, StickyNote, KeyRound, Copy, Loader2, Plus, BarChart3, Trash2, Target, MessageSquare, FileText, Sparkles, Send, CheckCircle2, ClipboardList } from 'lucide-react'
import { Lead, STATUSES, STATUS_MAP, OCCUPANCY_LABELS, UNITS_LABELS, ISSUE_LABELS } from './types'
import { timeAgo, formatDate } from './utils'
import OnboardingWizard from '../OnboardingWizard'

/* ── LeadCard ── */

export default function LeadCard({ lead, expanded, onToggle, onUpdateStatus, onAddNote, onSetFollowUp, newNote, onNewNoteChange, updating, adminKey, score, selected, onSelect, isOverdue }: {
  lead: Lead
  expanded: boolean
  onToggle: () => void
  onUpdateStatus: (status: string) => void
  onAddNote: (note: string) => void
  onSetFollowUp: (date: string) => void
  newNote: string
  onNewNoteChange: (v: string) => void
  updating: boolean
  adminKey: string
  score?: { score: number; grade: string; breakdown: Record<string, number> }
  selected?: boolean
  onSelect?: () => void
  isOverdue?: boolean
}) {
  const statusInfo = STATUS_MAP[lead.status] || { label: lead.status, color: 'bg-slate-100 text-slate-600' }

  const gradeColors: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-amber-100 text-amber-700',
    D: 'bg-orange-100 text-orange-700',
    F: 'bg-red-100 text-red-700',
  }

  return (
    <div className={`bg-white rounded-xl border transition-all ${
      expanded ? 'border-emerald-300 shadow-lg shadow-emerald-600/5' : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Summary Row */}
      <div className="flex items-center px-4 sm:px-5 py-4 gap-3">
        <input
          type="checkbox"
          checked={selected || false}
          onChange={(e) => { e.stopPropagation(); onSelect?.() }}
          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 shrink-0 cursor-pointer"
        />
        <button
          onClick={onToggle}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 truncate">{lead.name}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {score && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${gradeColors[score.grade] || 'bg-slate-100 text-slate-600'}`} title={`Score: ${score.score}/100`}>
                {score.grade} · {score.score}
              </span>
            )}
            {isOverdue && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-0.5">
                <CalendarClock size={9} /> Overdue
              </span>
            )}
            {lead.followUpDate && !isOverdue && (
              <span className="text-[10px] text-slate-400" title="Follow-up scheduled">
                Follow-up: {new Date(lead.followUpDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 size={12} /> {lead.facilityName}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {lead.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> {timeAgo(lead.createdAt)}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-5 border-t border-slate-100 pt-4 space-y-5">
          {/* Contact & Facility Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contact</h4>
              <div className="space-y-1.5 text-sm">
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700">
                  <Mail size={14} /> {lead.email}
                </a>
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700">
                  <Phone size={14} /> {lead.phone}
                </a>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Facility Details</h4>
              <div className="text-sm space-y-1 text-slate-600">
                <p>Occupancy: <span className="font-medium text-slate-900">{OCCUPANCY_LABELS[lead.occupancyRange] || lead.occupancyRange}</span></p>
                <p>Units: <span className="font-medium text-slate-900">{UNITS_LABELS[lead.totalUnits] || lead.totalUnits}</span></p>
                <p>Issue: <span className="font-medium text-slate-900">{ISSUE_LABELS[lead.biggestIssue] || lead.biggestIssue}</span></p>
              </div>
            </div>
          </div>

          {/* Form notes from user */}
          {lead.formNotes && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Submission Notes</h4>
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">{lead.formNotes}</p>
            </div>
          )}

          {/* Access Code + Campaign Manager (shown for signed clients) */}
          {lead.accessCode && (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3">
                <KeyRound size={16} className="text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-800">Portal Access Code</p>
                  <p className="text-sm font-mono tracking-wider text-emerald-700">{lead.accessCode}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(lead.accessCode!) }}
                  className="p-1.5 text-emerald-500 hover:text-emerald-700 transition-colors"
                  title="Copy code"
                >
                  <Copy size={14} />
                </button>
              </div>
              <OnboardingSection accessCode={lead.accessCode} adminKey={adminKey} />
              <CampaignManager accessCode={lead.accessCode} adminKey={adminKey} />
              <AuditReportSection leadId={lead.id} adminKey={adminKey} />
              <EmailTemplatePicker leadId={lead.id} leadName={lead.name} adminKey={adminKey} />
            </>
          )}

          {/* Audit Report + Email Templates (for all leads) */}
          {!lead.accessCode && (
            <>
              <AuditReportSection leadId={lead.id} adminKey={adminKey} />
              <EmailTemplatePicker leadId={lead.id} leadName={lead.name} adminKey={adminKey} />
            </>
          )}

          {/* Timestamps */}
          <div className="flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Calendar size={12} /> Created: {formatDate(lead.createdAt)}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> Updated: {formatDate(lead.updatedAt)}</span>
          </div>

          {/* Status Change */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Move to Stage</h4>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => onUpdateStatus(s.value)}
                  disabled={lead.status === s.value || updating}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    lead.status === s.value
                      ? 'ring-2 ring-emerald-500 ring-offset-1 ' + s.color
                      : s.color + ' opacity-60 hover:opacity-100'
                  } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-Up Reminder */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <CalendarClock size={12} /> Follow-Up Reminder
            </h4>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={lead.followUpDate || ''}
                onChange={e => onSetFollowUp(e.target.value)}
                className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
              {lead.followUpDate && (
                <button onClick={() => onSetFollowUp('')} className="text-xs text-slate-400 hover:text-red-500">
                  Clear
                </button>
              )}
              {isOverdue && (
                <span className="text-xs text-red-600 font-medium">Overdue since {new Date(lead.followUpDate!).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* Admin Message Thread (for signed clients) */}
          {lead.accessCode && (
            <AdminMessageThread accessCode={lead.accessCode} adminKey={adminKey} />
          )}

          {/* Notes */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <StickyNote size={12} /> Internal Notes ({lead.notes?.length || 0})
            </h4>
            {lead.notes?.length > 0 && (
              <div className="space-y-2 mb-3">
                {lead.notes.map((n, i) => (
                  <div key={i} className="text-sm bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-slate-700">{n.text}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(n.at)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                value={newNote}
                onChange={e => onNewNoteChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newNote.trim()) onAddNote(newNote.trim()) }}
                className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
              <button
                onClick={() => newNote.trim() && onAddNote(newNote.trim())}
                disabled={!newNote.trim() || updating}
                className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Onboarding Section ── */

function OnboardingSection({ accessCode, adminKey }: { accessCode: string; adminKey: string }) {
  const [completionPct, setCompletionPct] = useState<number | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/client-onboarding?code=${accessCode}`, {
          headers: { 'X-Admin-Key': adminKey },
        })
        if (res.ok) {
          const json = await res.json()
          setCompletionPct(json.completionPct)
        }
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    fetchStatus()
  }, [accessCode, adminKey])

  const completedSteps = completionPct != null ? Math.round(completionPct / 20) : 0

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Campaign Onboarding</span>
          </div>
          {loading ? (
            <span className="text-xs text-slate-400">Loading...</span>
          ) : completionPct === 100 ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Launch Ready</span>
          ) : (
            <span className="text-xs text-slate-500">{completionPct}% complete</span>
          )}
        </div>
        {!loading && (
          <>
            <div className="flex gap-1 mb-2">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < completedSteps ? 'bg-emerald-500' : 'bg-slate-100'}`} />
              ))}
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="w-full text-center text-xs font-medium py-1.5 rounded-lg transition-all cursor-pointer bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              {completionPct === 100 ? 'View Onboarding Info' : 'Open Wizard'}
            </button>
          </>
        )}
      </div>

      {showWizard && (
        <OnboardingWizard
          accessCode={accessCode}
          adminKey={adminKey}
          onClose={() => setShowWizard(false)}
          onCompletionChange={setCompletionPct}
        />
      )}
    </>
  )
}

/* ── Campaign Manager ── */

interface CampaignEntry {
  month: string
  spend: number
  leads: number
  cpl: number
  moveIns: number
  costPerMoveIn: number
  roas: number
  occupancyDelta: number
}

function CampaignManager({ accessCode, adminKey }: { accessCode: string; adminKey: string }) {
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [month, setMonth] = useState('')
  const [spend, setSpend] = useState('')
  const [leads, setLeads] = useState('')
  const [moveIns, setMoveIns] = useState('')
  const [roas, setRoas] = useState('')

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/client-campaigns?code=${accessCode}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
    setLoaded(true)
  }

  const addCampaign = async () => {
    if (!month || !spend || !leads) return
    setSaving(true)
    try {
      const res = await fetch('/api/client-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          code: accessCode,
          campaign: {
            month,
            spend: Number(spend),
            leads: Number(leads),
            moveIns: Number(moveIns || 0),
            roas: Number(roas || 0),
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
        setMonth(''); setSpend(''); setLeads(''); setMoveIns(''); setRoas('')
        setShowForm(false)
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  const deleteCampaign = async (m: string) => {
    try {
      const res = await fetch('/api/client-campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ code: accessCode, month: m }),
      })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
          <BarChart3 size={12} /> Campaign Data ({campaigns.length})
        </h4>
        <div className="flex items-center gap-2">
          {!loaded && (
            <button onClick={fetchCampaigns} disabled={loading}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
              {loading ? 'Loading...' : 'Load campaigns'}
            </button>
          )}
          {loaded && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
              <Plus size={12} /> Add month
            </button>
          )}
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-2 py-1.5 font-medium text-slate-500">Month</th>
                <th className="px-2 py-1.5 font-medium text-slate-500 text-right">Spend</th>
                <th className="px-2 py-1.5 font-medium text-slate-500 text-right">Leads</th>
                <th className="px-2 py-1.5 font-medium text-slate-500 text-right">CPL</th>
                <th className="px-2 py-1.5 font-medium text-slate-500 text-right">Move-Ins</th>
                <th className="px-2 py-1.5 font-medium text-slate-500 text-right">ROAS</th>
                <th className="px-2 py-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.month} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-medium">{c.month}</td>
                  <td className="px-2 py-1.5 text-right text-slate-600">${c.spend.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right text-slate-600">{c.leads}</td>
                  <td className="px-2 py-1.5 text-right text-slate-600">${c.cpl.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right text-emerald-600 font-medium">{c.moveIns}</td>
                  <td className="px-2 py-1.5 text-right font-medium">{c.roas}x</td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => deleteCampaign(c.month)}
                      className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-5 gap-2">
            <input type="text" placeholder="Month (e.g. Mar 2026)" value={month}
              onChange={e => setMonth(e.target.value)}
              className="col-span-2 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
            <input type="number" placeholder="Spend" value={spend}
              onChange={e => setSpend(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
            <input type="number" placeholder="Leads" value={leads}
              onChange={e => setLeads(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
            <input type="number" placeholder="Move-Ins" value={moveIns}
              onChange={e => setMoveIns(e.target.value)}
              className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
          </div>
          <div className="flex items-center gap-2">
            <input type="number" step="0.1" placeholder="ROAS (e.g. 4.2)" value={roas}
              onChange={e => setRoas(e.target.value)}
              className="w-32 px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30" />
            <button onClick={addCampaign} disabled={!month || !spend || !leads || saving}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loaded && (
        <GoalSetter accessCode={accessCode} adminKey={adminKey} />
      )}
    </div>
  )
}

/* ── Goal Setter ── */

function GoalSetter({ accessCode, adminKey }: { accessCode: string; adminKey: string }) {
  const [goal, setGoal] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const saveGoal = async () => {
    if (!goal) return
    setSaving(true)
    try {
      const res = await fetch('/api/client-campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ code: accessCode, monthlyGoal: Number(goal) }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
      <Target size={12} className="text-slate-400" />
      <span className="text-xs text-slate-400">Monthly move-in goal:</span>
      <input
        type="number"
        min="0"
        max="999"
        placeholder="e.g. 15"
        value={goal}
        onChange={e => setGoal(e.target.value)}
        className="w-16 px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
      />
      <button onClick={saveGoal} disabled={!goal || saving}
        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-40">
        {saving ? '...' : saved ? 'Saved!' : 'Set'}
      </button>
    </div>
  )
}

/* ── Admin Message Thread ── */

function AdminMessageThread({ accessCode, adminKey }: { accessCode: string; adminKey: string }) {
  const [messages, setMessages] = useState<{ id: string; from: string; text: string; timestamp: string }[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/client-messages?code=${accessCode}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
    setLoaded(true)
  }

  const sendMessage = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/client-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ code: accessCode, text: text.trim(), from: 'admin' }),
      })
      if (res.ok) {
        setText('')
        fetchMessages()
      }
    } catch { /* ignore */ }
    setSending(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
          <MessageSquare size={12} /> Messages ({messages.length})
        </h4>
        {!loaded && (
          <button onClick={fetchMessages} disabled={loading}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            {loading ? 'Loading...' : 'Load messages'}
          </button>
        )}
      </div>
      {loaded && (
        <>
          {messages.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2 mb-2">
              {messages.map(m => (
                <div key={m.id} className={`text-sm rounded-lg p-2 border ${
                  m.from === 'admin' ? 'bg-emerald-50 border-emerald-100 ml-6' : 'bg-slate-50 border-slate-100 mr-6'
                }`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] font-semibold text-slate-400">{m.from === 'admin' ? 'You' : 'Client'}</span>
                    <span className="text-[10px] text-slate-300">{new Date(m.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-700">{m.text}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Reply to client..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && text.trim()) sendMessage() }}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
            <button onClick={sendMessage} disabled={!text.trim() || sending}
              className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40">
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Audit Report Section ── */

interface AuditReport {
  generatedAt: string
  facility: { name: string; totalUnits: number; occupancy: number; vacantUnits: number }
  vacancyCost: { monthlyLoss: number; annualLoss: number }
  marketOpportunity: { score: number; grade: string }
  projections: {
    recommendedSpend: number; projectedCpl: number; projectedLeadsPerMonth: number
    projectedMoveInsPerMonth: number; projectedMonthlyRevenue: number
    projectedRoas: number; projectedMonthsToFill: number; conversionRate: number
  }
  competitiveInsights: string[]
  recommendations: { title: string; detail: string; priority: string }[]
}

function AuditReportSection({ leadId, adminKey }: { leadId: string; adminKey: string }) {
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState('')

  const generate = async (force = false) => {
    setLoading(true)
    setError('')
    try {
      const url = force ? '/api/audit-report' : `/api/audit-report?id=${leadId}`
      const opts: RequestInit = {
        method: force ? 'POST' : 'GET',
        headers: { 'X-Admin-Key': adminKey, ...(force ? { 'Content-Type': 'application/json' } : {}) },
        ...(force ? { body: JSON.stringify({ leadId }) } : {}),
      }
      const res = await fetch(url, opts)
      if (res.ok) {
        const data = await res.json()
        if (data.report) {
          setReport(data.report)
          setExpanded(true)
        } else {
          setError('No report data returned')
        }
      } else {
        setError('Failed to generate report')
      }
    } catch {
      setError('Connection error')
    }
    setLoading(false)
  }

  const gradeColor = report ? (
    report.marketOpportunity.grade === 'Excellent' ? 'text-emerald-600' :
    report.marketOpportunity.grade === 'Strong' ? 'text-blue-600' :
    report.marketOpportunity.grade === 'Moderate' ? 'text-amber-600' : 'text-slate-500'
  ) : ''

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
          <FileText size={12} /> Marketing Audit
        </h4>
        <div className="flex items-center gap-2">
          {report && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-slate-500 hover:text-slate-700">
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          <button onClick={() => generate(!report)} disabled={loading}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            {loading ? 'Generating...' : report ? 'Regenerate' : 'Generate Audit'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {report && expanded && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Vacant Units</p>
              <p className="text-lg font-bold text-red-600">{report.facility.vacantUnits}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Annual Loss</p>
              <p className="text-lg font-bold text-red-600">${report.vacancyCost.annualLoss.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Opportunity</p>
              <p className={`text-lg font-bold ${gradeColor}`}>
                {report.marketOpportunity.grade} ({report.marketOpportunity.score})
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Rec. Spend</p>
              <p className="text-lg font-bold text-emerald-600">${report.projections.recommendedSpend.toLocaleString()}/mo</p>
            </div>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-slate-500 mb-2">Projected Performance</h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">CPL</span>
                <span className="font-semibold">${report.projections.projectedCpl}</span>
              </div>
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">Leads/mo</span>
                <span className="font-semibold">{report.projections.projectedLeadsPerMonth}</span>
              </div>
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">Move-ins/mo</span>
                <span className="font-semibold text-emerald-600">{report.projections.projectedMoveInsPerMonth}</span>
              </div>
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">ROAS</span>
                <span className="font-semibold">{report.projections.projectedRoas}x</span>
              </div>
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">Revenue/mo</span>
                <span className="font-semibold">${report.projections.projectedMonthlyRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between bg-white rounded px-2 py-1.5 border border-slate-100">
                <span className="text-slate-500">Months to fill</span>
                <span className="font-semibold">{report.projections.projectedMonthsToFill}</span>
              </div>
            </div>
          </div>

          {report.competitiveInsights.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-500 mb-2">Competitive Insights</h5>
              <div className="space-y-1.5">
                {report.competitiveInsights.map((insight, i) => (
                  <p key={i} className="text-xs text-slate-600 bg-white rounded px-3 py-2 border border-slate-100">
                    {insight}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <h5 className="text-xs font-semibold text-slate-500 mb-2">Recommendations</h5>
            <div className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="bg-white rounded-lg px-3 py-2 border border-slate-100">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      rec.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>{rec.priority}</span>
                    <span className="text-xs font-semibold">{rec.title}</span>
                  </div>
                  <p className="text-xs text-slate-500">{rec.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-slate-400">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Email Template Picker ── */

const EMAIL_TEMPLATES = [
  { id: 'follow_up', name: 'Follow Up', icon: '📧', description: 'Warm follow-up after submission' },
  { id: 'audit_delivery', name: 'Audit', icon: '📊', description: 'Send audit report' },
  { id: 'proposal', name: 'Proposal', icon: '📋', description: 'Send pricing & next steps' },
  { id: 'check_in', name: 'Check In', icon: '👋', description: 'Re-engage quiet lead' },
  { id: 'onboarding_reminder', name: 'Onboarding', icon: '🔔', description: 'Remind to complete setup' },
  { id: 'campaign_update', name: 'Update', icon: '📈', description: 'Share performance highlights' },
]

function EmailTemplatePicker({ leadId, leadName, adminKey }: { leadId: string; leadName: string; adminKey: string }) {
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<string[]>([])
  const [error, setError] = useState('')

  const sendTemplate = async (templateId: string) => {
    setSending(templateId)
    setError('')
    try {
      const res = await fetch('/api/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ templateId, leadId }),
      })
      if (res.ok) {
        setSent(prev => [...prev, templateId])
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send')
      }
    } catch {
      setError('Connection error')
    }
    setSending(null)
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
        <Send size={12} /> Quick Emails
      </h4>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex flex-wrap gap-1.5">
        {EMAIL_TEMPLATES.map(t => {
          const isSent = sent.includes(t.id)
          const isSending = sending === t.id
          return (
            <button
              key={t.id}
              onClick={() => sendTemplate(t.id)}
              disabled={isSending || isSent}
              title={`${t.description} — sends to ${leadName}`}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                isSent
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              } ${isSending ? 'opacity-50' : ''} disabled:cursor-not-allowed`}
            >
              {isSending ? <Loader2 size={10} className="animate-spin" /> : isSent ? <CheckCircle2 size={10} /> : null}
              {t.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
