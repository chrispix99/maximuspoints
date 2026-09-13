import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          500: "#1f7ae0",
          600: "#1668c4",
          700: "#12559f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
