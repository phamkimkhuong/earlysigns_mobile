import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { AppText } from "@/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, RefreshCw } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";
import { useAuth } from "@/services/Auth";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { useBillingStore } from "@/store/useBillingStore";
import { buildLessonSession } from "@/utils/lessons";
import { lessonApi, textPracticeApi } from "@/api";
import { lessonKeys } from "@/hooks/queries/useLessonQueries";
import { billingKeys, useBillingUsageQuery } from "@/hooks/queries/useBillingQueries";
import IPAChecking, { type IPASentence } from "@/components/practice/IPAChecking";
import { PracticeScreenSkeleton } from "@/components/ui/Skeleton";
import type { Dialect, LessonSession } from "@/types/domain";

type Props = NativeStackScreenProps<RootStackParamList, "JourneyLesson">;

export default function JourneyLessonScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { authToken, authEmail, userDialect } = useAuth();
  const dialect: Dialect = (route.params?.dialect as Dialect) || userDialect || "uk";
  const queryClient = useQueryClient();

  const { data: usageData } = useBillingUsageQuery(Boolean(authToken));
  const storeUsage = useBillingStore((s) => s.usage);
  const storeHomeSummary = useBillingStore((s) => s.homeSummary);
  const usageStatus = usageData || storeUsage;

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
  const [error, setError] = useState<string | null>(null);
  const [lessonSession, setLessonSession] = useState<LessonSession | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const fetchLesson = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await lessonApi.getPersonalizedLesson(dialect, false);
      const session = buildLessonSession("personalized", data, { dialect }, t, i18n.language);
      if (!session || !session.sentences?.length) {
        setError(t("lesson.empty", "Chưa có bài học khả dụng"));
        return;
      }
      setLessonSession(session);
      setSessionKey((k) => k + 1);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }, [dialect, i18n.language, t]);

  useEffect(() => {
    void fetchLesson();
  }, [fetchLesson]);

  const loadNextLesson = useCallback(async () => {
    try {
      await lessonApi.markPracticed(lessonSession?.phonemes || []).catch(() => {});
      const data = await lessonApi.getPersonalizedLesson(lessonSession?.dialect || dialect, false);
      const nextSession = buildLessonSession("personalized", data, { dialect }, t, i18n.language);
      if (nextSession) {
        setLessonSession(nextSession);
        setSessionKey((k) => k + 1);
      }
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }, [dialect, lessonSession, t, i18n.language]);

  const handleLessonAllCompleted = useCallback(async () => {
    try {
      await lessonApi.completeJourney();
    } catch {
      /* ignore offline */
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: lessonKeys.all }),
      queryClient.invalidateQueries({ queryKey: billingKeys.all }),
    ]);
  }, [queryClient]);

  const handlePracticePhoneme = useCallback(
    (sound: string) => {
      navigation.navigate("PhonemePractice", { phoneme: sound, dialect });
    },
    [dialect, navigation]
  );

  const requestSentenceWords = useCallback(
    async (sentence: IPASentence) => {
      try {
        return await textPracticeApi.getIpaWords(sentence.text, dialect);
      } catch {
        return [];
      }
    },
    [dialect]
  );

  const requestSampleAudio = useCallback(
    async (sentence: IPASentence) => {
      try {
        if (!sentence?.text) return null;
        return await textPracticeApi.generateAudio(sentence.text, dialect, false);
      } catch {
        return null;
      }
    },
    [dialect]
  );

  const lessonTitle = route.params?.lessonTitle;
  const phonemes = lessonSession?.phonemes;
  const displayTitle = useMemo(() => {
    const baseTitle = lessonTitle || t("journeyPage.lessonTitle", "Bài học lộ trình");
    if (phonemes && phonemes.length > 0) {
      return `${baseTitle} · ${phonemes.map((p) => `/${p}/`).join(" ")}`;
    }
    return baseTitle;
  }, [lessonTitle, phonemes, t]);

  const currentModule = storeHomeSummary?.journey?.current_module;
  const totalModules = storeHomeSummary?.journey?.total_modules || currentModule;

  // Loading state (Matches IPAChecking header styling 100% to eliminate visual jump)
  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#f7f6f3" }}>
        {/* UNIFIED WHITE HEADER */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(15,23,42,0.07)",
            backgroundColor: "#ffffff",
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("common.back", "Quay lại")}
            onPress={() => navigation.goBack()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#f7f6f3",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={22} color="#334155" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <AppText
              style={{ fontSize: 15, fontWeight: "700", color: "#37352f" }}
              numberOfLines={1}
            >
              {displayTitle}
            </AppText>
            {lessonTitle ? (
              <AppText style={{ fontSize: 13, fontWeight: "500", color: "#64748b", marginTop: 2 }}>
                {t("phonemesHome.dailyMissionEyebrow", "Nhiệm vụ hôm nay")}
              </AppText>
            ) : currentModule != null ? (
              <AppText style={{ fontSize: 13, fontWeight: "500", color: "#64748b", marginTop: 2 }}>
                {t("home.journey.moduleOf", {
                  current: currentModule,
                  total: totalModules,
                })}
              </AppText>
            ) : null}
          </View>
        </View>

        <PracticeScreenSkeleton />
      </SafeAreaView>
    );
  }

  // Error state (Matches IPAChecking header styling)
  if (error || !lessonSession) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#f7f6f3" }}>
        {/* UNIFIED WHITE HEADER */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(15,23,42,0.07)",
            backgroundColor: "#ffffff",
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("common.back", "Quay lại")}
            onPress={() => navigation.goBack()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#f7f6f3",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={22} color="#334155" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <AppText
              style={{ fontSize: 15, fontWeight: "700", color: "#37352f" }}
              numberOfLines={1}
            >
              {displayTitle}
            </AppText>
            {lessonTitle ? (
              <AppText style={{ fontSize: 13, fontWeight: "500", color: "#64748b", marginTop: 2 }}>
                {t("phonemesHome.dailyMissionEyebrow", "Nhiệm vụ hôm nay")}
              </AppText>
            ) : currentModule != null ? (
              <AppText style={{ fontSize: 13, fontWeight: "500", color: "#64748b", marginTop: 2 }}>
                {t("home.journey.moduleOf", {
                  current: currentModule,
                  total: totalModules,
                })}
              </AppText>
            ) : null}
          </View>
        </View>

        <View className="flex-1 items-center justify-center p-6 gap-4">
          <View className="w-16 h-16 rounded-full bg-rose-100 items-center justify-center">
            <AlertCircle size={32} color="#e11d48" />
          </View>
          <AppText className="text-base font-extrabold text-[#37352f] text-center">
            {t("common.loadFailed", "Không thể tải bài học")}
          </AppText>
          <AppText className="text-[14px] text-slate-600 text-center leading-relaxed max-w-[280px]">
            {error || t("lesson.empty", "Chưa có bài học khả dụng")}
          </AppText>

          <View className="flex-row items-center gap-3 mt-2">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common.back", "Quay lại")}
              activeOpacity={0.8}
              onPress={() => navigation.goBack()}
              className="py-3 px-5 rounded-2xl border border-slate-300 bg-white"
            >
              <AppText className="text-sm font-bold text-slate-700">
                {t("common.back", "Quay lại")}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common.retry", "Thử lại")}
              activeOpacity={0.8}
              onPress={fetchLesson}
              className="py-3 px-6 rounded-2xl flex-row items-center gap-2"
              style={{ backgroundColor: "#2383e2" }}
            >
              <RefreshCw size={16} color="#ffffff" />
              <AppText className="text-sm font-bold text-white">
                {t("common.retry", "Thử lại")}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Active Lesson Practice View
  return (
    <IPAChecking
      asModal={false}
      open={true}
      onClose={() => navigation.goBack()}
      sentences={lessonSession.sentences || []}
      dialect={lessonSession.dialect || dialect}
      sessionKey={sessionKey}
      lessonTitle={displayTitle}
      instructionsHtml={lessonSession.instructionsHtml}
      userTier={userTier}
      userKey={userKey}
      usageStatus={usageStatus}
      loadNextLesson={loadNextLesson}
      onLessonAllCompleted={handleLessonAllCompleted}
      journeyData={lessonTitle ? undefined : storeHomeSummary?.journey}
      onRequestSampleAudio={requestSampleAudio}
      onRequestSentenceWords={requestSentenceWords}
      onPracticePhoneme={handlePracticePhoneme}
    />
  );
}
