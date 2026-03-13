import { useState } from 'react'
import {
  Building2, Lock, Mail, Eye, EyeOff, ArrowRight, Shield, Zap
} from 'lucide-react'

const BRAND = 'StowStack'

export default function ClientLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please enter both fields'); return }
    setLoading(true)
    // simulate login
    setTimeout(() => {
      if (password.length >= 4) {
        localStorage.setItem('stowstack_client', JSON.stringify({ email, name: email.split('@')[0], ts: Date.now() }))
        onLogin()
      } else {
        setError('Invalid credentials. Please try again.')
        setLoading(false)
      }
    }, 1000)
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />

      <div className="relative max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 gradient-brand rounded-xl flex items-center justify-center animate-pulse-glow">
              <Building2 size={24} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-xl text-white">{BRAND}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Client Portal</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-sm text-slate-400">Sign in to your facility dashboard</p>
        </div>

        {/* Login Card */}
        <div className="glass-dark rounded-2xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl pl-10 pr-12 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-brand-500" />
                <span className="text-xs text-slate-400">Remember me</span>
              </label>
              <button type="button" className="text-xs text-brand-400 hover:text-brand-300 cursor-pointer">Forgot password?</button>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full gradient-brand text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/50 text-center">
            <p className="text-xs text-slate-500">
              Not a client yet?{' '}
              <button onClick={onBack} className="text-brand-400 hover:text-brand-300 font-medium cursor-pointer">Get a Free Facility Audit</button>
            </p>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Shield size={12} /> 256-bit Encrypted</span>
          <span className="flex items-center gap-1.5"><Zap size={12} /> Real-time Data</span>
        </div>
      </div>
    </div>
  )
}
