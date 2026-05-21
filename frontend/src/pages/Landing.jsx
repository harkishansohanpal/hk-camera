import { useNavigate, Link } from 'react-router-dom';
import { Camera, Shield, Video, Bell, Smartphone, Zap, ChevronRight, Monitor, Radio, Eye, Volume2, Cloud, Lock, RefreshCw, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) { navigate('/dashboard', { replace: true }); return null; }

  return (
    <div className="min-h-dvh bg-card text-text-primary">
      {/* ── Nav ────────────────────────────────────────────── */}
      <header className="nav-bar fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-b border-ap-separator">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-ap-blue rounded-xl flex items-center justify-center shadow-sm">
              <Camera size={16} className="text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-text-primary">HK Camera</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <button onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Products</button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">How it Works</button>
            <button onClick={() => navigate('/pricing')}
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Pricing</button>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost text-sm px-4 text-text-secondary hover:text-text-primary">Log in</Link>
            <button onClick={() => navigate('/register')} className="btn-primary text-sm px-5">Get Started</button>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05] text-text-primary">
            Turn any device into a{' '}
            <span className="text-ap-blue">smart security camera</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            AI-powered motion detection, real-time WebRTC streaming, two-way audio, and cloud recordings.
            Works from any browser — no hardware required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/register')} className="btn-primary text-lg px-8 py-3.5 shadow-apple-lg">
              Start Free <ChevronRight size={20} />
            </button>
            <button onClick={() => navigate('/pricing')} className="btn-secondary text-lg px-8 py-3.5">
              View Plans
            </button>
          </div>
        </div>
      </section>

      {/* ── Products ──────────────────────────────────────── */}
      <section id="products" className="py-24 px-4 sm:px-6 bg-page border-y border-ap-separator">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-text-primary">
              Everything you need to{' '}
              <span className="text-ap-blue">secure your home</span>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">Check in all around home with easy-to-set-up security cameras — no hardware required.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { Icon: Video, title: 'Live Streaming', desc: 'Peer-to-peer WebRTC video with ultra-low latency. Watch from any browser, anywhere.' },
              { Icon: Zap, title: 'ML Object Detection', desc: 'YOLOv8 AI detects people, vehicles, and animals — not just pixel changes. Fewer false alerts.' },
              { Icon: Bell, title: 'Smart Alerts', desc: 'Get notified via email, push, or in-app when motion is detected. Configurable sensitivity.' },
              { Icon: Eye, title: 'Night Vision', desc: 'Android Camera2 native low-light mode + IR phosphor overlay for viewing in complete darkness.' },
              { Icon: Smartphone, title: 'Mobile Apps', desc: 'Native iOS and Android apps via Capacitor. Install as PWA for quick access.' },
              { Icon: Volume2, title: 'Two-Way Audio', desc: 'Speak through your camera from the viewer. Built-in echo cancellation.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="card-highlighted p-6 sm:p-8 transition-all duration-200">
                <div className="w-11 h-11 bg-ap-blue/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={20} className="text-ap-blue" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button onClick={() => navigate('/register')} className="btn-primary text-base px-8 py-3">
              Get Started Free <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-text-primary">
              How it <span className="text-ap-blue">works</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">Get started in under a minute. No installation, no hardware, no credit card.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              { step: '1', title: 'Open in browser', desc: 'Open HK Camera on any device with a camera — laptop, phone, or tablet. No installation needed.', icon: Monitor },
              { step: '2', title: 'Go live', desc: 'Press broadcast to start streaming. Your camera becomes available instantly via WebRTC.', icon: Radio },
              { step: '3', title: 'Watch & protect', desc: 'View from anywhere, get AI-powered alerts, review recordings, and speak through your camera.', icon: Eye },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 bg-ap-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon size={26} className="text-ap-blue" />
                </div>
                <div className="text-ap-blue font-bold text-xs mb-2 tracking-widest">STEP {step}</div>
                <h3 className="text-lg font-semibold text-text-primary mb-3">{title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ──────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6 bg-page border-y border-ap-separator">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-text-primary">
              Enterprise-grade <span className="text-ap-blue">security</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">Your video feeds and data are protected with modern encryption and security practices.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { Icon: Lock, title: 'E2E Encryption', desc: 'Video streams use SRTP via WebRTC with DTLS-SRTP key exchange.' },
              { Icon: Radio, title: 'TURN Relay', desc: 'Media relayed through authenticated TURN servers with HMAC-SHA1 credentials.' },
              { Icon: Cloud, title: 'Encrypted at Rest', desc: 'AES-256 encryption for all recordings. TLS enforced in production.' },
              { Icon: RefreshCw, title: 'JWT Rotation', desc: 'Short-lived access tokens (15 min) with rotating refresh tokens.' },
              { Icon: Shield, title: 'Rate Limiting', desc: 'API-wide and auth-specific rate limiting with input validation.' },
              { Icon: Shield, title: 'Security Headers', desc: 'Helmet.js, CORS restriction, Stripe webhook verification, automated npm audit.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="card p-6 hover:shadow-apple transition-shadow">
                <div className="w-10 h-10 bg-ap-blue/10 rounded-xl flex items-center justify-center mb-3">
                  <Icon size={18} className="text-ap-blue" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-text-primary">Ready to secure your space?</h2>
          <p className="text-text-secondary text-lg mb-8">Set up your first camera in under a minute. No credit card required.</p>
          <button onClick={() => navigate('/register')} className="btn-primary text-lg px-8 py-3.5 shadow-apple-lg">
            Get Started Free <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-ap-separator py-8 px-4 sm:px-6 bg-card">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-text-secondary text-sm">
            <div className="w-6 h-6 bg-ap-blue rounded-lg flex items-center justify-center">
              <Camera size={12} className="text-white" />
            </div>
            HK Camera
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/pricing')} className="text-ap-gray3 hover:text-text-secondary text-xs transition-colors">Pricing</button>
            <Link to="/login" className="text-ap-gray3 hover:text-text-secondary text-xs transition-colors">Log in</Link>
          </div>
          <p className="text-ap-gray3 text-xs">Open source on GitHub.</p>
        </div>
      </footer>
    </div>
  );
}
