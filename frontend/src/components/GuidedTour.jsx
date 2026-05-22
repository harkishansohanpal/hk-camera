import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { ChevronRight, ChevronLeft, SkipForward } from 'lucide-react';

const DEFAULT_STEPS = [
  { target: 'tour-welcome', title: 'Welcome!', content: 'Quick tour to help you get started. Skip anytime.', position: 'center' },
  { target: 'tour-stats', title: 'Overview', content: 'See how many cameras you have, which ones are on, and recent alerts.', position: 'bottom' },
  { target: 'tour-add-camera', title: 'Add a Camera', content: 'Tap here to add a camera. You\'ll get a code to connect your phone.', position: 'left' },
  { target: 'tour-broadcast', title: 'Stream from Your Phone', content: 'Open the app on your phone and tap \'Stream\' on the camera card. Enter the code to start streaming live video.', position: 'top' },
  { target: 'tour-camera-list', title: 'Your Cameras', content: 'All your cameras show up here. Each one shows the name, status, and recording count.', position: 'top' },
  { target: 'tour-view-live', title: 'Watch Live', content: 'Tap \'Watch\' to see live video from any device.', position: 'top' },
  { target: 'tour-camera-menu', title: 'Manage', content: 'Tap the menu to rename, turn detection on/off, or delete a camera.', position: 'left' },
  { target: 'tour-nav', title: 'Navigation', content: 'Use the menu to get to Recordings, Alerts, Settings, and more.', position: 'right' },
  { target: 'tour-end', title: 'You\'re Ready!', content: 'Add a camera, open your phone\'s browser, and tap \'Stream\' to start.', position: 'center' },
];

function getTargetEl(step) {
  if (step.position === 'center') return null;
  const els = document.querySelectorAll(`[data-tour="${step.target}"]`);
  for (const el of els) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return els[0] || null;
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
    if (el) { const r = el.getBoundingClientRect(); setSpotlight({ top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 }); }
    else { setSpotlight(null); }
    const t = tooltipRef.current;
    if (!t) return;
    const tw = t.offsetWidth, th = t.offsetHeight;
    if (tw === 0 || th === 0) { setPos({ top: window.innerHeight / 2 - th / 2, left: window.innerWidth / 2 - tw / 2 }); return; }
    const pad = 12, gap = 8;
    const { innerWidth, innerHeight } = window;
    const isNarrow = innerWidth < 480;
    let top, left = Math.max(pad, (innerWidth - tw) / 2);
    if (!el) { top = (innerHeight - th) / 2; }
    else {
      const tr = el.getBoundingClientRect();
      const above = tr.top - gap - th, below = tr.bottom + gap;
      if (isNarrow || step.position === 'center') { top = below + th < innerHeight - pad ? below : (above > pad ? above : pad); left = Math.max(pad, Math.min(tr.left + tr.width / 2 - tw / 2, innerWidth - tw - pad)); }
      else if (step.position === 'top') { top = above > pad ? above : below; left = Math.max(pad, Math.min(tr.left + tr.width / 2 - tw / 2, innerWidth - tw - pad)); }
      else if (step.position === 'bottom') { top = below + th < innerHeight - pad ? below : (above > pad ? above : pad); left = Math.max(pad, Math.min(tr.left + tr.width / 2 - tw / 2, innerWidth - tw - pad)); }
      else if (step.position === 'left') {
        if (tr.left > tw + gap + pad) { top = Math.max(pad, Math.min(tr.top + tr.height / 2 - th / 2, innerHeight - th - pad)); left = tr.left - gap - tw; }
        else { top = Math.max(pad, Math.min(tr.top + tr.height / 2 - th / 2, innerHeight - th - pad)); left = tr.right + gap; }
      } else if (step.position === 'right') {
        if (tr.right + tw + gap + pad < innerWidth) { top = Math.max(pad, Math.min(tr.top + tr.height / 2 - th / 2, innerHeight - th - pad)); left = tr.right + gap; }
        else { top = Math.max(pad, Math.min(tr.top + tr.height / 2 - th / 2, innerHeight - th - pad)); left = tr.left - gap - tw; }
      } else { top = below + th < innerHeight - pad ? below : (above > pad ? above : pad); left = Math.max(pad, Math.min(tr.left + tr.width / 2 - tw / 2, innerWidth - tw - pad)); }
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
    return () => { window.removeEventListener('resize', handler); window.removeEventListener('scroll', handler, true); clearTimeout(timer); };
  }, [positionTooltip]);

  function handleNext() { if (isLast) { if (dontShowAgain) onDismiss?.(); onFinish?.(); } else { setStepIndex((i) => i + 1); } }
  function handleBack() { setStepIndex((i) => Math.max(0, i - 1)); }
  function handleSkip() { if (dontShowAgain) onDismiss?.(); onFinish?.(); }

  const isNarrow = typeof window !== 'undefined' ? window.innerWidth < 480 : false;

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
      <style>{`@keyframes tour-spotlight-pop { 0% { transform: scale(0.92); opacity: 0.6; } 50% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>
      {spotlight ? (
        <div className="absolute rounded-xl pointer-events-none" style={{
          top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
          transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
          animation: pulse ? 'tour-spotlight-pop 0.4s ease-out' : undefined,
        }} onClick={handleSkip} />
      ) : (
        <div className="absolute inset-0 bg-black/75" style={{ pointerEvents: 'auto' }} onClick={handleSkip} />
      )}
      {spotlight && (
        <div className="absolute rounded-xl pointer-events-none" style={{
          top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height,
          boxShadow: '0 0 0 2px rgba(255,255,255,0.6), 0 0 20px 3px rgba(255,255,255,0.2)',
          transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
        }} />
      )}

      <div ref={tooltipRef} className="absolute z-10 bg-card rounded-2xl shadow-apple-lg p-4 sm:p-5 border border-ap-separator"
        style={{ top: pos.top, left: pos.left, pointerEvents: 'auto', transition: 'top 0.3s ease, left 0.3s ease', maxWidth: 'calc(100vw - 24px)', width: isNarrow ? 'auto' : undefined, minWidth: isNarrow ? undefined : 288 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === stepIndex ? 'w-6 bg-ap-blue' : 'w-1.5 bg-ap-gray4'}`} />
            ))}
          </div>
          <button onClick={handleSkip} className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary transition-colors flex-shrink-0 min-h-0">
            <SkipForward size={12} /> Skip
          </button>
        </div>
        <h3 className="text-sm font-bold text-text-primary mb-1.5">{step.title}</h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-3">{step.content}</p>
        <label className="flex items-center gap-2 mb-4 cursor-pointer group">
          <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-ap-gray4 bg-card text-ap-blue focus:ring-ap-blue/30 cursor-pointer flex-shrink-0" />
          <span className="text-[11px] text-text-secondary group-hover:text-text-primary transition-colors select-none">Don't show on start</span>
        </label>
        <div className="flex items-center justify-between">
          <button onClick={handleBack} disabled={isFirst}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${isFirst ? 'text-ap-gray3 cursor-not-allowed' : 'text-text-secondary hover:text-text-primary hover:bg-card-hover'}`}>
            <ChevronLeft size={14} /> Back
          </button>
          <button onClick={handleNext} className="flex items-center gap-1 text-xs font-semibold px-4 py-1.5 bg-ap-blue hover:bg-[#0066E0] text-white rounded-xl transition-colors">
            {isLast ? 'Done' : 'Next'} {!isLast && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
