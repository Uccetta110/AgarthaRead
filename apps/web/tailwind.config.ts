import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./app/**/*.{vue,js,ts}', './shared/**/*.{vue,js,ts}', './app/assets/**/*.css'],
  theme: {
    extend: {
      colors: {
        page: 'rgb(var(--color-page) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        surface2: 'rgb(var(--color-surface-2) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-strong': 'rgb(var(--color-accent-strong) / <alpha-value>)',
        'accent-soft': 'rgb(var(--color-accent-soft) / <alpha-value>)',
        header: 'rgb(var(--color-header) / <alpha-value>)',
        headerBorder: 'rgb(var(--color-header-border) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        display: ['"Newsreader"', 'serif'],
      },
      boxShadow: {
        elevated: '0 18px 40px -30px rgb(0 0 0 / 0.45), 0 6px 14px -8px rgb(0 0 0 / 0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config
