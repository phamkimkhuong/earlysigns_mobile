import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/services/Auth";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { buildLessonSession } from "@/utils/lessons";
import { buildItems } from "@/components/practice/HomeJourney";
import { useBillingStore } from "@/store/useBillingStore";
import { lessonApi, billingApi } from "@/api";
import type { Dialect, LessonSession } from "@/types/domain";

export function useJourneyViewModel(navigation?: any) {
  const { t, i18n } = useTranslation();
  const { authToken, authEmail, userDialect } = useAuth();
  const dialect: Dialect = userDialect || "uk";

  const homeSummary = useBillingStore((s) => s.homeSummary);
  const usageStatus = useBillingStore((s) => s.usage);

  const [journeyLessonProgress, setJourneyLessonProgress] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
      setLoading(true);
      Promise.all([
        lessonApi.getHomeSummary(dialect),
        billingApi.getUsage(),
      ])
        .catch((e: any) => setError(String(e.message || e)))
        .finally(() => setLoading(false));
    }
  }, [authToken, dialect]);

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
    await lessonApi.getHomeSummary(dialect).catch(() => {});
  }, [dialect]);

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
  }, []);

  const journey = homeSummary?.journey || null;
  const streakDays = Number(homeSummary?.streak_days ?? 0);
  const displayJourney = journeyLessonProgress || journey;
  const items = displayJourney ? buildItems(displayJourney.milestones) : [];

  return {
    t,
    dialect,
    loading,
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
