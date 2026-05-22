import { createContext, useContext, useState, useCallback } from 'react';

const DISMISSED_KEY = 'hk-camera-tour-dismissed';

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true');

  const start = useCallback(() => setActive(true), []);
  const finish = useCallback(() => setActive(false), []);
  const dismissForever = useCallback(() => { setDismissed(true); localStorage.setItem(DISMISSED_KEY, 'true'); }, []);
  const reset = useCallback(() => { localStorage.removeItem(DISMISSED_KEY); setDismissed(false); }, []);

  return (
    <TourContext.Provider value={{ active, dismissed, start, finish, reset, dismissForever }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourProvider');
  return ctx;
}
