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
          <h3 className="text-base font-semibold text-text-primary mb-2">1. Agreement</h3>
          <p>By creating an account or using the service, you agree to these Terms and our <Link to="/privacy" className="text-ap-blue hover:text-blue-600 font-semibold">Privacy Policy</Link>.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">2. Audio Recording</h3>
          <p>HK Camera lets you talk through your camera. You are responsible for following the law when using audio, including:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>In most US states, only you need to consent to record.</li>
            <li>Some states (California, Connecticut, Florida, and others) require everyone's consent. You must tell people and get their OK before recording.</li>
            <li>Other countries have their own laws. It's your job to know them.</li>
          </ul>
          <p className="mt-2">We're not responsible for how you use the audio feature.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">3. Object Detection</h3>
          <p>HK Camera uses a pixel-based motion detection algorithm that runs entirely on your device and:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Does <strong className="text-text-primary">not</strong> recognize faces or identify people.</li>
            <li>Does <strong className="text-text-primary">not</strong> create face prints.</li>
            <li>Does <strong className="text-text-primary">not</strong> send detection data to our servers.</li>
          </ul>
          <p className="mt-2">Detection results (like &quot;person&quot; or &quot;car&quot;) are used only to trigger alerts.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">4. Copyright</h3>
          <p>We respect copyright. If you think something on the service violates your copyright, tell us:</p>
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
          <h3 className="text-base font-semibold text-text-primary mb-2">5. Your Responsibilities</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Don't use HK Camera to record in private spaces (bathrooms, changing rooms) without permission.</li>
            <li>Post signs if your local law requires it (like &quot;This area is on camera&quot;).</li>
            <li>Don't use the service to harass or stalk people.</li>
            <li>Keep your account and stream keys safe.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">6. No Warranty</h3>
          <p>HK Camera is provided &quot;as is&quot; with no warranty. We are not liable for any problems from using the service, including privacy issues, data loss, or security problems from not securing your account.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">7. Changes</h3>
          <p>We may update these terms. We'll notify you of big changes. Using the service after changes means you accept them.</p>
        </section>

        <section>
          <h3 className="text-base font-semibold text-text-primary mb-2">8. Contact</h3>
          <p>Questions? Open an issue on GitHub or email the maintainer.</p>
          <p className="mt-1 text-ap-blue text-xs">Effective date: May 21, 2026</p>
        </section>
      </div>
    </div>
  );
}
