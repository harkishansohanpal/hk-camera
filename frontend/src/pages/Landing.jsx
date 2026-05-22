import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, Shield, Video, Bell, Smartphone, Zap, ChevronRight, Monitor, Radio, Eye, Volume2, Cloud, Lock, Moon, Sliders, Search, Wifi, Users, Code, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PRODUCTS = [
  { id: 'live', Icon: Video, title: 'Live Video', desc: 'Watch live from any browser. No app needed.', tech: 'Works right out of the box.' },
  { id: 'detection', Icon: Zap, title: 'Smart Detection', desc: 'Knows the difference between people, cars, and animals. Fewer false alerts.', tech: 'Works right out of the box.' },
  { id: 'alerts', Icon: Bell, title: 'Instant Alerts', desc: 'Get notified the moment something happens — by email or push.', tech: 'Works right out of the box.' },
  { id: 'night', Icon: Eye, title: 'Night Vision', desc: 'Works in the dark. Clear video even with the lights off.', tech: 'Works right out of the box.' },
  { id: 'audio', Icon: Volume2, title: 'Talk Through It', desc: 'Hear and speak through your camera like a walkie-talkie.', tech: 'Works right out of the box.' },
  { id: 'control', Icon: Sliders, title: 'Control From Anywhere', desc: 'Adjust brightness, turn on the light, or flip the view — all from your phone.', tech: 'Works right out of the box.' },
  { id: 'recordings', Icon: Search, title: 'Record & Replay', desc: 'Save clips when motion is spotted. Watch them back anytime.', tech: 'Works right out of the box.' },
  { id: 'mobile', Icon: Smartphone, title: 'Works on Phones Too', desc: 'Use a phone as a camera or watch from one. Everything works in a browser.', tech: 'Works right out of the box.' },
  { id: 'theme', Icon: Moon, title: 'Easy on the Eyes', desc: 'Light or dark mode. Looks great however you like it.', tech: 'Works right out of the box.' },
];

const SECURITY = [
  { id: 'encryption', Icon: Lock, title: 'Fully Encrypted', desc: 'Your video is scrambled so only you can see it.', tech: 'Works right out of the box.' },
  { id: 'privacy', Icon: Users, title: 'Private to You', desc: 'Only people you share the link with can watch.', tech: 'Works right out of the box.' },
  { id: 'storage', Icon: Cloud, title: 'Your Data is Safe', desc: 'Recordings are stored safely. Delete them anytime.', tech: 'Works right out of the box.' },
  { id: 'network', Icon: Wifi, title: 'Works on Your Network', desc: 'Video goes directly between your devices. No middleman.', tech: 'Works right out of the box.' },
  { id: 'opensource', Icon: Shield, title: 'Open Source', desc: 'The code is public. Anyone can check it for security.', tech: 'Works right out of the box.' },
  { id: 'exit', Icon: Moon, title: 'No Vendor Lock-In', desc: 'Stop anytime, keep your data. No contracts or fees.', tech: 'Works right out of the box.' },
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
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Features</button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">How it Works</button>
            <button onClick={() => navigate('/pricing')}
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Pricing</button>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost text-sm px-4 text-text-secondary hover:text-text-primary">Log In</Link>
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
            No expensive gear. No monthly fees. Just grab any device with a camera, open a browser, and you've got a security camera with smart alerts and recordings.
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
              <span className="text-ap-blue">watch over your space</span>
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
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">No install. No boxes to mount. Just open and go.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              { step: '1', title: 'Open the website', desc: 'Go to HK Camera on any device with a camera — your phone, laptop, or tablet.', icon: Monitor },
              { step: '2', title: 'Press "Go Live"', desc: 'Tap the button and your camera starts streaming. It\'s just that easy.', icon: Radio },
              { step: '3', title: 'Watch from anywhere', desc: 'Open the feed on another device. Watch live, get alerts, and talk back.', icon: Eye },
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
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">Your video belongs to you. No one else can watch without your permission.</p>
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
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-text-primary">Ready to try it?</h2>
          <p className="text-text-secondary text-lg mb-8">Set up your first camera in under a minute. No credit card needed.</p>
          <button onClick={() => navigate('/register')} className="btn-primary text-lg px-8 py-3.5 shadow-apple-lg">
            Get Started Free <ChevronRight size={20} />
          </button>
        </div>
      </section>

      <footer className="py-4 px-4 border-t border-ap-separator bg-card">
        <div className="max-w-7xl mx-auto flex items-baseline justify-center gap-6 text-xs text-text-secondary">
          <Link to="/privacy" className="hover:text-text-primary transition-colors leading-none">Privacy</Link>
          <span aria-hidden="true" className="text-ap-gray3 select-none">&middot;</span>
          <Link to="/terms" className="hover:text-text-primary transition-colors leading-none">Terms</Link>
          <span aria-hidden="true" className="text-ap-gray3 select-none">&middot;</span>
          <span className="text-ap-gray3 leading-none">View source on GitHub</span>
        </div>
      </footer>
    </div>
  );
}
