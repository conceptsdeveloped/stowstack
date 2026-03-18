import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Loader2, ChevronDown, ClipboardList, Building2, ExternalLink } from 'lucide-react'

interface Lead {
  id: string
  name: string
  status: string
  accessCode?: string
}

interface OnboardingStep {
  id: string
  label: string
  description: string
  completed: boolean
  completedAt: string | null
  completedBy: string | null
}

interface ClientChecklist {
  lead: Lead
  clientId: string
  steps: OnboardingStep[]
  completedCount: number
  totalSteps: number
  completionPct: number
}

export default function OnboardingChecklistView({ leads, adminKey }: { leads: Lead[]; adminKey: string }) {
  const [checklists, setChecklists] = useState<ClientChecklist[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)

  const signedClients = leads.filter(l => l.status === 'client_signed' && l.accessCode)

  useEffect(() => {
    if (signedClients.length === 0) {
      setLoading(false)
      return
    }

    const fetchAll = async () => {
      const results: ClientChecklist[] = []

      for (const lead of signedClients) {
        try {
          // First get the client ID
          const clientRes = await fetch(`/api/client-data?code=${lead.accessCode}`, {
            headers: { 'X-Admin-Key': adminKey },
          })
          if (!clientRes.ok) continue
          const clientData = await clientRes.json()
          const clientId = clientData.client?.id

          if (!clientId) continue

          const res = await fetch(`/api/onboarding-checklist?clientId=${clientId}`, {
            headers: { 'X-Admin-Key': adminKey },
          })
          if (res.ok) {
            const data = await res.json()
            results.push({
              lead,
              clientId,
              steps: data.steps || [],
              completedCount: data.completedCount || 0,
              totalSteps: data.totalSteps || 10,
              completionPct: data.completionPct || 0,
            })
          }
        } catch { /* skip */ }
      }

      setChecklists(results)
      setLoading(false)
    }

    fetchAll()
  }, [signedClients.length, adminKey])

  const toggleStep = async (clientId: string, stepId: string, currentCompleted: boolean) => {
    try {
      const res = await fetch('/api/onboarding-checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          clientId,
          stepId,
          completed: !currentCompleted,
          completedBy: 'admin',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setChecklists(prev => prev.map(c =>
          c.clientId === clientId
            ? { ...c, steps: data.steps, completedCount: data.completedCount, completionPct: data.completionPct }
            : c
        ))
      }
    } catch (err) {
      console.error('Toggle step error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Loading onboarding data...
      </div>
    )
  }

  if (signedClients.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400">
        <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-lg font-medium">No signed clients yet</p>
        <p className="text-sm mt-1">Onboarding checklists will appear here once clients are signed.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Clients</p>
          <p className="text-2xl font-bold">{checklists.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fully Onboarded</p>
          <p className="text-2xl font-bold text-emerald-600">{checklists.filter(c => c.completionPct === 100).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">In Progress</p>
          <p className="text-2xl font-bold text-amber-600">{checklists.filter(c => c.completionPct > 0 && c.completionPct < 100).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Not Started</p>
          <p className="text-2xl font-bold text-slate-400">{checklists.filter(c => c.completionPct === 0).length}</p>
        </div>
      </div>

      {/* Client Checklists */}
      {checklists.map(cl => (
        <div key={cl.clientId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setExpandedClient(expandedClient === cl.clientId ? null : cl.clientId)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Building2 size={16} className="text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900">{cl.lead.name}</p>
                <p className="text-xs text-slate-500">{cl.completedCount}/{cl.totalSteps} steps complete</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {Array.from({ length: cl.totalSteps }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < cl.completedCount ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                ))}
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                cl.completionPct === 100 ? 'bg-emerald-100 text-emerald-700' :
                cl.completionPct > 0 ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {cl.completionPct}%
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedClient === cl.clientId ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {expandedClient === cl.clientId && (
            <div className="border-t border-slate-100 p-4">
              <div className="space-y-2">
                {cl.steps.map((step, i) => (
                  <label
                    key={step.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      step.completed ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      onClick={() => toggleStep(cl.clientId, step.id, step.completed)}
                      className="mt-0.5 shrink-0"
                    >
                      {step.completed
                        ? <CheckCircle2 size={18} className="text-emerald-500" />
                        : <Circle size={18} className="text-slate-300" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">#{i + 1}</span>
                        <span className={`text-sm font-medium ${step.completed ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>
                          {step.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                      {step.completedAt && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Completed {new Date(step.completedAt).toLocaleDateString()} by {step.completedBy || 'admin'}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Walk-in form link */}
              {cl.lead.accessCode && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Walk-in attribution form for facility manager:</p>
                  <a
                    href={`/walkin/${cl.lead.accessCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    stowstack.co/walkin/{cl.lead.accessCode} <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
