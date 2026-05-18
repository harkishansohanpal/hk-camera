import { useRef, useCallback, useEffect } from 'react';

export function useWakeLock() {
  const wlRef = useRef(null);
  const shouldHaveRef = useRef(false);

  const acquire = useCallback(async () => {
    shouldHaveRef.current = true;
    if (!navigator.wakeLock || wlRef.current) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => {
        wlRef.current = null;
        if (shouldHaveRef.current) acquire();
      });
      wlRef.current = lock;
    } catch (e) {
      // Wake lock not supported or denied
    }
  }, []);

  const release = useCallback(() => {
    shouldHaveRef.current = false;
    if (wlRef.current) {
      wlRef.current.release().catch(() => {});
      wlRef.current = null;
    }
  }, []);

  // Re-acquire on visibility change if we should still have the lock
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && shouldHaveRef.current && !wlRef.current) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [acquire]);

  return { isSupported: !!navigator.wakeLock, acquire, release };
}
