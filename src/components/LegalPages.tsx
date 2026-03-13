import { Building2, ArrowLeft } from 'lucide-react'

function LegalLayout({ title, children, onBack }: { title: string; children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 sticky top-0 z-30 bg-white">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
            <Building2 size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight font-['Space_Grotesk']">
            Stow<span className="text-emerald-600">Stack</span>
          </span>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold mb-1">{title}</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: March 1, 2026</p>
        <div className="prose prose-slate prose-sm max-w-none [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:mb-4 [&_li]:mb-1">
          {children}
        </div>
      </article>
    </div>
  )
}

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <LegalLayout title="Privacy Policy" onBack={onBack}>
      <p>StowStack ("we," "our," or "us") operates the website stowstack.co. This Privacy Policy explains how we collect, use, and protect your information when you visit our website or use our services.</p>

      <h2>Information We Collect</h2>
      <p>We collect information you provide directly to us, including:</p>
      <ul>
        <li>Name, email address, and phone number when you submit our audit intake form</li>
        <li>Facility information such as name, location, occupancy range, and unit count</li>
        <li>Login credentials for the client portal (email and access code)</li>
        <li>Any notes or messages you submit through our forms</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide and deliver our services, including facility audits and ad campaign management</li>
        <li>Send you audit results, campaign reports, and service communications</li>
        <li>Respond to your inquiries and provide customer support</li>
        <li>Display campaign performance data in your client portal</li>
        <li>Improve our website and services</li>
      </ul>

      <h2>Information Sharing</h2>
      <p>We do not sell, trade, or rent your personal information to third parties. We may share information with:</p>
      <ul>
        <li>Service providers who assist us in operating our website and services (e.g., email delivery, hosting)</li>
        <li>Meta Platforms, Inc. for the purpose of running advertising campaigns on your behalf</li>
        <li>As required by law or to protect our rights</li>
      </ul>

      <h2>Data Security</h2>
      <p>We implement reasonable security measures to protect your personal information. Client portal access is secured with unique access codes, and all data is transmitted over encrypted connections (HTTPS).</p>

      <h2>Data Retention</h2>
      <p>We retain your personal information for as long as your account is active or as needed to provide our services. You may request deletion of your data by contacting us at blake@storepawpaw.com.</p>

      <h2>Cookies</h2>
      <p>Our website uses essential cookies for functionality (such as maintaining your login session). We do not use third-party tracking cookies or advertising pixels on our marketing website.</p>

      <h2>Your Rights</h2>
      <p>You have the right to access, correct, or delete your personal information. To exercise these rights, contact us at blake@storepawpaw.com.</p>

      <h2>Contact Us</h2>
      <p>If you have questions about this Privacy Policy, contact us at:</p>
      <p>StowStack<br />Email: blake@storepawpaw.com<br />Phone: (269) 929-8541</p>
    </LegalLayout>
  )
}

export function TermsOfService({ onBack }: { onBack: () => void }) {
  return (
    <LegalLayout title="Terms of Service" onBack={onBack}>
      <p>These Terms of Service ("Terms") govern your use of the StowStack website at stowstack.co and any services provided by StowStack ("we," "our," or "us"). By using our website or services, you agree to these Terms.</p>

      <h2>Services</h2>
      <p>StowStack provides digital advertising services for self-storage operators, including but not limited to: facility audits, Meta (Facebook/Instagram) ad campaign creation and management, lead generation, and performance reporting through our client portal.</p>

      <h2>Client Accounts</h2>
      <p>Access to the client portal is provided upon becoming a StowStack client. You are responsible for maintaining the confidentiality of your access code. You agree to notify us immediately of any unauthorized use of your account.</p>

      <h2>Service Agreements</h2>
      <p>Specific service terms, pricing, campaign budgets, and deliverables are defined in individual service agreements between StowStack and each client. These Terms supplement, but do not replace, any signed service agreement.</p>

      <h2>No Guarantees</h2>
      <p>While we strive to deliver strong results, advertising performance depends on many factors outside our control including market conditions, competition, and platform algorithms. We do not guarantee specific lead volumes, occupancy rates, or return on ad spend.</p>

      <h2>Intellectual Property</h2>
      <p>All content on the StowStack website, including text, graphics, logos, and software, is our property or licensed to us. Ad creative, copy, and campaign strategies developed for clients remain our intellectual property unless otherwise specified in a service agreement.</p>

      <h2>Limitation of Liability</h2>
      <p>StowStack shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services. Our total liability shall not exceed the fees paid by you in the 3 months preceding the claim.</p>

      <h2>Termination</h2>
      <p>Either party may terminate the service relationship with 30 days written notice. Upon termination, we will provide a final performance report and cease all advertising activities on your behalf.</p>

      <h2>Changes to Terms</h2>
      <p>We may update these Terms from time to time. We will notify active clients of any material changes via email.</p>

      <h2>Contact</h2>
      <p>Questions about these Terms? Contact us at:</p>
      <p>StowStack<br />Email: blake@storepawpaw.com<br />Phone: (269) 929-8541</p>
    </LegalLayout>
  )
}
