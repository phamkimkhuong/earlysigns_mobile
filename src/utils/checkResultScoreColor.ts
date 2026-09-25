import { colors } from "@/core/theme";

export const CHECK_RESULT_SCORE_GOOD_THRESHOLD = 0.8;

export function checkResultScoreColor(score01: number | string | null | undefined): string {
  const s = Number(score01);
  if (!Number.isFinite(s)) return colors.warning;
  return s >= CHECK_RESULT_SCORE_GOOD_THRESHOLD ? colors.success : colors.warning;
}

export function checkResultScoreColorFromPct(pct: number | string | null | undefined): string {
  const p = Number(pct);
  if (!Number.isFinite(p)) return colors.warning;
  return p >= CHECK_RESULT_SCORE_GOOD_THRESHOLD * 100 ? colors.success : colors.warning;
}

export function accuracyBandColor(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return colors.danger;
  if (n >= 0.7) return colors.success;
  if (n >= 0.4) return colors.warning;
  return colors.danger;
}
