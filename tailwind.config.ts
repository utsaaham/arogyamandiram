import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.05rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
      '7xl': ['4.5rem', { lineHeight: '1' }],
      '8xl': ['6rem', { lineHeight: '1' }],
      '9xl': ['8rem', { lineHeight: '1' }],
    },
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
        // Workout page design tokens (used via bg-workout-bg, border-workout-border, text-workout-accent, etc.)
        // Keep the workout theme warm, but reduce the red cast.
        'workout-bg': '#141017',
        'workout-border': '#2A1E29',
        'workout-accent': '#FF4D4D',
        'workout-label': '#A38F8F',
      },
      fontFamily: {
        heading: ['var(--font-bebas)', 'Bebas Neue', 'sans-serif'],
        body: ['var(--font-outfit)', 'Outfit', 'system-ui', 'sans-serif'],
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
      minHeight: {
        'screen-safe': '100dvh',
      },
      height: {
        'screen-safe': '100dvh',
      },
      spacing: {
        'safe-top': 'var(--sat, env(safe-area-inset-top, 0px))',
        'safe-bottom': 'var(--sab, env(safe-area-inset-bottom, 0px))',
        'safe-left': 'var(--sal, env(safe-area-inset-left, 0px))',
        'safe-right': 'var(--sar, env(safe-area-inset-right, 0px))',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'water-fill': 'waterFill 1s ease-out forwards',
        'water-wave-slide': 'waterWaveSlide 10s linear infinite',
        'water-surface-glow': 'waterSurfaceGlow 2.5s ease-in-out infinite',
        'water-surface-glow-intense': 'waterSurfaceGlowIntense 0.5s ease-in-out infinite',
        'water-pour-stream': 'waterPourStreamShimmer 0.3s ease-in-out infinite',
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
        waterWaveSlide: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        waterSurfaceGlow: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.6' },
        },
        waterSurfaceGlowIntense: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.9' },
        },
        waterPourStreamShimmer: {
          '0%, 100%': { opacity: '1', transform: 'translateX(-50%) scaleX(1)' },
          '50%': { opacity: '0.85', transform: 'translateX(-50%) scaleX(1.08)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
