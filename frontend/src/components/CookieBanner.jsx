import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { acceptConsent, rejectConsent, consentStatus } from '../lib/consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!consentStatus()) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    acceptConsent();
    setVisible(false);
  }

  function handleReject() {
    rejectConsent();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4" style={{ pointerEvents: 'none' }}>
      <div className="max-w-lg mx-auto bg-card border border-ap-separator rounded-2xl shadow-apple-lg p-4 backdrop-blur-xl" style={{ pointerEvents: 'auto' }}>
        <p className="text-sm font-semibold text-text-primary mb-1">Your Privacy</p>
        <p className="text-xs text-text-secondary leading-relaxed mb-4">
          We use browser storage for things like keeping you logged in. Things like theme preference are only saved if you allow it.{' '}
          <Link to="/privacy" className="text-ap-blue hover:text-blue-600 font-semibold">Privacy</Link>
        </p>
        <div className="flex items-center gap-2">
          <button onClick={handleAccept} className="flex-1 btn-primary text-sm">Accept</button>
          <button onClick={handleReject} className="flex-1 btn-secondary text-sm">Only Essential</button>
        </div>
      </div>
    </div>
  );
}
