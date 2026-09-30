import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import IPAChecking from "@/components/practice/IPAChecking";
import PhonemesHome from "@/components/practice/PhonemesHome";
import ScreeningResultModal from "@/components/practice/ScreeningResultModal";
import { usePhonemesViewModel } from "@/hooks/usePhonemesViewModel";
import { ALL_44_IPA_SOUNDS, type IpaCategory } from "@/utils/ipaData";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";

type CategoryFilter = "all" | IpaCategory;

export default function PhonemesScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Phonemes">) {
  const {
    t, dialect, screeningCompleted, screeningLoading, screeningError, startScreeningTest,
    summaryLoading, summaryError, retrySummary, journey, lessonLoading, lessonError, startPersonalizedLesson,
    weakestPhonemes, dailyMissionPhonemes, soundsAccuracyMap, startPhoneme, phonemeLoading, lessonSession, lessonSessionKey, closeLessonSession,
    userTier, userKey, usageStatus, lessonMode, screeningResult, setScreeningResult,
    handleLessonAllCompleted, handleScreeningFinished, loadNextLesson, requestSentenceWords,
  } = usePhonemesViewModel(navigation);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const { width, fontScale } = useWindowDimensions();
  const isCatalog = route.params?.view === "catalog";
  const columns = width < 360 || fontScale > 1.3 ? 2 : 3;
  const busy = Boolean(lessonLoading || screeningLoading || phonemeLoading);
  const routeActionPending = useRef(false);

  const catalogStats = useMemo(() => {
    let practiced = 0;
    let mastered = 0;
    ALL_44_IPA_SOUNDS.forEach((s) => {
      const clean = s.sound.replace(/^\/+|\/+$/g, "").trim().toLowerCase();
      const info = soundsAccuracyMap?.get(clean);
      if (info && info.accuracyPct != null) {
        practiced++;
        if (info.accuracyPct >= 70) mastered++;
      }
    });
    return { practiced, mastered };
  }, [soundsAccuracyMap]);

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
      navigation.navigate("Screening", { dialect });
      return;
    }
    routeActionPending.current = false;
  }, [navigation, route.params?.startLesson, route.params?.startScreening, startPersonalizedLesson, startScreeningTest, dialect]);

  const filteredCatalog = useMemo(() => ALL_44_IPA_SOUNDS.filter(item => selectedCategory === "all" || item.category === selectedCategory), [selectedCategory]);
  const openCatalog = () => navigation.push("Phonemes", { view: "catalog" });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#0a2644]">
      {/* 1. LUXURY NAVY HEADER (Unified with Text Practice & Video) */}
      <View className="bg-[#0a2644] pt-2 pb-6 px-5">
        {/* Top Nav Bar */}
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t("common.back", "Quay lại")}
            activeOpacity={0.8}
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
            {isCatalog ? t("phonemesHome.catalogTitle") : t("nav.phonemes")}
          </Text>

          {/* Symmetrical placeholder to center title */}
          <View className="w-10 h-10" />
        </View>
      </View>

      {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
      <View className="flex-1 bg-[#f8fafc] -mt-4 rounded-t-[32px] overflow-hidden">
        {isCatalog ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, gap: 18, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Catalog Progress Banner */}
            <View
              className="px-4 py-3.5 rounded-2xl border bg-white gap-2.5"
              style={{
                borderColor: "#e2eaf2",
                shadowColor: "#0c2340",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 1,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1 mr-2">
                  <View
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: catalogStats.mastered > 0 ? "#10b981" : "#0284c7" }}
                  />
                  <Text className="text-sm font-bold text-[#0c2340]" numberOfLines={1}>
                    {t("phonemesHome.catalogProgress", {
                      practiced: catalogStats.practiced,
                      total: 44,
                    })}
                  </Text>
                </View>
                {catalogStats.mastered > 0 ? (
                  <View
                    className="px-2.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0" }}
                  >
                    <Text className="text-xs font-bold text-[#047857]" numberOfLines={1}>
                      {t("phonemesHome.catalogMastered", { count: catalogStats.mastered })}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Progress bar track */}
              <View
                className="w-full bg-[#f1f5f9] rounded-full overflow-hidden"
                style={{ height: 6 }}
                accessible={false}
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(catalogStats.practiced > 0 ? 5 : 0, Math.min(100, Math.round((catalogStats.practiced / 44) * 100)))}%`,
                    backgroundColor: catalogStats.mastered > 0 ? "#10b981" : "#0284c7",
                  }}
                />
              </View>
            </View>

            {/* Category Filter Pills (Nguyên âm đơn, Nguyên âm đôi, Phụ âm) */}
            <View className="flex-row flex-wrap gap-2">
              {(["all", "monophthong", "diphthong", "consonant"] as const).map(category => (
                <Pressable
                  key={category}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCategory === category }}
                  onPress={() => setSelectedCategory(category)}
                  className="active:opacity-85"
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    minHeight: 40,
                    borderRadius: 20,
                    backgroundColor: selectedCategory === category ? "#0c2340" : "#ffffff",
                    borderWidth: 1,
                    borderColor: selectedCategory === category ? "#0c2340" : "#e2eaf2",
                  }}
                >
                  <Text
                    className={`text-sm font-bold ${selectedCategory === category ? "text-white" : "text-[#53677a]"}`}
                  >
                    {t(`phonemesHome.categories.${category}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {lessonError ? (
              <Text accessibilityRole="alert" className="text-[#b42318] text-sm" style={{ lineHeight: 22 }}>
                {lessonError}
              </Text>
            ) : null}

            <View className="flex-row flex-wrap" style={{ marginHorizontal: -5 }}>
              {filteredCatalog.map(item => {
                const clean = item.sound.replace(/^\/+|\/+$/g, "").trim().toLowerCase();
                const soundInfo = soundsAccuracyMap?.get(clean);
                const hasScore = soundInfo != null && soundInfo.accuracyPct != null;
                const accuracyPct = soundInfo?.accuracyPct ?? 0;

                return (
                  <View key={item.sound} style={{ width: `${100 / columns}%`, padding: 5 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("phonemesHome.practiceSound", { sound: item.sound })}
                      accessibilityState={{ disabled: busy, busy: phonemeLoading === item.sound }}
                      disabled={busy}
                      onPress={() => void startPhoneme(item.sound)}
                      className="active:opacity-80"
                      style={{
                        backgroundColor: "#ffffff",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: 104,
                        paddingHorizontal: 8,
                        paddingVertical: 12,
                        borderRadius: 18,
                        gap: 3,
                        borderWidth: 1.5,
                        borderColor: hasScore
                          ? (accuracyPct >= 70 ? "#a7f3d0" : accuracyPct >= 50 ? "#fed7aa" : "#fecaca")
                          : "#e8f1f8",
                        shadowColor: "#0c2340",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.04,
                        shadowRadius: 6,
                        elevation: 1,
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      {phonemeLoading === item.sound ? (
                        <ActivityIndicator color="#0284c7" />
                      ) : (
                        <>
                          <Text
                            className="font-extrabold text-center text-[#0c2340]"
                            style={{
                              fontSize: 22,
                              includeFontPadding: false,
                            }}
                            numberOfLines={1}
                          >
                            /{item.sound}/
                          </Text>
                          <Text numberOfLines={1} className="text-[#64748b] text-xs text-center font-medium">
                            {item.example.split(" /", 1)[0]}
                          </Text>
                          {hasScore ? (
                            <View
                              className="px-2.5 py-0.5 rounded-full mt-0.5 shrink-0"
                              style={{
                                backgroundColor: accuracyPct >= 70 ? "#ecfdf5" : accuracyPct >= 50 ? "#fffbeb" : "#fef2f2",
                                borderWidth: 1,
                                borderColor: accuracyPct >= 70 ? "#a7f3d0" : accuracyPct >= 50 ? "#fde68a" : "#fecaca",
                              }}
                            >
                              <Text
                                numberOfLines={1}
                                className="text-xs font-bold text-center"
                                style={{
                                  color: accuracyPct >= 70 ? "#047857" : accuracyPct >= 50 ? "#b45309" : "#dc2626",
                                }}
                              >
                                {`${accuracyPct}%`}
                              </Text>
                            </View>
                          ) : (
                            <View
                              className="px-2.5 py-0.5 rounded-full mt-0.5 shrink-0"
                              style={{
                                backgroundColor: "#f8fafc",
                                borderWidth: 1,
                                borderColor: "#e2e8f0",
                              }}
                            >
                              <Text
                                numberOfLines={1}
                                className="text-xs font-medium text-[#94a3b8] text-center"
                              >
                                {t("phonemesHome.notPracticed", "Chưa học")}
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : (
          <PhonemesHome
            t={t}
            dialect={dialect}
            screeningCompleted={screeningCompleted}
            weakestPhonemes={weakestPhonemes}
            dailyMissionPhonemes={dailyMissionPhonemes}
            summaryLoading={summaryLoading}
            summaryError={summaryError}
            journey={journey}
            lessonLoading={lessonLoading}
            screeningLoading={screeningLoading}
            phonemeLoading={phonemeLoading}
            lessonError={lessonError}
            screeningError={screeningError}
            onScreening={startScreeningTest}
            onLesson={startPersonalizedLesson}
            onPhoneme={startPhoneme}
            onJourney={() => navigation.navigate("Journey")}
            onCatalog={openCatalog}
            onProfile={() => navigation.navigate("PronunciationProfile")}
            onRetry={retrySummary}
          />
        )}
      </View>
      {lessonSession ? (
        <IPAChecking
          open
          onClose={closeLessonSession}
          sentences={lessonSession.sentences}
          dialect={lessonSession.dialect || dialect}
          sessionKey={lessonSessionKey}
          lessonTitle={lessonSession.title}
          instructionsHtml={lessonSession.instructionsHtml}
          userTier={userTier}
          userKey={userKey}
          usageStatus={usageStatus}
          mode={lessonMode}
          loadNextLesson={loadNextLesson}
          onPracticePhoneme={startPhoneme}
          onLessonAllCompleted={handleLessonAllCompleted}
          onScreeningFinished={handleScreeningFinished}
          onRequestSentenceWords={requestSentenceWords}
          journeyData={journey}
        />
      ) : null}
      <ScreeningResultModal open={Boolean(screeningResult)} totalAccuracy={screeningResult?.totalAccuracy} onClose={() => setScreeningResult(null)} />
    </SafeAreaView>
  );
}
