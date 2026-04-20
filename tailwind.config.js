/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1a1208',
        paper: '#f5f0e8',
        cream: '#ede8dc',
        red: '#c0392b',
        gold: '#b8860b',
        muted: '#7a6e5e',
        border: '#c8bfaa',
      },
      fontFamily: {
        jp: "'Noto Sans JP', sans-serif",
        serif: "'DM Serif Display', serif",
        mono: "'DM Mono', monospace",
      },
    },
  },
  plugins: [],
}
