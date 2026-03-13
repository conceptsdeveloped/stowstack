import { CheckCircle2, Rocket, Linkedin, Globe, Phone, Clock, Shield } from 'lucide-react'
import ScrollReveal from '../ScrollReveal'
import AuditIntakeForm from '../forms/AuditIntakeForm'

export default function CTA() {
  return (
    <section id="cta" className="py-20 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <ScrollReveal animation="animate-fade-left">
              <div>
                <div className="inline-flex items-center gap-2 bg-brand-500/20 text-brand-300 px-4 py-1.5 rounded-full text-sm font-medium mb-4 border border-brand-500/30">
                  <Rocket size={14} /> Campaigns Live in 48 to 72 Hours
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                  Stop Losing Recurring Revenue to Empty Units
                </h2>
                <p className="mt-4 text-lg text-slate-400">
                  Get a free facility audit from our team. We will map your vacancy gaps, identify where
                  your funnel is leaking conversions, and show you the exact campaign architecture we would
                  build. Operator to operator. No obligation. No sales deck.
                </p>
                <div className="mt-6 space-y-2.5">
                  <span className="flex items-center gap-2.5 text-sm text-slate-400">
                    <CheckCircle2 size={16} className="text-brand-400 shrink-0" /> No obligation, no contracts required
                  </span>
                  <span className="flex items-center gap-2.5 text-sm text-slate-400">
                    <CheckCircle2 size={16} className="text-brand-400 shrink-0" /> Operator-to-operator, we run our own facilities
                  </span>
                  <span className="flex items-center gap-2.5 text-sm text-slate-400">
                    <CheckCircle2 size={16} className="text-brand-400 shrink-0" /> Campaign launch in 48 to 72 hours
                  </span>
                  <span className="flex items-center gap-2.5 text-sm text-slate-400">
                    <CheckCircle2 size={16} className="text-brand-400 shrink-0" /> Blake personally reviews every audit
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="https://linkedin.com/in/mruhaul"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    <Linkedin size={16} /> Connect on LinkedIn
                  </a>
                  <a
                    href="https://midwayselfstoragemi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    <Globe size={16} /> See Our Facility
                  </a>
                </div>
                {/* Trust badges */}
                <div className="mt-6 pt-5 border-t border-slate-700/50 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><Shield size={12} className="text-slate-400" /> Data kept private</span>
                  <span className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400" /> Response within 24hrs</span>
                  <a href="tel:+12699298541" className="flex items-center gap-1.5 hover:text-slate-300 transition-colors"><Phone size={12} className="text-slate-400" /> 269-929-8541</a>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal animation="animate-fade-right">
              <AuditIntakeForm />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}
