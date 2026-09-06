/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './packages/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: "#08090d",
        surface: "#0f1118",
        "surface-raised": "#151822",
        "surface-elevated": "#1c202e",
        border: "#232838",
        "border-light": "#2f364a",
        gold: {
          DEFAULT: "#e5b842",
          light: "#ffd56b",
          dark: "#b88a1b",
          muted: "rgba(229, 184, 66, 0.15)",
        },
        cyber: {
          cyan: "#00f0ff",
          blue: "#3b82f6",
          purple: "#8b5cf6",
        },
        up: {
          DEFAULT: "#00e676",
          glow: "rgba(0, 230, 118, 0.25)",
          hover: "#00ff88",
        },
        down: {
          DEFAULT: "#ff1744",
          glow: "rgba(255, 23, 68, 0.25)",
          hover: "#ff3355",
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        }
      }
    },
  },
  plugins: [],
}
