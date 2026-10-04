import React, { useEffect, useRef } from "react";
import {
  TouchableOpacity,
  View,
} from "react-native";
import { AppText } from "@/components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import PhonemesHome from "@/components/practice/PhonemesHome";
import ScreeningResultModal from "@/components/practice/ScreeningResultModal";
import { usePhonemesViewModel } from "@/hooks/usePhonemesViewModel";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";

export default function PhonemesScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Phonemes">) {
  const {
    t, dialect, showScreeningPrompt, screeningLoading, screeningError, startScreeningTest,
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
    <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
      {/* 1. TOP NAV BAR */}
      <View className="bg-appBg px-4 py-3 border-b border-slate-200 flex-row items-center justify-between">
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Quay lại")}
          activeOpacity={0.7}
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

        <AppText className="text-base font-bold text-[#0c2340]">
          {t("nav.phonemes")}
        </AppText>

        <View className="w-10 h-10" />
      </View>

      {/* 2. MAIN CONTENT (Primary scrollable container <ScrollView> is encapsulated inside PhonemesHome) */}
      <View className="flex-1 bg-appBg overflow-hidden">
        <PhonemesHome
          t={t}
          dialect={dialect}
          showScreeningPrompt={showScreeningPrompt}
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
