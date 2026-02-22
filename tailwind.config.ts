import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#08080d',
          surface: '#0f0f18',
          elevated: '#16162a',
          hover: '#1c1c35',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.03)',
          default: 'rgba(255, 255, 255, 0.06)',
          strong: 'rgba(255, 255, 255, 0.12)',
        },
        text: {
          primary: '#f0f0f5',
          secondary: '#a1a1b5',
          muted: '#6b7280',
        },
        accent: {
          emerald: '#10b981',
          'emerald-dim': '#065f46',
          violet: '#8b5cf6',
          'violet-dim': '#4c1d95',
          amber: '#f59e0b',
          'amber-dim': '#78350f',
          rose: '#ef4444',
          'rose-dim': '#7f1d1d',
          cyan: '#06b6d4',
          'cyan-dim': '#164e63',
          pink: '#ec4899',
          'pink-dim': '#831843',
        },
      },
      fontFamily: {
        heading: ['var(--font-satoshi)', 'system-ui', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glow: '0 0 20px rgba(139, 92, 246, 0.15)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.15)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.15)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'water-fill': 'waterFill 1s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        waterFill: {
          '0%': { height: '0%' },
          '100%': { height: 'var(--fill-height)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
