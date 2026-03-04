import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Indian T20 Team Colors
        primary: {
          DEFAULT: '#003366', // Navy Blue
          50: '#e6f2ff',
          100: '#cce5ff',
          200: '#99ccff',
          300: '#66b2ff',
          400: '#3399ff',
          500: '#0080ff',
          600: '#0066cc',
          700: '#004d99',
          800: '#003366', // Main Navy
          900: '#001a33',
        },
        secondary: {
          DEFAULT: '#FF6600', // Saffron Orange
          50: '#fff3e6',
          100: '#ffe7cc',
          200: '#ffcc99',
          300: '#ffb366',
          400: '#ff9933',
          500: '#FF6600', // Main Saffron
          600: '#cc5200',
          700: '#993d00',
          800: '#662900',
          900: '#331400',
        },
        accent: {
          DEFAULT: '#FFFFFF', // White
          50: '#ffffff',
          100: '#f9f9f9',
          200: '#f0f0f0',
          300: '#e0e0e0',
          400: '#d0d0d0',
          500: '#c0c0c0',
          600: '#a0a0a0',
          700: '#808080',
          800: '#606060',
          900: '#404040',
        },
        // Cricket-themed greens
        cricket: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Status colors
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-roboto-mono)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config;