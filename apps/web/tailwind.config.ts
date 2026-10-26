import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#211a16',
        sand: '#f5efe6',
        // Classic barbershop: dark espresso with brass accents.
        brand: { DEFAULT: '#2b211c', dark: '#16110e', light: '#efe3cc' },
        brass: { DEFAULT: '#b6873a', light: '#e8d3a6', dark: '#8a6324' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
