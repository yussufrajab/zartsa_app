// client/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Outfit', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#e6f4ef',
          100: '#c0e4d5',
          200: '#8ecfb2',
          300: '#4db889',
          400: '#12a07a',
          500: '#0d9068',
          600: '#0a7c5c',
          700: '#085a43',
          800: '#064734',
          900: '#043426',
        },
        zartsa: {
          green: '#0a7c5c',
          blue: '#1a5f8a',
          gold: '#c8730a',
        },
      },
      animation: {
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fadeIn 0.3s ease-out both',
        'fade-up': 'fadeUp 0.4s ease-out both',
        'shimmer': 'shimmer 1.8s infinite linear',
        'pulse-dot': 'pulseDot 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2.5s ease-in-out infinite',
      },
      keyframes: {
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(10,124,92,0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(10,124,92,0.15)' },
        },
      },
      boxShadow: {
        'card': '0 2px 8px rgba(10, 124, 92, 0.07), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 12px 32px rgba(10, 124, 92, 0.14), 0 4px 8px rgba(0, 0, 0, 0.06)',
        'glow': '0 0 0 3px rgba(10, 124, 92, 0.3)',
        'drawer': '8px 0 48px rgba(10, 124, 92, 0.15)',
        'premium': '0 20px 60px rgba(10, 124, 92, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;