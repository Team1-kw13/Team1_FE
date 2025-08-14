/** @type {import('tailwindcss').Config} */
export default {
  content: [".index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        yellow: "#FFB904",
        gray100: "#FAFAF7",
        gray200: "#ECECEC",
        gray300: "#D9D9D9",
        gray400: "#8A8A8A",
        gray450: "#484C52",
        gray500: "#3E3E3E",
      },
      fontFamily: {
        big: ['"Kakao Big Sans"', 'sans-serif'],
        small: ['"Kakao Small Sans"', 'sans-serif'],
        logo: ['"Ownglyph PDH"', 'sans-serif'],
      },
      animation: {
        gradient: 'gradientMove 0.8s ease-in-out forwards',
      },
      backgroundSize: {
        '200%': '200% 200%',
      }
    },
  },
  plugins: [],
}

