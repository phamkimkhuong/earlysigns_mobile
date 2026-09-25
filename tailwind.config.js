/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        appBg: "#f8fafc",
        appElevated: "#ffffff",
        appMuted: "#f1f5f9",
        appText: "#0f172a",
        appTextSecondary: "#475569",
        appTextMuted: "#94a3b8",
        appBorder: "rgba(15, 23, 42, 0.06)",
        appBorderStrong: "rgba(15, 23, 42, 0.12)",
        accent: "#4f46e5",
        accentHover: "#4338ca",
        accentMuted: "rgba(79, 70, 229, 0.12)",
        danger: "#ef4444",
        dangerMuted: "rgba(239, 68, 68, 0.1)",
        success: "#10b981",
        warning: "#f59e0b",
        overlay: "rgba(15, 23, 42, 0.5)",
      },
    },
  },
  plugins: [],
};
