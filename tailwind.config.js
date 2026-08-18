/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#06090e",
        surface: {
          50: "#182030",
          100: "#131a27",
          200: "#0e1420",
          300: "#0a0e17",
        },
        emergency: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          glow: "rgba(239, 68, 68, 0.45)",
        },
        cyber: {
          cyan: "#06b6d4",
          blue: "#3b82f6",
          emerald: "#10b981",
          amber: "#f59e0b",
          purple: "#8b5cf6",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
