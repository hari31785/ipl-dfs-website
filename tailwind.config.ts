import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Authentic Indian Cricket Team Colors
        primary: {
          DEFAULT: '#002244', // Deep Navy Blue (Indian team jersey)
          50: '#e6f0ff',
          100: '#cce0ff',
          200: '#99c2ff',
          300: '#66a3ff',
          400: '#3385ff',
          500: '#0066ff',
          600: '#0052cc',
          700: '#003d99',
          800: '#002244', // Main Deep Navy
          900: '#001122',
        },
        secondary: {
          DEFAULT: '#FF9933', // Authentic Saffron Orange
          50: '#fff7e6',
          100: '#ffedcc',
          200: '#ffdb99',
          300: '#ffc966',
          400: '#ffb633',
          500: '#FF9933', // Main Saffron Orange
          600: '#cc7a29',
          700: '#995c1f',
          800: '#663d14',
          900: '#331f0a',
        },
        accent: {
          DEFAULT: '#FFFFFF', // Pure White
          50: '#ffffff',
          100: '#fafafa',
          200: '#f5f5f5',
          300: '#f0f0f0',
          400: '#e5e5e5',
          500: '#d9d9d9',
          600: '#b3b3b3',
          700: '#8c8c8c',
          800: '#666666',
          900: '#404040',
        },
        // Cricket field green
        cricket: {
          DEFAULT: '#228B22', // Cricket field green
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#228B22', // Main cricket green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Indian flag inspired colors
        tricolor: {
          saffron: '#FF9933',
          white: '#FFFFFF', 
          green: '#138808',
          navy: '#002244',
        },
        // Status colors
        success: '#138808',
        warning: '#FF9933',
        error: '#dc2626',
        info: '#002244',
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
