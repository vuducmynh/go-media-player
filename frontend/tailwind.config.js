/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fluent: {
          bg: {
            dark: '#141418',
            darker: '#0d0d11',
            card: '#1e1e24',
            hover: '#282830',
            active: '#32323c',
            subtle: '#18181f'
          },
          border: {
            dark: '#2d2d38',
            subtle: '#22222b'
          },
          accent: {
            DEFAULT: '#38bdf8',
            hover: '#0ea5e9',
            active: '#0284c7',
            subtle: '#0369a1',
            glow: 'rgba(56, 189, 248, 0.25)'
          },
          purple: {
            DEFAULT: '#a855f7',
            hover: '#9333ea',
            subtle: 'rgba(168, 85, 247, 0.2)'
          },
          text: {
            primary: '#f3f4f6',
            secondary: '#9ca3af',
            muted: '#6b7280'
          }
        }
      },
      boxShadow: {
        'fluent': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'fluent-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
        'accent-glow': '0 0 20px -3px rgba(56, 189, 248, 0.4)',
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
