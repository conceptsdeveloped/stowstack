import { useState, useEffect } from 'react'
import { Building2, Loader2, Zap, TrendingUp, Gem, Check, CheckCircle2, Copy, Eye, EyeOff, ArrowLeft, KeyRound } from 'lucide-react'
import { STORAGE_KEY } from './PartnerTypes'
import type { AuthState } from './PartnerTypes'

interface PartnerLoginProps {
  onLogin: (auth: AuthState) => void
}

interface CheckoutCredentials {
  orgSlug: string
  email: string
  tempPassword: string
  companyName: string
  plan: string
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    price: 750,
    setupFee: 500,
    color: 'emerald',
    features: ['Up to 10 facilities', '2 landing pages each', 'Meta ads', 'Monthly reporting', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: TrendingUp,
    price: 1500,
    setupFee: 1000,
    color: 'blue',
    popular: true,
    features: ['Up to 50 facilities', '5 landing pages each', 'Meta + Google', 'Weekly reporting', 'Slack channel', 'Call tracking'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Gem,
    price: null,
    setupFee: null,
    color: 'amber',
    features: ['Unlimited facilities', 'White-label option', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee'],
  },
]

export default function PartnerLogin({ onLogin }: PartnerLoginProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login')
  const [signupStep, setSignupStep] = useState<'info' | 'plan'>('info')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Signup fields
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [facilityCount, setFacilityCount] = useState('')

  // Checkout success state
  const [credentials, setCredentials] = useState<CheckoutCredentials | null>(null)
  const [showTempPassword, setShowTempPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // Password reset state
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Handle checkout success redirect and password reset token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Handle password reset token
    const resetParam = params.get('reset')
    if (resetParam) {
      window.history.replaceState({}, '', window.location.pathname)
      setResetToken(resetParam)
      setMode('reset')
      setLoading(true)
      fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', token: resetParam }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.error) {
            setError(data.error)
            setMode('login')
            setResetToken('')
          } else {
            setEmail(data.email || '')
            setOrgSlug(data.orgSlug || '')
          }
          setLoading(false)
        })
        .catch(() => {
          setError('Could not verify reset link. Please try again.')
          setMode('login')
          setLoading(false)
        })
      return
    }

