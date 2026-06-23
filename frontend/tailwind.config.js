/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        panel: {
          bg: 'var(--color-panel-bg)',
          border: 'var(--color-panel-border)',
          inner: 'var(--color-panel-inner)',
        },
        brand: {
          'primary-start': 'var(--color-primary-start)',
          'primary-end': 'var(--color-primary-end)',
        },
        status: {
          listening: 'var(--color-listening)',
          speaking: 'var(--color-speaking)',
          thinking: 'var(--color-thinking)',
          processing: 'var(--color-processing)',
          error: 'var(--color-error)',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'glow-blue': 'var(--shadow-glow-blue)',
        'glow-listening': 'var(--shadow-glow-listening)',
        'glow-speaking': 'var(--shadow-glow-speaking)',
        'glow-thinking': 'var(--shadow-glow-thinking)',
        'glow-processing': 'var(--shadow-glow-processing)',
        'glow-error': 'var(--shadow-glow-error)',
      },
    },
  },
  plugins: [],
}
