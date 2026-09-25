import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { videoApi } from "@/api";

export const videoKeys = {
  all: ["videos"] as const,
  topics: () => [...videoKeys.all, "topics"] as const,
  viewed: (limit: number) => [...videoKeys.all, "viewed", limit] as const,
  topicSection: (topic: string, level?: string) =>
    [
      ...videoKeys.all,
      "section",
      topic.trim(),
      level && level.trim() ? level.trim().toUpperCase() : "ALL",
    ] as const,
  detail: (youtubeId: string) => [...videoKeys.all, "detail", youtubeId] as const,
};

/**
 * Fetch video topic categories with 30-minute staleTime
 */
export function useTopicsQuery() {
  return useQuery({
    queryKey: videoKeys.topics(),
    queryFn: () => videoApi.getTopics(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Fetch recently viewed videos for the current user
 */
export function useViewedVideosQuery(limit: number = 4, enabled: boolean = true) {
  return useQuery({
    queryKey: videoKeys.viewed(limit),
    queryFn: () => videoApi.getViewedVideos(limit),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch infinite paginated videos for a topic & level with 20-minute staleTime
 */
export function useTopicVideosInfiniteQuery(
  topic: string,
  level?: string,
  options: { enabled?: boolean } = {}
) {
  return useInfiniteQuery({
    queryKey: videoKeys.topicSection(topic, level),
    queryFn: async ({ pageParam }) => {
      return videoApi.getVideos(topic, {
        cursor: pageParam || undefined,
        level: level || undefined,
        limit: 8,
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? undefined,
    enabled: Boolean(topic) && (options.enabled ?? true),
    staleTime: 1000 * 60 * 20, // 20 minutes fresh
    gcTime: 1000 * 60 * 60, // 1 hour memory persistence
    retry: false,
  });
}

/**
 * Fetch video details and segments by youtubeId with 30-minute staleTime
 */
export function useVideoDetailQuery(youtubeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: videoKeys.detail(youtubeId),
    queryFn: () => videoApi.getVideoDetail(youtubeId),
    enabled: Boolean(youtubeId) && enabled,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}
