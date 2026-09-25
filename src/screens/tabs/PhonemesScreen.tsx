import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import HomeJourney from "@/components/practice/HomeJourney";
import IPAChecking from "@/components/practice/IPAChecking";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { PhonemesChipsSkeleton } from "@/components/ui/Skeleton";
import ScreeningResultModal from "@/components/practice/ScreeningResultModal";
import { accuracyBandColor } from "@/utils/checkResultScoreColor";
import { usePhonemesViewModel } from "@/hooks/usePhonemesViewModel";

export default function PhonemesScreen({ navigation }: { navigation: any }) {
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

  return (
    <ScrollView className="flex-1 bg-appBg" contentContainerClassName="p-4 gap-2.5 pb-10">
      {showScreeningPrompt ? (
        <View className="bg-appElevated rounded-xl p-3.5 gap-2 border border-appBorder">
          <Text className="text-lg font-bold text-appText">{t("screening.optional.title")}</Text>
          <Text className="text-appTextSecondary">{t("screening.optional.description")}</Text>
          <PrimaryButton
            title={screeningLoading ? t("screening.card.loading") : t("screening.optional.cta")}
            loading={screeningLoading}
            onPress={startScreeningTest}
          />
        </View>
      ) : null}

      <HomeJourney
        journey={journey}
        loading={!homeSummary}
        streakDays={Number(homeSummary?.streak_days ?? 0)}
        lessonLoading={lessonLoading}
        lessonError={lessonError}
        onStartLesson={startPersonalizedLesson}
        onViewAll={() => navigation.navigate("Journey")}
      />

      {Number.isFinite(clarityRatio) && clarityRatio > 0 ? (
        <Text
          className="text-[28px] font-extrabold"
          style={{ color: accuracyBandColor(clarityRatio) }}
        >
          {Math.round(clarityRatio * 100)}%
        </Text>
      ) : null}

      <Text className="text-lg font-bold text-appText">{t("home.weakest.title")}</Text>
      <Text className="text-appTextSecondary">{t("home.weakest.subtitle")}</Text>
      {!homeSummary ? (
        <PhonemesChipsSkeleton count={3} />
      ) : weakestPhonemes.length === 0 ? (
        <Text className="text-appTextSecondary">{t("home.weakest.empty")}</Text>
      ) : (
        weakestPhonemes.map((item: any) => {
          const sound = String(item?.sound || "");
          if (!sound) return null;
          return (
            <Pressable key={sound} className="bg-appElevated rounded-md p-3 border border-appBorder" onPress={() => startPhoneme(sound)}>
              <Text className="text-lg font-bold text-appText">/{sound}/</Text>
            </Pressable>
          );
        })
      )}

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
