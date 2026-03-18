import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Plus, RefreshCw, Zap, Users, MessageSquare,
  Mail, Smartphone, ChevronDown, ChevronUp, Pause, Play,
  SkipForward, UserCheck, Trash2, Clock,
  CheckCircle2, AlertCircle, Send,
} from 'lucide-react'
import { Facility } from './types'
import {
  type NurtureSequence, type NurtureEnrollment, type NurtureMessage,
  type SequenceTemplate, type NurtureStats, type NurtureStep,
  TRIGGER_TYPES, CHANNEL_CONFIG, STATUS_CONFIG, formatDelay,
} from './nurture/NurtureTypes'

/* ════════════════════════════════════════════════════════════════
   Lead Nurture Engine
   Multi-channel SMS + Email follow-up sequences.
   NEW feature — does NOT modify drip-sequences or existing code.
════════════════════════════════════════════════════════════════ */

type SubView = 'sequences' | 'enrollments' | 'messages'

export default function LeadNurtureEngine({ facility, adminKey, darkMode }: {
  facility: Facility
  adminKey: string
  darkMode: boolean
}) {
  const [templates, setTemplates] = useState<SequenceTemplate[]>([])
  const [sequences, setSequences] = useState<NurtureSequence[]>([])
  const [enrollments, setEnrollments] = useState<NurtureEnrollment[]>([])
  const [messages, setMessages] = useState<NurtureMessage[]>([])
  const [stats, setStats] = useState<NurtureStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [subView, setSubView] = useState<SubView>('sequences')
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null)
  const [showEnrollModal, setShowEnrollModal] = useState<string | null>(null)
  const [enrollForm, setEnrollForm] = useState({ name: '', email: '', phone: '' })

  const card = darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/nurture-sequences?facilityId=${facility.id}`, {
        headers: { 'X-Admin-Key': adminKey },
      })
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setTemplates(data.templates || [])
      setSequences(data.sequences || [])
      setEnrollments(data.enrollments || [])
      setMessages(data.recentMessages || [])
      setStats(data.stats || null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [facility.id, adminKey])

  useEffect(() => { fetchData() }, [fetchData])

  async function createFromTemplate(templateKey: string) {
    await fetch('/api/nurture-sequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ action: 'create_from_template', facilityId: facility.id, templateKey }),
    })
    fetchData()
  }

  async function enrollLead(sequenceId: string) {
    if (!enrollForm.email && !enrollForm.phone) return alert('Email or phone required')
    await fetch('/api/nurture-sequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({
        action: 'enroll',
        sequenceId,
        facilityId: facility.id,
        contactName: enrollForm.name,
        contactEmail: enrollForm.email,
        contactPhone: enrollForm.phone,
      }),
    })
    setShowEnrollModal(null)
    setEnrollForm({ name: '', email: '', phone: '' })
    fetchData()
  }

  async function updateEnrollment(enrollmentId: string, action: string) {
    await fetch('/api/nurture-sequences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ enrollmentId, action }),
    })
    fetchData()
  }

  async function deleteItem(id: string, type: 'sequence' | 'enrollment') {
    if (!confirm(`Delete this ${type}?`)) return
    await fetch(`/api/nurture-sequences?id=${id}&type=${type}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': adminKey },
    })
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
        <span className={`ml-3 ${sub}`}>Loading nurture engine...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ══════════ HEADER ══════════ */}
      <div className={`border rounded-xl p-4 ${card}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className={`text-lg font-bold ${text}`}>Lead Nurture Engine</h2>
            <p className={`text-xs ${sub} mt-0.5`}>Automated SMS + email follow-up sequences for leads and tenants</p>
          </div>
          <button onClick={fetchData} className={`p-2 rounded-xl border ${darkMode ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>
            <RefreshCw size={14} className={sub} />
          </button>
        </div>
      </div>

      {/* ══════════ METRICS ══════════ */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          <MetricCard label="Sequences" value={String(stats.totalSequences)} darkMode={darkMode} />
          <MetricCard label="Active" value={String(stats.activeEnrollments)} accent="text-emerald-500" darkMode={darkMode} />
          <MetricCard label="Converted" value={String(stats.converted)} accent="text-blue-500" darkMode={darkMode} />
          <MetricCard label="Messages" value={String(stats.totalMessages)} darkMode={darkMode} />
          <MetricCard label="SMS Sent" value={String(stats.smsSent)} accent="text-green-500" darkMode={darkMode} />
          <MetricCard label="Emails Sent" value={String(stats.emailSent)} accent="text-blue-500" darkMode={darkMode} />
          <MetricCard label="Delivery" value={`${stats.deliveryRate}%`} accent={stats.deliveryRate > 80 ? 'text-emerald-500' : 'text-amber-500'} darkMode={darkMode} />
        </div>
      )}

      {/* ══════════ SUB-VIEW TABS ══════════ */}
      <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        {([
          ['sequences', 'Sequences', Zap],
          ['enrollments', `Enrollments (${enrollments.filter(e => e.status === 'active').length})`, Users],
          ['messages', `Message Log (${messages.length})`, MessageSquare],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setSubView(key as SubView)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              subView === key
                ? 'bg-emerald-500 text-white shadow-lg'
                : `${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ══════════ SEQUENCES VIEW ══════════ */}
      {subView === 'sequences' && (
        <div className="space-y-4">
          {/* Template setup cards */}
          {templates.length > 0 && sequences.length === 0 && (
            <div className={`border rounded-xl p-4 ${card}`}>
              <h3 className={`text-sm font-bold mb-3 ${text}`}>Get Started — Pick a Sequence Template</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map(t => {
                  const trigger = TRIGGER_TYPES[t.trigger_type] || { label: t.trigger_type, icon: '⚙️', color: 'text-slate-500' }
                  return (
                    <button
                      key={t.key}
                      onClick={() => createFromTemplate(t.key)}
                      className={`p-3 rounded-lg border text-left transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{trigger.icon}</span>
                        <span className={`text-xs font-bold ${trigger.color}`}>{trigger.label}</span>
                      </div>
                      <p className={`text-sm font-medium ${text}`}>{t.name}</p>
                      <p className={`text-xs ${sub} mt-0.5`}>{t.stepCount} steps · SMS + Email</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add template buttons (when sequences exist) */}
          {sequences.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {templates.filter(t => !sequences.find(s => s.trigger_type === t.trigger_type)).map(t => (
                <button
                  key={t.key}
                  onClick={() => createFromTemplate(t.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Plus size={12} /> Add {t.name}
                </button>
              ))}
            </div>
          )}

          {/* Sequence cards */}
          {sequences.map(seq => {
            const trigger = TRIGGER_TYPES[seq.trigger_type] || { label: seq.trigger_type, icon: '⚙️', color: 'text-slate-500' }
            const seqEnrollments = enrollments.filter(e => e.sequence_id === seq.id)
            const activeCount = seqEnrollments.filter(e => e.status === 'active').length
            const steps: NurtureStep[] = typeof seq.steps === 'string' ? JSON.parse(seq.steps) : seq.steps
            const isExpanded = expandedSeq === seq.id
            const seqStatus = STATUS_CONFIG[seq.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active

            return (
              <div key={seq.id} className={`border rounded-xl overflow-hidden ${card}`}>
                {/* Sequence header */}
                <button onClick={() => setExpandedSeq(isExpanded ? null : seq.id)} className="w-full flex items-center gap-3 p-4 text-left">
                  <span className="text-lg">{trigger.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold text-sm ${text}`}>{seq.name}</h3>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${seqStatus.bg} ${seqStatus.text}`}>{seqStatus.label}</span>
                      <span className={`text-xs ${sub}`}>{steps.length} steps</span>
                    </div>
                    <p className={`text-xs ${sub} mt-0.5`}>
                      {activeCount} active · {seqEnrollments.filter(e => e.status === 'converted').length} converted
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEnrollModal(seq.id) }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
                  >
                    <Plus size={12} /> Enroll
                  </button>
                  {isExpanded ? <ChevronUp size={16} className={sub} /> : <ChevronDown size={16} className={sub} />}
                </button>

                {/* Expanded: step timeline + enrollments */}
                {isExpanded && (
                  <div className={`border-t p-4 space-y-4 ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}`}>
                    {/* Step timeline */}
                    <div>
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>Sequence Steps</h4>
                      <div className="space-y-2">
                        {steps.map((step, i) => {
                          const ch = CHANNEL_CONFIG[step.channel]
                          return (
                            <div key={i} className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-7 h-7 rounded-full ${ch.bg} flex items-center justify-center text-xs`}>
                                  {step.channel === 'sms' ? <Smartphone size={12} className={ch.color} /> : <Mail size={12} className={ch.color} />}
                                </div>
                                {i < steps.length - 1 && <div className={`w-px h-6 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${ch.color}`}>{ch.label}</span>
                                  <span className={`text-xs ${sub}`}>after {formatDelay(step.delay_minutes)}</span>
                                  {step.send_window && <span className={`text-xs ${sub}`}>({step.send_window.start}-{step.send_window.end})</span>}
                                </div>
                                {step.subject && <p className={`text-xs font-medium ${text} mt-0.5`}>{step.subject}</p>}
                                <p className={`text-xs ${sub} mt-0.5 line-clamp-2`}>{step.body.slice(0, 120)}...</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Enrollments for this sequence */}
                    {seqEnrollments.length > 0 && (
                      <div>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${sub}`}>Enrollments ({seqEnrollments.length})</h4>
                        <div className="space-y-1">
                          {seqEnrollments.map(e => {
                            const eStatus = STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
                            return (
                              <div key={e.id} className={`flex items-center gap-3 p-2 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-medium ${text}`}>{e.contact_name || e.contact_email || e.contact_phone || 'Unknown'}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${eStatus.bg} ${eStatus.text}`}>{eStatus.label}</span>
                                    <span className={`text-[10px] ${sub}`}>Step {e.current_step + 1}/{steps.length}</span>
                                  </div>
                                  {e.next_send_at && e.status === 'active' && (
                                    <p className={`text-[10px] ${sub} flex items-center gap-1 mt-0.5`}>
                                      <Clock size={9} /> Next: {new Date(e.next_send_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {e.status === 'active' && (
                                    <>
                                      <button onClick={() => updateEnrollment(e.id, 'pause')} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`} title="Pause">
                                        <Pause size={12} className="text-amber-500" />
                                      </button>
                                      <button onClick={() => updateEnrollment(e.id, 'skip')} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`} title="Skip step">
                                        <SkipForward size={12} className={sub} />
                                      </button>
                                      <button onClick={() => updateEnrollment(e.id, 'convert')} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`} title="Mark converted">
                                        <UserCheck size={12} className="text-emerald-500" />
                                      </button>
                                    </>
                                  )}
                                  {e.status === 'paused' && (
                                    <button onClick={() => updateEnrollment(e.id, 'resume')} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`} title="Resume">
                                      <Play size={12} className="text-emerald-500" />
                                    </button>
                                  )}
                                  <button onClick={() => deleteItem(e.id, 'enrollment')} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'}`} title="Remove">
                                    <Trash2 size={12} className="text-red-400" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Delete sequence */}
                    <div className="flex justify-end">
                      <button onClick={() => deleteItem(seq.id, 'sequence')} className="text-xs text-red-400 hover:text-red-300">
                        Delete this sequence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ══════════ ENROLLMENTS VIEW ══════════ */}
      {subView === 'enrollments' && (
        <div className="space-y-2">
          {enrollments.length === 0 ? (
            <div className="text-center py-10">
              <Users size={32} className={`mx-auto mb-3 ${sub}`} />
              <p className={`font-medium ${text}`}>No enrollments yet</p>
              <p className={`text-sm ${sub} mt-1`}>Create a sequence and enroll leads to start nurturing</p>
            </div>
          ) : (
            enrollments.map(e => {
              const seq = sequences.find(s => s.id === e.sequence_id)
              const eStatus = STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
              const steps: NurtureStep[] = seq ? (typeof seq.steps === 'string' ? JSON.parse(seq.steps as string) : seq.steps) : []
              return (
                <div key={e.id} className={`border rounded-xl p-3 ${card}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${text}`}>{e.contact_name || e.contact_email || e.contact_phone}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${eStatus.bg} ${eStatus.text}`}>{eStatus.label}</span>
                      </div>
                      <div className={`flex items-center gap-2 mt-0.5 text-xs ${sub}`}>
                        <span>{seq?.name || 'Unknown sequence'}</span>
                        <span>·</span>
                        <span>Step {e.current_step + 1}/{steps.length || '?'}</span>
                        {e.contact_email && <span>· {e.contact_email}</span>}
                        {e.contact_phone && <span>· {e.contact_phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {e.status === 'active' && (
                        <>
                          <button onClick={() => updateEnrollment(e.id, 'pause')} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Pause size={14} className="text-amber-500" /></button>
                          <button onClick={() => updateEnrollment(e.id, 'convert')} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><UserCheck size={14} className="text-emerald-500" /></button>
                        </>
                      )}
                      {e.status === 'paused' && (
                        <button onClick={() => updateEnrollment(e.id, 'resume')} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><Play size={14} className="text-emerald-500" /></button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ══════════ MESSAGES VIEW ══════════ */}
      {subView === 'messages' && (
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare size={32} className={`mx-auto mb-3 ${sub}`} />
              <p className={`font-medium ${text}`}>No messages sent yet</p>
              <p className={`text-sm ${sub} mt-1`}>Messages will appear here as sequences run</p>
            </div>
          ) : (
            messages.map(m => {
              const ch = CHANNEL_CONFIG[m.channel as keyof typeof CHANNEL_CONFIG] || CHANNEL_CONFIG.email
              const isFailed = m.status === 'failed' || m.status === 'bounced'
              return (
                <div key={m.id} className={`border rounded-xl p-3 ${card}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full ${ch.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      {m.channel === 'sms' ? <Smartphone size={12} className={ch.color} /> : <Mail size={12} className={ch.color} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium ${ch.color}`}>{ch.label}</span>
                        <span className={`text-xs ${sub}`}>to {m.to_address}</span>
                        <span className={`text-xs ${sub}`}>· Step {m.step_number + 1}</span>
                        {isFailed ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center gap-1"><AlertCircle size={9} /> {m.status}</span>
                        ) : m.status === 'sent' || m.status === 'delivered' ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 flex items-center gap-1"><CheckCircle2 size={9} /> {m.status}</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center gap-1"><Send size={9} /> {m.status}</span>
                        )}
                      </div>
                      {m.subject && <p className={`text-xs font-medium ${text} mt-0.5`}>{m.subject}</p>}
                      <p className={`text-xs ${sub} mt-0.5 line-clamp-2`}>{m.body.slice(0, 150)}</p>
                      {m.error_message && <p className="text-xs text-red-400 mt-0.5">{m.error_message}</p>}
                      {m.sent_at && <p className={`text-[10px] ${sub} mt-1`}>{new Date(m.sent_at).toLocaleString()}</p>}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ══════════ ENROLL MODAL ══════════ */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEnrollModal(null)}>
          <div className={`border rounded-2xl shadow-2xl max-w-md w-full ${card}`} onClick={e => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <h3 className={`font-bold ${text}`}>Enroll Lead in Sequence</h3>
              <div className="space-y-3">
                <div>
                  <label className={`text-xs font-medium ${sub}`}>Name</label>
                  <input value={enrollForm.name} onChange={e => setEnrollForm(f => ({ ...f, name: e.target.value }))} className={`w-full mt-1 rounded-lg border px-3 py-2 text-sm ${inputBg}`} placeholder="John Smith" />
                </div>
                <div>
                  <label className={`text-xs font-medium ${sub}`}>Email</label>
                  <input value={enrollForm.email} onChange={e => setEnrollForm(f => ({ ...f, email: e.target.value }))} className={`w-full mt-1 rounded-lg border px-3 py-2 text-sm ${inputBg}`} placeholder="john@example.com" type="email" />
                </div>
                <div>
                  <label className={`text-xs font-medium ${sub}`}>Phone (for SMS)</label>
                  <input value={enrollForm.phone} onChange={e => setEnrollForm(f => ({ ...f, phone: e.target.value }))} className={`w-full mt-1 rounded-lg border px-3 py-2 text-sm ${inputBg}`} placeholder="+1234567890" type="tel" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => enrollLead(showEnrollModal)} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
                  Enroll
                </button>
                <button onClick={() => setShowEnrollModal(null)} className={`px-4 py-2.5 border rounded-xl text-sm font-medium ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, accent, darkMode }: { label: string; value: string; accent?: string; darkMode: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${darkMode ? 'bg-slate-800/80 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
      <p className={`text-[10px] uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
      <p className={`text-lg font-bold ${accent || (darkMode ? 'text-slate-100' : 'text-slate-900')}`}>{value}</p>
    </div>
  )
}
