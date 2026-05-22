/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
      },
      colors: {
        page: 'var(--color-page)',
        card: 'var(--color-card)',
        'card-hover': 'var(--color-card-hover)',
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },
        fill: {
          input: 'var(--color-input-bg)',
          'input-border': 'var(--color-input-border)',
          'input-focus': 'var(--color-input-focus)',
        },
        ap: {
          blue:      '#007AFF',
          green:     '#34C759',
          red:       '#FF3B30',
          orange:    '#FF9500',
          yellow:    '#FFCC00',
          gray:      '#8E8E93',
          gray2:     '#AEAEB2',
          gray3:     '#C7C7CC',
          gray4:     '#D1D1D6',
          gray5:     '#E5E5EA',
          gray6:     '#F2F2F7',
          separator: 'var(--color-separator)',
        },
      },
      spacing: { '44': '44px' },
      minHeight: { '44': '44px' },
      minWidth:  { '44': '44px' },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      boxShadow: {
        'apple-sm': 'var(--shadow-sm)',
        'apple':    'var(--shadow-md)',
        'apple-lg': 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
};
