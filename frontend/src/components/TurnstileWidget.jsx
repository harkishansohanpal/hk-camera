import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export default function TurnstileWidget({ onToken, onExpire }) {
  const containerRef = useRef(null);
  const widgetId = useRef(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const win = window;
    if (win.turnstile) {
      widgetId.current = win.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onToken?.(token),
        'expired-callback': () => onExpire?.(),
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (win.turnstile) {
        widgetId.current = win.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onToken?.(token),
          'expired-callback': () => onExpire?.(),
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (win.turnstile && widgetId.current != null) {
        win.turnstile.remove(widgetId.current);
      }
    };
  }, [onToken, onExpire]);

  return <div ref={containerRef} className="cf-turnstile-wrapper" />;
}
