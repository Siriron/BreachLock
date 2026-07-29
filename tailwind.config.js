/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        ink: "#0A0A0A",
        seal: "#F5C400",
        "seal-deep": "#B38F00",
        "seal-press": "#1A1600",
        graphite: "#8A8A82",
        "graphite-line": "#E5E4DD",
      },
      fontFamily: {
        mono: [
          "Fragment Mono",
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "redaction-noise":
          "repeating-linear-gradient(45deg, rgba(10,10,10,0.03) 0px, rgba(10,10,10,0.03) 1px, transparent 1px, transparent 6px)",
      },
      keyframes: {
        "redact-lift": {
          "0%": { transform: "scaleX(1)" },
          "100%": { transform: "scaleX(0)" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [],
};
