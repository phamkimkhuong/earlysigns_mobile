import type { SentenceCheckResult } from "@/types/domain";

export const SCREENING_SENTENCE_COUNT = 5;

export function screeningAccuracy(result?: SentenceCheckResult | null): number | null {
  const value: unknown = result?.accuracy;
  if (value == null || String(value) === "" || typeof value === "boolean") return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 1 ? score : null;
}

export type ScreeningProgress = { current: number; results: Record<number, SentenceCheckResult> };
export type ScreeningAction =
  | { type: "recorded"; index: number; result: SentenceCheckResult }
  | { type: "next" }
  | { type: "previous" };

export function screeningReducer(state: ScreeningProgress, action: ScreeningAction): ScreeningProgress {
  if (action.type === "recorded") {
    if (action.index !== state.current || screeningAccuracy(action.result) === null) return state;
    return { ...state, results: { ...state.results, [action.index]: action.result } };
  }
  if (action.type === "previous") return { ...state, current: Math.max(0, state.current - 1) };
  if (screeningAccuracy(state.results[state.current]) === null) return state;
  return { ...state, current: Math.min(SCREENING_SENTENCE_COUNT - 1, state.current + 1) };
}

export function isScreeningComplete(results: ScreeningProgress["results"]): boolean {
  return Array.from({ length: SCREENING_SENTENCE_COUNT }, (_, index) => index)
    .every(index => screeningAccuracy(results[index]) !== null);
}
