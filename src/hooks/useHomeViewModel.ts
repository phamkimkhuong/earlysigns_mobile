import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/services/Auth";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { buildLessonSession } from "@/utils/lessons";
import { useBillingStore } from "@/store/useBillingStore";
import { lessonApi } from "@/api";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  useHomeSummaryQuery,
  lessonKeys,
} from "@/hooks/queries/useLessonQueries";
import {
  useBillingUsageQuery,
  billingKeys,
} from "@/hooks/queries/useBillingQueries";
import type { Dialect, LessonSession } from "@/types/domain";

export function useHomeViewModel(navigation: any) {
  const { t, i18n } = useTranslation();
  const { authToken, authEmail, userDialect } = useAuth();
  const dialect: Dialect = userDialect || "uk";
  const queryClient = useQueryClient();

  // TanStack Query: Home summary & Billing usage
  const { data: homeSummaryData } = useHomeSummaryQuery(dialect, Boolean(authToken));
  const { data: usageData } = useBillingUsageQuery(Boolean(authToken));

  const storeHomeSummary = useBillingStore((s) => s.homeSummary);
  const storeUsage = useBillingStore((s) => s.usage);

  const homeSummary = homeSummaryData || storeHomeSummary;
  const usageStatus = usageData || storeUsage;

  const { refreshing, onRefresh } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: lessonKeys.all }),
        queryClient.invalidateQueries({ queryKey: billingKeys.all }),
      ]);
    }, [queryClient])
  );

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
    await queryClient.invalidateQueries({ queryKey: lessonKeys.homeSummary(dialect) });
  }, [dialect, queryClient]);

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
