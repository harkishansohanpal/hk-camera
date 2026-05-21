import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-dvh bg-page text-text-primary">
      <header className="nav-bar bg-card/90 backdrop-blur-xl border-b border-ap-separator">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="text-ap-blue hover:text-blue-600 font-semibold text-sm">&larr; Back</Link>
          <span className="font-bold text-base text-text-primary">Terms of Service</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8 text-sm leading-relaxed text-text-secondary">
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Terms of Service</h2>
          <p>By using HK Camera, you agree to these terms. Please read them carefully. If you do not agree, do not use the service.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">1. Acceptance</h3>
          <p>By creating an account or accessing the service, you agree to be bound by these Terms and our <Link to="/privacy" className="text-ap-blue hover:text-blue-600 font-semibold">Privacy Policy</Link>.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">2. Audio Recording &mdash; Your Legal Responsibility</h3>
          <p>HK Camera supports two-way audio. You are solely responsible for complying with all applicable laws when using audio features, including:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong className="text-text-primary">One-party consent states</strong> &mdash; In most US states, only one person needs to consent to recording a conversation (that can be you).</li>
            <li><strong className="text-text-primary">Two-party / all-party consent states</strong> &mdash; California, Connecticut, Florida, Illinois, Maryland, Massachusetts, Michigan, Montana, New Hampshire, Pennsylvania, and Washington require consent from all parties being recorded. You must inform anyone who may be recorded and obtain their consent before enabling audio.</li>
            <li><strong className="text-text-primary">International</strong> &mdash; Many countries have their own wiretapping and eavesdropping laws. It is your responsibility to know and follow them.</li>
          </ul>
          <p className="mt-2">HK Camera is not responsible for how you use the audio feature. You assume all legal risk.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">3. Biometric Data Policy</h3>
          <p>HK Camera uses on-device machine learning (YOLOv8) to detect objects such as people, vehicles, and animals in your camera feed. This detection runs entirely on your device and:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Does <strong className="text-text-primary">not</strong> perform facial recognition or identify specific individuals.</li>
            <li>Does <strong className="text-text-primary">not</strong> create biometric templates or face prints.</li>
            <li>Does <strong className="text-text-primary">not</strong> transmit raw detection data to our servers.</li>
          </ul>
          <p className="mt-2">The detection result is a simple label (e.g., "person", "car") used only to trigger alerts or recordings on your account. If you enable detection in a jurisdiction that regulates biometric data (such as Illinois under BIPA), you are responsible for providing any required notices and obtaining any required consents.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">4. DMCA Notice &amp; Takedown</h3>
          <p>HK Camera respects intellectual property rights and expects its users to do the same. If you believe that any content on the service infringes your copyright, you may submit a DMCA takedown notice to our designated agent:</p>
          <div className="mt-2 p-3 bg-fill-input rounded-xl space-y-1">
            <p><strong className="text-text-primary">DMCA Agent:</strong> Project Maintainer</p>
            <p><strong className="text-text-primary">Email:</strong> dmca@hkcamera.app</p>
            <p><strong className="text-text-primary">Address:</strong> Available upon request</p>
          </div>
          <p className="mt-2">Your notice must include:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Identification of the copyrighted work claimed to be infringed.</li>
            <li>Identification of the material that is claimed to be infringing, with enough detail for us to locate it.</li>
            <li>Your contact information (address, phone number, email).</li>
            <li>A statement that you have a good faith belief that the use is not authorized by the copyright owner.</li>
            <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on their behalf.</li>
            <li>Your physical or electronic signature.</li>
          </ul>
          <p className="mt-2">We will respond to all valid DMCA notices and may terminate the accounts of repeat infringers.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">5. User Responsibilities</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>You must not use HK Camera to record in areas where there is a reasonable expectation of privacy (e.g., bathrooms, changing rooms) without explicit consent.</li>
            <li>You must post appropriate signage if required by local law (e.g., "This area under video surveillance").</li>
            <li>You must not use the service to harass, stalk, or invade the privacy of others.</li>
            <li>You are responsible for maintaining the confidentiality of your account and stream keys.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">6. Limitation of Liability</h3>
          <p>HK Camera is provided &quot;as is&quot; without warranty of any kind. To the maximum extent permitted by law, we are not liable for any damages arising from your use of the service, including but not limited to privacy violations, data loss, or security breaches caused by your failure to secure your account.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">7. Changes</h3>
          <p>We may update these terms at any time. Material changes will be notified via email or in-app notice. Continued use after changes constitutes acceptance.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">8. Contact</h3>
          <p>Questions about these terms? Open an issue on our GitHub repository or email the project maintainer.</p>
          <p className="mt-1 text-ap-blue text-xs">Effective date: May 21, 2026</p>
        </section>
      </div>
    </div>
  );
}
