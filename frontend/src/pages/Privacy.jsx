import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="min-h-dvh bg-page text-text-primary">
      <header className="nav-bar bg-card/90 backdrop-blur-xl border-b border-ap-separator">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="text-ap-blue hover:text-blue-600 font-semibold text-sm">&larr; Back</Link>
          <span className="font-bold text-base text-text-primary">Privacy Policy</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 text-sm leading-relaxed text-text-secondary">
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Your privacy matters to us</h2>
          <p>This policy explains what data HK Camera collects, why we collect it, and what you can do about it. We keep things simple because we believe privacy shouldn't require a law degree to understand.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">What we collect and why</h3>
          <div className="space-y-3">
            <div><strong className="text-text-primary">Account info</strong> &mdash; Your name and email address. Needed so you can log in and we can send you alerts.</div>
            <div><strong className="text-text-primary">Video feeds</strong> &mdash; Live camera streams and recordings. Only you and people you explicitly share access with can view them.</div>
            <div><strong className="text-text-primary">Billing info</strong> &mdash; Payment processing is handled by Stripe. We never see your credit card details.</div>
            <div><strong className="text-text-primary">Usage data</strong> &mdash; Basic logs like connection status and error reports to help us fix bugs and improve reliability.</div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">How we protect your data</h3>
          <div className="space-y-3">
            <div><strong className="text-text-primary">Encryption</strong> &mdash; Video streams are encrypted in transit using WebRTC (DTLS-SRTP). Recordings are encrypted at rest (AES-256).</div>
            <div><strong className="text-text-primary">Access control</strong> &mdash; Each camera has a unique stream key. Only people with the key can watch or record.</div>
            <div><strong className="text-text-primary">No snooping</strong> &mdash; Your video feeds are private. We do not monitor, record, or analyze your camera streams.</div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Lawful basis for processing (GDPR Art. 6)</h3>
          <p>If you are in the European Economic Area, we process your personal data under the following legal bases:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-text-primary">Contractual necessity</strong> &mdash; Account registration, authentication, and service delivery require processing your account data to fulfill our terms of service.</li>
            <li><strong className="text-text-primary">Consent</strong> &mdash; Non-essential local storage (theme preference, tour state) is stored only after you explicitly accept via the cookie consent banner.</li>
            <li><strong className="text-text-primary">Legitimate interest</strong> &mdash; Basic error logs and usage metrics for service improvement and security monitoring.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">International data transfers (GDPR Art. 44&ndash;49)</h3>
          <p>Our servers are hosted in Canada (Fly.io) and the United States (Cloudflare). If you are in the European Economic Area, data transfers are governed by:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-text-primary">Standard Contractual Clauses (SCCs)</strong> &mdash; We rely on EU-approved SCCs for transfers to third countries.</li>
            <li><strong className="text-text-primary">Adequacy decisions</strong> &mdash; Canada is recognised by the European Commission as providing adequate data protection ( adequacy decision ).</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Age of consent (GDPR Art. 8)</h3>
          <p>HK Camera is not directed at children under 16. If you are under 16, you must have parental consent to use this service. We do not knowingly collect data from children under 16.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Who we share data with</h3>
          <p>We only use third-party services that are necessary to run the app:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-text-primary">Stripe</strong> &mdash; Payment processing (if you subscribe to a paid plan).</li>
            <li><strong className="text-text-primary">Cloudflare</strong> &mdash; TURN relay servers for WebRTC connections when direct peer-to-peer fails.</li>
          </ul>
          <p className="mt-2">We do <strong className="text-text-primary">not</strong> sell your personal information to anyone. Period.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Data retention</h3>
          <p>Recordings are kept for the retention period you choose per camera (default 30 days). After that, they are automatically deleted. You can also delete any recording manually at any time. Your account data is kept until you delete your account.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Your rights</h3>
          <div className="space-y-2">
            <div><strong className="text-text-primary">Access</strong> &mdash; You can download a copy of your data from Settings &rarr; Export My Data.</div>
            <div><strong className="text-text-primary">Deletion (right to erasure)</strong> &mdash; You can delete your account and all associated data from Settings &rarr; Delete Account. Under GDPR Art. 17, you also have the right to request deletion without undue delay.</div>
            <div><strong className="text-text-primary">Data portability (GDPR Art. 20)</strong> &mdash; You can export your data in JSON format from Settings &rarr; Export My Data. This allows you to transfer your data to another service.</div>
            <div><strong className="text-text-primary">Opt-out of sale</strong> &mdash; You can enable &quot;Do Not Sell&quot; in Settings at any time (CCPA/CPRA). We do not sell personal data.</div>
            <div><strong className="text-text-primary">Opt-out of non-essential storage</strong> &mdash; You can withdraw consent for non-essential local storage at any time by clearing your browser's local storage.</div>
            <div><strong className="text-text-primary">Correction</strong> &mdash; You can update your name and email in Settings.</div>
            <div><strong className="text-text-primary">Right to lodge a complaint (GDPR Art. 77)</strong> &mdash; If you are in the EEA and believe we have not handled your data properly, you have the right to lodge a complaint with your local data protection supervisory authority.</div>
            <div><strong className="text-text-primary">Automated decision-making</strong> &mdash; We do not use automated decision-making or profiling that produces legal effects concerning you.</div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Cookies and local storage</h3>
          <p>This site uses browser local storage (not cookies) for the following purposes:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-text-primary">Essential</strong> &mdash; Access tokens for authentication and your consent preference. These cannot be disabled as the service would not function.</li>
            <li><strong className="text-text-primary">Non-essential</strong> &mdash; Theme preference (dark/light mode) and guided tour dismissal state. These are stored only after you give explicit consent via the cookie consent banner.</li>
          </ul>
          <p className="mt-2">No tracking cookies, analytics cookies, or third-party cookies are used.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Changes to this policy</h3>
          <p>If we make material changes, we will notify you via email or in-app notice. Continued use after changes means you accept the updated policy.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Contact</h3>
          <p>Questions about your privacy or data protection rights? Open an issue on our GitHub repository or email the project maintainer.</p>
          <p className="mt-1 text-ap-blue text-xs">Effective date: May 21, 2026</p>
        </section>
      </div>
    </div>
  );
}
