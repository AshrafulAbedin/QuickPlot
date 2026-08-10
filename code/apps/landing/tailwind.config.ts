import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Display face for the wordmark, headings and buttons.
        head: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        // Handwritten face, used for the rotating accent word. Comic Sans ships
        // with Windows and macOS; Comic Neue is the webfont fallback so Linux
        // and Android get the same feel instead of a generic cursive.
        hand: ['"Comic Sans MS"', '"Comic Neue"', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Dark half of the split — unchanged from the original hero.
        ink: {
          900: '#161412',
          800: '#1c1a17',
          700: '#242119',
          600: '#2e2a23',
        },
        // Warm off-white half. Tuned to sit next to `ink` without going blue.
        paper: {
          50: '#FDFBF6',
          100: '#F7F3EA',
          200: '#EFE9DA',
          300: '#E0D8C4',
          400: '#C4B99E',
          600: '#7A7160',
        },
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 520ms cubic-bezier(0.2, 0.9, 0.3, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
