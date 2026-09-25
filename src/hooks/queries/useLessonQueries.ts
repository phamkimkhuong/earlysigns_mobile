import { useQuery } from "@tanstack/react-query";
import { lessonApi } from "@/api";
import type { Dialect, HomeSummary } from "@/types/domain";

export const lessonKeys = {
  all: ["lessons"] as const,
  homeSummary: (dialect?: Dialect | string) =>
    [...lessonKeys.all, "homeSummary", dialect || "uk"] as const,
  screeningSentences: (dialect?: Dialect | string) =>
    [...lessonKeys.all, "screeningSentences", dialect || "uk"] as const,
  phonemeLesson: (phoneme: string, dialect?: Dialect | string) =>
    [...lessonKeys.all, "phoneme", phoneme, dialect || "uk"] as const,
};

/**
 * Fetch home screen / journey summary (streak, journey, weak phonemes, accuracy)
 */
export function useHomeSummaryQuery(dialect?: Dialect | string, enabled: boolean = true) {
  return useQuery<HomeSummary | null>({
    queryKey: lessonKeys.homeSummary(dialect),
    queryFn: () => lessonApi.getHomeSummary(dialect),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 30, // 30 minutes in cache
  });
}

/**
 * Fetch initial screening assessment sentences
 */
export function useScreeningSentencesQuery(dialect?: Dialect | string, enabled: boolean = true) {
  return useQuery({
    queryKey: lessonKeys.screeningSentences(dialect),
    queryFn: () => lessonApi.getScreeningSentences(dialect),
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Fetch lesson for a specific IPA phoneme
 */
export function usePhonemeLessonQuery(
  phoneme: string,
  dialect?: Dialect | string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: lessonKeys.phonemeLesson(phoneme, dialect),
    queryFn: () => lessonApi.getPhonemeLesson(phoneme, dialect, true),
    enabled: Boolean(phoneme) && enabled,
    staleTime: 1000 * 60 * 30,
  });
}
