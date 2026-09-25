import React, { useCallback, useMemo, useState } from "react";
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
import { VideoCardSkeleton, VideoCatalogSkeleton } from "@/components/ui/Skeleton";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  useTopicsQuery,
  useViewedVideosQuery,
  useTopicVideosInfiniteQuery,
  videoKeys,
} from "@/hooks/queries/useVideoQueries";
import type { VideoItem } from "@/types/domain";

const VIEWED_PREVIEW_SIZE = 4;
const INITIAL_TOPIC_COUNT = 2;
const BATCH_TOPIC_COUNT = 1;

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

function TopicSectionRow({
  topic,
  level,
  topicFilter,
  t,
  onSelectTopic,
  onOpenVideo,
}: {
  topic: string;
  level: string;
  topicFilter: string;
  t: (key: string, opts?: any) => string;
  onSelectTopic: (topic: string) => void;
  onOpenVideo: (youtubeId: string) => void;
}) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTopicVideosInfiniteQuery(topic, level);

  const videos = useMemo(
    () => (data?.pages ? data.pages.flatMap((page) => page.videos) : []),
    [data]
  );

  return (
    <View className="gap-2.5 pt-1">
      <View className="flex-row justify-between items-center px-1">
        <Text className="text-base font-extrabold text-slate-900">
          {topicLabel(topic, t)}
        </Text>
        {!topicFilter ? (
          <TouchableOpacity onPress={() => onSelectTopic(topic)}>
            <Text className="text-xs text-indigo-600 font-bold">
              {t("videos.catalog.viewAll")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading && videos.length === 0 ? (
        <View className="flex-row py-1">
          <VideoCardSkeleton horizontal={!topicFilter} />
          <VideoCardSkeleton horizontal={!topicFilter} />
        </View>
      ) : null}

      {isError ? (
        <View className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
          <Text className="text-xs text-rose-600">
            {String((error as any)?.message || error)}
          </Text>
        </View>
      ) : null}

      <FlatList
        horizontal={!topicFilter}
        showsHorizontalScrollIndicator={false}
        data={videos}
        keyExtractor={(item) => `${topic}-${item.youtube_id}`}
        renderItem={({ item }) => (
          <VideoCard video={item} t={t} onPress={() => onOpenVideo(item.youtube_id)} />
        )}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        scrollEnabled={!topicFilter}
      />
      {isFetchingNextPage ? <ActivityIndicator color="#4f46e5" size="small" /> : null}
    </View>
  );
}

export default function VideosScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { authToken } = useAuth();
  const queryClient = useQueryClient();

  const [topicFilter, setTopicFilter] = useState("");
  const [level, setLevel] = useState("");
  const [visibleTopicLimit, setVisibleTopicLimit] = useState(INITIAL_TOPIC_COUNT);

  // TanStack Query: Topics catalog
  const { data: topics = [], isLoading: topicsLoading } = useTopicsQuery();

  // TanStack Query: Recently viewed videos
  const { data: viewedVideos = [] } = useViewedVideosQuery(
    VIEWED_PREVIEW_SIZE,
    Boolean(authToken)
  );

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

  const handleSelectLevel = useCallback((lv: string) => {
    setLevel(lv);
    setVisibleTopicLimit(INITIAL_TOPIC_COUNT);
  }, []);

  const handleSelectTopic = useCallback((tp: string) => {
    setTopicFilter(tp);
    setVisibleTopicLimit(INITIAL_TOPIC_COUNT);
  }, []);

  const allSectionTopics = useMemo(
    () => (topicFilter ? [topicFilter] : topics),
    [topicFilter, topics]
  );

  const sectionTopics = useMemo(
    () => (topicFilter ? allSectionTopics : allSectionTopics.slice(0, visibleTopicLimit)),
    [allSectionTopics, topicFilter, visibleTopicLimit]
  );

  // Infinite vertical scrolling: load next batch of topics when near bottom
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (topicFilter || visibleTopicLimit >= allSectionTopics.length) return;

      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      if (contentOffset.y < 80 || contentSize.height <= layoutMeasurement.height + 50) {
        return;
      }

      const paddingToBottom = 250;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      if (isCloseToBottom) {
        setVisibleTopicLimit((prev) => {
          if (prev >= allSectionTopics.length) return prev;
          return Math.min(prev + BATCH_TOPIC_COUNT, allSectionTopics.length);
        });
      }
    },
    [allSectionTopics.length, topicFilter, visibleTopicLimit]
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
        className="flex-1 bg-appBg"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
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
                onPress={() => handleSelectLevel("")}
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
                    onPress={() => handleSelectLevel(lv)}
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
                onPress={() => handleSelectTopic("")}
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
                    onPress={() => handleSelectTopic(tp)}
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

          {/* Catalog Sections by Topic via TanStack Query */}
          {sectionTopics.map((sectionTopic) => (
            <TopicSectionRow
              key={`${sectionTopic}-${level}`}
              topic={sectionTopic}
              level={level}
              topicFilter={topicFilter}
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
