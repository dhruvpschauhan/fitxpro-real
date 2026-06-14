/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f1117',
        surface: '#171923',
        card: '#1e2130',
        primary: '#6C63FF',
        success: '#00E5A0',
        text: {
          primary: '#E2E8F0',
          secondary: '#94A3B8',
          muted: '#475569'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
