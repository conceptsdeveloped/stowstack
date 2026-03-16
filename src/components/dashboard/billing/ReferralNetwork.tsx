import {
  Handshake, Gift, UserPlus, BadgeDollarSign, Trophy, Target,
  Plus, Share2, CheckCircle2
} from 'lucide-react'
import type { ClientAccount, Referral } from './BillingConstants'
import { REFERRAL_TIERS } from './BillingConstants'

interface ReferralNetworkProps {
  clients: ClientAccount[]
  referrals: Referral[]
  showNewReferral: boolean
  setShowNewReferral: (show: boolean) => void
  card: string
  muted: string
  subtle: string
  input: string
  c: (light: string, dark: string) => string
}

export default function ReferralNetwork({ clients, referrals, showNewReferral, setShowNewReferral, card, muted, subtle, input, c }: ReferralNetworkProps) {
  const activeReferrals = referrals.filter(r => r.status === 'active' || r.status === 'signed')
  const totalCreditsEarned = referrals.filter(r => ['active', 'signed'].includes(r.status)).reduce((s, r) => s + r.creditAmount, 0)
  const topReferrer = clients.reduce<{ name: string; count: number } | null>((best, cl) => {
    const count = referrals.filter(r => r.referrerCode === cl.referralCode && ['active', 'signed'].includes(r.status)).length
    if (!best || count > best.count) return { name: cl.name, count }
    return best
  }, null)

  return (
    <div className="space-y-6">
      {/* How It Works */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
          <Handshake size={16} className="text-amber-600" />
          Referral Network — The Storage Conference Growth Engine
        </h3>
        <p className={`text-xs mb-4 ${muted}`}>
          Self-storage is tight-knit. Operators talk at SSA, ISS World, state expos, and REIA meetups.
          One happy client at a conference table of 8 operators is your best sales channel.
          Make it easy and rewarding to refer.
        </p>

        <div className="grid sm:grid-cols-4 gap-3 mb-4">
          {[
            { step: '1', title: 'Client Gets Unique Code', desc: 'Every signed client gets a referral code. Printed on business cards, shared at conferences.', icon: Gift },
            { step: '2', title: 'Referred Operator Signs Up', desc: 'New operator submits an audit using the referral code. We track attribution.', icon: UserPlus },
            { step: '3', title: 'Both Earn Credits', desc: 'Referrer gets invoice credit. New client gets discount on first month.', icon: BadgeDollarSign },
            { step: '4', title: 'Tier Up for More', desc: 'More referrals = higher tier = bigger credits per referral. Platinum = $1,500/ref.', icon: Trophy },
          ].map(s => (
            <div key={s.step} className={`rounded-lg border p-3 ${c('border-slate-100', 'border-slate-700')}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">{s.step}</span>
                <s.icon size={14} className={muted} />
              </div>
              <p className="text-xs font-semibold mb-0.5">{s.title}</p>
              <p className={`text-[10px] ${subtle}`}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Referral Tiers */}
        <h4 className={`text-xs font-semibold mb-2 ${muted}`}>REFERRAL REWARD TIERS</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {REFERRAL_TIERS.map(tier => {
            const TierIcon = tier.icon
            return (
              <div key={tier.label} className={`rounded-lg border p-3 text-center ${c('border-slate-100', 'border-slate-700')}`}>
                <TierIcon size={20} className={`mx-auto mb-1 ${
                  tier.color === 'slate' ? 'text-slate-400' :
                  tier.color === 'blue' ? 'text-blue-500' :
                  tier.color === 'amber' ? 'text-amber-500' :
                  'text-purple-500'
                }`} />
                <p className="text-xs font-bold">{tier.label}</p>
                <p className={`text-[10px] ${subtle}`}>{tier.min}–{tier.max === Infinity ? '\u221E' : tier.max} referrals</p>
                <p className="text-sm font-bold text-emerald-600">${tier.rate}/ref</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Referrals', value: referrals.length },
          { label: 'Converted', value: activeReferrals.length },
          { label: 'Credits Earned', value: `$${totalCreditsEarned.toLocaleString()}` },
          { label: 'Top Referrer', value: topReferrer ? `${topReferrer.name} (${topReferrer.count})` : '—' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${card}`}>
            <p className={`text-[10px] uppercase tracking-wide font-medium mb-1 ${muted}`}>{k.label}</p>
            <p className="text-lg font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Referral Log */}
      <div className={`rounded-xl border ${card}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${c('border-slate-100', 'border-slate-700')}`}>
          <h3 className="font-semibold text-sm">Referral Activity</h3>
          <button onClick={() => setShowNewReferral(!showNewReferral)} className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700">
            <Plus size={14} /> Log Referral
          </button>
        </div>

        {showNewReferral && (
          <div className={`px-4 py-3 border-b ${c('border-slate-100 bg-slate-50', 'border-slate-700 bg-slate-800/50')}`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <select className={`text-xs px-2 py-1.5 rounded-lg border ${input}`}>
                <option value="">Referring Client...</option>
                {clients.map(c => <option key={c.id} value={c.referralCode}>{c.facilityName}</option>)}
              </select>
              <input type="text" placeholder="Referred Name" className={`text-xs px-2 py-1.5 rounded-lg border ${input}`} />
              <input type="email" placeholder="Referred Email" className={`text-xs px-2 py-1.5 rounded-lg border ${input}`} />
              <input type="text" placeholder="Source (conference, etc.)" className={`text-xs px-2 py-1.5 rounded-lg border ${input}`} />
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800">Log Referral</button>
              <button onClick={() => setShowNewReferral(false)} className={`px-3 py-1.5 text-xs ${muted}`}>Cancel</button>
            </div>
          </div>
        )}

        {referrals.length === 0 ? (
          <div className={`px-4 py-12 text-center ${muted}`}>
            <Share2 size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No referrals yet</p>
            <p className={`text-xs mt-1 ${subtle}`}>Share referral codes at your next storage conference</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {referrals.map(ref => (
              <div key={ref.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    ref.status === 'active' ? c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') :
                    ref.status === 'signed' ? c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') :
                    ref.status === 'pending' ? c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400') :
                    c('bg-slate-100 text-slate-500', 'bg-slate-700 text-slate-400')
                  }`}>
                    {ref.referredName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{ref.referredName}</p>
                    <p className={`text-[10px] ${subtle}`}>
                      Referred by {ref.referrerName} — {ref.source}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-600">${ref.creditAmount}</p>
                    <p className={`text-[10px] ${subtle}`}>{ref.createdAt}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    ref.status === 'active' ? c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') :
                    ref.status === 'signed' ? c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') :
                    ref.status === 'pending' ? c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400') :
                    c('bg-slate-100 text-slate-500', 'bg-slate-700 text-slate-400')
                  }`}>{ref.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conference Playbook */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Target size={16} className="text-purple-600" />
          Conference Referral Playbook
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h4 className={`text-xs font-semibold mb-2`}>BEFORE THE EVENT</h4>
            <ul className="space-y-1">
              {[
                'Print referral code cards for every active client attending',
                'Pre-load referral landing page with conference-specific offer',
                'Brief clients on the credit they earn per referral',
                'Set up QR code linking to audit form with ref code pre-filled',
              ].map(item => (
                <li key={item} className="flex items-start gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span className={`text-[11px] ${muted}`}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className={`text-xs font-semibold mb-2`}>AT THE EVENT</h4>
            <ul className="space-y-1">
              {[
                'Clients introduce you as "their ad guy who actually tracks move-ins"',
                'Show the operator dashboard on your phone — live data sells',
                'Collect business cards and log as referrals immediately',
                'Offer "conference special" — waived setup fee for signed referrals',
              ].map(item => (
                <li key={item} className="flex items-start gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span className={`text-[11px] ${muted}`}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
