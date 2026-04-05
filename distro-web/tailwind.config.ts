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
        blue: {
          DEFAULT: "#1A4BDB",
          dark: "#1239B0",
          light: "#E8EFFE",
          pale: "#F0F4FF",
        },
        green: {
          DEFAULT: "#00C46F",
          dark: "#00A05A",
          light: "#E0FAF0",
        },
        ink: "#0D1120",
        "off-white": "#F7F9FF",
        gray: {
          200: "#E0E4F0",
          400: "#9BA3BF",
          600: "#5C6480",
        },
      },
      fontFamily: {
        grotesk: ["Space Grotesk", "sans-serif"],
        jakarta: ["Plus Jakarta Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
