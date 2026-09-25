import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  Play,
  PlayCircle,
  Video,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { formatDuration, topicLabel, videoThumbnail } from "@/utils/errors";
import { videoApi } from "@/api";
import { VideoCardSkeleton, VideoCatalogSkeleton } from "@/components/ui/Skeleton";
import type { VideoItem } from "@/types/domain";

const TOPIC_PAGE_SIZE = 8;
const VIEWED_PREVIEW_SIZE = 4;

interface TopicStateItem {
  videos: VideoItem[];
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string;
}

function emptyTopicState(): TopicStateItem {
  return { videos: [], nextCursor: null, loading: false, loadingMore: false, error: "" };
}

function mergeUniqueVideos(existing: VideoItem[], incoming: VideoItem[]): VideoItem[] {
  const seen = new Set((existing || []).map((v) => String(v?.youtube_id || "")).filter(Boolean));
  const merged = [...(existing || [])];
  for (const video of incoming || []) {
    const id = String(video?.youtube_id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(video);
  }
  return merged;
}

function VideoCard({
  video,
  t,
  showProgress,
  onPress,
}: {
  video: VideoItem;
  t: (key: string, opts?: any) => string;
  showProgress?: boolean;
  onPress: () => void;
}) {
  const playedPct = Math.max(0, Math.min(100, Number(video.played_pct || 0)));
  const totalSegments = Math.max(Number(video.segment_count || 0), Number(video.played_count || 0));
  const thumbSrc = videoThumbnail(video);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      className="w-[230px] mr-3.5 mb-2 bg-white rounded-3xl overflow-hidden border border-slate-200"
      onPress={onPress}
    >
      <View className="relative w-full h-[126px] bg-slate-900">
        {thumbSrc ? (
          <Image source={{ uri: thumbSrc }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="w-full h-full bg-slate-800 items-center justify-center">
            <Video size={30} color="#94a3b8" />
          </View>
        )}

        {/* Level Tag floating on top-left */}
        <View className="absolute top-2.5 left-2.5 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-700">
          <Text className="text-[10px] font-black text-white">{video.level || "A1"}</Text>
        </View>

        {/* Duration Tag floating on bottom-right */}
        <View className="absolute bottom-2.5 right-2.5 bg-black px-2 py-0.5 rounded-md">
          <Text className="text-[10px] font-bold text-white tracking-wide">
            {formatDuration(video.duration_ms)}
          </Text>
        </View>

        {/* Play Icon Badge */}
        <View className="absolute inset-0 items-center justify-center pointer-events-none">
          <View className="w-9 h-9 rounded-full bg-slate-900 items-center justify-center border border-white">
            <Play size={15} color="#ffffff" fill="#ffffff" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>

      <View className="p-3.5 gap-1.5">
        <View className="flex-row items-center gap-1.5">
          <View className="bg-indigo-50 px-2 py-0.5 rounded-md self-start">
            <Text className="text-[10px] font-bold text-indigo-700">
              {topicLabel(video.topic || video.topics?.[0], t)}
            </Text>
          </View>
        </View>

        <Text className="text-sm font-bold text-slate-900 leading-snug" numberOfLines={2}>
          {video.title}
        </Text>

        {showProgress ? (
          <View className="mt-1 gap-1">
            <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${playedPct}%` }} />
            </View>
            <Text className="text-2xs font-semibold text-emerald-600">
              {t("videos.viewed.progress", {
                played: video.played_count ?? 0,
                total: totalSegments,
                pct: playedPct,
              })}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <PlayCircle size={12} color="#64748b" />
            <Text className="text-2xs text-slate-500 font-medium">
              {t("videos.catalog.segments", { count: video.segment_count })}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function VideosScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { authToken } = useAuth();
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicFilter, setTopicFilter] = useState("");
  const [level, setLevel] = useState("");
  const [topicState, setTopicState] = useState<Record<string, TopicStateItem>>({});
  const [viewedVideos, setViewedVideos] = useState<VideoItem[]>([]);
  const topicStateRef = useRef(topicState);
  const levelRef = useRef(level);

  useEffect(() => {
    topicStateRef.current = topicState;
  }, [topicState]);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const openVideo = useCallback(
    (youtubeId: string) => {
      if (!authToken) {
        navigation.navigate("Login", {
          next: "VideoPractice",
          nextParams: { youtubeId },
        });
        return;
      }
      navigation.navigate("VideoPractice", { youtubeId });
    },
    [authToken, navigation]
  );

  const fetchTopicPage = useCallback(
    async (sectionTopic: string, { cursor, level: levelFilter }: { cursor?: string | null; level?: string } = {}) => {
      const { videos, next_cursor } = await videoApi.getVideos(sectionTopic, {
        cursor,
        level: levelFilter,
        limit: TOPIC_PAGE_SIZE,
      });
      return {
        videos,
        nextCursor: next_cursor,
      };
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTopicsLoading(true);
      try {
        const topicsList = await videoApi.getTopics();
        if (!cancelled) setTopics(topicsList);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setTopicsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!authToken) {
      setViewedVideos([]);
      return undefined;
    }
    (async () => {
      try {
        const viewedList = await videoApi.getViewedVideos(VIEWED_PREVIEW_SIZE);
        if (!cancelled) setViewedVideos(viewedList);
      } catch {
        if (!cancelled) setViewedVideos([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  useEffect(() => {
    if (topicsLoading) return undefined;
    const sectionTopics = topicFilter ? [topicFilter] : topics;
    if (!sectionTopics.length) {
      setTopicState({});
      return undefined;
    }
    const initialState: Record<string, TopicStateItem> = {};
    sectionTopics.forEach((sectionTopic) => {
      initialState[sectionTopic] = { ...emptyTopicState(), loading: true };
    });
    setTopicState(initialState);
    let cancelled = false;
    (async () => {
      for (const sectionTopic of sectionTopics) {
        if (cancelled) return;
        try {
          const { videos, nextCursor } = await fetchTopicPage(sectionTopic, { level });
          if (cancelled) return;
          setTopicState((prev) => ({
            ...prev,
            [sectionTopic]: { videos, nextCursor, loading: false, loadingMore: false, error: "" },
          }));
        } catch (err: any) {
          if (cancelled) return;
          setTopicState((prev) => ({
            ...prev,
            [sectionTopic]: {
              ...emptyTopicState(),
              loading: false,
              error: String(err?.message || err),
            },
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topics, topicsLoading, topicFilter, level, fetchTopicPage]);

  const loadMore = useCallback(
    async (sectionTopic: string) => {
      const state = topicStateRef.current[sectionTopic];
      if (!state?.nextCursor || state.loadingMore) return;
      setTopicState((prev) => ({
        ...prev,
        [sectionTopic]: { ...prev[sectionTopic], loadingMore: true },
      }));
      try {
        const { videos, nextCursor } = await fetchTopicPage(sectionTopic, {
          cursor: state.nextCursor,
          level: levelRef.current,
        });
        setTopicState((prev) => {
          const current = prev[sectionTopic] || emptyTopicState();
          return {
            ...prev,
            [sectionTopic]: {
              ...current,
              videos: mergeUniqueVideos(current.videos, videos),
              nextCursor,
              loadingMore: false,
            },
          };
        });
      } catch (err: any) {
        setTopicState((prev) => ({
          ...prev,
          [sectionTopic]: { ...(prev[sectionTopic] || emptyTopicState()), loadingMore: false, error: String(err) },
        }));
      }
    },
    [fetchTopicPage]
  );

  const levels = useMemo(() => ["A1", "A2", "B1", "B2", "C1", "C2"], []);
  const sectionTopics = topicFilter ? [topicFilter] : topics;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#1e2538]">
      <ScrollView
        className="flex-1 bg-appBg"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top elastic overscroll filler */}
        <View
          style={{
            position: "absolute",
            top: -1000,
            left: 0,
            right: 0,
            height: 1000,
            backgroundColor: "#1e2538",
          }}
        />

        {/* 1. LUXURY NAVY HERO HEADER */}
        <View className="bg-[#1e2538] pt-3 pb-8 px-5">
          {/* Top Nav Bar */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("Main");
                }
              }}
              className="w-10 h-10 rounded-2xl bg-slate-800 items-center justify-center border border-slate-700"
            >
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>

            <Text className="text-base font-extrabold text-white">
              {t("videos.screenTitle")}
            </Text>

            <View className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1 flex-row items-center gap-1">
              <Text className="text-xs font-black text-indigo-300">🇬🇧 UK RP</Text>
            </View>
          </View>

          {/* Hero Content */}
          <View className="flex-row items-center gap-3.5">
            <View className="w-12 h-12 rounded-2xl bg-emerald-500 items-center justify-center">
              <Video size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-white tracking-tight">
                {t("videos.catalog.title")}
              </Text>
              <Text className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                {t("videos.catalog.subtitle")}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-20 gap-4">
          {/* Filter Bar: Level Chips */}
          <View className="gap-2">
            <Text className="text-2xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
              {t("videos.speakingLevel")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setLevel("")}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                  !level
                    ? "bg-indigo-600 border-indigo-600"
                    : "bg-white border-slate-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    !level ? "text-white" : "text-slate-700"
                  }`}
                >
                  {t("videos.catalog.allLevels")}
                </Text>
              </TouchableOpacity>
              {levels.map((lv) => {
                const isSelected = level === lv;
                return (
                  <TouchableOpacity
                    key={lv}
                    activeOpacity={0.8}
                    onPress={() => setLevel(lv)}
                    className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {lv}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Filter Bar: Topic Chips */}
          <View className="gap-2">
            <Text className="text-2xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
              {t("videos.conversationTopic")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setTopicFilter("")}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                  !topicFilter
                    ? "bg-slate-900 border-slate-900"
                    : "bg-white border-slate-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    !topicFilter ? "text-white" : "text-slate-700"
                  }`}
                >
                  {t("videos.catalog.allTopics")}
                </Text>
              </TouchableOpacity>
              {topics.map((tp) => {
                const isSelected = topicFilter === tp;
                return (
                  <TouchableOpacity
                    key={tp}
                    activeOpacity={0.8}
                    onPress={() => setTopicFilter(tp)}
                    className={`px-3.5 py-1.5 rounded-full mr-2 border ${
                      isSelected
                        ? "bg-slate-900 border-slate-900"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {topicLabel(tp, t)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Viewed / Continue Learning Section */}
          {authToken && viewedVideos.length > 0 ? (
            <View className="gap-2.5 pt-1">
              <View className="flex-row items-center justify-between px-1">
                <Text className="text-sm font-bold text-slate-900">
                  {t("videos.viewed.title")}
                </Text>
              </View>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={viewedVideos}
                keyExtractor={(item) => `viewed-${item.youtube_id}`}
                renderItem={({ item }) => (
                  <VideoCard
                    video={item}
                    t={t}
                    showProgress
                    onPress={() => openVideo(item.youtube_id)}
                  />
                )}
              />
            </View>
          ) : null}

          {topicsLoading ? <VideoCatalogSkeleton /> : null}

          {/* Catalog Sections by Topic */}
          {sectionTopics.map((sectionTopic) => {
            const state = topicState[sectionTopic] || emptyTopicState();
            return (
              <View key={sectionTopic} className="gap-2.5 pt-1">
                <View className="flex-row justify-between items-center px-1">
                  <Text className="text-base font-extrabold text-slate-900">
                    {topicLabel(sectionTopic, t)}
                  </Text>
                  {!topicFilter ? (
                    <TouchableOpacity onPress={() => setTopicFilter(sectionTopic)}>
                      <Text className="text-xs text-indigo-600 font-bold">
                        {t("videos.catalog.viewAll")}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {state.loading && state.videos.length === 0 ? (
                  <View className="flex-row py-1">
                    <VideoCardSkeleton horizontal={!topicFilter} />
                    <VideoCardSkeleton horizontal={!topicFilter} />
                  </View>
                ) : null}
                {state.error ? (
                  <View className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                    <Text className="text-xs text-rose-600">{state.error}</Text>
                  </View>
                ) : null}

                <FlatList
                  horizontal={!topicFilter}
                  showsHorizontalScrollIndicator={false}
                  data={state.videos}
                  keyExtractor={(item) => `${sectionTopic}-${item.youtube_id}`}
                  renderItem={({ item }) => (
                    <VideoCard video={item} t={t} onPress={() => openVideo(item.youtube_id)} />
                  )}
                  onEndReached={() => loadMore(sectionTopic)}
                  onEndReachedThreshold={0.4}
                  scrollEnabled={!topicFilter}
                />
                {state.loadingMore ? <ActivityIndicator color="#4f46e5" size="small" /> : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
