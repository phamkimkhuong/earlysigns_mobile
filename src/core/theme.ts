export interface Colors {
  bg: string;
  bgElevated: string;
  bgMuted: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentHover: string;
  accentMuted: string;
  danger: string;
  dangerMuted: string;
  success: string;
  warning: string;
  overlay: string;
  practiceHeader: string;
  calloutBlue: string;
  calloutYellow: string;
  calloutPink: string;
  calloutGreen: string;
  calloutOrange: string;
}

export const colors: Colors = {
  bg: "#f7f6f3",
  bgElevated: "#ffffff",
  bgMuted: "#efeee9",
  text: "#37352f",
  textSecondary: "#6b6b66",
  textMuted: "#9b9a97",
  border: "rgba(55, 53, 47, 0.09)",
  borderStrong: "rgba(55, 53, 47, 0.16)",
  accent: "#2383e2",
  accentHover: "#1a6fc9",
  accentMuted: "rgba(35, 131, 226, 0.12)",
  danger: "#e03e3e",
  dangerMuted: "rgba(224, 62, 62, 0.1)",
  success: "#0f7b6c",
  warning: "#cb912f",
  overlay: "rgba(55, 53, 47, 0.5)",
  practiceHeader: "#1a5f91",
  calloutBlue: "rgba(35, 131, 226, 0.10)",
  calloutYellow: "rgba(233, 168, 0, 0.12)",
  calloutPink: "rgba(226, 85, 161, 0.10)",
  calloutGreen: "rgba(15, 123, 108, 0.10)",
  calloutOrange: "rgba(217, 115, 13, 0.10)",
};

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 16,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
