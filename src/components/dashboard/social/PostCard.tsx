import { useState } from 'react'
import {
  Send, Pencil, Trash2, Clock, CheckCircle2, AlertCircle,
  Loader2, ChevronDown, ChevronUp, Image as ImageIcon,
} from 'lucide-react'
import { type SocialPost, PLATFORM_CONFIG, POST_TYPES, STATUS_CONFIG } from './SocialTypes'

interface PostCardProps {
  post: SocialPost
  darkMode: boolean
  adminKey: string
  onUpdate: () => void
}

export default function PostCard({ post, darkMode, adminKey, onUpdate }: PostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const card = darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'
  const text = darkMode ? 'text-slate-100' : 'text-slate-900'
  const sub = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-200 text-slate-900'

  const platform = PLATFORM_CONFIG[post.platform]
  const postType = POST_TYPES[post.post_type as keyof typeof POST_TYPES] || { label: post.post_type, icon: '📝' }
  const status = STATUS_CONFIG[post.status]

  async function handlePublish() {
    setPublishing(true)
    try {
      const res = await fetch('/api/publish-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ postId: post.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Publish failed')
      }
      onUpdate()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/social-posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ id: post.id, content: editContent }),
      })
      setEditing(false)
      onUpdate()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this post?')) return
    setDeleting(true)
    try {
      await fetch(`/api/social-posts?id=${post.id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey },
      })
      onUpdate()
    } finally {
      setDeleting(false)
    }
  }

  async function handleSchedule() {
    await fetch('/api/social-posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ id: post.id, status: 'scheduled' }),
    })
    onUpdate()
  }

  const scheduledDate = post.scheduled_at ? new Date(post.scheduled_at) : null
  const truncatedContent = post.content.length > 120 ? post.content.slice(0, 120) + '...' : post.content

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${card} ${expanded ? 'ring-1 ring-emerald-500/20' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-3">
        {/* Platform dot */}
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${platform.dotColor}`} />

        {/* Content preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium ${platform.textColor}`}>{platform.icon} {platform.label}</span>
            <span className={`text-xs ${sub}`}>·</span>
            <span className={`text-xs ${sub}`}>{postType.icon} {postType.label}</span>
            {post.ai_generated && <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>AI</span>}
            <span className={`text-xs px-1.5 py-0.5 rounded ${status.bg} ${status.text}`}>{status.label}</span>
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className={`w-full rounded-lg border p-2 text-sm resize-none ${inputBg}`}
                rows={5}
              />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setEditContent(post.content) }} className={`px-3 py-1 border rounded-lg text-xs ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-sm ${text} cursor-pointer`} onClick={() => setExpanded(!expanded)}>
              {expanded ? post.content : truncatedContent}
            </p>
          )}

          {/* Scheduled date */}
          {scheduledDate && (
            <p className={`text-xs mt-1.5 flex items-center gap-1 ${sub}`}>
              <Clock size={11} />
              {scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}

          {/* Hashtags */}
          {expanded && post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.hashtags.map((tag, i) => (
                <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Suggested image */}
          {expanded && post.suggested_image && (
            <div className={`mt-2 flex items-start gap-2 rounded-lg p-2 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              <ImageIcon size={14} className={sub} />
              <p className={`text-xs ${sub}`}>{post.suggested_image}</p>
            </div>
          )}

          {/* Error message */}
          {post.error_message && (
            <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
              <AlertCircle size={11} /> {post.error_message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {post.status === 'draft' && (
            <>
              <button onClick={handleSchedule} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Schedule">
                <Clock size={14} className="text-blue-500" />
              </button>
              <button onClick={handlePublish} disabled={publishing} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Publish now">
                {publishing ? <Loader2 size={14} className="animate-spin text-emerald-500" /> : <Send size={14} className="text-emerald-500" />}
              </button>
            </>
          )}
          {post.status === 'scheduled' && (
            <button onClick={handlePublish} disabled={publishing} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Publish now">
              {publishing ? <Loader2 size={14} className="animate-spin text-emerald-500" /> : <Send size={14} className="text-emerald-500" />}
            </button>
          )}
          {(post.status === 'draft' || post.status === 'scheduled') && (
            <>
              <button onClick={() => { setEditing(true); setExpanded(true) }} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Edit">
                <Pencil size={14} className={sub} />
              </button>
              <button onClick={handleDelete} disabled={deleting} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Delete">
                <Trash2 size={14} className="text-red-400" />
              </button>
            </>
          )}
          {post.status === 'published' && post.external_url && (
            <a href={post.external_url} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="View post">
              <CheckCircle2 size={14} className="text-emerald-500" />
            </a>
          )}
          <button onClick={() => setExpanded(!expanded)} className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            {expanded ? <ChevronUp size={14} className={sub} /> : <ChevronDown size={14} className={sub} />}
          </button>
        </div>
      </div>
    </div>
  )
}
