import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
import { useQueryClient } from "@tanstack/react-query";
import { VideoCatalogSkeleton } from "@/components/ui/Skeleton";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  fetchVideoCards,
  useVideoFeedQuery,
  useViewedVideosQuery,
  videoKeys,
} from "@/hooks/queries/useVideoQueries";
import type { VideoItem } from "@/types/domain";

const VIEWED_PREVIEW_SIZE = 4;
const INITIAL_TOPIC_COUNT = 4;
const BATCH_TOPIC_COUNT = 2;

function VideoCard({
  video,
  t,
  showProgress,
  isGrid,
  onPress,
}: {
  video: VideoItem;
  t: (key: string, opts?: any) => string;
  showProgress?: boolean;
  isGrid?: boolean;
  onPress: () => void;
}) {
  const playedPct = Math.max(0, Math.min(100, Number(video.played_pct || 0)));
  const totalSegments = Math.max(Number(video.segment_count || 0), Number(video.played_count || 0));
  const thumbSrc = videoThumbnail(video);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={{ maxWidth: isGrid ? "48.5%" : undefined }}
      className={`${isGrid ? "flex-1 mb-3.5" : "w-[176px] mr-3 mb-1.5"
        } bg-white rounded-2xl overflow-hidden border border-slate-200`}
      onPress={onPress}
    >
      <View className={`relative w-full ${isGrid ? "h-[105px]" : "h-[98px]"} bg-slate-900`}>
        {thumbSrc ? (
          <Image source={{ uri: thumbSrc }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="w-full h-full bg-slate-800 items-center justify-center">
            <Video size={isGrid ? 24 : 22} color="#94a3b8" />
          </View>
        )}

        {/* Level Tag floating on top-left */}
        <View className="absolute top-1.5 left-1.5 bg-slate-900 px-1.5 py-0.5 rounded-full border border-slate-700">
          <Text className="text-xs font-black text-white">{video.level || "A1"}</Text>
        </View>

        {/* Duration Tag floating on bottom-right */}
        <View className="absolute bottom-1.5 right-1.5 bg-black px-1.5 py-0.5 rounded-md">
          <Text className="text-xs font-bold text-white tracking-wide">
            {formatDuration(video.duration_ms)}
          </Text>
        </View>

        {/* Play Icon Badge */}
        <View className="absolute inset-0 items-center justify-center pointer-events-none">
          <View
            className={`${isGrid ? "w-8 h-8" : "w-7 h-7"
              } rounded-full bg-slate-900 items-center justify-center border border-white`}
          >
            <Play size={isGrid ? 13 : 11} color="#ffffff" fill="#ffffff" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>

      <View className="p-2.5 gap-1">
        <View className="flex-row items-center gap-1.5">
          <View className="bg-indigo-50 px-2 py-0.5 rounded-md self-start">
            <Text className="text-xs font-bold text-indigo-700" numberOfLines={1}>
              {topicLabel(video.topic || video.topics?.[0], t)}
            </Text>
          </View>
        </View>

        <Text
          className="text-sm font-bold text-slate-900 leading-snug"
          numberOfLines={2}
        >
          {video.title}
        </Text>

        {showProgress ? (
          <View className="mt-0.5 gap-1">
            <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${playedPct}%` }} />
            </View>
            <Text className="text-xs font-semibold text-emerald-600" numberOfLines={1}>
              {t("videos.viewed.progress", {
                played: video.played_count ?? 0,
                total: totalSegments,
                pct: playedPct,
              })}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-1 mt-0.5">
            <PlayCircle size={12} color="#64748b" />
            <Text className="text-xs text-slate-500 font-medium" numberOfLines={1}>
              {t("videos.catalog.segments", { count: video.segment_count })}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function TopicSectionRow({
  topic,
  level,
  initialVideos,
  videoIds,
  topicFilter,
  loadMoreTrigger,
  t,
  onSelectTopic,
  onOpenVideo,
}: {
  topic: string;
  level?: string;
  initialVideos: VideoItem[];
  videoIds: string[];
  topicFilter: string;
  loadMoreTrigger?: number;
  t: (key: string, opts?: any) => string;
  onSelectTopic: (topic: string) => void;
  onOpenVideo: (youtubeId: string) => void;
}) {
  const queryClient = useQueryClient();
  const topicVideosKey = useMemo(
    () => videoKeys.topicVideos(topic, level),
    [topic, level]
  );

  // Initialize from TanStack Query cache if previously loaded, else fallback to initialVideos
  const getInitialVideos = useCallback(() => {
    const cached = queryClient.getQueryData<VideoItem[]>(topicVideosKey);
    return cached && cached.length > 0 ? cached : initialVideos;
  }, [initialVideos, queryClient, topicVideosKey]);

  const [videos, setVideos] = useState<VideoItem[]>(getInitialVideos);
  const [cursor, setCursor] = useState<number>(() => getInitialVideos().length);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const fetchingRef = useRef(false);
  const cursorRef = useRef(cursor);
  const videoIdsRef = useRef(videoIds);
  const lastProcessedTriggerRef = useRef(loadMoreTrigger || 0);
  const loadMoreTriggerRef = useRef(loadMoreTrigger || 0);
  useEffect(() => {
    loadMoreTriggerRef.current = loadMoreTrigger || 0;
  }, [loadMoreTrigger]);

  // Sync state when initialVideos, videoIds, or topicVideosKey change
  useEffect(() => {
    const cached = queryClient.getQueryData<VideoItem[]>(topicVideosKey);
    const currentList = cached && cached.length > 0 ? cached : initialVideos;
    setVideos(currentList);
    setCursor(currentList.length);
    cursorRef.current = currentList.length;
    videoIdsRef.current = videoIds;
    setIsLoadingMore(false);
    fetchingRef.current = false;
    lastProcessedTriggerRef.current = loadMoreTriggerRef.current;
  }, [initialVideos, videoIds, topicVideosKey, queryClient]);

  // Stable callback that fetches cards via TanStack Query cache
  const handleLoadMore = useCallback(async () => {
    if (fetchingRef.current) return;
    const currentCursor = cursorRef.current;
    const ids = videoIdsRef.current;
    if (currentCursor >= ids.length) return;

    // Strict constraint from BE: Only fetch next 4 IDs max
    const nextBatchIds = ids.slice(currentCursor, currentCursor + 4);
    if (nextBatchIds.length === 0) return;

    fetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const newCards = await fetchVideoCards(queryClient, nextBatchIds);
      if (Array.isArray(newCards) && newCards.length > 0) {
        setVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.youtube_id));
          const filtered = newCards.filter((v) => !existingIds.has(v.youtube_id));
          const updated = [...prev, ...filtered];
          queryClient.setQueryData(topicVideosKey, updated);
          return updated;
        });
      }
    } catch {
      // Quietly handle network hiccup on scroll
    } finally {
      // Rule: Luôn tăng con trỏ thêm 4, kể cả khi thiếu một thẻ
      cursorRef.current = currentCursor + 4;
      setCursor(currentCursor + 4);
      setIsLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [queryClient, topicVideosKey]);

  // Auto-trigger load more ONLY when loadMoreTrigger strictly increments from parent scroll
  useEffect(() => {
    if (
      topicFilter &&
      typeof loadMoreTrigger === "number" &&
      loadMoreTrigger > lastProcessedTriggerRef.current
    ) {
      lastProcessedTriggerRef.current = loadMoreTrigger;
      handleLoadMore();
    }
  }, [loadMoreTrigger, topicFilter, handleLoadMore]);

  // If topic has 0 videos and not in specific topic filter mode, omit this row
  if (videos.length === 0 && !topicFilter) {
    return null;
  }

  // If in specific topic filter mode and 0 videos
  if (videos.length === 0 && topicFilter) {
    return (
      <View className="py-12 items-center justify-center">
        <Text className="text-[13px] text-slate-400 font-medium">
          {t("videos.catalog.empty")}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2.5 pt-1">
      <View className="flex-row justify-between items-center px-1">
        <Text className="text-base font-extrabold text-slate-900">
          {topicLabel(topic, t)}
        </Text>
        {topicFilter ? (
          <TouchableOpacity onPress={() => onSelectTopic("")} className="py-1">
            <Text className="text-sm text-indigo-600 font-bold">
              {t("videos.catalog.allTopics") || "Tất cả"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => onSelectTopic(topic)} className="py-1">
            <Text className="text-sm text-indigo-600 font-bold">
              {t("videos.catalog.viewAll")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        key={topicFilter ? "grid-2" : "horizontal-1"}
        horizontal={!topicFilter}
        numColumns={topicFilter ? 2 : 1}
        columnWrapperStyle={topicFilter ? { gap: 12 } : undefined}
        showsHorizontalScrollIndicator={false}
        data={videos}
        keyExtractor={(item) => `${topic}-${item.youtube_id}`}
        renderItem={({ item }) => (
          <VideoCard
            video={item}
            isGrid={Boolean(topicFilter)}
            t={t}
            onPress={() => onOpenVideo(item.youtube_id)}
          />
        )}
        scrollEnabled={!topicFilter}
      />

      {topicFilter && isLoadingMore ? (
        <View className="py-5 items-center justify-center">
          <ActivityIndicator color="#4f46e5" size="small" />
        </View>
      ) : null}
    </View>
  );
}

export default function VideosScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { authToken } = useAuth();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const lastTriggerTimeRef = useRef(0);

  const [topicFilter, setTopicFilter] = useState("");
  const [level, setLevel] = useState("");
  const [visibleTopicLimit, setVisibleTopicLimit] = useState(INITIAL_TOPIC_COUNT);
  const [loadMoreTrigger, setLoadMoreTrigger] = useState(0);

  // TanStack Query: Unified Feed from BE
  const {
    data: feedTopics = [],
    isLoading: feedLoading,
  } = useVideoFeedQuery(level);

  // TanStack Query: Recently viewed videos (Unchanged)
  const { data: viewedVideos = [] } = useViewedVideosQuery(
    VIEWED_PREVIEW_SIZE,
    Boolean(authToken)
  );

  const openVideo = useCallback(
    (youtubeId: string, initialIndex?: number) => {
      const params: { youtubeId: string; initialIndex?: number } = { youtubeId };
      if (typeof initialIndex === "number" && Number.isFinite(initialIndex) && initialIndex >= 0) {
        params.initialIndex = initialIndex;
      }
      if (!authToken) {
        navigation.navigate("Login", {
          next: "VideoPractice",
          nextParams: params,
        });
        return;
      }
      navigation.navigate("VideoPractice", params);
    },
    [authToken, navigation]
  );

  const handleSelectLevel = useCallback((lv: string) => {
    setLevel(lv);
    setVisibleTopicLimit(INITIAL_TOPIC_COUNT);
    setLoadMoreTrigger(0);
    lastTriggerTimeRef.current = Date.now();
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const handleSelectTopic = useCallback((tp: string) => {
    setTopicFilter(tp);
    setVisibleTopicLimit(INITIAL_TOPIC_COUNT);
    setLoadMoreTrigger(0);
    lastTriggerTimeRef.current = Date.now();
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // Extract distinct topic names from feed
  const topics = useMemo(
    () => feedTopics.map((item) => item.topic).filter(Boolean),
    [feedTopics]
  );

  // Split topics into 2 balanced rows for the filter bar
  const topicChipRows = useMemo(() => {
    const all = ["", ...topics];
    const r1: string[] = [];
    const r2: string[] = [];
    all.forEach((tp, idx) => {
      if (idx % 2 === 0) {
        r1.push(tp);
      } else {
        r2.push(tp);
      }
    });
    return [r1, r2];
  }, [topics]);

  const filteredFeedTopics = useMemo(() => {
    if (!topicFilter) return feedTopics;
    return feedTopics.filter(
      (item) => item.topic.toLowerCase() === topicFilter.toLowerCase()
    );
  }, [feedTopics, topicFilter]);

  const displayedTopics = useMemo(
    () => (topicFilter ? filteredFeedTopics : filteredFeedTopics.slice(0, visibleTopicLimit)),
    [filteredFeedTopics, topicFilter, visibleTopicLimit]
  );

  // Infinite vertical scrolling: load next batch of topics or more videos when near bottom
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      // 1. Never trigger if user hasn't scrolled down at least 100px
      // or if content height doesn't exceed screen height by at least 100px
      if (contentOffset.y < 100 || contentSize.height <= layoutMeasurement.height + 100) {
        return;
      }

      // 2. Check if user is close to bottom (within 160px)
      const paddingToBottom = 160;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      if (!isCloseToBottom) return;

      // 3. Khi đang xem một chủ đề (lưới 2 cột): kích hoạt nạp thêm 4 video, kèm throttle 1200ms
      if (topicFilter) {
        const now = Date.now();
        if (now - lastTriggerTimeRef.current > 1200) {
          lastTriggerTimeRef.current = now;
          setLoadMoreTrigger((prev) => prev + 1);
        }
        return;
      }

      // 4. Khi đang xem danh mục chung: nạp thêm các hàng chủ đề tiếp theo
      if (visibleTopicLimit < filteredFeedTopics.length) {
        setVisibleTopicLimit((prev) => Math.min(prev + BATCH_TOPIC_COUNT, filteredFeedTopics.length));
      }
    },
    [filteredFeedTopics.length, topicFilter, visibleTopicLimit]
  );

  // Pull-to-refresh: invalidate all video queries via TanStack Query
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: videoKeys.all });
    setVisibleTopicLimit(INITIAL_TOPIC_COUNT);
  }, [queryClient]);

  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh, {
    tintColor: "#f59e0b",
    enableHaptics: true,
    minDurationMs: 450,
  });

  const levels = useMemo(() => ["A1", "A2", "B1", "B2", "C1", "C2"], []);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#1e2538]">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-appBg"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f59e0b"
          />
        }
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
        <View className="bg-[#1e2538] pt-3 pb-6 px-5">
          {/* Top Nav Bar */}
          <View className="flex-row items-center justify-between mb-1">
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
              {t("videos.catalog.title") || "Luyện nói với YouTube"}
            </Text>

            <View className="w-10 h-10" />
          </View>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-20 gap-4">
          {/* Filter Bar: Level Chips */}
          <View className="gap-2">
            <Text className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
              {t("videos.speakingLevel")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectLevel("")}
                className={`px-3.5 py-1.5 rounded-full mr-2 border ${!level
                  ? "bg-indigo-600 border-indigo-600"
                  : "bg-white border-slate-200"
                  }`}
              >
                <Text
                  className={`text-sm font-bold ${!level ? "text-white" : "text-slate-700"
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
                    onPress={() => handleSelectLevel(lv)}
                    className={`px-3.5 py-1.5 rounded-full mr-2 border ${isSelected
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-white border-slate-200"
                      }`}
                  >
                    <Text
                      className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-700"
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
            <Text className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
              {t("videos.conversationTopic")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
              <View className="gap-2 pr-4">
                {topicChipRows.map((row, rowIdx) => (
                  <View key={`topic-chip-row-${rowIdx}`} className="flex-row gap-2">
                    {row.map((tp) => {
                      const isSelected = tp ? topicFilter === tp : !topicFilter;
                      return (
                        <TouchableOpacity
                          key={tp || "all-topics"}
                          activeOpacity={0.8}
                          onPress={() => handleSelectTopic(tp)}
                          className="px-3.5 py-1.5 rounded-full border"
                          style={{
                            backgroundColor: isSelected ? "#0f172a" : "#ffffff",
                            borderColor: isSelected ? "#0f172a" : "#e2e8f0",
                          }}
                        >
                          <Text
                            className="text-sm font-bold"
                            style={{ color: isSelected ? "#ffffff" : "#334155" }}
                          >
                            {tp ? topicLabel(tp, t) : t("videos.catalog.allTopics")}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Viewed / Continue Learning Section */}
          {authToken && viewedVideos.length > 0 ? (
            <View className="gap-2.5 pt-1">
              <View className="flex-row items-center justify-between px-1">
                <Text className="text-base font-extrabold text-slate-900">
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
                    onPress={() => openVideo(item.youtube_id, item.played_count)}
                  />
                )}
              />
            </View>
          ) : null}

          {feedLoading ? <VideoCatalogSkeleton /> : null}

          {!feedLoading && displayedTopics.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <Text className="text-[13px] text-slate-400 font-medium">
                {t("videos.catalog.empty")}
              </Text>
            </View>
          ) : null}

          {/* Catalog Sections by Topic via Feed */}
          {displayedTopics.map((feedItem) => (
            <TopicSectionRow
              key={`${feedItem.topic}-${level}`}
              topic={feedItem.topic}
              level={level}
              initialVideos={feedItem.videos || []}
              videoIds={feedItem.video_ids || []}
              topicFilter={topicFilter}
              loadMoreTrigger={loadMoreTrigger}
              t={t}
              onSelectTopic={handleSelectTopic}
              onOpenVideo={openVideo}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
