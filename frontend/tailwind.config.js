/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ap: {
          blue:      '#007AFF',
          green:     '#34C759',
          red:       '#FF3B30',
          orange:    '#FF9500',
          yellow:    '#FFCC00',
          purple:    '#AF52DE',
          pink:      '#FF2D55',
          teal:      '#5AC8FA',
          gray:      '#8E8E93',
          gray2:     '#AEAEB2',
          gray3:     '#C7C7CC',
          gray4:     '#D1D1D6',
          gray5:     '#E5E5EA',
          gray6:     '#F2F2F7',
          bg:        '#FFFFFF',
          separator: 'rgba(60,60,67,0.12)',
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
        'apple-sm': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'apple':    '0 4px 14px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        'apple-lg': '0 12px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
