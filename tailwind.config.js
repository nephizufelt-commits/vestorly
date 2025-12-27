/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts}",
    ],
  theme: {
    extend: {
      colors: {
        primary: "#1F7A4D",
        accent: "#4CAF50",
        accentSoft: "#DFF5E3",
        soft: "#E9ECEF",
        text: "#444444",
        muted: "#6B7280",
      },
    },
  },
  plugins: [],
}

