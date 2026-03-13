import { Building2, ArrowLeft, BookOpen, Shield, Users, BarChart3, Mail, ClipboardList, Target, TrendingUp, MessageSquare, Bell, Download, CalendarClock, CheckSquare, Sparkles } from 'lucide-react'

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {n}
      </div>
      <div className="text-sm text-slate-600 leading-relaxed">{children}</div>
    </div>
  )
}

function Section({ id, icon: Icon, title, children }: { id: string; icon: any; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Icon size={20} className="text-emerald-600" /> {title}
        </h2>
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-2">{title}</h3>
      <div className="space-y-2 pl-1">
        {children}
      </div>
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
      {children}
    </div>
  )
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{label}</span>
}

export default function GuidePage({ onBack }: { onBack: () => void }) {
  const tocItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'admin-getting-started', label: 'Admin: Getting Started' },
    { id: 'admin-pipeline', label: 'Admin: Lead Pipeline' },
    { id: 'admin-tools', label: 'Admin: Lead Tools' },
    { id: 'admin-portfolio', label: 'Admin: Portfolio & Alerts' },
    { id: 'admin-insights', label: 'Admin: Insights & Analytics' },
    { id: 'client-login', label: 'Client Portal: Login' },
    { id: 'client-dashboard', label: 'Client Portal: Dashboard' },
    { id: 'client-onboarding', label: 'Client Portal: Onboarding' },
    { id: 'client-messages', label: 'Client Portal: Messages' },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 sticky top-0 z-30 bg-white">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
            <Building2 size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight font-['Space_Grotesk']">
            Stow<span className="text-emerald-600">Stack</span>
          </span>
          <span className="text-xs text-slate-400 ml-1">/ Guide</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">How to Use StowStack</h1>
          <p className="text-slate-500 text-sm">Everything you need to know about managing leads, tracking campaigns, and getting the most out of the platform.</p>
        </div>

        {/* Table of Contents */}
        <nav className="bg-white rounded-xl border border-slate-200 p-5 mb-8">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <BookOpen size={14} /> Contents
          </h2>
          <div className="grid sm:grid-cols-2 gap-1">
            {tocItems.map(item => (
              <a key={item.id} href={`#${item.id}`}
                className="text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg px-3 py-1.5 transition-colors">
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Sections */}
        <div className="space-y-6">

          {/* Overview */}
          <Section id="overview" icon={Building2} title="Platform Overview">
            <p className="text-sm text-slate-600 leading-relaxed">
              StowStack is a full-stack marketing platform built for self-storage operators. It connects three core tools:
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Admin Dashboard</p>
                <p className="text-sm text-slate-700">Manage your entire lead pipeline, track client performance, generate audits, and send emails.</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Client Portal</p>
                <p className="text-sm text-slate-700">Your clients see their own dashboard with campaign metrics, charts, onboarding progress, and messages.</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Marketing Site</p>
                <p className="text-sm text-slate-700">The public-facing website at stowstack.co with the audit intake form that generates leads.</p>
              </div>
            </div>
          </Section>

          {/* Admin: Getting Started */}
          <Section id="admin-getting-started" icon={Shield} title="Admin Dashboard: Getting Started">
            <Step n={1}>
              Navigate to <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">/admin</code> in your browser.
            </Step>
            <Step n={2}>
              Enter your admin key to authenticate. This key is stored in your browser so you don't need to re-enter it each session.
            </Step>
            <Step n={3}>
              You'll land on the <strong>Pipeline</strong> tab — your main workspace for managing leads.
            </Step>
            <InfoBox>
              The admin dashboard has three main tabs: <strong>Pipeline</strong> (lead management), <strong>Portfolio</strong> (client campaign performance), and <strong>Insights</strong> (analytics and activity feed).
            </InfoBox>
          </Section>

          {/* Admin: Pipeline */}
          <Section id="admin-pipeline" icon={Users} title="Admin: Lead Pipeline">
            <SubSection title="Lead Stages">
              <p className="text-sm text-slate-600">Every lead moves through a 7-stage pipeline. Click any stage button on a lead card to advance it:</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <StatusBadge label="Submitted" color="bg-blue-100 text-blue-700" />
                <span className="text-slate-300">→</span>
                <StatusBadge label="Form Sent" color="bg-indigo-100 text-indigo-700" />
                <span className="text-slate-300">→</span>
                <StatusBadge label="Form Done" color="bg-purple-100 text-purple-700" />
                <span className="text-slate-300">→</span>
                <StatusBadge label="Audit Ready" color="bg-amber-100 text-amber-700" />
                <span className="text-slate-300">→</span>
                <StatusBadge label="Call Set" color="bg-emerald-100 text-emerald-700" />
                <span className="text-slate-300">→</span>
                <StatusBadge label="Signed" color="bg-green-100 text-green-800" />
              </div>
              <p className="text-sm text-slate-500 mt-2">Leads can also be marked <StatusBadge label="Lost" color="bg-red-100 text-red-700" /> at any point.</p>
            </SubSection>

            <SubSection title="Lead Scoring">
              <p className="text-sm text-slate-600">Each lead gets an automatic score (0–100) with a letter grade based on:</p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li><strong>Facility size</strong> — larger facilities score higher (up to 20 pts)</li>
                <li><strong>Occupancy</strong> — lower occupancy = more urgency (up to 25 pts)</li>
                <li><strong>Primary issue</strong> — "filling units" scores highest (up to 15 pts)</li>
                <li><strong>Pipeline progress</strong> — further along = more engaged (up to 15 pts)</li>
                <li><strong>Recency</strong> — newer leads score higher (up to 10 pts)</li>
                <li><strong>Engagement</strong> — notes, PMS upload, onboarding (up to 15 pts)</li>
              </ul>
            </SubSection>

            <SubSection title="Bulk Actions">
              <p className="text-sm text-slate-600">Use the checkboxes to select multiple leads, then choose a status from the bulk action bar to update them all at once. Great for batch-processing new submissions.</p>
            </SubSection>

            <SubSection title="Follow-Up Reminders">
              <p className="text-sm text-slate-600">Set a follow-up date on any lead. Overdue follow-ups get a red badge and sort to the top of the list so nothing slips through the cracks. Use the "Overdue" filter to see only leads that need attention.</p>
            </SubSection>

            <SubSection title="Search & Filter">
              <p className="text-sm text-slate-600">Use the search bar to find leads by name, facility, location, or email. Click the stage filter chips to view only leads at a specific pipeline stage.</p>
            </SubSection>
          </Section>

          {/* Admin: Lead Tools */}
          <Section id="admin-tools" icon={Sparkles} title="Admin: Lead Tools">
            <SubSection title="Marketing Audit Report">
              <Step n={1}>Expand a lead card and click <strong>"Generate Audit"</strong> next to the Marketing Audit header.</Step>
              <Step n={2}>The system computes vacancy cost analysis, market opportunity score, projected campaign metrics (CPL, leads/mo, move-ins, ROAS), and generates 6 recommendations.</Step>
              <Step n={3}>View the full report inline or click <strong>"Regenerate"</strong> to refresh with updated data.</Step>
            </SubSection>

            <SubSection title="Quick Email Templates">
              <p className="text-sm text-slate-600">Six one-click email templates are available on every lead card:</p>
              <div className="grid sm:grid-cols-2 gap-2 mt-1">
                {[
                  { name: 'Follow Up', desc: 'Warm follow-up after form submission' },
                  { name: 'Audit Delivery', desc: 'Send the marketing audit' },
                  { name: 'Proposal', desc: 'Send pricing and next steps' },
                  { name: 'Check In', desc: 'Re-engage a quiet lead' },
                  { name: 'Onboarding Reminder', desc: 'Remind client to complete setup' },
                  { name: 'Campaign Update', desc: 'Share performance highlights' },
                ].map(t => (
                  <div key={t.name} className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <Mail size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Campaign Data Management">
              <p className="text-sm text-slate-600">For signed clients, you can add monthly campaign metrics (spend, leads, CPL, move-ins, ROAS) directly in the lead card. This data powers the client's portal dashboard and the Portfolio analytics.</p>
            </SubSection>

            <SubSection title="CSV Lead Export">
              <p className="text-sm text-slate-600">Click the <strong>Download CSV</strong> button in the admin header to export all leads as a spreadsheet. Includes: name, email, phone, facility, location, status, score, dates, and notes count.</p>
            </SubSection>

            <SubSection title="Client Onboarding">
              <p className="text-sm text-slate-600">When a lead is marked "Signed," they get a portal access code. The onboarding wizard collects facility details, target demographics, unit mix, competitor intel, and ad preferences. Track completion progress in the lead card.</p>
            </SubSection>
          </Section>

          {/* Admin: Portfolio & Alerts */}
          <Section id="admin-portfolio" icon={BarChart3} title="Admin: Portfolio & Campaign Alerts">
            <SubSection title="Portfolio Dashboard">
              <p className="text-sm text-slate-600">The <strong>Portfolio</strong> tab shows aggregate performance across all signed clients:</p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Portfolio-wide KPIs: active clients, total spend, leads, move-ins, avg CPL, cost per move-in</li>
                <li>Monthly lead and move-in charts aggregated across all clients</li>
                <li>Budget allocation breakdown per client</li>
                <li>Client performance cards with individual metrics</li>
                <li>Rankings: top clients by move-ins and best CPL</li>
              </ul>
            </SubSection>

            <SubSection title="Campaign Health Alerts">
              <p className="text-sm text-slate-600">The alert system automatically monitors all client campaigns and flags issues:</p>
              <div className="space-y-1.5 mt-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="font-semibold text-red-700">Critical:</span>
                  <span className="text-slate-600">Zero leads, ROAS below 1.0x, CPL 2x above average</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="font-semibold text-amber-700">Warning:</span>
                  <span className="text-slate-600">CPL spike, ROAS drop, low lead volume, spend changes</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="font-semibold text-blue-700">Info:</span>
                  <span className="text-slate-600">Exceptional ROAS, move-in milestones, CPL improvements</span>
                </div>
              </div>
            </SubSection>
          </Section>

          {/* Admin: Insights */}
          <Section id="admin-insights" icon={TrendingUp} title="Admin: Insights & Analytics">
            <p className="text-sm text-slate-600">The <strong>Insights</strong> tab provides pipeline-level analytics:</p>
            <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
              <li><strong>Conversion rate</strong> — percentage of leads that became signed clients</li>
              <li><strong>Avg days to sign</strong> — how long leads take to convert</li>
              <li><strong>Pipeline funnel</strong> — visual breakdown of leads at each stage</li>
              <li><strong>Weekly velocity</strong> — lead volume over the past 8 weeks (bar chart)</li>
              <li><strong>Lead quality overview</strong> — score distribution across your pipeline</li>
              <li><strong>Activity feed</strong> — real-time log of all pipeline actions (status changes, notes, emails, uploads)</li>
            </ul>
          </Section>

          {/* Client: Login */}
          <Section id="client-login" icon={Shield} title="Client Portal: Logging In">
            <Step n={1}>
              Navigate to <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">/portal</code> or click "Client Login" in the site nav.
            </Step>
            <Step n={2}>
              Enter the email address associated with your account.
            </Step>
            <Step n={3}>
              Enter the access code provided by StowStack when you signed on. It's a short alphanumeric code (e.g., <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">A7K2MN9X</code>).
            </Step>
            <InfoBox>
              Your login session is saved in your browser. You won't need to re-enter credentials each visit unless you sign out.
            </InfoBox>
          </Section>

          {/* Client: Dashboard */}
          <Section id="client-dashboard" icon={BarChart3} title="Client Portal: Dashboard">
            <SubSection title="KPI Cards">
              <p className="text-sm text-slate-600">At the top of your dashboard, you'll see four key metrics across all your campaigns:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                {[
                  { label: 'Total Leads', desc: 'All leads generated by your ads' },
                  { label: 'Avg CPL', desc: 'Average cost per lead' },
                  { label: 'Move-Ins', desc: 'Leads that became tenants' },
                  { label: 'Latest ROAS', desc: 'Return on ad spend (most recent month)' },
                ].map(k => (
                  <div key={k.label} className="bg-slate-50 rounded-lg p-2 border border-slate-100 text-center">
                    <p className="text-xs font-semibold">{k.label}</p>
                    <p className="text-[10px] text-slate-500">{k.desc}</p>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Performance Charts">
              <p className="text-sm text-slate-600">Below the KPIs, interactive charts show trends over time:</p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li><strong>Cost Per Lead trend</strong> — lower is better; shows how ad efficiency improves over time</li>
                <li><strong>Leads vs Move-Ins</strong> — monthly bar chart comparing lead volume to actual conversions</li>
                <li><strong>ROAS trend</strong> — appears after 3+ months; tracks return on your ad investment</li>
              </ul>
            </SubSection>

            <SubSection title="Monthly Performance Table">
              <p className="text-sm text-slate-600">A detailed table shows every month's metrics: spend, leads, CPL, move-ins, and ROAS. The totals row at the bottom summarizes your entire campaign history.</p>
            </SubSection>

            <SubSection title="Monthly Digest">
              <p className="text-sm text-slate-600">When you have 2+ months of data, a digest card highlights month-over-month changes with green/red arrows for each metric so you can quickly see what's improving.</p>
            </SubSection>

            <SubSection title="Campaign Goals">
              <p className="text-sm text-slate-600">If your StowStack team has set a monthly move-in target, you'll see a progress bar showing how you're tracking against the goal.</p>
            </SubSection>
          </Section>

          {/* Client: Onboarding */}
          <Section id="client-onboarding" icon={ClipboardList} title="Client Portal: Onboarding Wizard">
            <p className="text-sm text-slate-600">After signing on, complete the 5-step onboarding wizard to give us everything we need to build your campaigns:</p>
            <div className="space-y-2 mt-1">
              {[
                { n: 1, title: 'Facility Details', desc: 'Brand description, colors, and unique selling points' },
                { n: 2, title: 'Target Demographics', desc: 'Age range, radius, income level, renter/owner targeting' },
                { n: 3, title: 'Unit Mix & Pricing', desc: 'Unit types, sizes, rates, and available counts' },
                { n: 4, title: 'Competitor Intel', desc: 'Nearby competitors, their pricing, and how you differentiate' },
                { n: 5, title: 'Ad Preferences', desc: 'Tone of voice, budget range, primary goal, past ad experience' },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-3 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{s.n}</div>
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-xs text-slate-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <InfoBox>
              Your progress is saved automatically. You can close the wizard and return later — all entered data will be there when you come back.
            </InfoBox>
          </Section>

          {/* Client: Messages */}
          <Section id="client-messages" icon={MessageSquare} title="Client Portal: Messages">
            <p className="text-sm text-slate-600">Use the Messages section on your dashboard to communicate directly with your StowStack team. Messages are checked regularly and you'll see replies next time you log in.</p>
            <Step n={1}>Scroll to the Messages card on your dashboard.</Step>
            <Step n={2}>Type your message and click Send.</Step>
            <Step n={3}>Replies from the StowStack team will appear in the same thread.</Step>
          </Section>

        </div>

        {/* Footer */}
        <div className="mt-12 mb-8 text-center">
          <p className="text-sm text-slate-400">
            Questions? Contact <a href="mailto:blake@storepawpaw.com" className="text-emerald-600 hover:text-emerald-700">blake@storepawpaw.com</a> or call <a href="tel:+12699298541" className="text-emerald-600 hover:text-emerald-700">(269) 929-8541</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
