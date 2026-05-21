import { useNavigate, Link } from 'react-router-dom';
import { Camera, Shield, Video, Bell, Smartphone, Zap, ChevronRight, Monitor, Radio, Eye, Volume2, Cloud, Lock, RefreshCw, Check, Moon, Sliders, Search, Wifi, Users } from 'lucide-react';
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
            {[
              { Icon: Video, title: 'Live Video', desc: 'See what your camera sees, instantly. Open it from any browser — no app download needed.' },
              { Icon: Zap, title: 'Smart Detection', desc: 'Knows the difference between a person, a car, and a squirrel. You get fewer false alerts.' },
              { Icon: Bell, title: 'Instant Alerts', desc: 'Get a notification the moment something happens. Choose email, push, or both.' },
              { Icon: Eye, title: 'Night Vision', desc: 'Works in the dark. Your camera can still see clearly even when the lights are off.' },
              { Icon: Volume2, title: 'Talk Through It', desc: 'Hear what\'s happening and speak back. Works like a two-way intercom.' },
              { Icon: Sliders, title: 'Control From Anywhere', desc: 'Adjust brightness, turn on the flashlight, or flip the camera view — all remotely.' },
              { Icon: Search, title: 'Record & Replay', desc: 'Save clips when motion is detected. Go back and watch what you missed.' },
              { Icon: Smartphone, title: 'Works on Phones Too', desc: 'Use your phone as a camera or watch from it. Everything works on mobile browsers.' },
              { Icon: Moon, title: 'Easy on the Eyes', desc: 'Switch between light and dark mode. Looks great however you like it.' },
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
            {[
              { Icon: Lock, title: 'Fully Encrypted', desc: 'Your video is scrambled from end to end. Even we can\'t see your feed.' },
              { Icon: Users, title: 'Private to You', desc: 'Only people you share the link with can watch. You\'re in control.' },
              { Icon: Cloud, title: 'Your Data is Safe', desc: 'Recordings are stored securely. Delete them anytime — it\'s your footage.' },
              { Icon: Wifi, title: 'Works on Your Network', desc: 'Video goes directly between devices when possible. No middleman needed.' },
              { Icon: Shield, title: 'Open Source', desc: 'The code is public for anyone to inspect. No secrets, no backdoors.' },
              { Icon: Moon, title: 'No Vendor Lock-In', desc: 'Stop anytime, keep your data. No contracts, no cancellation fees.' },
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
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-text-primary">Ready to give it a try?</h2>
          <p className="text-text-secondary text-lg mb-8">Set up your first camera in under a minute. No credit card needed.</p>
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
