import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'

type TabFilter = 'all' | 'google-ads' | 'tiktok' | 'video' | 'landing-pages' | 'creative'

/**
 * Simple directive bar — shows one actionable instruction
 * for the current tab based on the marketing plan.
 * No expand, no full plan. Just the nudge.
 */
export default function PlanContextBar({ facilityId, adminKey, darkMode, filter }: {
  facilityId: string
  adminKey: string
  darkMode: boolean
  filter?: TabFilter
}) {
  const [directive, setDirective] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const text = darkMode ? 'text-slate-100' : 'text-slate-900'

  useEffect(() => {
    fetch(`/api/marketing-plan?facilityId=${facilityId}`, { headers: { 'X-Admin-Key': adminKey } })
      .then(r => r.json())
      .then(data => {
        if (data.plan?.plan_json) {
          const pj = typeof data.plan.plan_json === 'string' ? JSON.parse(data.plan.plan_json) : data.plan.plan_json
          const directives = pj.tab_directives
          if (directives && filter) {
            const map: Record<string, string | undefined> = {
              'creative': directives.creative,
              'google-ads': directives.google_ads,
              'tiktok': directives.tiktok,
              'video': directives.video,
              'landing-pages': directives.landing_pages,
            }
            setDirective(map[filter] || null)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [facilityId, adminKey, filter])

  if (!loaded || !directive) return null

  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${darkMode ? 'border-emerald-800 bg-emerald-900/15' : 'border-emerald-200 bg-emerald-50'}`}>
      <Sparkles size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
      <p className={`text-xs ${text} leading-relaxed`}>{directive}</p>
    </div>
  )
}
