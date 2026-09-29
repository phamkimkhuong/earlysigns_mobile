import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import IPAChecking from "@/components/practice/IPAChecking";
import PhonemesHome from "@/components/practice/PhonemesHome";
import ScreeningResultModal from "@/components/practice/ScreeningResultModal";
import ScreeningSession from "@/components/practice/ScreeningSession";
import { usePhonemesViewModel } from "@/hooks/usePhonemesViewModel";
import { ALL_44_IPA_SOUNDS, type IpaCategory } from "@/utils/ipaData";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";

type CategoryFilter = "all" | IpaCategory;

export default function PhonemesScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Phonemes">) {
  const {
    t, dialect, screeningCompleted, screeningLoading, screeningError, startScreeningTest,
    summaryLoading, summaryError, retrySummary, journey, lessonLoading, lessonError, startPersonalizedLesson,
    weakestPhonemes, startPhoneme, phonemeLoading, lessonSession, lessonSessionKey, closeLessonSession,
    userTier, userKey, usageStatus, lessonMode, screeningResult, setScreeningResult,
    handleLessonAllCompleted, handleScreeningFinished, loadNextLesson, requestSentenceWords,
  } = usePhonemesViewModel(navigation);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const { width, fontScale } = useWindowDimensions();
  const isCatalog = route.params?.view === "catalog";
  const columns = width < 360 || fontScale > 1.3 ? 2 : 3;
  const busy = Boolean(lessonLoading || screeningLoading || phonemeLoading);
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

  const filteredCatalog = useMemo(() => ALL_44_IPA_SOUNDS.filter(item => selectedCategory === "all" || item.category === selectedCategory), [selectedCategory]);
  const openCatalog = () => navigation.push("Phonemes", { view: "catalog" });

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-[#f5f8fb]">
      {isCatalog ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-[#53677a]" style={{ fontSize: 15, lineHeight: 23 }}>
            {t("phonemesHome.catalogDescription")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(["all", "monophthong", "diphthong", "consonant"] as const).map(category => (
              <Pressable
                key={category}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCategory === category }}
                onPress={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "bg-[#0c2340]" : "bg-white"}
                style={{ paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, borderRadius: 22 }}
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
            {filteredCatalog.map(item => (
              <View key={item.sound} style={{ width: `${100 / columns}%`, padding: 5 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("phonemesHome.practiceSound", { sound: item.sound })}
                  accessibilityState={{ disabled: busy, busy: phonemeLoading === item.sound }}
                  disabled={busy}
                  onPress={() => void startPhoneme(item.sound)}
                  className="bg-white items-center justify-center"
                  style={({ pressed }) => ({
                    minHeight: 100, padding: 12, borderRadius: 18, gap: 6,
                    opacity: busy ? 0.6 : pressed ? 0.8 : 1,
                  })}
                >
                  {phonemeLoading === item.sound ? (
                    <ActivityIndicator color="#0369a1" />
                  ) : (
                    <Text className="text-[#0369a1] font-bold" style={{ fontSize: 26 }}>
                      /{item.sound}/
                    </Text>
                  )}
                  <Text className="text-[#53677a] text-sm text-center">
                    {item.example.split(" /", 1)[0]}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <PhonemesHome
          t={t}
          dialect={dialect}
          screeningCompleted={screeningCompleted}
          weakestPhonemes={weakestPhonemes}
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
      {lessonSession?.kind === "screening" ? (
        <ScreeningSession
          key={lessonSessionKey}
          sentences={lessonSession.sentences}
          dialect={lessonSession.dialect || dialect}
          userTier={userTier}
          userKey={userKey}
          onClose={closeLessonSession}
          onComplete={handleScreeningFinished}
        />
      ) : lessonSession ? (
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
