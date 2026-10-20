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
        party: {
          dark: '#0F172A',
          board: '#1E293B',
          card: '#334155',
          gold: '#F59E0B',
          crimson: '#EF4444',
          emerald: '#10B981',
          azure: '#3B82F6',
          purple: '#8B5CF6',
        },
      },
      fontFamily: {
        cartoon: ['"Fredoka"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-subtle': 'bounce 2s infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
