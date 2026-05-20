import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';

const DISMISSED_KEY = 'hk-camera-tour-dismissed';

const DEFAULT_STEPS = [
  {
    target: 'tour-welcome',
    title: 'Welcome to HK Camera',
    content: 'Let\'s take a 60-second tour to get you started. You can skip at any time.',
    position: 'center',
  },
  {
    target: 'tour-stats',
    title: 'At a Glance',
    content: 'See your total cameras, how many are online, and your recent alert count — all in one row.',
    position: 'bottom',
  },
  {
    target: 'tour-add-camera',
    title: 'Add a Camera',
    content: 'Click here to add a security camera. If you have an RTSP camera, enter its stream URL. For your phone, you\'ll use the stream key shown after adding.',
    position: 'left',
  },
  {
    target: 'tour-broadcast',
    title: 'Broadcast from Your Phone',
    content: 'Open the app on your phone and tap "Broadcast" on the camera card. Enter the stream key to start streaming live video.',
    position: 'top',
  },
  {
    target: 'tour-camera-list',
    title: 'Your Cameras',
    content: 'All your cameras appear here. Each card shows the name, online status, and recording count.',
    position: 'top',
  },
  {
    target: 'tour-view-live',
    title: 'View Live Feed',
    content: 'Click "View Live" to watch the camera stream in real-time. Uses WebRTC for low-latency streaming.',
    position: 'top',
  },
  {
    target: 'tour-camera-menu',
    title: 'Camera Settings',
    content: 'Manage each camera — rename, adjust detection settings, or delete it.',
    position: 'left',
  },
  {
    target: 'tour-nav',
    title: 'Navigation',
    content: 'Use the sidebar to access Recordings, Alerts, and Settings at any time.',
    position: 'right',
  },
  {
    target: 'tour-end',
    title: 'You\'re All Set!',
    content: 'Add a camera, then open the CameraView on your phone with the stream key to start broadcasting live.',
    position: 'center',
  },
];

function getTargetEl(step) {
  if (step.position === 'center') return null;
  return document.querySelector(`[data-tour="${step.target}"]`);
}

export function useTour() {
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true');

  const start = useCallback(() => setActive(true), []);
  const finish = useCallback(() => setActive(false), []);

  const dismissForever = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(DISMISSED_KEY);
    setDismissed(false);
  }, []);

  return { active, dismissed, start, finish, reset, dismissForever };
}

