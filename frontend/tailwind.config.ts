import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class', // class-based toggling
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
        },
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        theme: {
          bg: 'rgb(var(--color-theme-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-theme-surface) / <alpha-value>)',
          text: 'rgb(var(--color-theme-text) / <alpha-value>)',
          muted: 'rgb(var(--color-theme-muted) / <alpha-value>)',
          border: 'rgb(var(--color-theme-border) / <alpha-value>)',
        },
        dark: {
          bg: 'rgb(var(--color-theme-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-theme-surface) / <alpha-value>)',
          text: 'rgb(var(--color-theme-text) / <alpha-value>)',
        },
      },
      backdropBlur: { xs: '2px' },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
export default config;
