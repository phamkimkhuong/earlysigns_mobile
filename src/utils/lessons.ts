import type { LessonSession, LessonSentence } from "@/types/domain";

export function pickInstructions(data: any, language?: string): string {
  if (!data) return "";
  const lang = String(language || "vi");
  if (lang.toLowerCase().startsWith("vi")) {
    return data.vi_instructions || data.en_instructions || "";
  }
  return data.en_instructions || data.vi_instructions || "";
}

export function lessonTitleFromData(
  data: any,
  t: (key: string, opts?: Record<string, any>) => string
): string {
  if (!data) return "";
  if (data.phoneme) {
    return t("lesson.titlePhoneme", { phoneme: data.phoneme });
  }
  const phonemes = Array.isArray(data.phonemes) ? data.phonemes : [];
  if (phonemes.length > 0) {
    return t("lesson.titlePersonalized", { phonemes: phonemes.join(" / ") });
  }
  return t("lesson.titlePersonalizedShort");
}

export function lessonPhonemesFromData(
  kind: string,
  data: any,
  opts: { phoneme?: string; [key: string]: any } = {}
): string[] {
  if (Array.isArray(data?.phonemes)) {
    const filtered = data.phonemes.filter((p: unknown) => typeof p === "string" && Boolean(p));
    if (filtered.length > 0) return Array.from(new Set(filtered));
  }
  const single = kind === "phoneme" ? opts.phoneme || data?.phoneme || "" : "";
  if (single) return [single];
  return [];
}

export function buildLessonSession(
  kind: string,
  data: any,
  opts: Record<string, any> = {},
  t: (key: string, opts?: Record<string, any>) => string,
  language?: string
): LessonSession | null {
  const sentences: LessonSentence[] = Array.isArray(data?.sentences) ? data.sentences : [];
  if (sentences.length === 0) return null;
  return {
    kind,
    phoneme: kind === "phoneme" ? opts.phoneme || data?.phoneme || "" : null,
    phonemes: lessonPhonemesFromData(kind, data, opts),
    dialect: data?.dialect || opts.dialect || "uk",
    sentences,
    title: lessonTitleFromData(data, t),
    instructionsHtml: kind === "phoneme" ? pickInstructions(data, language) : "",
  };
}
