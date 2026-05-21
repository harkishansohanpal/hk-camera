import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'hk-cookie-consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'dismissed');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-lg mx-auto bg-card border border-ap-separator rounded-2xl shadow-apple-lg p-4 backdrop-blur-xl pointer-events-auto">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary mb-1">Cookie & Privacy Notice</p>
            <p className="text-xs text-text-secondary leading-relaxed">
              We use local storage for authentication and preferences. No tracking cookies are used.{' '}
              <Link to="/privacy" className="text-ap-blue hover:text-blue-600 font-semibold">Learn more</Link>
            </p>
          </div>
          <button onClick={dismiss} className="w-8 h-8 flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
