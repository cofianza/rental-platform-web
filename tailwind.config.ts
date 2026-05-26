import type { Config } from 'tailwindcss'

// NOTA: con Tailwind v4 la fuente de verdad del tema vive en
// `app/globals.css` (bloque @theme inline). Este archivo se mantiene
// para herramientas y plugins que aún lean tailwind.config.ts.
// Si actualizás colores aquí, espejá los mismos valores en globals.css.
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Esmeralda — verde Cofianza (rebrand 2026)
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        // Coral — accent CTAs principales
        coral: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Ink — "negro" del mockup para hero dark
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0F172A',
          950: '#020617',
        },
      },
      fontFamily: {
        display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        script: ['var(--font-fraunces)', 'serif'],
      },
    },
  },
}

export default config
