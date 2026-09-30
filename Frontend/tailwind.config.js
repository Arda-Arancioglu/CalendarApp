/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#090A0F',
          surface: '#11131F',
          elevated: '#1A1D2D',
          border: '#272A3D',
          hover: '#222638',
        },
        accent: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
          muted: 'rgba(99, 102, 241, 0.15)',
          border: '#4338CA',
        },
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
        }
      },
      borderRadius: {
        'xs': '2px',
        'sm': '4px',
        'md': '6px',
        'DEFAULT': '4px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
