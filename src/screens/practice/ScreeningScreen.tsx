import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertCircle, ChevronLeft, RotateCcw } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";
import type { LessonSentence } from "@/types/domain";
import { lessonApi } from "@/api";
import { useAuth } from "@/services/Auth";
import { useAuthStore } from "@/store/useAuthStore";
import { useBillingStore } from "@/store/useBillingStore";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { lessonKeys } from "@/hooks/queries/useLessonQueries";
import { progressKeys } from "@/hooks/queries/useProgressQueries";
import { getFriendlyErrorMessage } from "@/utils/localizedError";
import { SCREENING_SENTENCE_COUNT } from "@/utils/screeningSession";
import ScreeningSession from "@/components/practice/ScreeningSession";
import ScreeningResultModal from "@/components/practice/ScreeningResultModal";
import { ScreeningPracticeSkeleton } from "@/components/ui/Skeleton";

type Props = NativeStackScreenProps<RootStackParamList, "Screening">;

export default function ScreeningScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const dialect = route.params?.dialect || "uk";

  const authToken = useAuthStore((s) => s.token);
  const authEmail = useAuthStore((s) => s.email);
  const usageStatus = useBillingStore((s) => s.usage);
  const { refreshScreeningStatus } = useAuth();

  const userTier = useMemo(
    () =>
      resolveUserTier({
        authToken,
        hasActiveSubscription: Boolean(usageStatus?.has_active_subscription),
        isInTrial: Boolean(usageStatus?.is_in_trial),
      }),
    [authToken, usageStatus]
  );

  const userKey = useMemo(
    () => resolveUserKey({ authToken, authEmail }),
    [authToken, authEmail]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sentences, setSentences] = useState<LessonSentence[]>([]);
  const [completedResult, setCompletedResult] = useState<{ totalAccuracy?: number } | null>(null);

  const fetchSentences = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await lessonApi.getScreeningSentences(dialect);
      const items = Array.isArray(data?.sentences) ? data.sentences : [];
      if (
        items.length !== SCREENING_SENTENCE_COUNT ||
        items.some((item: any) => typeof item?.text !== "string" || !item.text.trim())
      ) {
        setError(t("screeningPractice.unavailable"));
        return;
      }
      setSentences(items);
    } catch (e: any) {
      setError(
        getFriendlyErrorMessage(
          e,
          t("phonemesHome.startError"),
          i18n.language.startsWith("vi") ? "vi" : "en"
        )
      );
    } finally {
      setLoading(false);
    }
  }, [dialect, i18n.language, t]);

  useEffect(() => {
    void fetchSentences();
  }, [fetchSentences]);

  const handleScreeningFinished = useCallback(async () => {
    try {
      const data = await lessonApi.completeScreening();
      const status = await refreshScreeningStatus?.();
      const confirmed =
        data?.screening_completed === true ||
        data?.screening_status?.screening_completed === true ||
        status?.screening_completed === true;

      if (!confirmed) {
        return false;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: lessonKeys.homeSummary(dialect) }),
        queryClient.invalidateQueries({ queryKey: progressKeys.sounds(dialect) }),
      ]);

      const rawScore = data?.total_accuracy;
      const validScore =
        rawScore != null &&
        rawScore !== "" &&
        Number.isFinite(Number(rawScore)) &&
        Number(rawScore) >= 0 &&
        Number(rawScore) <= 1;

      setCompletedResult({
        totalAccuracy: validScore ? Number(rawScore) : undefined,
      });
      return true;
    } catch {
      return false;
    }
  }, [dialect, queryClient, refreshScreeningStatus]);

  const handleResultClose = useCallback(() => {
    setCompletedResult(null);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace("Phonemes");
    }
  }, [navigation]);

  // Loading State
  if (loading) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
        <ScreeningPracticeSkeleton onClose={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  // Error State
  if (error || !sentences.length) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
        <View className="bg-appBg px-4 py-3 border-b border-slate-200 flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("common.back", "Quay lại")}
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center active:opacity-70"
          >
            <ChevronLeft size={22} color="#37352f" strokeWidth={2.5} />
          </TouchableOpacity>
          <AppText className="text-base font-bold text-[#37352f]">
            {t("screeningPractice.title")}
          </AppText>
          <View className="w-10 h-10" />
        </View>

        <View className="flex-1 bg-appBg items-center justify-center px-6 gap-5">
          <View className="w-16 h-16 rounded-3xl bg-[#fef2f2] items-center justify-center">
            <AlertCircle size={32} color="#dc2626" />
          </View>
          <View className="gap-2 items-center">
            <AppText className="text-lg font-extrabold text-[#37352f] text-center">
              {t("phonemesHome.startError")}
            </AppText>
            <AppText className="text-[15px] text-[#64748b] text-center leading-6 max-w-[300px]">
              {error || t("screeningPractice.unavailable")}
            </AppText>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void fetchSentences()}
            activeOpacity={0.8}
            className="min-h-[48px] px-6 py-3 rounded-2xl bg-[#2383e2] flex-row items-center gap-2"
          >
            <RotateCcw size={18} color="#ffffff" />
            <AppText className="text-sm font-bold text-white">
              {t("common.retry", "Thử lại")}
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-appBg">
      <ScreeningSession
        sentences={sentences}
        dialect={dialect}
        userTier={userTier}
        userKey={userKey}
        onClose={() => navigation.goBack()}
        onComplete={handleScreeningFinished}
      />
      <ScreeningResultModal
        open={Boolean(completedResult)}
        totalAccuracy={completedResult?.totalAccuracy}
        onClose={handleResultClose}
      />
    </View>
  );
}
