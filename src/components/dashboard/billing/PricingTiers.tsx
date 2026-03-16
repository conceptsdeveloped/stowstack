import { CheckCircle2, Calculator } from 'lucide-react'
import type { ClientAccount } from './BillingConstants'
import { PRICING_TIERS } from './BillingConstants'

interface PricingTiersProps {
  clients: ClientAccount[]
  card: string
  muted: string
  subtle: string
  c: (light: string, dark: string) => string
}

export default function PricingTiers({ clients, card, muted, subtle, c }: PricingTiersProps) {
  return (
    <div className="space-y-6">
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-1">Managed Ad Spend Pricing Model</h3>
        <p className={`text-xs mb-4 ${muted}`}>
          Clients pay StowStack a single monthly invoice. We manage their ad accounts directly — better CPMs, consolidated reporting, developer-tier access.
          Every tier includes management fee + ad spend markup. Higher tiers get lower markup rates as a volume incentive.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING_TIERS.map(tier => {
            const TierIcon = tier.icon
            const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
              emerald: { bg: c('bg-emerald-50', 'bg-emerald-900/10'), border: c('border-emerald-200', 'border-emerald-800'), text: 'text-emerald-700', badge: c('bg-emerald-100 text-emerald-700', 'bg-emerald-900/30 text-emerald-400') },
              blue: { bg: c('bg-blue-50', 'bg-blue-900/10'), border: c('border-blue-200', 'border-blue-800'), text: 'text-blue-700', badge: c('bg-blue-100 text-blue-700', 'bg-blue-900/30 text-blue-400') },
              purple: { bg: c('bg-purple-50', 'bg-purple-900/10'), border: c('border-purple-200', 'border-purple-800'), text: 'text-purple-700', badge: c('bg-purple-100 text-purple-700', 'bg-purple-900/30 text-purple-400') },
              amber: { bg: c('bg-amber-50', 'bg-amber-900/10'), border: c('border-amber-200', 'border-amber-800'), text: 'text-amber-700', badge: c('bg-amber-100 text-amber-700', 'bg-amber-900/30 text-amber-400') },
            }
            const colors = colorMap[tier.color]
            const clientsOnTier = clients.filter(c => c.tier === tier.id).length

            return (
              <div key={tier.id} className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
                <div className="flex items-center gap-2 mb-3">
                  <TierIcon size={18} className={colors.text} />
                  <h4 className={`font-bold text-sm ${colors.text}`}>{tier.name}</h4>
                </div>
                <div className="space-y-2 mb-3">
                  <div>
                    <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>Monthly Ad Budget</p>
                    <p className="text-sm font-bold">${tier.monthlyAdMin.toLocaleString()} – ${tier.monthlyAdMax.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>Management Fee</p>
                    <p className="text-sm font-bold">{tier.managementFee > 0 ? `$${tier.managementFee.toLocaleString()}/mo` : 'Custom'}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>Ad Spend Markup</p>
                    <p className="text-sm font-bold">{tier.adMarkupPct}%</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>Setup Fee</p>
                    <p className="text-sm font-bold">{tier.setupFee > 0 ? `$${tier.setupFee.toLocaleString()}` : 'Custom'}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-wide font-medium ${muted}`}>Referral Credit</p>
                    <p className="text-sm font-bold">${tier.referralCredit} per signup</p>
                  </div>
                </div>
                <div className="space-y-1 mb-3">
                  {tier.features.map(f => (
                    <div key={f} className="flex items-center gap-1.5">
                      <CheckCircle2 size={10} className={colors.text} />
                      <span className="text-[10px]">{f}</span>
                    </div>
                  ))}
                </div>
                {clientsOnTier > 0 && (
                  <div className={`text-[10px] font-medium px-2 py-1 rounded-lg text-center ${colors.badge}`}>
                    {clientsOnTier} active client{clientsOnTier !== 1 ? 's' : ''}
                  </div>
                )}

                {/* Revenue per client calc */}
                <div className={`mt-3 pt-2 border-t ${c('border-slate-200', 'border-slate-700')}`}>
                  <p className={`text-[10px] ${subtle}`}>Revenue per client/mo:</p>
                  <p className="text-xs font-bold">
                    ${(tier.managementFee + (tier.monthlyAdMin + tier.monthlyAdMax) / 2 * tier.adMarkupPct / 100).toLocaleString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Unit Economics */}
      <div className={`rounded-xl border p-5 ${card}`}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Calculator size={16} className="text-blue-600" />
          Unit Economics by Tier
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={c('bg-slate-50', 'bg-slate-700/50')}>
                {['Tier', 'Avg Ad Spend', 'Mgmt Fee', 'Markup', 'Total Rev/Client', 'Margin', 'Break-even'].map(h => (
                  <th key={h} className={`px-3 py-2 text-left font-medium ${muted}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRICING_TIERS.map(tier => {
                const avgSpend = (tier.monthlyAdMin + tier.monthlyAdMax) / 2
                const markup = avgSpend * tier.adMarkupPct / 100
                const totalRev = tier.managementFee + markup
                const costPerClient = 400 // approx labor + tools
                const margin = ((totalRev - costPerClient) / totalRev * 100)
                const setupFee = tier.setupFee || 3000
                const breakeven = totalRev > costPerClient ? Math.ceil(setupFee / (totalRev - costPerClient)) : '—'

                return (
                  <tr key={tier.id} className={`border-t ${c('border-slate-100', 'border-slate-700')}`}>
                    <td className="px-3 py-2 font-semibold">{tier.name}</td>
                    <td className="px-3 py-2">${avgSpend.toLocaleString()}</td>
                    <td className="px-3 py-2">${tier.managementFee.toLocaleString()}</td>
                    <td className="px-3 py-2">${markup.toLocaleString()} ({tier.adMarkupPct}%)</td>
                    <td className="px-3 py-2 font-bold">${totalRev.toLocaleString()}/mo</td>
                    <td className="px-3 py-2">
                      <span className={margin > 60 ? 'text-emerald-600 font-semibold' : ''}>{margin.toFixed(0)}%</span>
                    </td>
                    <td className="px-3 py-2">{typeof breakeven === 'number' ? `${breakeven} mo` : breakeven}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
