import { CheckCircle2, Rocket, Linkedin, Globe } from 'lucide-react'
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
                  <Rocket size={14} /> Campaigns Live in 48–72 Hours
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
                  Stop Losing Recurring Revenue to Empty Units
                </h2>
                <p className="mt-4 text-lg text-slate-400">
                  Get a free facility audit from our team. We'll map your vacancy gaps, identify where
                  your funnel is leaking conversions, and show you the exact campaign architecture we'd
                  build. Operator to operator. No obligation. No sales deck.
                </p>
                <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-brand-400" /> No obligation
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-brand-400" /> Operator-to-operator
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-brand-400" /> 48–72hr launch
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
