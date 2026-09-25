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
}

export const colors: Colors = {
  bg: "#f8fafc",
  bgElevated: "#ffffff",
  bgMuted: "#f1f5f9",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  border: "rgba(15, 23, 42, 0.06)",
  borderStrong: "rgba(15, 23, 42, 0.12)",
  accent: "#4f46e5",
  accentHover: "#4338ca",
  accentMuted: "rgba(79, 70, 229, 0.12)",
  danger: "#ef4444",
  dangerMuted: "rgba(239, 68, 68, 0.1)",
  success: "#10b981",
  warning: "#f59e0b",
  overlay: "rgba(15, 23, 42, 0.5)",
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
