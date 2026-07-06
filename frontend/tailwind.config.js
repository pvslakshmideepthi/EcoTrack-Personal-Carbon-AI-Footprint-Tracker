/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // You can add custom EcoTrack brand colours here if needed
        green: {
          50: '#f0fdf4',
          500: '#22c55e',
          700: '#15803d',
        }
      }
    },
  },
  plugins: [],
}