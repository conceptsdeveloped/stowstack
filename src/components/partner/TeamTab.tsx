import { useState, useEffect, useCallback } from 'react'
import { Loader2, UserPlus, Trash2, Mail } from 'lucide-react'
import type { OrgUser, AuthState } from './PartnerTypes'

export interface TeamTabProps {
  orgToken: string
  orgUser: AuthState['user']
  primaryColor: string
}

export default function TeamTab({ orgToken, orgUser, primaryColor }: TeamTabProps) {
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviting, setInviting] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/org-users', { headers: { 'X-Org-Token': orgToken } })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [orgToken])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await fetch('/api/org-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Org-Token': orgToken },
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim(), role: inviteRole }),
      })
      setInviteName('')
      setInviteEmail('')
      setShowInvite(false)
      fetchUsers()
    } catch { /* silent */ }
    setInviting(false)
  }

  const removeUser = async (userId: string) => {
    if (userId === orgUser.id) return
    await fetch('/api/org-users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Org-Token': orgToken },
      body: JSON.stringify({ userId }),
    })
    fetchUsers()
  }

  const isAdmin = orgUser.role === 'org_admin'

  const ROLE_LABELS: Record<string, string> = {
    org_admin: 'Admin',
    facility_manager: 'Manager',
    viewer: 'Viewer',
  }

  const ROLE_COLORS: Record<string, string> = {
    org_admin: 'bg-purple-100 text-purple-700',
    facility_manager: 'bg-blue-100 text-blue-700',
    viewer: 'bg-slate-100 text-slate-600',
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-slate-400" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Team Members</h2>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: primaryColor }}
          >
            <UserPlus size={14} /> Invite
          </button>
        )}
      </div>

      {showInvite && (
        <form onSubmit={invite} className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              placeholder="Name"
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              type="email"
              placeholder="Email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="viewer">Viewer</option>
              <option value="facility_manager">Facility Manager</option>
              <option value="org_admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                {u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{u.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  {u.status === 'invited' && <span className="text-[10px] text-amber-600 font-medium">Pending</span>}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Mail size={10} /> {u.email}
                  {u.last_login_at && <span className="text-slate-300 ml-2">Last login: {new Date(u.last_login_at).toLocaleDateString()}</span>}
                </div>
              </div>
            </div>
            {isAdmin && u.id !== orgUser.id && (
              <button onClick={() => removeUser(u.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Remove user">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-500">No team members yet. Invite your first team member above.</div>
        )}
      </div>
    </div>
  )
}
