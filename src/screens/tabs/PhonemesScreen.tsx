import React, { useEffect, useRef } from "react";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import PhonemesHome from "@/components/practice/PhonemesHome";
import ScreeningResultModal from "@/components/practice/ScreeningResultModal";
import { usePhonemesViewModel } from "@/hooks/usePhonemesViewModel";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";

export default function PhonemesScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Phonemes">) {
  const {
    t, dialect, screeningCompleted, screeningLoading, screeningError, startScreeningTest,
    summaryLoading, summaryError, retrySummary, journey, lessonLoading, lessonError, startPersonalizedLesson,
    weakestPhonemes, dailyMissionPhonemes, phonemeLoading,
    screeningResult, setScreeningResult, authToken,
  } = usePhonemesViewModel(navigation);
  const routeActionPending = useRef(false);
  const navigatingLessonRef = useRef(false);

  const handleStartLesson = () => {
    if (navigatingLessonRef.current) return;
    navigatingLessonRef.current = true;
    setTimeout(() => {
      navigatingLessonRef.current = false;
    }, 1000);

    if (!authToken) {
      navigation.navigate("Login", { next: "JourneyLesson" });
      return;
    }
    navigation.navigate("JourneyLesson", {
      dialect,
      lessonTitle: t("phonemesHome.personalizedHeadline", "Mục tiêu phát âm hôm nay"),
    });
  };

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
  }, [navigation, route.params?.startLesson, route.params?.startScreening, startPersonalizedLesson, dialect]);

  const openCatalog = () => navigation.navigate("PhonemeCatalog", { dialect });

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
            {t("nav.phonemes")}
          </Text>

          {/* Symmetrical placeholder to center title */}
          <View className="w-10 h-10" />
        </View>
      </View>

      {/* 2. LAYERED OVERLAPPING CANVAS SHEET (Primary scrollable container <ScrollView> is encapsulated inside PhonemesHome) */}
      <View className="flex-1 bg-[#f8fafc] -mt-4 rounded-t-[32px] overflow-hidden">
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
          onLesson={handleStartLesson}
          onPhoneme={(sound) => navigation.navigate("PhonemePractice", { phoneme: sound, dialect })}
          onJourney={() => navigation.navigate("Journey")}
          onCatalog={openCatalog}
          onRetry={retrySummary}
        />
      </View>
      <ScreeningResultModal open={Boolean(screeningResult)} totalAccuracy={screeningResult?.totalAccuracy} onClose={() => setScreeningResult(null)} />
    </SafeAreaView>
  );
}
