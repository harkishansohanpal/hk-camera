import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { consentGiven } from '../lib/consent';

const THEME_KEY = 'hk-camera-theme';
const BG_TONE_KEY = 'bg_tone';
const GLASS_STYLE_KEY = 'glass_style';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    if (consentGiven()) return localStorage.getItem(THEME_KEY) || 'dark';
    return 'dark';
  });

  const [bgTone, setBgTone] = useState(() => {
    if (typeof window === 'undefined') return 50;
    const saved = localStorage.getItem(BG_TONE_KEY);
    return saved !== null ? Number(saved) : 50;
  });

  const [glassStyle, setGlassStyle] = useState(() => {
    if (typeof window === 'undefined') return 'frosted';
    return localStorage.getItem(GLASS_STYLE_KEY) || 'frosted';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (consentGiven()) {
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    let overlay;
    if (bgTone <= 50) {
      const opacity = ((50 - bgTone) / 50) * 0.4;
      overlay = opacity > 0 ? `rgba(255,255,255,${opacity})` : 'transparent';
    } else {
      const opacity = ((bgTone - 50) / 50) * 0.4;
      overlay = opacity > 0 ? `rgba(0,0,0,${opacity})` : 'transparent';
    }
    document.documentElement.style.setProperty('--bg-overlay', overlay);
    if (consentGiven()) {
      localStorage.setItem(BG_TONE_KEY, bgTone);
    }
  }, [bgTone]);

  useEffect(() => {
    if (consentGiven()) {
      localStorage.setItem(GLASS_STYLE_KEY, glassStyle);
    }
  }, [glassStyle]);

  const setTheme = useCallback((t) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, bgTone, setBgTone, glassStyle, setGlassStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
