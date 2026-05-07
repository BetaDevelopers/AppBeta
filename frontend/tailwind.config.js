/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      // ── Colors ──────────────────────────────────────────────────
      colors: {
        beta: {
          // Backgrounds
          bg: '#030712',
          surface: '#0b1120',
          'surface-muted': '#1e293b',
          elevated: '#21262D',
          card: '#161B22',
          dashboard: '#0a0f1e',
          glass: 'rgba(15,23,42,0.65)',

          // Borders
          'border-subtle': 'rgba(255,255,255,0.04)',
          'border-default': 'rgba(255,255,255,0.08)',
          'border-strong': 'rgba(255,255,255,0.15)',

          // Text
          'text-primary': '#f8fafc',
          'text-secondary': '#94a3b8',
          'text-tertiary': '#475569',
          'text-muted': '#484F58',
          'text-body': '#E6EDF3',
          'text-dim': '#8B949E',

          // Accents
          accent: '#3b82f6',
          'accent-vivid': '#2563eb',
          'accent-gh': '#388BFD',
          purple: '#A371F7',
          green: '#3FB950',
          orange: '#F78166',
          yellow: '#E3B341',
          red: '#f87171',
        },
      },

      // ── Typography ──────────────────────────────────────────────
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      fontSize: {
        'beta-xs': ['11px', { lineHeight: '1.6' }],
        'beta-sm': ['13px', { lineHeight: '1.6' }],
        'beta-md': ['15px', { lineHeight: '1.6' }],
        'beta-lg': ['17px', { lineHeight: '1.6' }],
        'beta-xl': ['20px', { lineHeight: '1.3' }],
        'beta-2xl': ['24px', { lineHeight: '1.3' }],
        'beta-3xl': ['30px', { lineHeight: '1.3' }],
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
      },

      // ── Border radius ────────────────────────────────────────────
      borderRadius: {
        'beta-sm': '6px',
        'beta-md': '10px',
        'beta-lg': '14px',
        'beta-xl': '20px',
        'beta-2xl': '24px',
      },

      // ── Spacing / touch targets ──────────────────────────────────
      spacing: {
        'touch': '44px',
        'touch-md': '52px',
        'touch-lg': '60px',
      },

      // ── Shadows ──────────────────────────────────────────────────
      boxShadow: {
        'beta-card': '0 8px 32px 0 rgba(0,0,0,0.37)',
        'beta-btn': '0 4px 20px rgba(29,110,238,0.2)',
        'beta-glow': '0 0 20px -5px rgba(37,99,235,0.4)',
        'beta-ring': '0 0 8px rgba(56,139,253,0.6)',
      },

      // ── Transitions ───────────────────────────────────────────────
      transitionDuration: {
        'beta-fast': '120',
        'beta-normal': '200',
        'beta-slow': '300',
      },
      transitionTimingFunction: {
        'beta-spring': 'cubic-bezier(0.34,1.56,0.64,1)',
      },

      // ── Gradients ────────────────────────────────────────────────
      backgroundImage: {
        'beta-btn-primary': 'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)',
        'beta-btn-blue': 'linear-gradient(90deg,#1d6fee,#388BFD)',
        'beta-h1': 'linear-gradient(to bottom right,#ffffff 50%,#94a3b8)',
        'beta-glass-card': 'linear-gradient(135deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%)',
        'beta-blockquote': 'linear-gradient(to right,rgba(59,130,246,0.1),transparent)',
      },

      // ── Layout ───────────────────────────────────────────────────
      width: {
        'sidebar': '240px',
        'sidebar-collapsed': '72px',
        'sidebar-right': '300px',
      },
      height: {
        'toolbar': '64px',
        'topbar': '60px',
      },
    },
  },
  plugins: [],
}