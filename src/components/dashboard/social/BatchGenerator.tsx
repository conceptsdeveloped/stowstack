import { useState } from 'react'
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { PLATFORM_CONFIG, POST_TYPES, type Platform, type PostType } from './SocialTypes'

interface BatchGeneratorProps {
  facilityId: string
  adminKey: string
  darkMode: boolean
  onGenerated: () => void
  onClose: () => void
}

const TONE_OPTIONS = [
  { value: 'friendly', label: 'Friendly & Approachable', desc: 'Warm, conversational, uses emojis' },
  { value: 'professional', label: 'Professional', desc: 'Clean, authoritative, no slang' },
  { value: 'urgent', label: 'Urgency-driven', desc: 'Direct, action-oriented, time-sensitive' },
  { value: 'premium', label: 'Premium', desc: 'Polished, high-end feel' },
]

export default function BatchGenerator({ facilityId, adminKey, darkMode, onGenerated, onClose }: BatchGeneratorProps) {
  const [platforms, setPlatforms] = useState<Platform[]>(['facebook', 'instagram', 'gbp'])
  const [postTypes, setPostTypes] = useState<PostType[]>(['promotion', 'tip', 'seasonal', 'community'])
  const [count, setCount] = useState(10)
  const [timeframe, setTimeframe] = useState(14)
  const [tone, setTone] = useState('friendly')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  function togglePlatform(p: Platform) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  function togglePostType(t: PostType) {
    setPostTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  async function handleGenerate() {
    if (platforms.length === 0) return setError('Select at least one platform')
    if (postTypes.length === 0) return setError('Select at least one post type')

    setGenerating(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/generate-social-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({
          facilityId,
          platforms,
          count,
          timeframeDays: timeframe,
          postTypes,
          tone,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Generation failed')
      }

      const data = await res.json()
      setResult({ count: data.count })
      onGenerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4`} onClick={onClose}>
      <div className={`border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto ${card}`} onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Sparkles size={20} className="text-violet-500" />
            </div>
            <div>
              <h3 className={`font-bold ${text}`}>Generate Social Content</h3>
              <p className={`text-xs ${sub}`}>AI creates a batch of posts using your facility data</p>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className={`text-xs font-medium uppercase tracking-wider ${sub}`}>Platforms</label>
            <div className="flex gap-2 mt-2">
              {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => togglePlatform(key)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    platforms.includes(key)
                      ? `${config.color} text-white border-transparent`
                      : darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post types */}
          <div>
            <label className={`text-xs font-medium uppercase tracking-wider ${sub}`}>Post Types</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(Object.entries(POST_TYPES) as [PostType, typeof POST_TYPES[PostType]][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => togglePostType(key)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                    postTypes.includes(key)
                      ? 'bg-emerald-500 text-white border-transparent'
                      : darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count & timeframe */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-xs font-medium ${sub}`}>Number of Posts</label>
              <select value={count} onChange={e => setCount(Number(e.target.value))} className={`w-full mt-1 rounded-lg border px-3 py-2 text-sm ${inputBg}`}>
                <option value={5}>5 posts</option>
                <option value={8}>8 posts</option>
                <option value={10}>10 posts</option>
                <option value={14}>14 posts (2 weeks)</option>
                <option value={20}>20 posts</option>
              </select>
            </div>
            <div>
              <label className={`text-xs font-medium ${sub}`}>Timeframe</label>
              <select value={timeframe} onChange={e => setTimeframe(Number(e.target.value))} className={`w-full mt-1 rounded-lg border px-3 py-2 text-sm ${inputBg}`}>
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={21}>3 weeks</option>
                <option value={30}>1 month</option>
              </select>
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className={`text-xs font-medium uppercase tracking-wider ${sub}`}>Tone of Voice</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {TONE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`px-3 py-2 rounded-lg border text-left transition-all ${
                    tone === t.value
                      ? 'bg-emerald-500 text-white border-transparent'
                      : darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <p className="text-xs font-medium">{t.label}</p>
                  <p className={`text-[10px] mt-0.5 ${tone === t.value ? 'text-emerald-100' : sub}`}>{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Result / Error */}
          {result && (
            <div className={`rounded-lg p-3 flex items-center gap-2 ${darkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
              <CheckCircle2 size={16} className="text-emerald-500" />
              <p className="text-sm text-emerald-600">{result.count} posts generated as drafts. Review them in the calendar!</p>
            </div>
          )}
          {error && (
            <div className={`rounded-lg p-3 flex items-center gap-2 ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
              <AlertTriangle size={16} className="text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating || platforms.length === 0 || postTypes.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <><Loader2 size={16} className="animate-spin" /> Generating {count} posts...</>
              ) : (
                <><Sparkles size={16} /> Generate {count} Posts</>
              )}
            </button>
            <button onClick={onClose} className={`px-4 py-2.5 border rounded-xl text-sm font-medium ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {result ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
