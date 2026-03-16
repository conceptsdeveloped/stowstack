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
      <p>StowStack by StorageAds.com ("we," "our," or "us") operates the website stowstack.co and related applications. This Privacy Policy explains how we collect, use, disclose, and protect your information when you visit our website, use our services, or interact with our applications on third-party platforms including Meta (Facebook and Instagram).</p>

      <h2>Information We Collect</h2>
      <p><strong>Information you provide directly:</strong></p>
      <ul>
        <li>Name, email address, and phone number when you submit our audit intake form or contact us</li>
        <li>Facility information such as name, location, occupancy range, and unit count</li>
        <li>Login credentials for the client portal (email and access code)</li>
        <li>Messages, notes, and other content you submit through our forms or client portal</li>
      </ul>
      <p><strong>Information collected automatically:</strong></p>
      <ul>
        <li>Browser type and version, operating system, and device type</li>
        <li>IP address and approximate geographic location</li>
        <li>Pages visited, time spent on pages, and referring URLs</li>
        <li>Interaction data such as clicks, scrolls, and form interactions</li>
      </ul>
      <p><strong>Information from third-party platforms:</strong></p>
      <ul>
        <li>When we run advertising campaigns on your behalf via Meta (Facebook/Instagram), we may receive aggregated campaign performance data including impressions, clicks, leads, and conversion events through the Meta Marketing API and Conversions API</li>
        <li>We do not collect or store personal data of individual Facebook or Instagram users who view or interact with ads</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>We process your information for the following specific purposes:</p>
      <ul>
        <li><strong>Service delivery:</strong> Providing facility audits, creating and managing advertising campaigns, and generating performance reports</li>
        <li><strong>Client portal:</strong> Authenticating your identity and displaying campaign performance data in your dashboard</li>
        <li><strong>Communications:</strong> Sending audit results, campaign reports, onboarding information, and responding to your inquiries</li>
        <li><strong>Campaign optimization:</strong> Analyzing ad performance data to optimize campaigns, conduct A/B testing, and improve conversion rates</li>
        <li><strong>Meta platform integration:</strong> Using the Meta Marketing API and Conversions API to create, manage, and measure advertising campaigns on Facebook and Instagram on behalf of our clients</li>
        <li><strong>Service improvement:</strong> Improving our website, tools, and service offerings based on usage patterns</li>
      </ul>

      <h2>Information Sharing and Disclosure</h2>
      <p>We do not sell, trade, or rent your personal information to third parties. We may share information with:</p>
      <ul>
        <li><strong>Meta Platforms, Inc.:</strong> Campaign data shared through the Meta Marketing API and Conversions API for the purpose of running and measuring advertising campaigns on your behalf. This data is processed in accordance with Meta's Platform Terms and Data Policy.</li>
        <li><strong>Service providers:</strong> Third parties who assist us in operating our website and services, including email delivery (Resend), hosting (Vercel), and analytics tools. These providers are contractually obligated to protect your data.</li>
        <li><strong>Legal requirements:</strong> When required by law, court order, or governmental regulation, or to protect our rights, property, or safety.</li>
      </ul>

      <h2>Meta Platform Data</h2>
      <p>Our application integrates with Meta's platform (Facebook and Instagram) to provide advertising services. Regarding data obtained through Meta's platform:</p>
      <ul>
        <li>We only access Meta platform data that is necessary to provide our advertising management services</li>
        <li>We do not use Meta platform data for purposes other than providing and improving our services for the specific client whose campaigns we manage</li>
        <li>We do not transfer or sell Meta platform data to third parties, advertising networks, or data brokers</li>
        <li>We do not use Meta platform data to build or augment user profiles for purposes unrelated to our services</li>
        <li>Campaign performance data accessed through Meta APIs is displayed only to the authorized client in their secure portal</li>
      </ul>

      <h2>Data Security</h2>
      <p>We implement reasonable security measures to protect your personal information. Client portal access is secured with unique access codes, and all data is transmitted over encrypted connections (HTTPS). We regularly review our security practices and update them as necessary.</p>

      <h2>Data Retention</h2>
      <p>We retain your personal information for as long as your account is active or as needed to provide our services. Campaign performance data is retained for the duration of our service agreement and for a reasonable period afterward for reporting purposes.</p>

      <h2>Data Deletion</h2>
      <p>You have the right to request deletion of your personal data at any time. To request data deletion:</p>
      <ul>
        <li><strong>Email:</strong> Send a deletion request to <a href="mailto:blake@storepawpaw.com">blake@storepawpaw.com</a> with the subject line "Data Deletion Request"</li>
        <li><strong>Response time:</strong> We will acknowledge your request within 5 business days and complete deletion within 30 days</li>
        <li><strong>Scope:</strong> Upon deletion, we will remove your personal data from our systems, including any data obtained through Meta's platform APIs. Some data may be retained if required by law or legitimate business purposes (e.g., financial records).</li>
      </ul>

      <h2>Cookies and Tracking</h2>
      <p>Our website uses essential cookies for functionality such as maintaining your login session. On client landing pages built for advertising campaigns, we may use:</p>
      <ul>
        <li>Meta Pixel for conversion tracking and campaign optimization</li>
        <li>Meta Conversions API (server-side) for accurate attribution</li>
        <li>Essential analytics to measure page performance</li>
      </ul>

      <h2>Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the personal information we hold about you</li>
        <li>Correct inaccurate or incomplete personal information</li>
        <li>Request deletion of your personal data (see Data Deletion section above)</li>
        <li>Object to or restrict certain processing of your data</li>
        <li>Withdraw consent where processing is based on consent</li>
      </ul>
      <p>To exercise any of these rights, contact us at <a href="mailto:blake@storepawpaw.com">blake@storepawpaw.com</a>.</p>

      <h2>Children's Privacy</h2>
      <p>Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will take steps to delete it promptly.</p>

      <h2>Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify active clients of any material changes via email. The "Last updated" date at the top of this page indicates when this policy was last revised.</p>

      <h2>Contact Us</h2>
      <p>If you have questions about this Privacy Policy, how we handle your data, or wish to exercise your data rights, contact us at:</p>
      <p>StowStack<br />Email: <a href="mailto:blake@storepawpaw.com">blake@storepawpaw.com</a><br />Phone: (269) 929-8541<br />Website: stowstack.co</p>
    </LegalLayout>
  )
}

