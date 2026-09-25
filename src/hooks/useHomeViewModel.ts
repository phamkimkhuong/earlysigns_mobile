import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/services/Auth";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { buildLessonSession } from "@/utils/lessons";
import { useBillingStore } from "@/store/useBillingStore";
import { lessonApi, billingApi } from "@/api";
import type { Dialect, LessonSession } from "@/types/domain";

export function useHomeViewModel(navigation: any) {
  const { t, i18n } = useTranslation();
  const { authToken, authEmail, userDialect } = useAuth();
  const dialect: Dialect = userDialect || "uk";

  const [refreshing, setRefreshing] = useState(false);
  const homeSummary = useBillingStore((s) => s.homeSummary);
  const usageStatus = useBillingStore((s) => s.usage);

  const [lessonSession, setLessonSession] = useState<LessonSession | null>(null);
  const [lessonSessionKey, setLessonSessionKey] = useState(0);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState("");
  const lessonKindRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (authToken) {
      lessonApi.getHomeSummary(dialect).catch(() => {});
      billingApi.getUsage().catch(() => {});
    }
  }, [authToken, dialect]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        lessonApi.getHomeSummary(dialect),
        billingApi.getUsage(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [dialect]);

  const navigateWithGate = useCallback(
    (targetRoute: string, targetParams?: Record<string, any>) => {
      if (!authToken) {
        navigation.navigate("Login", {
          next: targetRoute,
          nextParams: targetParams,
        });
        return;
      }
      navigation.navigate(targetRoute, targetParams);
    },
    [authToken, navigation]
  );

  const startPersonalizedLesson = useCallback(async () => {
    if (!authToken) {
      navigation.navigate("Login", { next: "Home" });
      return;
    }
    setLessonLoading(true);
    setLessonError("");
    try {
      const data = await lessonApi.getPersonalizedLesson(dialect, true);
      const session = buildLessonSession("personalized", data, { dialect }, t, i18n.language);
      if (!session) {
        setLessonError(t("lesson.empty"));
        return;
      }
      lessonKindRef.current = session.kind;
      setLessonSession(session);
      setLessonSessionKey((k) => k + 1);
    } catch (e: any) {
      setLessonError(String(e?.message || e));
    } finally {
      setLessonLoading(false);
    }
  }, [authToken, dialect, i18n.language, navigation, t]);

  const closeLessonSession = useCallback(async () => {
    setLessonSession(null);
    await lessonApi.getHomeSummary(dialect).catch(() => {});
  }, [dialect]);

  const streakDays = Number(homeSummary?.streak_days || 0);
  const clarityRatio = homeSummary?.total_accuracy != null ? Number(homeSummary.total_accuracy) : null;
  const clarityPct = clarityRatio != null ? Math.round(clarityRatio * 100) : null;
  const journey = homeSummary?.journey || null;
  const weakestPhonemes =
    Array.isArray(homeSummary?.weakest_phonemes) && homeSummary.weakest_phonemes.length > 0
      ? homeSummary.weakest_phonemes
      : [{ sound: "ə" }, { sound: "n" }, { sound: "ɪ" }, { sound: "t" }, { sound: "r" }];

  return {
    t,
    dialect,
    authToken,
    authEmail,
    refreshing,
    onRefresh,
    homeSummary,
    usageStatus,
    userTier,
    userKey,
    streakDays,
    clarityPct,
    journey,
    weakestPhonemes,
    lessonSession,
    lessonSessionKey,
    lessonLoading,
    lessonError,
    startPersonalizedLesson,
    closeLessonSession,
    navigateWithGate,
  };
}

export default useHomeViewModel;
