/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          350: '#cbd5e1',
          450: '#94a3b8',
          850: '#1b2330',
          855: '#17202c',
          950: '#0b0f19',
        },
        emerald: {
          350: '#52dcb0',
          450: '#0fb478',
          550: '#047857',
        },
        blue: {
          450: '#2563eb',
        },
      },
      boxShadow: {
        'glow-blue': '0 0 15px rgba(59, 130, 246, 0.35)',
        'glow-emerald': '0 0 15px rgba(16, 185, 129, 0.35)',
      },
      animation: {
        'fadeIn': 'fadeIn 0.25s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