    if (params.get('checkout') === 'success') {
      const sessionId = params.get('session_id')
      window.history.replaceState({}, '', window.location.pathname)
      if (sessionId) {
        setLoading(true)
        fetch(`/api/checkout-success?session_id=${encodeURIComponent(sessionId)}`)
          .then(r => r.json())
          .then(data => {
            if (data.error) {
              setError(data.error)
              setMode('login')
            } else {
              setCredentials(data)
              setEmail(data.email || '')
              setOrgSlug(data.orgSlug || '')
            }
            setLoading(false)
          })
          .catch(() => {
            setError('Could not retrieve your account details. Please check your email for credentials.')
            setMode('login')
            setLoading(false)
          })
      } else {
        setMode('login')
        setError('')
      }
    }
    if (params.get('checkout') === 'canceled') {
      window.history.replaceState({}, '', window.location.pathname)
      setMode('signup')
      setSignupStep('plan')
      setError('Checkout was canceled. You can try again or choose a different plan.')
    }
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !orgSlug.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: email.trim(), password: password.trim(), orgSlug: orgSlug.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Invalid credentials')
        setLoading(false)
        return
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      onLogin(data)
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  const submitForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !orgSlug.trim()) return
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const res = await fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email: email.trim(), orgSlug: orgSlug.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSuccessMessage('If an account exists with that email, you will receive a password reset link shortly.')
      }
    } catch {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) return
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', token: resetToken, newPassword }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSuccessMessage('Password reset successfully! You can now sign in.')
        setMode('login')
        setResetToken('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setError('Connection error. Please try again.')
    }
    setLoading(false)
  }

  const startCheckout = async (planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:partners@stowstack.co?subject=Enterprise Plan Inquiry'
      return
    }

    if (!companyName.trim() || !contactName.trim() || !email.trim()) {
      setError('Please fill out your company details first.')
      setSignupStep('info')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          facilityCount: facilityCount.trim(),
          plan: planId,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to start checkout')
        setLoading(false)
        return
      }
      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  const handleInfoNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim() || !contactName.trim() || !email.trim()) return
    setError('')
    setSignupStep('plan')
  }

  // Show checkout success with credentials
  if (credentials) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/20">
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome to StowStack!</h1>
            <p className="text-sm text-slate-500 mt-2">
              Your <span className="font-medium capitalize">{credentials.plan}</span> plan for <span className="font-medium">{credentials.companyName}</span> is now active.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Your Login Credentials</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Organization</p>
                  <code className="text-sm bg-slate-100 px-2 py-0.5 rounded font-mono">{credentials.orgSlug}</code>
                </div>
                <button onClick={() => copyToClipboard(credentials.orgSlug, 'org')} className="text-slate-400 hover:text-slate-600 p-1">
                  {copied === 'org' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Email</p>
                  <p className="text-sm font-medium">{credentials.email}</p>
                </div>
                <button onClick={() => copyToClipboard(credentials.email, 'email')} className="text-slate-400 hover:text-slate-600 p-1">
                  {copied === 'email' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 mb-0.5">Temporary Password</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-mono">
                      {showTempPassword ? credentials.tempPassword : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                    </code>
                    <button onClick={() => setShowTempPassword(!showTempPassword)} className="text-slate-400 hover:text-slate-600">
                      {showTempPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <button onClick={() => copyToClipboard(credentials.tempPassword, 'pass')} className="text-slate-400 hover:text-slate-600 p-1">
                  {copied === 'pass' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="bg-amber-50 px-5 py-3 border-t border-amber-100">
              <p className="text-[11px] text-amber-700">Save these credentials now. You'll be asked to change your password on first login.</p>
            </div>
          </div>

          <button
            onClick={() => {
              setOrgSlug(credentials.orgSlug)
              setEmail(credentials.email)
              setPassword(credentials.tempPassword)
              setCredentials(null)
              setMode('login')
            }}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            Sign In Now
          </button>
          <p className="text-xs text-slate-400 text-center mt-3">A copy of these credentials was also sent to your email.</p>
        </div>
      </div>
    )
  }

  if (loading && !credentials && !error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-sm text-slate-500">Setting up your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className={`w-full ${mode === 'signup' && signupStep === 'plan' ? 'max-w-2xl' : 'max-w-sm'}`}>
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/20">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Partner Portal</h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'forgot'
              ? 'Reset your password'
              : mode === 'reset'
              ? 'Set a new password'
              : mode === 'login'
              ? 'Sign in to your management dashboard'
              : signupStep === 'info'
              ? 'Create your partner account'
              : 'Choose your plan'}
          </p>
        </div>

        {/* Tab toggle */}
        {(mode === 'login' || mode === 'signup') && (
          <div className={`flex bg-slate-100 rounded-lg p-1 mb-4 ${mode === 'signup' && signupStep === 'plan' ? 'max-w-sm mx-auto' : ''}`}>
            <button
              onClick={() => { setMode('login'); setError(''); setSuccessMessage(''); setSignupStep('info') }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >Sign In</button>
            <button
              onClick={() => { setMode('signup'); setError(''); setSuccessMessage('') }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >Get Started</button>
          </div>
        )}

        {error && <p className="text-red-600 text-sm text-center mb-3">{error}</p>}
        {successMessage && <p className="text-emerald-600 text-sm text-center mb-3">{successMessage}</p>}

        {mode === 'login' ? (
          <form onSubmit={submitLogin} className="space-y-3">
            <input type="text" placeholder="Organization slug" value={orgSlug} onChange={e => setOrgSlug(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); setSuccessMessage('') }}
              className="w-full text-xs text-slate-400 hover:text-indigo-500 transition-colors"
            >
              Forgot your password?
            </button>
          </form>
        ) : mode === 'forgot' ? (
          <form onSubmit={submitForgotPassword} className="space-y-3">
            <input type="text" placeholder="Organization slug" value={orgSlug} onChange={e => setOrgSlug(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Send Reset Link'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMessage('') }}
              className="flex items-center gap-1 mx-auto text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft size={12} /> Back to sign in
            </button>
          </form>
        ) : mode === 'reset' ? (
          <form onSubmit={submitResetPassword} className="space-y-3">
            <div className="bg-indigo-50 rounded-lg px-4 py-3 text-sm text-indigo-700 flex items-center gap-2">
              <KeyRound size={16} />
              <span>Set a new password for <strong>{email}</strong></span>
            </div>
            <input type="password" placeholder="New password (min 8 characters)" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Reset Password'}
            </button>
          </form>
        ) : signupStep === 'info' ? (
          <form onSubmit={handleInfoNext} className="space-y-3">
            <input type="text" placeholder="Company name" value={companyName} onChange={e => setCompanyName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <input type="text" placeholder="Your name" value={contactName} onChange={e => setContactName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <input type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <input type="text" placeholder="How many facilities do you manage?" value={facilityCount} onChange={e => setFacilityCount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            <button type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all">
              Choose Plan
            </button>
          </form>
        ) : (
          /* ── Plan Picker ── */
          <div>
            <div className="grid sm:grid-cols-3 gap-3">
              {PLANS.map(p => {
                const Icon = p.icon
                return (
                  <div
                    key={p.id}
                    className={`relative bg-white rounded-xl border ${p.popular ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200'} p-5 flex flex-col`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                      p.color === 'emerald' ? 'bg-emerald-100 text-emerald-600'
                      : p.color === 'blue' ? 'bg-blue-100 text-blue-600'
                      : 'bg-amber-100 text-amber-600'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <h3 className="text-base font-bold">{p.name}</h3>
                    <div className="mt-1 mb-3">
                      {p.price !== null ? (
                        <>
                          <span className="text-2xl font-bold">${p.price.toLocaleString()}</span>
                          <span className="text-xs text-slate-500">/mo</span>
                          {p.setupFee !== null && (
                            <p className="text-[10px] text-slate-400 mt-0.5">+ ${p.setupFee} one-time setup</p>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-slate-500">Custom pricing</span>
                      )}
                    </div>
                    <ul className="space-y-1.5 mb-4 flex-1">
                      {p.features.map(f => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <Check size={12} className="text-green-500 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => startCheckout(p.id)}
                      disabled={loading}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                        p.popular
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
                          : p.id === 'enterprise'
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : p.price !== null ? 'Subscribe' : 'Contact Sales'}
                    </button>
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => setSignupStep('info')}
              className="mt-4 text-sm text-slate-500 hover:text-slate-700 transition-colors block mx-auto"
            >
              Back to details
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
