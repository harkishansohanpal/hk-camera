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
          <p>This policy explains what data HK Camera collects, why we collect it, and what you can do about it. We try to keep things simple.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">What We Collect and Why</h3>
          <div className="space-y-3">
            <div><strong className="text-text-primary">Account info</strong> &mdash; Your name and email. Needed to log in and send alerts.</div>
            <div><strong className="text-text-primary">Video feeds</strong> &mdash; Live streams and recordings. Only you and people you share with can see them.</div>
            <div><strong className="text-text-primary">Billing info</strong> &mdash; Handled by Stripe. We never see your card details.</div>
            <div><strong className="text-text-primary">Usage data</strong> &mdash; Basic info like connection status to help us fix problems.</div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">How We Protect Your Data</h3>
          <div className="space-y-3">
            <div><strong className="text-text-primary">Encryption</strong> &mdash; Your video is scrambled during streaming and when stored.</div>
          <div><strong className="text-text-primary">Access control</strong> &mdash; Each camera has a unique key. Only people with it can watch.</div>
          <div><strong className="text-text-primary">No snooping</strong> &mdash; Your video feeds are private. We don't watch or record them. Our detection runs on your device and can't identify faces.</div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Who We Share Data With</h3>
          <p>We only use third-party services that are necessary to run the app:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-text-primary">Stripe</strong> &mdash; Payment processing (only if you have a paid plan).</li>
            <li><strong className="text-text-primary">Cloudflare</strong> &mdash; Helps connect your devices when direct connection isn't possible.</li>
          </ul>
          <p className="mt-2">We do <strong className="text-text-primary">not</strong> sell your personal information to anyone. Period.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Data Retention</h3>
          <p>Recordings are stored for the time you choose (usually 30 days), then deleted automatically. You can also delete them anytime.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Your Rights</h3>
          <div className="space-y-2">
            <div><strong className="text-text-primary">Access</strong> &mdash; Download your data from Settings &rarr; Export My Data.</div>
            <div><strong className="text-text-primary">Deletion</strong> &mdash; Delete your account from Settings &rarr; Delete Account.</div>
            <div><strong className="text-text-primary">Data portability</strong> &mdash; Export your data in JSON format.</div>
            <div><strong className="text-text-primary">Opt-out</strong> &mdash; Turn on &quot;Do Not Sell&quot; in Settings.</div>
            <div><strong className="text-text-primary">Correction</strong> &mdash; Update your name and email in Settings.</div>
            <div><strong className="text-text-primary">Audio recording</strong> &mdash; See our <Link to="/terms" className="text-ap-blue hover:text-blue-600 font-semibold">Terms</Link> for your responsibilities.</div>
            <div><strong className="text-text-primary">Copyright (DMCA)</strong> &mdash; See our <Link to="/terms" className="text-ap-blue hover:text-blue-600 font-semibold">Terms</Link> for takedown instructions.</div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Cookies and Local Storage</h3>
          <p>We use browser storage (not cookies) for:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-text-primary">Essential</strong> &mdash; Login tokens and your consent choice. Required for the service to work.</li>
            <li><strong className="text-text-primary">Non-essential</strong> &mdash; Theme preference and tour state. Only stored with your permission.</li>
          </ul>
          <p className="mt-2">No tracking cookies. Period.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Changes</h3>
          <p>We'll let you know if we make big changes. Using the service after changes means you accept them.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">Contact</h3>
          <p>Questions? Open an issue on GitHub or email the maintainer.</p>
          <p className="mt-1 text-ap-blue text-xs">Effective date: May 21, 2026</p>
        </section>
      </div>
    </div>
  );
}
