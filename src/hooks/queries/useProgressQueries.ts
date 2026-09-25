import { useQuery } from "@tanstack/react-query";
import { progressApi } from "@/api";
import type { Dialect } from "@/types/domain";

export const progressKeys = {
  all: ["progress"] as const,
  sounds: (dialect?: Dialect | string) =>
    [...progressKeys.all, "sounds", dialect || "uk"] as const,
  history: (start: string, end: string) =>
    [...progressKeys.all, "history", start, end] as const,
};

/**
 * Fetch all 44 IPA phonemes progress accuracy
 */
export function useProgressSoundsQuery(dialect?: Dialect | string, enabled: boolean = true) {
  return useQuery<any[]>({
    queryKey: progressKeys.sounds(dialect),
    queryFn: () => progressApi.getSounds(dialect),
    enabled,
    staleTime: 1000 * 60 * 15, // 15 minutes fresh
    gcTime: 1000 * 60 * 60,
  });
}

/**
 * Fetch daily historical practice accuracy within date range
 */
export function useProgressHistoryQuery(start: string, end: string, enabled: boolean = true) {
  return useQuery<any[]>({
    queryKey: progressKeys.history(start, end),
    queryFn: () => progressApi.getHistory(start, end),
    enabled: Boolean(start && end) && enabled,
    staleTime: 1000 * 60 * 15, // 15 minutes fresh
    gcTime: 1000 * 60 * 60,
  });
}
