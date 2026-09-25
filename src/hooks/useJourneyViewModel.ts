import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/services/Auth";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { buildLessonSession } from "@/utils/lessons";
import { buildItems } from "@/components/practice/HomeJourney";
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

export function useJourneyViewModel(navigation?: any) {
  const { t, i18n } = useTranslation();
  const { authToken, authEmail, userDialect } = useAuth();
  const dialect: Dialect = userDialect || "uk";
  const queryClient = useQueryClient();

  // TanStack Query: Home summary & Billing usage
  const {
    data: homeSummaryData,
    isLoading: homeLoading,
    error: homeError,
  } = useHomeSummaryQuery(dialect, Boolean(authToken));

  const {
    data: usageData,
    isLoading: usageLoading,
  } = useBillingUsageQuery(Boolean(authToken));

  const storeHomeSummary = useBillingStore((s) => s.homeSummary);
  const storeUsage = useBillingStore((s) => s.usage);

  const homeSummary = homeSummaryData || storeHomeSummary;
  const usageStatus = usageData || storeUsage;

  const loading = homeLoading || usageLoading;
  const error = homeError ? String((homeError as any)?.message || homeError) : "";

  const { refreshing, onRefresh } = usePullToRefresh(
    useCallback(async () => {
      if (!authToken) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: lessonKeys.all }),
        queryClient.invalidateQueries({ queryKey: billingKeys.all }),
      ]);
    }, [authToken, queryClient])
  );

  const [journeyLessonProgress, setJourneyLessonProgress] = useState<any>(null);
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

  const startPersonalizedLesson = useCallback(async () => {
    if (!authToken) {
      navigation?.navigate("Login", { next: "Journey" });
      return;
    }
    setLessonLoading(true);
    setLessonError("");
    try {
      const data = await lessonApi.getPersonalizedLesson(dialect, false);
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

  const loadNextLesson = useCallback(async () => {
    await lessonApi.markPracticed(lessonSession?.phonemes || []).catch(() => {});
    const data = await lessonApi.getPersonalizedLesson(lessonSession?.dialect || dialect, false);
    const session = buildLessonSession("personalized", data, { dialect }, t, i18n.language);
    if (session) {
      setLessonSession(session);
      setLessonSessionKey((k) => k + 1);
    }
  }, [dialect, lessonSession?.dialect, lessonSession?.phonemes, t, i18n.language]);

  const handleLessonAllCompleted = useCallback(async () => {
    const data = await lessonApi.completeJourney();
    if (data?.journey) setJourneyLessonProgress(data.journey);
    await queryClient.invalidateQueries({ queryKey: lessonKeys.homeSummary(dialect) });
  }, [dialect, queryClient]);

  const journey = homeSummary?.journey || null;
  const streakDays = Number(homeSummary?.streak_days ?? 0);
  const displayJourney = journeyLessonProgress || journey;
  const items = displayJourney ? buildItems(displayJourney.milestones) : [];

  return {
    t,
    dialect,
    loading,
    refreshing,
    onRefresh,
    error,
    lessonError,
    displayJourney,
    items,
    streakDays,
    lessonSession,
    lessonSessionKey,
    lessonLoading,
    startPersonalizedLesson,
    closeLessonSession,
    loadNextLesson,
    handleLessonAllCompleted,
    userTier,
    userKey,
    usageStatus,
  };
}

export default useJourneyViewModel;