export default function GuidedTour({ steps = DEFAULT_STEPS, onFinish, onDismiss }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [spotlight, setSpotlight] = useState(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [pulse, setPulse] = useState(false);
  const tooltipRef = useRef(null);

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const positionTooltip = useCallback(() => {
    const el = getTargetEl(step);
    if (el) {
      const r = el.getBoundingClientRect();
      setSpotlight({ top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 });
    } else {
      setSpotlight(null);
    }

    const t = tooltipRef.current;
    if (!t) return;
    const tw = t.offsetWidth;
    const th = t.offsetHeight;
    if (tw === 0 || th === 0) {
      setPos({ top: window.innerHeight / 2 - th / 2, left: window.innerWidth / 2 - tw / 2 });
      return;
    }

    const pad = 12;
    const gap = 8;
    const { innerWidth, innerHeight } = window;
    const isNarrow = innerWidth < 480;

    let top;
    let left = Math.max(pad, (innerWidth - tw) / 2);

    if (!el) {
      top = (innerHeight - th) / 2;
    } else {
      const tr = el.getBoundingClientRect();
      const above = tr.top - gap - th;
      const below = tr.bottom + gap;

      if (isNarrow || step.position === 'center') {
        top = below + th < innerHeight - pad ? below : (above > pad ? above : pad);
        left = Math.max(pad, Math.min(tr.left + tr.width / 2 - tw / 2, innerWidth - tw - pad));
      } else if (step.position === 'top') {
        top = above > pad ? above : below;
        left = Math.max(pad, Math.min(tr.left + tr.width / 2 - tw / 2, innerWidth - tw - pad));
      } else if (step.position === 'bottom') {
        top = below + th < innerHeight - pad ? below : (above > pad ? above : pad);
        left = Math.max(pad, Math.min(tr.left + tr.width / 2 - tw / 2, innerWidth - tw - pad));
      } else if (step.position === 'left') {
        if (tr.left > tw + gap + pad) {
          top = Math.max(pad, Math.min(tr.top + tr.height / 2 - th / 2, innerHeight - th - pad));
          left = tr.left - gap - tw;
        } else {
          top = Math.max(pad, Math.min(tr.top + tr.height / 2 - th / 2, innerHeight - th - pad));
          left = tr.right + gap;
        }
      } else if (step.position === 'right') {
        if (tr.right + tw + gap + pad < innerWidth) {
          top = Math.max(pad, Math.min(tr.top + tr.height / 2 - th / 2, innerHeight - th - pad));
          left = tr.right + gap;
        } else {
          top = Math.max(pad, Math.min(tr.top + tr.height / 2 - th / 2, innerHeight - th - pad));
          left = tr.left - gap - tw;
        }
      } else {
        top = below + th < innerHeight - pad ? below : (above > pad ? above : pad);
        left = Math.max(pad, Math.min(tr.left + tr.width / 2 - tw / 2, innerWidth - tw - pad));
      }
    }

    top = Math.max(pad, Math.min(top, innerHeight - th - pad));
    left = Math.max(pad, Math.min(left, innerWidth - tw - pad));
    setPos({ top, left });
  }, [step, stepIndex]);

  useLayoutEffect(() => {
    positionTooltip();
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 400);
    const handler = () => positionTooltip();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
      clearTimeout(timer);
    };
  }, [positionTooltip]);

  function handleNext() {
    if (isLast) {
      if (dontShowAgain) onDismiss?.();
      onFinish?.();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function handleSkip() {
    if (dontShowAgain) onDismiss?.();
    onFinish?.();
  }

  const isNarrow = typeof window !== 'undefined' ? window.innerWidth < 480 : false;

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
      {/* Spotlight pulse animation keyframes */}
      <style>{`
        @keyframes tour-spotlight-pop {
          0% { transform: scale(0.92); opacity: 0.6; }
          50% { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" style={{ pointerEvents: 'auto' }} onClick={handleSkip} />

      {/* Spotlight cutout */}
      {spotlight && (
        <div
          className="absolute rounded-lg pointer-events-none"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: `
              0 0 0 9999px rgba(0,0,0,0.85),
              0 0 0 2px rgba(255,255,255,0.7),
              0 0 20px 3px rgba(255,255,255,0.25)
            `,
            transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
            animation: pulse ? 'tour-spotlight-pop 0.4s ease-out' : undefined,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute z-10 bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-4 sm:p-5"
        style={{
          top: pos.top,
          left: pos.left,
          pointerEvents: 'auto',
          transition: 'top 0.3s ease, left 0.3s ease',
          maxWidth: 'calc(100vw - 24px)',
          width: isNarrow ? 'auto' : undefined,
          minWidth: isNarrow ? undefined : 288,
        }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === stepIndex ? 'w-6 bg-hk-400' : 'w-1.5 bg-slate-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
          >
            <SkipForward size={12} />
            Skip
          </button>
        </div>

        <h3 className="text-sm font-semibold text-white mb-1.5">{step.title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">{step.content}</p>

        {/* "Don't show again" checkbox */}
        <label className="flex items-center gap-2 mb-4 cursor-pointer group">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-500 bg-slate-700 text-hk-500 focus:ring-hk-500/30 focus:ring-offset-0 cursor-pointer flex-shrink-0"
          />
          <span className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors select-none">
            Don't show this on startup from next time
          </span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isFirst
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            disabled={isFirst}
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-1 text-xs font-medium px-4 py-1.5 bg-hk-500 hover:bg-hk-600 text-white rounded-lg transition-colors"
          >
            {isLast ? 'Done' : 'Next'}
            {!isLast && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
