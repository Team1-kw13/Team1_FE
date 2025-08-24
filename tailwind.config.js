/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
      keyframes:{
        gradient: {
          '0%':{backgroundPosition: '0% 50%'},
          '50%':{backgroundPosition: '100% 50%'},
          '100%':{backgroundPosition: '0% 50%'},
        },
        fadeUp:{
          "0%":{opacity:"0",transform:"translateY(20px)"},
          "100%":{opacity:"1",transform:"translateX(0)"},
        },
      },
      animation: {
        gradient: 'gradient 0.8s ease-in-out infinite',
        fadeUp:"fadeUp 0.8s ease-out forwards",
      },
      backgroundSize: {
        '200%': '200% 200%',
      }
    },
  },
  plugins: [
    function({addUtilities}){
      addUtilities({
        '.animation-delay-400':{'animation-delay':'400ms'},
        '.animation-delay-600':{'animation-delay':'600ms'},
      })
    }
  ],
}