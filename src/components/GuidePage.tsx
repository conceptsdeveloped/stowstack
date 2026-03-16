import { Building2, ArrowLeft, BookOpen, Shield, BarChart3, ClipboardList, MessageSquare, Target, TrendingUp, HelpCircle } from 'lucide-react'

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

function Section({ id, icon: Icon, title, children }: { id: string; icon: React.ComponentType<{ size?: number | string; className?: string }>; title: string; children: React.ReactNode }) {
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

export default function GuidePage({ onBack }: { onBack: () => void }) {
  const tocItems = [
    { id: 'welcome', label: 'Welcome to StowStack' },
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'dashboard', label: 'Your Dashboard' },
    { id: 'charts', label: 'Understanding Your Charts' },
    { id: 'onboarding', label: 'Onboarding Wizard' },
    { id: 'messages', label: 'Messages' },
    { id: 'goals', label: 'Campaign Goals' },
    { id: 'digest', label: 'Monthly Performance Digest' },
    { id: 'faq', label: 'FAQ' },
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
          <span className="text-xs text-slate-400 ml-1">/ Client Guide</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Client Guide</h1>
          <p className="text-slate-500 text-sm">Everything you need to know about your StowStack portal — your dashboard, campaign data, and how to get the most out of your ad campaigns.</p>
        </div>

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

        <div className="space-y-6">

          {/* Welcome */}
          <Section id="welcome" icon={Building2} title="Welcome to StowStack">
            <p className="text-sm text-slate-600 leading-relaxed">
              StowStack is a marketing platform built specifically for self-storage operators. We run targeted Facebook and Instagram ad campaigns to fill your vacant units with qualified tenants.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              As a StowStack client, you get access to your own portal where you can track campaign performance, see how many leads and move-ins your ads are generating, communicate with your account team, and monitor your return on investment — all in one place.
            </p>
            <InfoBox>
              Your portal updates as your StowStack team enters new campaign data each month. Check back regularly to see the latest numbers.
            </InfoBox>
          </Section>

          {/* Getting Started */}
          <Section id="getting-started" icon={Shield} title="Getting Started">
            <SubSection title="How to Log In">
              <Step n={1}>
                Go to <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">stowstack.co/portal</code> or click "Client Login" in the website navigation.
              </Step>
              <Step n={2}>
                Enter the email address associated with your StowStack account.
              </Step>
              <Step n={3}>
                Enter the access code provided by your StowStack team. It looks like <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">A7K2MN9X</code> — a short combination of letters and numbers.
              </Step>
            </SubSection>
            <InfoBox>
              Your login stays saved in your browser, so you won't need to re-enter your credentials each time you visit. If you lose your access code, contact your StowStack team and they'll send you a new one.
            </InfoBox>
          </Section>

          {/* Dashboard */}
          <Section id="dashboard" icon={BarChart3} title="Your Dashboard">
            <SubSection title="KPI Cards">
              <p className="text-sm text-slate-600">At the top of your dashboard, you'll see your key campaign numbers at a glance:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {[
                  { label: 'Total Leads', desc: 'Everyone who filled out a form or called from your ads' },
                  { label: 'Avg CPL', desc: 'How much each lead costs on average (lower is better)' },
                  { label: 'Move-Ins', desc: 'Leads who actually signed a lease and moved in' },
                  { label: 'Latest ROAS', desc: 'Your return on ad spend — how many dollars you earn per dollar spent on ads' },
                ].map(k => (
                  <div key={k.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">{k.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{k.desc}</p>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection title="Monthly Performance Table">
              <p className="text-sm text-slate-600">Below your charts, a table breaks down each month's performance: how much was spent on ads, how many leads came in, what each lead cost, how many became move-ins, and your return on ad spend. The totals row at the bottom summarizes your entire campaign history.</p>
            </SubSection>
          </Section>

          {/* Charts */}
          <Section id="charts" icon={TrendingUp} title="Understanding Your Charts">
            <SubSection title="Cost Per Lead (CPL) Trend">
              <p className="text-sm text-slate-600">This line chart shows how much each lead costs over time. A downward trend means your ads are becoming more efficient — you're paying less for each inquiry. It's normal for CPL to start higher and improve as the campaigns optimize.</p>
            </SubSection>

            <SubSection title="Leads vs Move-Ins">
              <p className="text-sm text-slate-600">This bar chart compares how many leads came in each month (blue bars) against how many actually became tenants (green bars). The gap between the two shows your conversion rate — a smaller gap means more of your leads are turning into real revenue.</p>
            </SubSection>

            <SubSection title="ROAS (Return on Ad Spend)">
              <p className="text-sm text-slate-600">ROAS shows up after your third month of data. It tells you how many dollars of revenue your ads generate for each dollar spent. For example, a 3.2x ROAS means for every $1 you spend on ads, you get $3.20 back in lease revenue. Anything above 1.0x means your ads are profitable.</p>
            </SubSection>
          </Section>

          {/* Onboarding */}
          <Section id="onboarding" icon={ClipboardList} title="Onboarding Wizard">
            <p className="text-sm text-slate-600">When you first sign on, you'll see a 5-step onboarding wizard. This collects the information we need to build effective ad campaigns for your specific facility.</p>
            <div className="space-y-2 mt-1">
              {[
                { n: 1, title: 'Facility Details', desc: 'Your brand description, colors, and what makes your facility unique' },
                { n: 2, title: 'Target Demographics', desc: 'Who your ideal tenants are — age range, location radius, and income level' },
                { n: 3, title: 'Unit Mix & Pricing', desc: 'What unit types you have, their sizes, monthly rates, and how many are available' },
                { n: 4, title: 'Competitor Intel', desc: 'Who your nearby competitors are, what they charge, and how you stand out' },
                { n: 5, title: 'Ad Preferences', desc: 'Your preferred tone of voice, budget range, main goal, and any past ad experience' },
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
              Your progress saves automatically. You can close the wizard and come back later — everything you've entered will still be there.
            </InfoBox>
          </Section>

          {/* Messages */}
          <Section id="messages" icon={MessageSquare} title="Messages">
            <p className="text-sm text-slate-600">The Messages card on your dashboard lets you communicate directly with your StowStack account team. Use it to ask questions, share feedback, or request changes to your campaigns.</p>
            <Step n={1}>Scroll to the Messages card on your dashboard.</Step>
            <Step n={2}>Type your message in the text box and click Send.</Step>
            <Step n={3}>Replies from your StowStack team will appear in the same conversation thread.</Step>
            <InfoBox>
              Messages are checked regularly by your team. For urgent requests, you can also reach us by phone or email (see the bottom of this page).
            </InfoBox>
          </Section>

          {/* Campaign Goals */}
          <Section id="goals" icon={Target} title="Campaign Goals">
            <p className="text-sm text-slate-600">Your StowStack team may set a monthly move-in target for your campaigns. When a goal is active, you'll see a progress bar on your dashboard showing how you're tracking against it.</p>
            <SubSection title="How to Read the Progress Bar">
              <p className="text-sm text-slate-600">The bar fills up as move-ins are recorded each month. If the bar is green, you're on track or ahead of your goal. The number on the right shows the target, and the number on the left shows where you are right now.</p>
            </SubSection>
            <InfoBox>
              Goals are set collaboratively with your account team based on your facility's size, occupancy, and budget. If you'd like to adjust your target, send a message through the portal or contact your team directly.
            </InfoBox>
          </Section>

          {/* Monthly Digest */}
          <Section id="digest" icon={TrendingUp} title="Monthly Performance Digest">
            <p className="text-sm text-slate-600">Once you have two or more months of campaign data, a digest card appears on your dashboard that compares your most recent month to the one before it.</p>
            <SubSection title="What the Arrows Mean">
              <div className="space-y-2 mt-1">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold text-sm mt-0.5">↑</span>
                  <p className="text-sm text-slate-600"><strong>Green up arrow</strong> — this metric improved compared to last month (more leads, more move-ins, better ROAS, or lower CPL).</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-bold text-sm mt-0.5">↓</span>
                  <p className="text-sm text-slate-600"><strong>Red down arrow</strong> — this metric went the other direction. Don't worry about small dips — campaigns naturally fluctuate month to month. Your team watches these trends and adjusts accordingly.</p>
                </div>
              </div>
            </SubSection>
            <InfoBox>
              The digest is a quick snapshot — for the full picture, check your charts and monthly table above.
            </InfoBox>
          </Section>

          {/* FAQ */}
          <Section id="faq" icon={HelpCircle} title="Frequently Asked Questions">
            {[
              { q: 'How often does my dashboard update?', a: 'Your StowStack team enters new campaign data monthly. You\'ll see updated numbers shortly after each month closes.' },
              { q: 'What if my access code doesn\'t work?', a: 'Double-check for typos (codes are case-sensitive). If it still doesn\'t work, contact your StowStack team and they\'ll issue a new code.' },
              { q: 'Who do I contact if I have questions?', a: 'Use the Messages feature in your portal, or reach out directly via email or phone (see below). Your account team checks messages regularly.' },
              { q: 'Can I change my campaign budget?', a: 'Yes — send a message through the portal or call your account team. They\'ll adjust your ad spend and update your projected metrics.' },
              { q: 'What counts as a "lead"?', a: 'A lead is anyone who submits a contact form, calls, or messages through one of your Facebook or Instagram ads. These are people actively looking for storage.' },
              { q: 'What\'s the difference between a lead and a move-in?', a: 'A lead is someone who expressed interest. A move-in is a lead who actually signed a lease and started renting a unit. Move-ins are the number that matters most.' },
              { q: 'How long before I see results?', a: 'Most clients see their first leads within the first two weeks. It typically takes 2-3 months for campaigns to fully optimize and reach peak performance.' },
            ].map(faq => (
              <div key={faq.q} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-semibold text-slate-800 mb-1">{faq.q}</p>
                <p className="text-sm text-slate-600">{faq.a}</p>
              </div>
            ))}
          </Section>

        </div>

        <div className="mt-12 mb-8 text-center">
          <p className="text-sm text-slate-400">
            Questions? Contact <a href="mailto:blake@storepawpaw.com" className="text-emerald-600 hover:text-emerald-700">blake@storepawpaw.com</a> or call <a href="tel:+12699298541" className="text-emerald-600 hover:text-emerald-700">(269) 929-8541</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
