import { useState } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { STORAGE_KEY } from './types'

export default function AdminLogin({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return
    setChecking(true)
    setError(false)
    try {
      const res = await fetch('/api/admin-leads', {
        headers: { 'X-Admin-Key': key.trim() },
      })
      if (res.status === 401) {
        setError(true)
        setChecking(false)
        return
      }
      if (!res.ok) throw new Error()
      localStorage.setItem(STORAGE_KEY, key.trim())
      onAuth(key.trim())
    } catch {
      setError(true)
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">StowStack Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your admin key to continue</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            placeholder="Admin key"
            value={key}
            onChange={e => { setKey(e.target.value); setError(false) }}
            autoFocus
            className={`w-full px-4 py-3 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${
              error ? 'border-red-300 bg-red-50' : 'border-slate-200'
            }`}
          />
          {error && <p className="text-xs text-red-600">Invalid admin key. Try again.</p>}
          <button
            type="submit"
            disabled={!key.trim() || checking}
            className="w-full py-3 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {checking ? <Loader2 size={16} className="animate-spin" /> : null}
            {checking ? 'Verifying...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