export function DataDeletion({ onBack }: { onBack: () => void }) {
  return (
    <LegalLayout title="Data Deletion Instructions" onBack={onBack}>
      <p>StowStack allows you to request deletion of your data associated with our application. When you request data deletion, we will remove your personal information from our systems, including any data obtained through Meta's platform.</p>

      <h2>How to Request Data Deletion</h2>
      <p>You can request deletion of your data by contacting us through any of the following methods:</p>
      <ul>
        <li><strong>Email:</strong> Send a request to <a href="mailto:blake@storepawpaw.com">blake@storepawpaw.com</a> with the subject line "Data Deletion Request." Include the email address associated with your account so we can locate your data.</li>
        <li><strong>Phone:</strong> Call us at (269) 929-8541 and request data deletion.</li>
      </ul>

      <h2>What Gets Deleted</h2>
      <p>Upon receiving and verifying your deletion request, we will delete:</p>
      <ul>
        <li>Your account information (name, email, phone number)</li>
        <li>Facility information you provided (name, location, occupancy, unit count)</li>
        <li>Client portal login credentials and access codes</li>
        <li>Messages and notes submitted through our forms or portal</li>
        <li>Campaign performance data associated with your account</li>
        <li>Any data obtained through Meta platform APIs on your behalf</li>
      </ul>

      <h2>What May Be Retained</h2>
      <p>Certain data may be retained after a deletion request if required by law or for legitimate business purposes:</p>
      <ul>
        <li>Financial transaction records (invoices, payment history) as required by tax and accounting regulations</li>
        <li>Data necessary to comply with legal obligations or resolve disputes</li>
      </ul>

      <h2>Processing Timeline</h2>
      <ul>
        <li><strong>Acknowledgment:</strong> We will confirm receipt of your request within 5 business days</li>
        <li><strong>Completion:</strong> Data deletion will be completed within 30 days of your request</li>
        <li><strong>Confirmation:</strong> You will receive an email confirming that your data has been deleted</li>
      </ul>

      <h2>Facebook / Instagram Data</h2>
      <p>If you used Facebook or Instagram to interact with our services, you can also manage your data through Facebook's settings:</p>
      <ul>
        <li>Go to your Facebook Settings &amp; Privacy &gt; Settings</li>
        <li>Navigate to Apps and Websites</li>
        <li>Find StowStack and select Remove</li>
        <li>This will revoke our access to your Facebook data going forward</li>
      </ul>
      <p>To ensure complete deletion from our systems, please also submit a deletion request directly to us using the methods above.</p>

      <h2>Contact</h2>
      <p>If you have questions about data deletion, contact us at:</p>
      <p>StowStack<br />Email: <a href="mailto:blake@storepawpaw.com">blake@storepawpaw.com</a><br />Phone: (269) 929-8541<br />Website: stowstack.co</p>
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
