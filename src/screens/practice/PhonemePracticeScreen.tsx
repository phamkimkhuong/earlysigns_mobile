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
import { progressKeys } from "@/hooks/queries/useProgressQueries";
import { useBillingUsageQuery } from "@/hooks/queries/useBillingQueries";
import IPAChecking, { type IPASentence } from "@/components/practice/IPAChecking";
import PhonemeIntroGuide from "@/components/practice/PhonemeIntroGuide";
import { PracticeScreenSkeleton } from "@/components/ui/Skeleton";
import { getIpaSoundMeta } from "@/utils/ipaData";
import { getFriendlyErrorMessage } from "@/utils/localizedError";
import type { Dialect, LessonSession } from "@/types/domain";

type Props = NativeStackScreenProps<RootStackParamList, "PhonemePractice">;

export default function PhonemePracticeScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { authToken, authEmail, userDialect } = useAuth();
  const dialect: Dialect = (route.params?.dialect as Dialect) || userDialect || "uk";
  const queryClient = useQueryClient();

  const rawPhoneme = route.params?.phoneme || "";
  const cleanPhoneme = useMemo(
    () => String(rawPhoneme).replace(/^\/+|\/+$/g, "").trim(),
    [rawPhoneme]
  );
  const soundMeta = useMemo(() => getIpaSoundMeta(cleanPhoneme), [cleanPhoneme]);

  const { data: usageData } = useBillingUsageQuery(Boolean(authToken));
  const storeUsage = useBillingStore((s) => s.usage);
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
  const [showGuideModal, setShowGuideModal] = useState(true);

  // Each sound starts with its guide; closing it lasts for this practice visit.
  useEffect(() => {
    setShowGuideModal(true);
  }, [cleanPhoneme, dialect]);

  const displayTitle = useMemo(() => {
    if (!cleanPhoneme) return t("lesson.practiceSound", "Luyện phát âm");
    return t("lesson.titlePhoneme", { phoneme: `/${cleanPhoneme}/` }) || `Luyện âm /${cleanPhoneme}/`;
  }, [cleanPhoneme, t]);

  const fetchLesson = useCallback(async () => {
    if (!cleanPhoneme) {
      setError(t("lesson.empty", "Chưa có bài học khả dụng"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await lessonApi.getPhonemeLesson(cleanPhoneme, dialect, true);
      const session = buildLessonSession(
        "phoneme",
        data,
        { phoneme: cleanPhoneme, dialect },
        t,
        i18n.language
      );
      if (!session || !session.sentences?.length) {
        setError(t("lesson.empty", "Chưa có bài học khả dụng cho âm này"));
        return;
      }
      setLessonSession(session);
      setSessionKey((k) => k + 1);
    } catch (err: any) {
      setError(
        getFriendlyErrorMessage(
          err,
          t("phonemesHome.startError", "Không thể bắt đầu bài học"),
          i18n.language.startsWith("vi") ? "vi" : "en"
        )
      );
    } finally {
      setLoading(false);
    }
  }, [cleanPhoneme, dialect, i18n.language, t]);

  useEffect(() => {
    void fetchLesson();
  }, [fetchLesson]);

  const loadNextLesson = useCallback(async () => {
    if (!cleanPhoneme) return;
    try {
      await lessonApi.markPracticed([cleanPhoneme]).catch(() => {});
      const data = await lessonApi.getPhonemeLesson(cleanPhoneme, dialect, true);
      const nextSession = buildLessonSession(
        "phoneme",
        data,
        { phoneme: cleanPhoneme, dialect },
        t,
        i18n.language
      );
      if (nextSession) {
        setLessonSession(nextSession);
        setSessionKey((k) => k + 1);
      }
    } catch (err: any) {
      setError(String(err?.message || err));
    }
  }, [cleanPhoneme, dialect, i18n.language, t]);

  const handleLessonAllCompleted = useCallback(async () => {
    if (!cleanPhoneme) return;
    try {
      await lessonApi.markPracticed([cleanPhoneme]).catch(() => {});
    } catch {
      /* ignore offline */
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: lessonKeys.homeSummary(dialect) }),
      queryClient.invalidateQueries({ queryKey: progressKeys.sounds(dialect) }),
      queryClient.invalidateQueries({ queryKey: progressKeys.all }),
    ]);
  }, [cleanPhoneme, dialect, queryClient]);

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

  const handlePracticeAnotherPhoneme = useCallback(
    (sound: string) => {
      const target = String(sound || "").replace(/^\/+|\/+$/g, "").trim();
      if (target) {
        navigation.push("PhonemePractice", { phoneme: target, dialect });
      }
    },
    [dialect, navigation]
  );

  // 1. Loading State with PracticeScreenSkeleton
  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#F7F6F2" }}>
        {/* Unified Top Navigation Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#e2e8f0",
            backgroundColor: "#F7F6F2",
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("common.back", "Quay lại")}
            onPress={() => navigation.goBack()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "rgba(15,23,42,0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={22} color="#0c2340" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <AppText
              style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}
              numberOfLines={1}
            >
              {displayTitle}
            </AppText>
            {soundMeta.example ? (
              <AppText
                style={{ fontSize: 13, fontWeight: "500", color: "#64748b", marginTop: 1 }}
                numberOfLines={1}
              >
                {t("phonemesHome.exampleWord", "Từ mẫu")}: {soundMeta.example.split(" /", 1)[0]}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* Pulse Shimmer Skeleton matching IPAChecking */}
        <PracticeScreenSkeleton />
      </SafeAreaView>
    );
  }

  // 2. Error State with Retry & Back
  if (error || !lessonSession || !lessonSession.sentences?.length) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#F7F6F2" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#e2e8f0",
            backgroundColor: "#F7F6F2",
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("common.back", "Quay lại")}
            onPress={() => navigation.goBack()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "rgba(15,23,42,0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={22} color="#0c2340" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <AppText
              style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}
              numberOfLines={1}
            >
              {displayTitle}
            </AppText>
          </View>
        </View>

        <View className="flex-1 items-center justify-center p-6 gap-4">
          <View className="w-16 h-16 rounded-full bg-rose-100 items-center justify-center">
            <AlertCircle size={32} color="#e11d48" />
          </View>
          <AppText className="text-base font-extrabold text-slate-900 text-center">
            {t("common.loadFailed", "Không thể tải bài học")}
          </AppText>
          <AppText className="text-[14px] text-slate-600 text-center leading-relaxed max-w-[280px]">
            {error || t("lesson.empty", "Chưa có bài học khả dụng cho âm này")}
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
              style={{ backgroundColor: "#0284c7" }}
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

  const hasGuide = Boolean(
    lessonSession?.rawLessonData?.vi_instructions ||
    lessonSession?.rawLessonData?.en_instructions ||
    lessonSession?.instructionsHtml
  );

  return (
    <>
      <IPAChecking
        asModal={false}
        open={true}
        onClose={() => navigation.goBack()}
        sentences={lessonSession.sentences || []}
        dialect={lessonSession.dialect || dialect}
        sessionKey={sessionKey}
        lessonTitle={displayTitle}
        instructionsHtml=""
        userTier={userTier}
        userKey={userKey}
        usageStatus={usageStatus}
        loadNextLesson={loadNextLesson}
        onLessonAllCompleted={handleLessonAllCompleted}
        onRequestSampleAudio={requestSampleAudio}
        onRequestSentenceWords={requestSentenceWords}
        onPracticePhoneme={handlePracticeAnotherPhoneme}
        onShowGuide={hasGuide ? () => setShowGuideModal(true) : undefined}
      />

      {hasGuide ? (
        <PhonemeIntroGuide
          visible={showGuideModal}
          phoneme={cleanPhoneme}
          dialect={dialect}
          lessonData={lessonSession.rawLessonData}
          soundMeta={soundMeta}
          onClose={() => setShowGuideModal(false)}
        />
      ) : null}
    </>
  );
}
