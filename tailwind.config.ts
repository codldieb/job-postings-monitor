import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        "surface-4": "var(--surface-4)",
        hairline: "var(--hairline)",
        "hairline-strong": "var(--hairline-strong)",
        "hairline-tertiary": "var(--hairline-tertiary)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-subtle": "var(--ink-subtle)",
        "ink-tertiary": "var(--ink-tertiary)",
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "primary-focus": "var(--primary-focus)",
        "on-primary": "var(--on-primary)",
        "semantic-success": "var(--semantic-success)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["var(--font-mono-jb)", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      maxWidth: {
        content: "1280px",
      },
      letterSpacing: {
        display: "-0.6px",
      },
    },
  },
  plugins: [],
};

export default config;
