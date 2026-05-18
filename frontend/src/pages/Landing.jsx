import { Link, useNavigate } from 'react-router-dom';
import { Camera, Shield, Video, Bell, Smartphone, Zap, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) { navigate('/dashboard', { replace: true }); return null; }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ── Nav ────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-hk-500 rounded-lg flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg">HK Camera</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-300 hover:text-white px-3 py-2 transition-colors">Log in</Link>
            <button
              onClick={() => navigate('/pricing')}
              className="text-sm text-slate-400 hover:text-white px-3 py-2 transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-hk-500 hover:bg-hk-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
            Turn any device into a{' '}
            <span className="text-hk-400">smart security camera</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
            AI-powered motion detection, real-time WebRTC streaming, two-way audio, and cloud recordings.
            Works from any browser — no hardware required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="bg-hk-500 hover:bg-hk-600 text-white font-semibold px-8 py-3.5 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
            >
              Start Free <ChevronRight size={20} />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-8 py-3.5 rounded-xl text-lg transition-colors border border-slate-700"
            >
              See Features
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Everything you need to{' '}
            <span className="text-hk-400">secure your home</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { Icon: Video, title: 'Live Streaming', desc: 'Peer-to-peer WebRTC video with ultra-low latency. Watch from any browser, anywhere.' },
              { Icon: Zap, title: 'ML Object Detection', desc: 'YOLOv8 AI detects people, vehicles, and animals — not just pixel changes. Fewer false alerts.' },
              { Icon: Bell, title: 'Smart Alerts', desc: 'Get notified via email, push, or in-app when motion is detected. Configurable sensitivity.' },
              { Icon: Shield, title: 'Night Vision', desc: 'Android Camera2 native low-light mode + IR phosphor overlay for viewing in complete darkness.' },
              { Icon: Smartphone, title: 'Mobile Apps', desc: 'Native iOS and Android apps via Capacitor. Install as PWA for quick access.' },
              { Icon: Camera, title: 'Two-Way Audio', desc: 'Speak through your camera from the viewer. Built-in echo cancellation.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="w-11 h-11 bg-hk-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Icon size={22} className="text-hk-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            How it <span className="text-hk-400">works</span>
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Open in browser', desc: 'No installation needed. Open HK Camera on any device with a camera — laptop, phone, or tablet.' },
              { step: '02', title: 'Go live', desc: 'Press broadcast to start streaming. Your camera becomes available instantly via WebRTC.' },
              { step: '03', title: 'Watch & protect', desc: 'View from anywhere, get AI-powered alerts, review recordings, and speak through your camera.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="text-hk-500 font-bold text-5xl mb-4 opacity-30">{step}</div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ────────────────────────────────────────── */}
      <section id="security" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Enterprise-grade <span className="text-hk-400">security</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Your video feeds and data are protected with modern encryption and security practices.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { Icon: Shield, title: 'End-to-End Encryption', desc: 'Video streams use SRTP (Secure Real-time Transport Protocol) via WebRTC with DTLS-SRTP key exchange. All communications are encrypted in transit.' },
              { Icon: Shield, title: 'TURN Relay Encryption', desc: 'When peer-to-peer fails, media is relayed through authenticated TURN servers with HMAC-SHA1 time-limited credentials. Cloudflare or self-hosted Coturn.' },
              { Icon: Shield, title: 'Encrypted at Rest', desc: 'Recordings stored in S3 are encrypted with AES-256 server-side encryption. Database connections enforce TLS in production.' },
              { Icon: Shield, title: 'JWT with Refresh Rotation', desc: 'Short-lived access tokens (15 min) with rotating refresh tokens. Compromised tokens are automatically invalidated on rotation.' },
              { Icon: Shield, title: 'Rate Limiting & Validation', desc: 'API-wide (300 req/15min) and auth-specific (20 req/15min) rate limiting. Input validation on all endpoints with express-validator.' },
              { Icon: Shield, title: 'Security Headers & Audit', desc: 'Helmet.js security headers (CSP, HSTS, X-Frame-Options), CORS origin restriction, Stripe webhook signature verification, and automated npm audit in CI.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="w-11 h-11 bg-hk-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Icon size={22} className="text-hk-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing preview ────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-slate-800/50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple <span className="text-hk-400">pricing</span>
          </h2>
          <p className="text-slate-400 mb-10 max-w-xl mx-auto">
            Start free, upgrade when you need more. All plans include core security features.
          </p>
          <button
            onClick={() => navigate('/pricing')}
            className="bg-hk-500 hover:bg-hk-600 text-white font-semibold px-8 py-3.5 rounded-xl text-lg transition-colors inline-flex items-center gap-2"
          >
            View Plans <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to secure your space?
          </h2>
          <p className="text-slate-400 mb-8">
            Set up your first camera in under a minute. No credit card required.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-hk-500 hover:bg-hk-600 text-white font-semibold px-8 py-3.5 rounded-xl text-lg transition-colors inline-flex items-center gap-2"
          >
            Get Started Free <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Camera size={14} />
            HK Camera
          </div>
          <p className="text-slate-600 text-xs">Built for home security. Open source on GitHub.</p>
        </div>
      </footer>
    </div>
  );
}
