import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: '#111827',
          dark: '#374151',
          muted: '#6b7280',
          line: '#e5e7eb',
          bg: '#f9fafb',
          card: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}

export default config