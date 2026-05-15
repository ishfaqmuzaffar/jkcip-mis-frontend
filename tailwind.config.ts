import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0faf4",
          100: "#dcf3e6",
          200: "#bbe7cf",
          300: "#88d4ae",
          400: "#4fb983",
          500: "#2a9e63",
          600: "#1a7f4e",
          700: "#176640",
          800: "#155135",
          900: "#12422c",
          950: "#092419",
        },
        saffron: {
          50: "#fff8ed",
          100: "#feefd5",
          200: "#fddaaa",
          300: "#fbbf74",
          400: "#f99b3c",
          500: "#f77d17",
          600: "#e8620d",
          700: "#c0490d",
          800: "#993a13",
          900: "#7c3112",
          950: "#431507",
        },
        sidebar: {
          DEFAULT: "#1a3a2a",
          hover: "#22503a",
          active: "#2d6b4e",
          border: "#2a4f38",
        },
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        sidebar: "2px 0 8px 0 rgb(0 0 0 / 0.15)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
