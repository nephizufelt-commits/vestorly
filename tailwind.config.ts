import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Vestorly brand colors
        primary: '#1F7A4D',      // primary green (CTAs)
        accent: '#4CAF50',       // success / confirmations
        accentSoft: '#DFF5E3',   // subtle highlights
        soft: '#E9ECEF',         // card backgrounds, dividers
        text: '#444444',         // main text
      },
    },
  },
  plugins: [],
}

export default config
