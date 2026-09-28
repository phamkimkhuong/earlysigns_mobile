import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AudioLines,
  BookOpen,
  CheckCircle2,
  Compass,
  Mic,
  Sparkles,
  Zap,
} from "lucide-react-native";
import HomeJourney from "@/components/practice/HomeJourney";
import IPAChecking from "@/components/practice/IPAChecking";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { PhonemesChipsSkeleton } from "@/components/ui/Skeleton";
import ScreeningResultModal from "@/components/practice/ScreeningResultModal";
import { accuracyBandColor } from "@/utils/checkResultScoreColor";
import { usePhonemesViewModel } from "@/hooks/usePhonemesViewModel";
import { ALL_44_IPA_SOUNDS, getIpaSoundMeta, type IpaCategory } from "@/utils/ipaData";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";

type TabMode = "journey" | "catalog";
type CategoryFilter = "all" | IpaCategory;

export default function PhonemesScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Phonemes">) {
  const {
    t,
    dialect,
    showScreeningPrompt,
    screeningLoading,
    startScreeningTest,
    homeSummary,
    journey,
    lessonLoading,
    lessonError,
    startPersonalizedLesson,
    clarityRatio,
    weakestPhonemes,
    startPhoneme,
    lessonSession,
    lessonSessionKey,
    closeLessonSession,
    userTier,
    userKey,
    usageStatus,
    lessonMode,
    screeningResult,
    setScreeningResult,
    handleLessonAllCompleted,
    handleScreeningHalfReached,
    handleScreeningFinished,
    loadNextLesson,
    requestSentenceWords,
  } = usePhonemesViewModel(navigation);

  const [activeTab, setActiveTab] = useState<TabMode>("journey");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");

  const routeActionPending = useRef(false);
  useEffect(() => {
    if (route.params?.startLesson) {
      if (routeActionPending.current) return;
      routeActionPending.current = true;
      navigation.setParams({ startLesson: undefined });
      void startPersonalizedLesson();
      return;
    }
    if (route.params?.startScreening) {
      if (routeActionPending.current) return;
      routeActionPending.current = true;
      navigation.setParams({ startScreening: undefined });
      void startScreeningTest();
      return;
    }
    routeActionPending.current = false;
  }, [navigation, route.params?.startLesson, route.params?.startScreening, startPersonalizedLesson, startScreeningTest]);

  // Filter 44 IPA sounds according to selected category
  const filteredCatalog = useMemo(() => {
    if (selectedCategory === "all") return ALL_44_IPA_SOUNDS;
    return ALL_44_IPA_SOUNDS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  const hasScore = Number.isFinite(clarityRatio) && clarityRatio > 0;
  const scorePercent = hasScore ? Math.round(clarityRatio * 100) : 0;
  const scoreColor = hasScore ? accuracyBandColor(clarityRatio) : "#4f46e5";

  return (
    <ScrollView
      className="flex-1 bg-[#f8fafc]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO PRONUNCIATION OVERVIEW CARD */}
      <View
        style={{
          backgroundColor: "#0a2644",
          borderColor: "#1e3a8a",
          shadowColor: "#0a2644",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 5,
        }}
        className="rounded-3xl p-5 border gap-4"
      >
        {/* Top Voice Badge & Tag */}
        <View className="flex-row items-center justify-between">
          <View
            style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
            className="flex-row items-center gap-1.5 px-3 py-1 rounded-full"
          >
            <AudioLines size={13} color="#38bdf8" />
            <Text className="text-2xs font-extrabold text-[#38bdf8] uppercase tracking-wider">
              {dialect === "us" ? "General American (US)" : "Received Pronunciation (UK)"}
            </Text>
          </View>

          <View
            style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
            className="px-2.5 py-1 rounded-full"
          >
            <Text className="text-2xs font-bold text-slate-300">
              44 Âm IPA
            </Text>
          </View>
        </View>

        {/* Hero Title & Clarity Score Gauge */}
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-2xl font-black text-white tracking-tight">
              {t("homeDesign.phonemesTitle") || "Luyện ngữ âm IPA"}
            </Text>
            <Text className="text-xs text-slate-300 leading-relaxed">
              {hasScore
                ? "Hệ thống AI phân tích độ chuẩn xác từng âm tiết theo giọng bản xứ."
                : "Luyện phát âm từng âm tiết và nhận phản hồi tức thì để tăng độ rõ giọng nói."}
            </Text>
          </View>

          {/* Clarity Score Circular Gauge Box */}
          {hasScore ? (
            <View
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderColor: scoreColor,
                borderWidth: 2,
              }}
              className="w-20 h-20 rounded-2xl items-center justify-center p-2"
            >
              <Text style={{ color: scoreColor }} className="text-2xl font-black">
                {scorePercent}%
              </Text>
              <Text className="text-[10px] font-bold text-slate-300 text-center uppercase tracking-tight">
                Độ chuẩn
              </Text>
            </View>
          ) : (
            <View
              style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
              className="w-16 h-16 rounded-2xl items-center justify-center"
            >
              <Sparkles size={24} color="#38bdf8" />
            </View>
          )}
        </View>

        {/* Primary Action Button: Bắt đầu bài học đề xuất */}
        <TouchableOpacity
          onPress={() => startPersonalizedLesson()}
          disabled={lessonLoading}
          style={{ backgroundColor: "#0284c7" }}
          className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl shadow-sm active:opacity-85"
        >
          <Sparkles size={16} color="#ffffff" />
          <Text className="text-sm font-extrabold text-white">
            {lessonLoading
              ? t("home.mission.starting") || "Đang chuẩn bị bài..."
              : t("homeDesign.startLessonAction") || "Bắt đầu bài luyện hôm nay"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. OPTIONAL SCREENING TEST CALLOUT BANNER */}
      {showScreeningPrompt ? (
        <View
          style={{ backgroundColor: "#ffffff", borderColor: "#c7d2fe" }}
          className="rounded-3xl p-5 border shadow-sm gap-3"
        >
          <View className="flex-row items-start gap-3">
            <View
              style={{ backgroundColor: "#e0e7ff" }}
              className="w-11 h-11 rounded-2xl items-center justify-center mt-0.5"
            >
              <Zap size={22} color="#4f46e5" />
            </View>
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-1.5">
                <Text style={{ color: "#4f46e5" }} className="text-2xs font-extrabold uppercase tracking-wider">
                  Khảo sát ban đầu
                </Text>
              </View>
              <Text className="text-base font-extrabold text-[#0f172a]">
                {t("screening.optional.title") || "Kiểm tra phát âm đầu vào"}
              </Text>
              <Text className="text-xs text-slate-500 leading-relaxed">
                {t("screening.optional.description") ||
                  "Thực hiện bài kiểm tra ngắn để AI phát hiện ngay các âm yếu và thiết kế lộ trình riêng cho bạn."}
              </Text>
            </View>
          </View>

          <PrimaryButton
            title={screeningLoading ? t("screening.card.loading") : t("screening.optional.cta") || "Bắt đầu kiểm tra (10 câu)"}
            loading={screeningLoading}
            onPress={startScreeningTest}
          />
        </View>
      ) : null}

      {/* 3. SEGMENTED TABS: [ 🎯 Lộ trình học ]  [ 🔤 Bảng 44 âm IPA ] */}
      <View
        style={{ backgroundColor: "#e2e8f0" }}
        className="flex-row rounded-2xl p-1 gap-1"
      >
        <TouchableOpacity
          onPress={() => setActiveTab("journey")}
          style={{
            flex: 1,
            backgroundColor: activeTab === "journey" ? "#ffffff" : "transparent",
            shadowColor: activeTab === "journey" ? "#000000" : "transparent",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: activeTab === "journey" ? 0.08 : 0,
            shadowRadius: 4,
            elevation: activeTab === "journey" ? 2 : 0,
          }}
          className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl"
        >
          <Compass size={15} color={activeTab === "journey" ? "#0284c7" : "#64748b"} />
          <Text
            style={{ color: activeTab === "journey" ? "#0c2340" : "#64748b" }}
            className="text-xs font-bold"
          >
            {t("home.journey.title") || "Lộ trình học tập"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("catalog")}
          style={{
            flex: 1,
            backgroundColor: activeTab === "catalog" ? "#ffffff" : "transparent",
            shadowColor: activeTab === "catalog" ? "#000000" : "transparent",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: activeTab === "catalog" ? 0.08 : 0,
            shadowRadius: 4,
            elevation: activeTab === "catalog" ? 2 : 0,
          }}
          className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl"
        >
          <BookOpen size={15} color={activeTab === "catalog" ? "#0284c7" : "#64748b"} />
          <Text
            style={{ color: activeTab === "catalog" ? "#0c2340" : "#64748b" }}
            className="text-xs font-bold"
          >
            Bảng 44 Âm IPA
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. TAB CONTENT 1: LỘ TRÌNH HỌC TẬP (JOURNEY) & CÁC ÂM CẦN CẢI THIỆN */}
      {activeTab === "journey" ? (
        <View className="gap-5">
          {/* Journey Winding Path Component */}
          <HomeJourney
            journey={journey}
            loading={!homeSummary}
            streakDays={Number(homeSummary?.streak_days ?? 0)}
            lessonLoading={lessonLoading}
            lessonError={lessonError}
            onStartLesson={startPersonalizedLesson}
            onViewAll={() => navigation.navigate("Journey")}
          />

          {/* Section: Các âm cần cải thiện (Weakest Phonemes) */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <View className="gap-0.5">
                <Text className="text-base font-extrabold text-[#0c2340]">
                  {t("home.weakest.title") || "Các âm cần cải thiện"}
                </Text>
                <Text className="text-xs text-slate-500">
                  {t("home.weakest.subtitle") || "Ưu tiên luyện tập các âm có tỷ lệ phát âm chưa chuẩn"}
                </Text>
              </View>
            </View>

            {!homeSummary ? (
              <PhonemesChipsSkeleton count={3} />
            ) : weakestPhonemes.length === 0 ? (
              <View
                style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                className="rounded-2xl p-6 border items-center justify-center gap-2"
              >
                <CheckCircle2 size={32} color="#10b981" />
                <Text className="text-sm font-bold text-slate-700 text-center">
                  {t("home.weakest.empty") || "Tuyệt vời! Bạn chưa có âm nào bị đánh giá yếu."}
                </Text>
                <Text className="text-xs text-slate-400 text-center">
                  Tiếp tục luyện các câu trong lộ trình để nâng cao độ thành thạo.
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {weakestPhonemes.map((item: any, idx: number) => {
                  const sound = String(item?.sound || "");
                  if (!sound) return null;
                  const meta = getIpaSoundMeta(sound);

                  return (
                    <TouchableOpacity
                      key={`${sound}-${idx}`}
                      onPress={() => startPhoneme(sound)}
                      style={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        shadowColor: "#000000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 6,
                        elevation: 1,
                      }}
                      className="rounded-2xl p-4 border flex-row items-center justify-between active:opacity-85"
                    >
                      {/* Left: IPA Symbol Badge */}
                      <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                        <View
                          style={{ backgroundColor: "#e0effe", borderColor: "#bae6fd" }}
                          className="w-13 h-13 rounded-2xl items-center justify-center border"
                        >
                          <Text className="text-xl font-black text-[#0284c7]">
                            /{sound}/
                          </Text>
                        </View>

                        <View className="flex-1 gap-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-extrabold text-[#0c2340]">
                              {meta.categoryLabelVi}
                            </Text>
                            <View
                              style={{ backgroundColor: "#fef2f2" }}
                              className="px-2 py-0.5 rounded-full border border-rose-200"
                            >
                              <Text className="text-[10px] font-bold text-rose-600">
                                Cần luyện
                              </Text>
                            </View>
                          </View>

                          <Text numberOfLines={1} className="text-xs text-slate-500 font-medium">
                            Ví dụ: <Text className="text-slate-800 font-bold">{meta.example}</Text>
                          </Text>
                          <Text numberOfLines={1} className="text-2xs text-slate-400">
                            {meta.vietnameseTip}
                          </Text>
                        </View>
                      </View>

                      {/* Right: Mic Action Button */}
                      <View
                        style={{ backgroundColor: "#0284c7" }}
                        className="w-9 h-9 rounded-xl items-center justify-center shadow-sm"
                      >
                        <Mic size={16} color="#ffffff" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      ) : (
        /* 5. TAB CONTENT 2: BẢNG TỔNG HỢP 44 ÂM IPA (IPA SOUNDBOARD) */
        <View className="gap-4">
          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            {(
              [
                { id: "all", label: "Tất cả (44)" },
                { id: "monophthong", label: "Nguyên âm đơn (12)" },
                { id: "diphthong", label: "Nguyên âm đôi (8)" },
                { id: "consonant", label: "Phụ âm (24)" },
              ] as const
            ).map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={{
                    backgroundColor: isSelected ? "#0c2340" : "#ffffff",
                    borderColor: isSelected ? "#0c2340" : "#e2e8f0",
                  }}
                  className="px-4 py-2 rounded-full border shadow-sm active:opacity-85"
                >
                  <Text
                    style={{ color: isSelected ? "#ffffff" : "#475569" }}
                    className="text-xs font-bold"
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Grid Cards of 44 IPA Sounds */}
          <View className="gap-2.5">
            {filteredCatalog.map((item) => (
              <TouchableOpacity
                key={item.sound}
                onPress={() => startPhoneme(item.sound)}
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                }}
                className="rounded-2xl p-3.5 border flex-row items-center justify-between active:opacity-80"
              >
                <View className="flex-row items-center gap-3 flex-1 pr-2">
                  <View
                    style={{
                      backgroundColor:
                        item.category === "monophthong"
                          ? "#ecfdf5"
                          : item.category === "diphthong"
                            ? "#fffbeb"
                            : "#eff6ff",
                      borderColor:
                        item.category === "monophthong"
                          ? "#a7f3d0"
                          : item.category === "diphthong"
                            ? "#fde68a"
                            : "#bfdbfe",
                    }}
                    className="w-12 h-12 rounded-xl items-center justify-center border"
                  >
                    <Text
                      style={{
                        color:
                          item.category === "monophthong"
                            ? "#059669"
                            : item.category === "diphthong"
                              ? "#d97706"
                              : "#1d4ed8",
                      }}
                      className="text-lg font-black"
                    >
                      /{item.sound}/
                    </Text>
                  </View>

                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs font-bold text-slate-800">
                        {item.categoryLabelVi}
                      </Text>
                    </View>
                    <Text numberOfLines={1} className="text-xs text-slate-500 font-medium">
                      Ví dụ: <Text className="text-slate-900 font-bold">{item.example}</Text>
                    </Text>
                    <Text numberOfLines={1} className="text-2xs text-slate-400">
                      {item.vietnameseTip}
                    </Text>
                  </View>
                </View>

                <View
                  style={{ backgroundColor: "#f1f5f9" }}
                  className="w-8 h-8 rounded-xl items-center justify-center"
                >
                  <Mic size={14} color="#0284c7" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* MODALS */}
      <IPAChecking
        open={Boolean(lessonSession)}
        onClose={closeLessonSession}
        sentences={lessonSession?.sentences || []}
        dialect={lessonSession?.dialect || dialect}
        sessionKey={lessonSessionKey}
        autoRecordKey={lessonSessionKey}
        lessonTitle={lessonSession?.title}
        instructionsHtml={lessonSession?.instructionsHtml}
        userTier={userTier}
        userKey={userKey}
        usageStatus={usageStatus}
        mode={lessonMode}
        loadNextLesson={loadNextLesson}
        onPracticePhoneme={startPhoneme}
        onLessonAllCompleted={handleLessonAllCompleted}
        onScreeningHalfReached={handleScreeningHalfReached}
        onScreeningFinished={handleScreeningFinished}
        onRequestSentenceWords={requestSentenceWords}
        journeyData={journey}
      />

      <ScreeningResultModal
        open={Boolean(screeningResult)}
        totalAccuracy={screeningResult?.totalAccuracy}
        onClose={() => setScreeningResult(null)}
      />
    </ScrollView>
  );
}
