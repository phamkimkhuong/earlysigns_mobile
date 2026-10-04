import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AlertCircle,
  ChevronLeft,
  Compass,
  Flame,
  TrendingUp,
  Trophy,
} from "lucide-react-native";
import { JourneyPathItem } from "@/components/practice/HomeJourney";
import { JourneyPathSkeleton } from "@/components/ui/Skeleton";
import { useJourneyViewModel } from "@/hooks/useJourneyViewModel";

export default function JourneyScreen({ navigation }: { navigation?: any }) {
  const {
    t,
    loading,
    refreshing,
    onRefresh,
    error,
    lessonError,
    displayJourney,
    items,
    streakDays,
    lessonLoading,
    startPersonalizedLesson,
  } = useJourneyViewModel(navigation);

  const totalModules = displayJourney?.milestones
    ? displayJourney.milestones.reduce(
      (acc: number, ms: any) => acc + (ms.modules?.length || 0),
      0
    )
    : 0;

  const currentModule = displayJourney?.current_module || 1;
  const progressPct =
    totalModules > 0
      ? Math.min(100, Math.round((currentModule / totalModules) * 100))
      : 0;

  const renderJourneyItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isFirst = index === 0;
      const isLast = index === items.length - 1;
      return (
        <View
          className={`mx-4 bg-white px-4 border-x border-slate-200 ${
            isFirst ? "rounded-t-3xl border-t pt-3" : ""
          } ${isLast ? "rounded-b-3xl border-b pb-4 shadow-sm mb-16" : ""}`}
        >
          <JourneyPathItem
            item={item}
            onStartLesson={startPersonalizedLesson}
            lessonLoading={lessonLoading}
            t={t}
          />
        </View>
      );
    },
    [items.length, lessonLoading, startPersonalizedLesson, t]
  );

  const renderHeader = useMemo(
    () => (
      <View className="bg-appBg">
        {/* Top elastic overscroll filler */}
        <View
          style={{
            position: "absolute",
            top: -1000,
            left: 0,
            right: 0,
            height: 1000,
            backgroundColor: "#F7F6F2",
          }}
        />

        {/* 1. TOP NAV BAR */}
        <View className="bg-appBg px-4 py-3 border-b border-slate-200">
          {/* Top Bar */}
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("common.back", "Quay lại")}
              onPress={() => {
                if (navigation?.canGoBack?.()) {
                  navigation.goBack();
                } else {
                  navigation?.navigate?.("Main");
                }
              }}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center active:opacity-70"
            >
              <ChevronLeft size={22} color="#0c2340" strokeWidth={2.5} />
            </TouchableOpacity>

            <Text className="text-base font-bold text-[#0c2340]">
              {t("journeyPage.title", "Lộ trình học tập")}
            </Text>

            <View className="w-10 h-10" />
          </View>

          {/* Hero Content */}
          <View className="flex-row items-center gap-3.5 mt-1 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <View className="w-10 h-10 rounded-xl items-center justify-center bg-sky-100">
              <Compass size={20} color="#0284c7" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-slate-500 leading-relaxed font-medium">
                {t(
                  "journeyPage.heroSubtitle",
                  "Lộ trình thích ứng thông minh tự động tối ưu theo từng âm bạn cần cải thiện."
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. MAIN CONTENT */}
        <View className="bg-appBg px-4 pt-4 pb-3 gap-4">
          {/* Progress Overview Card */}
          {displayJourney ? (
            <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1 mr-2">
                  <Trophy size={18} color="#d97706" />
                  <Text numberOfLines={1} className="text-[15px] font-extrabold text-slate-900">
                    {t("journeyPage.progressTitle", "Tiến độ lộ trình")}
                  </Text>
                </View>

                {streakDays > 0 ? (
                  <View
                    className="flex-row items-center gap-1.5 px-3 py-1 rounded-full border shrink-0"
                    style={{ backgroundColor: "#fff7ed", borderColor: "#fed7aa" }}
                  >
                    <Flame size={14} color="#ea580c" />
                    <Text
                      numberOfLines={1}
                      className="text-xs font-bold text-orange-700"
                      style={{ includeFontPadding: false }}
                    >
                      {t("journeyPage.streakDays", {
                        count: streakDays,
                        defaultValue: `${streakDays} ${t("profile.streakDaysUnit", "ngày")}`,
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Progress Bar */}
              <View className="gap-1.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-[13px] text-slate-500 font-semibold">
                    {t("home.journey.moduleOf", {
                      current: currentModule,
                      total: totalModules || currentModule,
                    })}
                  </Text>
                  <Text className="text-sm font-bold text-[#0284c7]">
                    {t("journeyPage.percentCompleted", {
                      percent: progressPct,
                      defaultValue: `${progressPct}% hoàn thành`,
                    })}
                  </Text>
                </View>

                <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <View
                    style={{ width: `${progressPct}%`, backgroundColor: "#0284c7" }}
                    className="h-full rounded-full"
                  />
                </View>
              </View>

              {/* Dynamic Note */}
              <View
                className="flex-row items-center gap-2.5 p-3.5 rounded-2xl border"
                style={{ backgroundColor: "#f0f9ff", borderColor: "#bae6fd" }}
              >
                <TrendingUp size={18} color="#0284c7" />
                <Text className="flex-1 text-[13px] text-[#0c2340] leading-snug font-medium">
                  {t(
                    "journeyPage.adaptiveNote",
                    "Hệ thống sẽ cập nhật độ khó và thứ tự bài học tiếp theo dựa trên kết quả phát âm của bạn."
                  )}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Error Banner */}
          {error || lessonError ? (
            <View className="bg-rose-50 p-4 rounded-2xl border border-rose-200 flex-row items-center gap-2.5">
              <AlertCircle size={18} color="#e11d48" />
              <Text className="flex-1 text-xs text-rose-800 font-medium leading-relaxed">
                {error || lessonError}
              </Text>
            </View>
          ) : null}

          {/* Loading Skeleton */}
          {loading && !displayJourney ? <JourneyPathSkeleton /> : null}
        </View>
      </View>
    ),
    [
      currentModule,
      displayJourney,
      error,
      lessonError,
      loading,
      navigation,
      progressPct,
      streakDays,
      t,
      totalModules,
    ]
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
      <FlatList
        data={displayJourney ? items : []}
        keyExtractor={(item, index) =>
          item.type === "milestone" ? `ms-${item.index}` : `node-${item.index}-${index}`
        }
        renderItem={renderJourneyItem}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f59e0b"
          />
        }
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-appBg"
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}
