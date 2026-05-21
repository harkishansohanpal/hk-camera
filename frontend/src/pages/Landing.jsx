import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, Shield, Video, Bell, Smartphone, Zap, ChevronRight, Monitor, Radio, Eye, Volume2, Cloud, Lock, RefreshCw, Check, Moon, Sliders, Search, Wifi, Users, Code, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PRODUCTS = [
  { id: 'live', Icon: Video, title: 'Live Video', desc: 'See what your camera sees, instantly. Open it from any browser — no app download needed.', tech: 'Peer-to-peer WebRTC video with ultra-low latency. Watch from any browser, anywhere.' },
  { id: 'detection', Icon: Zap, title: 'Smart Detection', desc: 'Knows the difference between a person, a car, and a squirrel. You get fewer false alerts.', tech: 'YOLOv8 AI detects people, vehicles, and animals — not just pixel changes. Fewer false alerts.' },
  { id: 'alerts', Icon: Bell, title: 'Instant Alerts', desc: 'Get a notification the moment something happens. Choose email, push, or both.', tech: 'Get notified via email, push, or in-app when motion is detected. Configurable sensitivity.' },
  { id: 'night', Icon: Eye, title: 'Night Vision', desc: 'Works in the dark. Your camera can still see clearly even when the lights are off.', tech: 'Android Camera2 native low-light mode + IR phosphor overlay for viewing in complete darkness.' },
  { id: 'audio', Icon: Volume2, title: 'Talk Through It', desc: 'Hear what\'s happening and speak back. Works like a two-way intercom.', tech: 'Speak through your camera from the viewer. Built-in echo cancellation.' },
  { id: 'control', Icon: Sliders, title: 'Control From Anywhere', desc: 'Adjust brightness, turn on the flashlight, or flip the camera view — all remotely.', tech: 'Adjust torch, focus, exposure, and white balance remotely from the viewer.' },
  { id: 'recordings', Icon: Search, title: 'Record & Replay', desc: 'Save clips when motion is detected. Go back and watch what you missed.', tech: 'Auto-record on motion or manually. Browse, search, and replay from anywhere.' },
  { id: 'mobile', Icon: Smartphone, title: 'Works on Phones Too', desc: 'Use your phone as a camera or watch from it. Everything works on mobile browsers.', tech: 'Native iOS and Android via Capacitor. Works as a PWA for quick access.' },
  { id: 'theme', Icon: Moon, title: 'Easy on the Eyes', desc: 'Switch between light and dark mode. Looks great however you like it.', tech: 'Light and dark themes with automatic persistence. Easy on the eyes day or night.' },
];

const SECURITY = [
  { id: 'encryption', Icon: Lock, title: 'Fully Encrypted', desc: 'Your video is scrambled from end to end. Even we can\'t see your feed.', tech: 'Video streams use SRTP via WebRTC with DTLS-SRTP key exchange.' },
  { id: 'privacy', Icon: Users, title: 'Private to You', desc: 'Only people you share the link with can watch. You\'re in control.', tech: 'Short-lived access tokens (15 min) with rotating refresh tokens. Camera auth via stream key.' },
  { id: 'storage', Icon: Cloud, title: 'Your Data is Safe', desc: 'Recordings are stored securely. Delete them anytime — it\'s your footage.', tech: 'AES-256 encryption for all recordings. TLS enforced in production.' },
  { id: 'network', Icon: Wifi, title: 'Works on Your Network', desc: 'Video goes directly between devices when possible. No middleman needed.', tech: 'Media relayed through authenticated TURN servers with HMAC-SHA1 credentials.' },
  { id: 'opensource', Icon: Shield, title: 'Open Source', desc: 'The code is public for anyone to inspect. No secrets, no backdoors.', tech: 'CodeQL SAST analysis + eslint-plugin-security catch vulnerabilities before deployment. npm audit blocks high-severity issues.' },
  { id: 'exit', Icon: Moon, title: 'No Vendor Lock-In', desc: 'Stop anytime, keep your data. No contracts, no cancellation fees.', tech: 'Self-host option via Docker Compose. Standard RTSP/WebRTC protocols — works with any camera.' },
];

function Card({ item, expanded, onToggle }) {
  const { Icon, title, desc, tech } = item;
  return (
    <div className="card p-6 sm:p-8 transition-all duration-200">
      <div className="w-11 h-11 bg-ap-blue/10 rounded-xl flex items-center justify-center mb-4">
        <Icon size={20} className="text-ap-blue" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
      <button onClick={() => onToggle(item.id)}
        className="mt-3 flex items-center gap-1 text-xs font-semibold text-ap-blue hover:text-blue-600 transition-colors">
        <Code size={12} />
        {expanded ? 'Hide' : 'Show'} technical details
        <ChevronDown size={12} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-ap-separator animate-fade-in">
          <p className="text-xs text-text-secondary leading-relaxed">{tech}</p>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [expanded, setExpanded] = useState(new Set());

  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">What you get</button>
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
            Turn any phone or laptop into a{' '}
            <span className="text-ap-blue">security camera</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            No expensive equipment. No monthly contracts. Just grab your phone, open a browser,
            and you have a working security camera with smart alerts and recordings.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/register')} className="btn-primary text-lg px-8 py-3.5 shadow-apple-lg">
              Start Free <ChevronRight size={20} />
            </button>
            <button onClick={() => navigate('/pricing')} className="btn-secondary text-lg px-8 py-3.5">
              See Plans
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
              <span className="text-ap-blue">keep an eye on things</span>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">Works with any device that has a camera — laptop, tablet, or phone.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRODUCTS.map((item) => (
              <Card key={item.id} item={item} expanded={expanded.has(item.id)} onToggle={toggle} />
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
              Set up in{' '}
              <span className="text-ap-blue">under a minute</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">No installation. No boxes to mount. Just open and go.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              { step: '1', title: 'Open the site', desc: 'Go to HK Camera on any device with a camera — your phone, laptop, or tablet works fine.', icon: Monitor },
              { step: '2', title: 'Press "Go Live"', desc: 'Tap the button and your camera starts streaming. It\'s that simple.', icon: Radio },
              { step: '3', title: 'Watch from anywhere', desc: 'Open the same feed on another device. See live video, get alerts, and talk back.', icon: Eye },
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
              Your privacy{' '}
              <span className="text-ap-blue">matters</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">Your video feeds belong to you — no one else can watch without your permission.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECURITY.map((item) => (
              <Card key={item.id} item={item} expanded={expanded.has(item.id)} onToggle={toggle} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-text-primary">Ready to give it a try?</h2>
          <p className="text-text-secondary text-lg mb-8">Set up your first camera in under a minute. No credit card needed.</p>
          <button onClick={() => navigate('/register')} className="btn-primary text-lg px-8 py-3.5 shadow-apple-lg">
            Get Started Free <ChevronRight size={20} />
          </button>
        </div>
      </section>

      <footer className="py-6 px-4 border-t border-ap-separator bg-card">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4 text-xs text-text-secondary">
          <Link to="/privacy" className="hover:text-text-primary transition-colors">Privacy Policy</Link>
          <span className="text-ap-gray3">Open source on GitHub</span>
        </div>
      </footer>
    </div>
  );
}
