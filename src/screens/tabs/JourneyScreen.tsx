import React from "react";
import {
  RefreshControl,
  ScrollView,
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
import { WindingPath } from "@/components/practice/HomeJourney";
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

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#0a2644]">
      <ScrollView
        className="flex-1 bg-[#f8fafc]"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
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
            backgroundColor: "#0a2644",
          }}
        />

        {/* 1. LUXURY NAVY HERO HEADER */}
        <View className="bg-[#0a2644] pt-2 pb-6 px-5">
          {/* Top Bar */}
          <View className="flex-row items-center justify-between mb-3">
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("common.back", "Quay lại")}
              onPress={() => {
                if (navigation?.canGoBack?.()) {
                  navigation.goBack();
                } else {
                  navigation?.navigate?.("Main");
                }
              }}
              className="w-10 h-10 rounded-2xl items-center justify-center border"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderColor: "rgba(255, 255, 255, 0.16)",
              }}
            >
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>

            <Text className="text-base font-extrabold text-white">
              {t("journeyPage.title", "Lộ trình học tập")}
            </Text>

            <View
              className="rounded-full px-3 py-1 flex-row items-center border"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderColor: "rgba(255, 255, 255, 0.16)",
              }}
            >
            </View>
          </View>

          {/* Hero Content */}
          <View className="flex-row items-center gap-3.5 mt-1">
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center shadow-sm"
              style={{ backgroundColor: "#0284c7" }}
            >
              <Compass size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-sky-200 mt-0.5 leading-relaxed font-medium">
                {t("journeyPage.heroSubtitle", "Lộ trình thích ứng thông minh tự động tối ưu theo từng âm bạn cần cải thiện.")}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-[#f8fafc] -mt-4 rounded-t-[32px] px-4 pt-5 pb-20 gap-4">
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
                  {t("journeyPage.adaptiveNote", "Hệ thống sẽ cập nhật độ khó và thứ tự bài học tiếp theo dựa trên kết quả phát âm của bạn.")}
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

          {/* Winding Quest Path */}
          {displayJourney ? (
            <View className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
              <WindingPath
                items={items}
                onStartLesson={startPersonalizedLesson}
                lessonLoading={lessonLoading}
                t={t}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
