import { useNavigate, Link } from 'react-router-dom';
import { Camera, Shield, Video, Bell, Smartphone, Zap, ChevronRight, Monitor, Radio, Eye, Volume2, Cloud, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) { navigate('/dashboard', { replace: true }); return null; }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ── Nav ────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-hk-500 rounded-lg flex items-center justify-center">
              <Camera size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg">HK Camera</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <button onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-slate-400 hover:text-white transition-colors">Products</button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-slate-400 hover:text-white transition-colors">How it Works</button>
            <button onClick={() => navigate('/pricing')} className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</button>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-300 hover:text-white px-3 py-2 transition-colors">Log in</Link>
            <button
              onClick={() => navigate('/register')}
              className="bg-hk-500 hover:bg-hk-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.1]">
            Turn any device into a{' '}
            <span className="text-hk-400">smart security camera</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            AI-powered motion detection, real-time WebRTC streaming, two-way audio, and cloud recordings.
            Works from any browser — no hardware required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="bg-hk-500 hover:bg-hk-600 text-white font-semibold px-8 py-3.5 rounded-xl text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-hk-500/25 hover:shadow-hk-500/40"
            >
              Start Free <ChevronRight size={20} />
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-8 py-3.5 rounded-xl text-lg transition-all border border-slate-700 flex items-center justify-center gap-2"
            >
              View Plans
            </button>
          </div>
        </div>
      </section>

      {/* ── Products / Features ────────────────────────────── */}
      <section id="products" className="py-24 px-4 sm:px-6 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to{' '}
              <span className="text-hk-400">secure your home</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Check in all around home with easy-to-set-up security cameras — no hardware required.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { Icon: Video, title: 'Live Streaming', desc: 'Peer-to-peer WebRTC video with ultra-low latency. Watch from any browser, anywhere.', color: 'text-blue-400 bg-blue-500/10' },
              { Icon: Zap, title: 'ML Object Detection', desc: 'YOLOv8 AI detects people, vehicles, and animals — not just pixel changes. Fewer false alerts.', color: 'text-yellow-400 bg-yellow-500/10' },
              { Icon: Bell, title: 'Smart Alerts', desc: 'Get notified via email, push, or in-app when motion is detected. Configurable sensitivity.', color: 'text-red-400 bg-red-500/10' },
              { Icon: Eye, title: 'Night Vision', desc: 'Android Camera2 native low-light mode + IR phosphor overlay for viewing in complete darkness.', color: 'text-green-400 bg-green-500/10' },
              { Icon: Smartphone, title: 'Mobile Apps', desc: 'Native iOS and Android apps via Capacitor. Install as PWA for quick access.', color: 'text-purple-400 bg-purple-500/10' },
              { Icon: Volume2, title: 'Two-Way Audio', desc: 'Speak through your camera from the viewer. Built-in echo cancellation.', color: 'text-cyan-400 bg-cyan-500/10' },
            ].map(({ Icon, title, desc, color }) => (
              <div key={title} className="bg-slate-800/80 rounded-xl p-6 sm:p-8 border border-slate-700/60 hover:border-slate-600 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${color} group-hover:scale-110 transition-transform`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/register')}
              className="bg-hk-500 hover:bg-hk-600 text-white font-semibold px-8 py-3 rounded-xl text-base transition-all inline-flex items-center gap-2"
            >
              Get Started Free <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How it <span className="text-hk-400">works</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Get started in under a minute. No installation, no hardware, no credit card.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              { step: '1', title: 'Open in browser', desc: 'Open HK Camera on any device with a camera — laptop, phone, or tablet. No installation needed.', icon: Monitor },
              { step: '2', title: 'Go live', desc: 'Press broadcast to start streaming. Your camera becomes available instantly via WebRTC.', icon: Radio },
              { step: '3', title: 'Watch & protect', desc: 'View from anywhere, get AI-powered alerts, review recordings, and speak through your camera.', icon: Eye },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="text-center">
                <div className="w-16 h-16 bg-hk-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Icon size={28} className="text-hk-400" />
                </div>
                <div className="text-hk-500 font-bold text-sm mb-2 tracking-widest">STEP {step}</div>
                <h3 className="text-xl font-semibold mb-3">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Enterprise-grade <span className="text-hk-400">security</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Your video feeds and data are protected with modern encryption and security practices.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { Icon: Lock, title: 'End-to-End Encryption', desc: 'Video streams use SRTP via WebRTC with DTLS-SRTP key exchange. All communications are encrypted in transit.' },
              { Icon: Radio, title: 'TURN Relay Encryption', desc: 'When peer-to-peer fails, media is relayed through authenticated TURN servers with HMAC-SHA1 time-limited credentials.' },
              { Icon: Cloud, title: 'Encrypted at Rest', desc: 'Recordings stored in S3 are encrypted with AES-256 server-side encryption. Database connections enforce TLS in production.' },
              { Icon: RefreshCw, title: 'JWT with Refresh Rotation', desc: 'Short-lived access tokens (15 min) with rotating refresh tokens. Compromised tokens are automatically invalidated on rotation.' },
              { Icon: Shield, title: 'Rate Limiting & Validation', desc: 'API-wide and auth-specific rate limiting. Input validation on all endpoints with express-validator.' },
              { Icon: Shield, title: 'Security Headers & Audit', desc: 'Helmet.js security headers, CORS origin restriction, Stripe webhook signature verification, and automated npm audit in CI.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="bg-slate-800/80 rounded-xl p-6 border border-slate-700/60 hover:border-slate-600 transition-all">
                <div className="w-11 h-11 bg-hk-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={20} className="text-hk-400" />
                </div>
                <h3 className="text-base font-semibold mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 bg-slate-800/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to secure your space?
          </h2>
          <p className="text-slate-400 text-lg mb-10">
            Set up your first camera in under a minute. No credit card required.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="bg-hk-500 hover:bg-hk-600 text-white font-semibold px-8 py-3.5 rounded-xl text-lg transition-all inline-flex items-center gap-2 shadow-lg shadow-hk-500/25 hover:shadow-hk-500/40"
          >
            Get Started Free <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-slate-500 text-sm">
            <div className="w-6 h-6 bg-hk-500 rounded flex items-center justify-center">
              <Camera size={12} className="text-white" />
            </div>
            HK Camera
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/pricing')} className="text-slate-600 hover:text-slate-400 text-xs transition-colors">Pricing</button>
            <Link to="/login" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">Log in</Link>
          </div>
          <p className="text-slate-700 text-xs">Open source on GitHub.</p>
        </div>
      </footer>
    </div>
  );
}
