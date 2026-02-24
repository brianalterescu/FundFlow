/** @type {import('tailwindcss').Config} */


export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'media', // enables automatic dark mode based on user's system
  theme: {
    extend: {
      colors: {
        fundflow: '#07d6a1', // our custom green
      },
      fontFamily: {
        lexend: ['"Lexend Deca"', 'sans-serif'],
      },
       keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
