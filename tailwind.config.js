/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beta: {
          primary: '#8b5cf6',
          'primary-dark': '#7c3aed',
          bg: '#0f172a',
          'bg-card': '#1e293b',
        }
      }
    },
  },
  plugins: [],
}
