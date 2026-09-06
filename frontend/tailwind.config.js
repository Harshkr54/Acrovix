/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'acrovix-bg': 'rgb(var(--acrovix-bg-rgb) / <alpha-value>)',
        'acrovix-bg-secondary': 'rgb(var(--acrovix-bg-secondary-rgb) / <alpha-value>)',
        'acrovix-card': 'rgb(var(--acrovix-card-rgb) / <alpha-value>)',
        'acrovix-aqua-light': 'rgb(var(--acrovix-aqua-light-rgb) / <alpha-value>)',
        'acrovix-teal-primary': 'rgb(var(--acrovix-teal-primary-rgb) / <alpha-value>)',
        'acrovix-teal-bright': 'rgb(var(--acrovix-teal-bright-rgb) / <alpha-value>)',
        'acrovix-heading': 'rgb(var(--acrovix-heading-rgb) / <alpha-value>)',
        'acrovix-body': 'rgb(var(--acrovix-body-rgb) / <alpha-value>)',
        'acrovix-muted': 'rgb(var(--acrovix-muted-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(13, 148, 136, 0.08)',
        'glass-hover': '0 12px 40px 0 rgba(13, 148, 136, 0.16)',
        'card-glow': '0 0 25px rgba(20, 184, 166, 0.15)',
      },
      backdropBlur: {
        'glass': '12px',
      }
    },
  },
  plugins: [],
}
