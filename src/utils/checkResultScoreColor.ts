import { colors } from "@/core/theme";

export const CHECK_RESULT_SCORE_GOOD_THRESHOLD = 0.8;

export function checkResultScoreColor(score01: number | string | null | undefined): string {
  const s = Number(score01);
  if (!Number.isFinite(s)) return colors.danger;
  if (s >= 0.8) return colors.success;
  if (s >= 0.6) return colors.accent;
  if (s >= 0.4) return colors.warning;
  return colors.danger;
}

export function checkResultScoreColorFromPct(pct: number | string | null | undefined): string {
  const p = Number(pct);
  if (!Number.isFinite(p)) return colors.danger;
  if (p >= 80) return colors.success;
  if (p >= 60) return colors.accent;
  if (p >= 40) return colors.warning;
  return colors.danger;
}

export function accuracyBandColor(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return colors.danger;
  if (n >= 0.7) return colors.success;
  if (n >= 0.4) return colors.warning;
  return colors.danger;
}
