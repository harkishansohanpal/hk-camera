import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';

const TOUR_KEY = 'hk-camera-tour-completed';

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
    content: 'Click here to add your first camera. You\'ll need an RTSP stream URL or the stream key from your camera app.',
    position: 'left',
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
    content: 'Add a camera to start monitoring. If you need help, check the docs or join our Discord.',
    position: 'center',
  },
];

function getStepTarget(step) {
  if (step.position === 'center') return null;
  if (step.target === 'tour-welcome' || step.target === 'tour-end') return null;
  return document.querySelector(`[data-tour="${step.target}"]`);
}

function getTooltipPosition(targetEl, preferred) {
  if (!targetEl) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  const rect = targetEl.getBoundingClientRect();
  const gap = 12;

  switch (preferred) {
    case 'top':
      return {
        top: rect.top - gap,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%)',
      };
    case 'bottom':
      return {
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, 0)',
      };
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - gap,
        transform: 'translate(-100%, -50%)',
      };
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        transform: 'translate(0, -50%)',
      };
    default:
      return {
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, 0)',
      };
  }
}

export function useTour() {
  const [active, setActive] = useState(false);
  const [completed, setCompleted] = useState(() => localStorage.getItem(TOUR_KEY) === 'true');

  const start = useCallback(() => setActive(true), []);
  const finish = useCallback(() => {
    setActive(false);
    setCompleted(true);
    localStorage.setItem(TOUR_KEY, 'true');
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(TOUR_KEY);
    setCompleted(false);
  }, []);

  return { active, completed, start, finish, reset, setActive };
}

export default function GuidedTour({ steps = DEFAULT_STEPS, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [spotlightStyle, setSpotlightStyle] = useState({});
  const tooltipRef = useRef(null);

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const updatePosition = useCallback(() => {
    const targetEl = getStepTarget(step);
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      setSpotlightStyle({
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
      });
      setTooltipPosition(getTooltipPosition(targetEl, step.position));
    } else {
      setSpotlightStyle({ display: 'none' });
      setTooltipStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
    }
  }, [step, stepIndex]);

  function setTooltipPosition(pos) {
    setTooltipStyle(pos);
  }

  useEffect(() => {
    updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [updatePosition]);

  useEffect(() => {
    if (!tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 16;
    const maxY = window.innerHeight - rect.height - 16;
    let { top, left } = tooltipStyle;

    if (typeof top === 'number' && top < 16) top = 16;
    if (typeof left === 'number' && left < 16) left = 16;
    if (typeof left === 'number' && left > maxX) left = maxX;
    if (typeof top === 'number' && top > maxY) top = maxY;

    setTooltipStyle((prev) => ({
      ...prev,
      top: typeof top === 'number' ? top + 'px' : top,
      left: typeof left === 'number' ? left + 'px' : left,
    }));
  }, [stepIndex]);

  function handleNext() {
    if (isLast) {
      onFinish?.();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function handleSkip() {
    onFinish?.();
  }

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" style={{ pointerEvents: 'auto' }} onClick={handleSkip} />

      {/* Spotlight cutout */}
      {spotlightStyle.display !== 'none' && (
        <div
          className="absolute rounded-lg pointer-events-none"
          style={{
            ...spotlightStyle,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="absolute z-10 bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-5 w-72 sm:w-80"
        style={{ ...tooltipStyle, pointerEvents: 'auto', transition: 'top 0.3s ease, left 0.3s ease' }}
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
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <SkipForward size={12} />
            Skip
          </button>
        </div>

        {/* Content */}
        <h3 className="text-sm font-semibold text-white mb-1.5">{step.title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">{step.content}</p>

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
