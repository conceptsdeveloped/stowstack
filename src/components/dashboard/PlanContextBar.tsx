import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Target, Sparkles, DollarSign, Users, MessageSquare } from 'lucide-react'

interface PlanData {
  summary?: string
  bottleneck_analysis?: string
  messaging_pillars?: { pillar: string; example_headline: string; rationale: string }[]
  target_audiences?: { segment: string; messaging_angle: string; channels: string[] }[]
  channel_strategy?: { channel: string; budget_pct: number; objective: string; tactics: string[] }[]
  content_calendar?: { week: number; focus: string; deliverables: string[]; channels: string[] }[]
  quick_wins?: string[]
  tab_directives?: {
    creative?: string
    google_ads?: string
    tiktok?: string
    video?: string
    landing_pages?: string
  }
}

interface SpendData {
  budgetTier?: string
  monthlyBudget?: { min: number; max: number }
  channels?: Record<string, number>
}

// Filter types to show only relevant info per tab
type TabFilter = 'all' | 'google-ads' | 'tiktok' | 'video' | 'landing-pages' | 'creative'

/**
 * Lightweight marketing plan context bar. Shows relevant plan details
 * for the current tab. Fetches plan data once and caches it.
 */
export default function PlanContextBar({ facilityId, adminKey, darkMode, filter }: {
  facilityId: string
  adminKey: string
  darkMode: boolean
  filter?: TabFilter
}) {
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [_spend, setSpend] = useState<SpendData | null>(null)
  const [playbooks, setPlaybooks] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'

  useEffect(() => {
    fetch(`/api/marketing-plan?facilityId=${facilityId}`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => {
        if (data.plan) {
          const pj = typeof data.plan.plan_json === 'string' ? JSON.parse(data.plan.plan_json) : data.plan.plan_json
          setPlan(pj)
          if (data.plan.spend_recommendation) {
            const sr = typeof data.plan.spend_recommendation === 'string' ? JSON.parse(data.plan.spend_recommendation) : data.plan.spend_recommendation
            setSpend(sr)
          }
          if (data.plan.assigned_playbooks) setPlaybooks(data.plan.assigned_playbooks)
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [facilityId, adminKey])

  if (!loaded || !plan) return null

  // Filter content by tab relevance
  const relevantChannels = plan.channel_strategy?.filter(ch => {
    if (!filter || filter === 'all' || filter === 'creative') return true
    if (filter === 'google-ads') return /google|search|ppc|display/i.test(ch.channel)
    if (filter === 'tiktok') return /tiktok|social|organic|video/i.test(ch.channel)
    if (filter === 'video') return /video|tiktok|social|youtube/i.test(ch.channel)
    if (filter === 'landing-pages') return true // all channels need landing pages
    return true
  })

  const relevantAudiences = plan.target_audiences?.filter(a => {
    if (!filter || filter === 'all' || filter === 'creative' || filter === 'landing-pages') return true
    if (filter === 'google-ads') return a.channels?.some(c => /google|search/i.test(c))
    if (filter === 'tiktok' || filter === 'video') return a.channels?.some(c => /tiktok|social|video/i.test(c))
    return true
  })

  // Build the context line based on filter
  let contextLabel = 'Marketing Plan'
  let contextHint = ''
  if (filter === 'google-ads') {
    contextLabel = 'Plan → Google Ads Strategy'
    const googleChannel = plan.channel_strategy?.find(c => /google|search/i.test(c.channel))
    contextHint = googleChannel ? `${googleChannel.budget_pct}% of budget — ${googleChannel.objective}` : ''
  } else if (filter === 'tiktok') {
    contextLabel = 'Plan → TikTok Content Strategy'
    contextHint = plan.messaging_pillars?.length ? `${plan.messaging_pillars.length} messaging themes to work from` : ''
  } else if (filter === 'video') {
    contextLabel = 'Plan → Video Content Direction'
    contextHint = plan.messaging_pillars?.length ? `Align video themes with these pillars` : ''
  } else if (filter === 'landing-pages') {
    contextLabel = 'Plan → Landing Page Alignment'
    contextHint = plan.target_audiences?.length ? `${plan.target_audiences.length} audience segments to build pages for` : ''
  }

  // Get the tab-specific directive
  const directiveMap: Record<string, string | undefined> = {
    'creative': plan.tab_directives?.creative,
    'google-ads': plan.tab_directives?.google_ads,
    'tiktok': plan.tab_directives?.tiktok,
    'video': plan.tab_directives?.video,
    'landing-pages': plan.tab_directives?.landing_pages,
  }
  const directive = filter ? directiveMap[filter] : null

  return (
    <div className={`border rounded-xl overflow-hidden ${darkMode ? 'border-emerald-800 bg-emerald-900/10' : 'border-emerald-200 bg-emerald-50/50'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center gap-2 text-left"
      >
        <Target size={13} className="text-emerald-500 flex-shrink-0" />
        <span className={`text-xs font-semibold ${text} flex-1`}>{contextLabel}</span>
        {contextHint && <span className={`text-[10px] ${sub} hidden sm:inline`}>{contextHint}</span>}
        {expanded ? <ChevronUp size={12} className={sub} /> : <ChevronDown size={12} className={sub} />}
      </button>

      {/* Directive — always visible, no expand needed */}
      {directive && (
        <div className={`px-4 py-2 flex items-start gap-2 border-t ${darkMode ? 'border-emerald-800 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'}`}>
          <Sparkles size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <p className={`text-xs ${text} leading-relaxed`}>{directive}</p>
        </div>
      )}

      {expanded && (
        <div className={`px-4 pb-3 space-y-3 border-t ${darkMode ? 'border-emerald-800' : 'border-emerald-200'}`}>
          {/* Summary */}
          {plan.summary && (
            <p className={`text-xs ${text} pt-2 leading-relaxed`}>{plan.summary}</p>
          )}

          {/* Bottleneck — always relevant */}
          {plan.bottleneck_analysis && (
            <div className={`text-xs p-2 rounded ${darkMode ? 'bg-red-900/15 text-red-300' : 'bg-red-50 text-red-700'}`}>
              <span className="font-semibold">Bottleneck:</span> {plan.bottleneck_analysis}
            </div>
          )}

          {/* Messaging Pillars — relevant for creative, tiktok, video, landing pages */}
          {plan.messaging_pillars?.length && (!filter || filter !== 'google-ads') ? (
            <div>
              <p className={`text-[10px] uppercase font-semibold ${sub} mb-1 flex items-center gap-1`}><MessageSquare size={10} /> Messaging Pillars</p>
              <div className="flex flex-wrap gap-1.5">
                {plan.messaging_pillars.map((m, i) => (
                  <span key={i} className={`text-[10px] px-2 py-1 rounded-lg ${darkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-700 border border-slate-200'}`}>
                    <span className="font-semibold">{m.pillar}</span> — "{m.example_headline}"
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Target Audiences — filtered by tab */}
          {relevantAudiences?.length ? (
            <div>
              <p className={`text-[10px] uppercase font-semibold ${sub} mb-1 flex items-center gap-1`}><Users size={10} /> Target Audiences</p>
              <div className="space-y-1">
                {relevantAudiences.map((a, i) => (
                  <div key={i} className={`text-xs p-2 rounded ${darkMode ? 'bg-slate-700/50' : 'bg-white border border-slate-100'}`}>
                    <span className={`font-semibold ${text}`}>{a.segment}</span>
                    <span className={` ${sub}`}> — {a.messaging_angle}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Channel Strategy — filtered by tab */}
          {relevantChannels?.length && filter !== 'creative' ? (
            <div>
              <p className={`text-[10px] uppercase font-semibold ${sub} mb-1 flex items-center gap-1`}><DollarSign size={10} /> Channel Strategy</p>
              {relevantChannels.map((ch, i) => (
                <div key={i} className={`text-xs p-2 rounded mb-1 ${darkMode ? 'bg-slate-700/50' : 'bg-white border border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${text}`}>{ch.channel}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">{ch.budget_pct}%</span>
                  </div>
                  <p className={sub}>{ch.objective}</p>
                  {ch.tactics?.length ? (
                    <ul className={`${sub} mt-1 space-y-0.5`}>
                      {ch.tactics.map((t, j) => <li key={j}>• {t}</li>)}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* Quick wins — only on creative tab */}
          {plan.quick_wins?.length && (filter === 'creative' || filter === 'all') ? (
            <div>
              <p className={`text-[10px] uppercase font-semibold ${sub} mb-1 flex items-center gap-1`}><Sparkles size={10} /> Quick Wins</p>
              <div className="space-y-0.5">
                {plan.quick_wins.map((w, i) => (
                  <p key={i} className={`text-xs ${text}`}>✓ {w}</p>
                ))}
              </div>
            </div>
          ) : null}

          {/* Playbooks */}
          {playbooks.length > 0 && (
            <p className={`text-[10px] ${sub}`}>Active playbooks: {playbooks.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  )
}
