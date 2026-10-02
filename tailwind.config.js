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
        accent: "#0284c7",
        accentHover: "#0369a1",
        accentMuted: "rgba(2, 132, 199, 0.12)",
        danger: "#ef4444",
        dangerMuted: "rgba(239, 68, 68, 0.1)",
        success: "#10b981",
        warning: "#f59e0b",
        overlay: "rgba(15, 23, 42, 0.5)",
      },
      fontSize: {
        // Mobile Typography Scale (Chuẩn tỉ lệ hiển thị trên di động)
        "2xs": ["10px", { lineHeight: "14px" }],
        "badge": ["11px", { lineHeight: "15px" }],
        "caption": ["13px", { lineHeight: "18px" }],
        "body-sm": ["14px", { lineHeight: "20px" }],
        "body": ["15px", { lineHeight: "22px" }],
        "body-lg": ["16px", { lineHeight: "24px" }],
        "title-sm": ["17px", { lineHeight: "24px" }],
        "title": ["19px", { lineHeight: "26px" }],
        "heading-sm": ["22px", { lineHeight: "28px" }],
        "heading": ["26px", { lineHeight: "32px" }],
        "display": ["32px", { lineHeight: "38px" }],
      },
    },
  },
  plugins: [],
};
