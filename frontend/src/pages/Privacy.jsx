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
            <div><strong className="text-text-primary">Deletion</strong> &mdash; You can delete your account and all associated data from Settings &rarr; Delete Account.</div>
            <div><strong className="text-text-primary">Opt-out</strong> &mdash; You can enable &quot;Do Not Sell&quot; in Settings at any time.</div>
            <div><strong className="text-text-primary">Correction</strong> &mdash; You can update your name and email in Settings.</div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Changes to this policy</h3>
          <p>If we make material changes, we will notify you via email or in-app notice. Continued use after changes means you accept the updated policy.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Contact</h3>
          <p>Questions about your privacy? Open an issue on our GitHub repository or email the project maintainer.</p>
          <p className="mt-1 text-ap-blue text-xs">Effective date: May 1, 2026</p>
        </section>
      </div>
    </div>
  );
}
