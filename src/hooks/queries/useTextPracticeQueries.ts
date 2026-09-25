import { useQuery } from "@tanstack/react-query";
import { textPracticeApi } from "@/api";

export const textPracticeKeys = {
  all: ["textPractice"] as const,
  passages: (limit: number = 30) => [...textPracticeKeys.all, "passages", limit] as const,
};

/**
 * Fetch saved passages for text practice
 */
export function useSavedPassagesQuery(limit: number = 30, enabled: boolean = true) {
  return useQuery<any[]>({
    queryKey: textPracticeKeys.passages(limit),
    queryFn: () => textPracticeApi.getSavedPassages(limit),
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes fresh
    gcTime: 1000 * 60 * 30,
  });
}
