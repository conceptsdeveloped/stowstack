import { useState } from 'react'
import { Send, Save, X } from 'lucide-react'
import { PLATFORM_CONFIG, POST_TYPES, type Platform, type PostType } from './SocialTypes'

interface PostComposerProps {
  facilityId: string
  adminKey: string
  darkMode: boolean
  onCreated: () => void
  onClose: () => void
}

export default function PostComposer({ facilityId, adminKey, darkMode, onCreated, onClose }: PostComposerProps) {
  const [platform, setPlatform] = useState<Platform>('facebook')
  const [postType, setPostType] = useState<PostType>('tip')
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)

  const card = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  const platformConfig = PLATFORM_CONFIG[platform]

  const charLimit = platform === 'facebook' ? 63206 : platform === 'instagram' ? 2200 : 1500
  const charCount = content.length

  async function handleSave(publishNow: boolean) {
    if (!content.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        facilityId,
        platform,
        postType,
        content: content.trim(),
        hashtags: hashtags ? hashtags.split(/[\s,]+/).filter(Boolean).map(h => h.startsWith('#') ? h : `#${h}`) : [],
        ctaUrl: ctaUrl || null,
        scheduledAt: scheduledAt || null,
      }

      const res = await fetch('/api/social-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to save post')

      if (publishNow) {
        const data = await res.json()
        await fetch('/api/publish-social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
          body: JSON.stringify({ postId: data.post.id }),
        })
      }

      onCreated()
      onClose()
    } catch {
      alert('Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto ${card}`} onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className={`font-bold ${text}`}>Create Post</h3>
            <button onClick={onClose} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <X size={16} className={sub} />
            </button>
          </div>

          {/* Platform tabs */}
          <div className="flex gap-1">
            {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setPlatform(key)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  platform === key
                    ? `${config.color} text-white`
                    : darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {config.icon} {config.label}
              </button>
            ))}
          </div>

          {/* Post type */}
          <div>
            <label className={`text-xs font-medium ${sub}`}>Post Type</label>
            <select value={postType} onChange={e => setPostType(e.target.value as PostType)} className={`w-full mt-1 rounded-lg border px-3 py-2 text-sm ${inputBg}`}>
              {Object.entries(POST_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.icon} {config.label}</option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between">
              <label className={`text-xs font-medium ${sub}`}>Content</label>
              <span className={`text-xs ${charCount > charLimit ? 'text-red-500' : sub}`}>{charCount}/{charLimit}</span>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={
                platform === 'facebook' ? 'Write your Facebook post...'
                  : platform === 'instagram' ? 'Write your Instagram caption...'
                    : 'Write your Google Business post...'
              }
              className={`w-full mt-1 rounded-lg border p-3 text-sm resize-none ${inputBg}`}
              rows={6}
            />
          </div>

          {/* Hashtags (Instagram) */}
          {platform === 'instagram' && (
            <div>
              <label className={`text-xs font-medium ${sub}`}>Hashtags (space or comma separated)</label>
              <input
                value={hashtags}
                onChange={e => setHashtags(e.target.value)}
                placeholder="#storage #moving #organization #selfstorage"
                className={`w-full mt-1 rounded-lg border px-3 py-2 text-sm ${inputBg}`}
              />
            </div>
          )}

          {/* CTA URL */}
          <div>
            <label className={`text-xs font-medium ${sub}`}>Link URL (optional)</label>
            <input
              value={ctaUrl}
              onChange={e => setCtaUrl(e.target.value)}
              placeholder="https://..."
              className={`w-full mt-1 rounded-lg border px-3 py-2 text-sm ${inputBg}`}
            />
          </div>

          {/* Schedule */}
          <div>
            <label className={`text-xs font-medium ${sub}`}>Schedule (optional, leave blank for draft)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className={`w-full mt-1 rounded-lg border px-3 py-2 text-sm ${inputBg}`}
            />
          </div>

          {/* Preview hint */}
          <div className={`rounded-lg p-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${platformConfig.dotColor}`} />
              <span className={`text-xs font-medium ${platformConfig.textColor}`}>{platformConfig.label} Preview</span>
            </div>
            <p className={`text-xs ${sub} whitespace-pre-wrap`}>
              {content || 'Your post will appear here...'}
            </p>
            {platform === 'instagram' && hashtags && (
              <p className="text-xs text-blue-400 mt-1">
                {hashtags.split(/[\s,]+/).filter(Boolean).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !content.trim()}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                darkMode ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Save size={14} /> {scheduledAt ? 'Schedule' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving || !content.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Send size={14} /> Publish Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
