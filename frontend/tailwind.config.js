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
          bg: '#0a0f1e',
          surface: '#0f172a',
          'surface-light': '#1e293b',
          accent: '#2563eb',
          'accent-light': '#3b82f6',
        }
      }
    },
  },
  plugins: [],
}
