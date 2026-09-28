import { httpClient } from "./client";
import { API_ENDPOINTS } from "@/core/config";
import { useAuthStore } from "@/store/useAuthStore";
import type { VideoItem, VideoFeedTopic, VideoFeedResponse } from "@/types/domain";

export const videoApi = {
  /**
   * Fetch full video catalog feed (1 request for all topics, 4 initial cards + video_ids)
   */
  async getVideoFeed(level?: string): Promise<VideoFeedTopic[]> {
    const endpoint = API_ENDPOINTS.VIDEOS.FEED(level);
    const data = await httpClient.get<VideoFeedResponse>(endpoint);
    return Array.isArray(data?.topics) ? data.topics : [];
  },

  /**
   * Fetch a batch of video cards by IDs (max 4 IDs per request)
   */
  async getVideoCards(ids: string[]): Promise<VideoItem[]> {
    if (!ids || ids.length === 0) return [];
    // Strict safeguard: BE returns 400 if more than 4 IDs are requested
    const batch = ids.slice(0, 4);
    const endpoint = API_ENDPOINTS.VIDEOS.CARDS(batch);
    const data = await httpClient.get<any>(endpoint);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.videos)) return data.videos;
    if (Array.isArray(data?.cards)) return data.cards;
    return [];
  },

  /**
   * Fetch paginated videos by topic
   */
  async getVideos(
    topic: string,
    options: { cursor?: string | null; level?: string; limit?: number } = {}
  ): Promise<{ videos: VideoItem[]; next_cursor: string | null }> {
    const params: Record<string, any> = {
      topic,
      limit: options.limit || 8,
    };
    if (options.level) params.level = options.level;
    if (options.cursor) params.cursor = options.cursor;

    const data = await httpClient.get(API_ENDPOINTS.VIDEOS.LIST, params);
    return {
      videos: Array.isArray(data?.videos) ? data.videos : [],
      next_cursor: data?.next_cursor || null,
    };
  },

  /**
   * Fetch topic categories for videos
   */
  async getTopics(): Promise<string[]> {
    const data = await httpClient.get<{ topics: string[] }>(API_ENDPOINTS.VIDEOS.TOPICS);
    return Array.isArray(data?.topics) ? data.topics : [];
  },

  /**
   * Fetch recently viewed videos
   */
  async getViewedVideos(limit: number = 4): Promise<VideoItem[]> {
    const data = await httpClient.get<{ videos: VideoItem[] }>(API_ENDPOINTS.VIDEOS.VIEWED(limit));
    return Array.isArray(data?.videos) ? data.videos : [];
  },

  /**
   * Fetch video details and segments
   */
  async getVideoDetail(youtubeId: string): Promise<any> {
    return httpClient.get(API_ENDPOINTS.VIDEOS.DETAIL(youtubeId));
  },

  /**
   * Notify backend that video playback has started
   */
  async notifyViewStart(youtubeId: string, metadata: Record<string, any>): Promise<any> {
    const dialect = metadata.dialect || useAuthStore.getState().dialect || "uk";
    return httpClient.post(API_ENDPOINTS.VIDEOS.VIEW_START(youtubeId), {
      ...metadata,
      dialect,
    });
  },

  /**
   * Notify backend that a video segment has been played
   */
  async notifyViewSegment(youtubeId: string, index: number): Promise<any> {
    return httpClient.post(API_ENDPOINTS.VIDEOS.VIEW_SEGMENT(youtubeId), { index });
  },

  /**
   * Fetch IPA transcription for video segment
   */
  async getSegmentIpa(text: string, dialect?: string): Promise<any[]> {
    const d = dialect || useAuthStore.getState().dialect || "uk";
    const data = await httpClient.post(API_ENDPOINTS.VIDEOS.SEGMENT_IPA, { text, dialect: d });
    return Array.isArray(data?.words) ? data.words : [];
  },
};

export default videoApi;
