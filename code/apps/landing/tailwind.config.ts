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
        mono: ['"JetBrains Mono"', 'monospace'],
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
        // Accent. Shifted one step lighter than stock Tailwind amber so the
        // highlight reads as a warm yellow-orange rather than a deep amber.
        // Only 400/500 move: they are the steps used on the dark half. 600/700
        // sit on the light `amber-100` chips, where lightening them would drop
        // the text below AA contrast.
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fcd34d',
          500: '#fbbf24',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
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
