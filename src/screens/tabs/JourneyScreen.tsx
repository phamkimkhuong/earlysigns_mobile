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
  LogIn,
  Sparkles,
  Trophy,
} from "lucide-react-native";
import { WindingPath } from "@/components/practice/HomeJourney";
import IPAChecking from "@/components/practice/IPAChecking";
import { JourneyPathSkeleton } from "@/components/ui/Skeleton";
import { useJourneyViewModel } from "@/hooks/useJourneyViewModel";
import { useAuth } from "@/services/Auth";

export default function JourneyScreen({ navigation }: { navigation?: any }) {
  const { authToken } = useAuth();
  const {
    t,
    dialect,
    loading,
    refreshing,
    onRefresh,
    error,
    lessonError,
    displayJourney,
    items,
    streakDays,
    lessonSession,
    lessonSessionKey,
    lessonLoading,
    startPersonalizedLesson,
    closeLessonSession,
    loadNextLesson,
    handleLessonAllCompleted,
    userTier,
    userKey,
    usageStatus,
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
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#1e2538]">
      <ScrollView
        className="flex-1 bg-appBg"
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
            backgroundColor: "#1e2538",
          }}
        />

        {/* 1. LUXURY NAVY HERO HEADER */}
        <View className="bg-[#1e2538] pt-3 pb-8 px-5">
          {/* Top Bar */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (navigation?.canGoBack?.()) {
                  navigation.goBack();
                } else {
                  navigation?.navigate?.("Main");
                }
              }}
              className="w-10 h-10 rounded-2xl bg-slate-800 items-center justify-center border border-slate-700"
            >
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>

            <Text className="text-base font-extrabold text-white">
              {t("journeyPage.title") || "Lộ trình học tập"}
            </Text>

            <View className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1 flex-row items-center gap-1">
              <Text className="text-xs font-black text-amber-300">
                {dialect === "us" ? "🇺🇸 US" : "🇬🇧 UK"}
              </Text>
            </View>
          </View>

          {/* Hero Content */}
          <View className="flex-row items-center gap-3.5">
            <View className="w-12 h-12 rounded-2xl bg-amber-500 items-center justify-center shadow-sm">
              <Compass size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-white tracking-tight">
                Hành trình Chuẩn hóa Ngữ âm
              </Text>
              <Text className="text-xs text-amber-200 mt-0.5 leading-relaxed font-medium">
                {t("home.journey.adaptive") ||
                  "Lộ trình thích ứng thông minh tự động tối ưu theo từng âm bạn cần cải thiện."}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-20 gap-4">
          {/* Progress Overview Card */}
          {displayJourney ? (
            <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Trophy size={18} color="#d97706" />
                  <Text className="text-sm font-extrabold text-slate-900">
                    Tiến độ lộ trình
                  </Text>
                </View>

                {streakDays > 0 ? (
                  <View className="flex-row items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                    <Flame size={14} color="#ea580c" />
                    <Text className="text-xs font-black text-orange-700">
                      {streakDays} ngày
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Progress Bar */}
              <View className="gap-1.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-500 font-medium">
                    {t("home.journey.moduleOf", {
                      current: currentModule,
                      total: totalModules || currentModule,
                    })}
                  </Text>
                  <Text className="text-xs font-black text-indigo-600">
                    {progressPct}% hoàn thành
                  </Text>
                </View>

                <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <View
                    style={{ width: `${progressPct}%` }}
                    className="h-full bg-indigo-600 rounded-full"
                  />
                </View>
              </View>

              {/* Dynamic Note */}
              <View className="flex-row items-center gap-2 bg-indigo-50 p-3 rounded-2xl border border-indigo-100">
                <Sparkles size={16} color="#4f46e5" />
                <Text className="flex-1 text-[11px] text-indigo-900 leading-snug font-medium">
                  {t("home.journey.adaptive") ||
                    "Hệ thống sẽ cập nhật độ khó và thứ tự bài học tiếp theo dựa trên kết quả phát âm của bạn."}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Guest Banner if not signed in */}
          {!authToken ? (
            <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3 items-center text-center">
              <Text className="text-sm font-extrabold text-slate-900 text-center">
                Mở khóa toàn bộ hành trình
              </Text>
              <Text className="text-xs text-slate-600 text-center leading-relaxed">
                Đăng nhập để hệ thống ghi nhớ các âm bạn đã phát âm chuẩn, lưu chuỗi ngày học liên tục và mở khóa các module nâng cao.
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation?.navigate?.("Login", { next: "Journey" })}
                className="flex-row items-center gap-2 py-3 px-6 rounded-2xl bg-indigo-600 mt-1"
              >
                <LogIn size={16} color="#ffffff" />
                <Text className="text-xs font-bold text-white">
                  Đăng nhập để tiếp tục
                </Text>
              </TouchableOpacity>
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

        {/* IPA Practice Modal */}
        <IPAChecking
          open={Boolean(lessonSession)}
          onClose={closeLessonSession}
          sentences={lessonSession?.sentences || []}
          dialect={lessonSession?.dialect || dialect}
          sessionKey={lessonSessionKey}
          autoRecordKey={lessonSessionKey}
          lessonTitle={lessonSession?.title}
          userTier={userTier}
          userKey={userKey}
          usageStatus={usageStatus}
          loadNextLesson={loadNextLesson}
          onLessonAllCompleted={handleLessonAllCompleted}
          journeyData={displayJourney}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
