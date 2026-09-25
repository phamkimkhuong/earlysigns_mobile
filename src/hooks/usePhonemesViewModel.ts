import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/services/Auth";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { buildLessonSession } from "@/utils/lessons";
import { useBillingStore } from "@/store/useBillingStore";
import { lessonApi, textPracticeApi } from "@/api";
import {
  useHomeSummaryQuery,
  lessonKeys,
} from "@/hooks/queries/useLessonQueries";
import { useBillingUsageQuery } from "@/hooks/queries/useBillingQueries";
import { progressKeys } from "@/hooks/queries/useProgressQueries";
import type { Dialect, LessonSession } from "@/types/domain";

const DEFAULT_CORE_PHONEMES = [
  { sound: "ə" },
  { sound: "n" },
  { sound: "ɪ" },
  { sound: "t" },
  { sound: "r" },
];

export function usePhonemesViewModel(navigation: any) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const {
    authToken,
    authEmail,
    authLoading,
    userDialect,
    showScreeningPrompt,
    refreshScreeningStatus,
  } = useAuth();
  const dialect: Dialect = userDialect || "uk";

  // TanStack Query: Home summary & Billing usage
  useHomeSummaryQuery(dialect, Boolean(authToken && !authLoading));
  useBillingUsageQuery(Boolean(authToken && !authLoading));

  const homeSummary = useBillingStore((s) => s.homeSummary);
  const usageStatus = useBillingStore((s) => s.usage);

  const [lessonSession, setLessonSession] = useState<LessonSession | null>(null);
  const [lessonSessionKey, setLessonSessionKey] = useState(0);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState("");
  const [lessonMode, setLessonMode] = useState<"lesson" | "screening">("lesson");
  const [screeningResult, setScreeningResult] = useState<{ totalAccuracy?: number } | null>(null);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [journeyLessonProgress, setJourneyLessonProgress] = useState<any>(null);
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
      navigation.navigate("Login", { next: "Phonemes" });
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
      setLessonMode("lesson");
    } catch (e: any) {
      setLessonError(String(e?.message || e));
    } finally {
      setLessonLoading(false);
    }
  }, [authToken, dialect, i18n.language, navigation, t]);

  const startScreeningTest = useCallback(async () => {
    if (!authToken) {
      navigation.navigate("Login", { next: "Phonemes" });
      return;
    }
    setScreeningLoading(true);
    try {
      const data = await lessonApi.getScreeningSentences(dialect);
      const sentences = Array.isArray(data?.sentences) ? data.sentences : [];
      if (!sentences.length) return;
      lessonKindRef.current = "screening";
      setLessonSession({
        kind: "screening",
        phoneme: null,
        phonemes: [],
        dialect: data?.dialect || dialect,
        sentences,
        title: t("screening.banner"),
        instructionsHtml: "",
      });
      setLessonSessionKey((k) => k + 1);
      setLessonMode("screening");
    } finally {
      setScreeningLoading(false);
    }
  }, [authToken, dialect, navigation, t]);

  const startPhoneme = useCallback(async (phoneme: string) => {
    if (!authToken) {
      navigation.navigate("Login", { next: "Phonemes" });
      return;
    }
    const data = await lessonApi.getPhonemeLesson(phoneme, dialect, true);
    const session = buildLessonSession("phoneme", data, { phoneme, dialect }, t, i18n.language);
    if (!session) return;
    lessonKindRef.current = session.kind;
    setLessonSession({ ...session, instructionsHtml: "" });
    setLessonSessionKey((k) => k + 1);
    setLessonMode("lesson");
  }, [authToken, dialect, i18n.language, navigation, t]);

  const closeLessonSession = useCallback(async () => {
    setLessonSession(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: lessonKeys.homeSummary(dialect) }),
      queryClient.invalidateQueries({ queryKey: progressKeys.sounds(dialect) }),
    ]);
    if (lessonMode === "screening") refreshScreeningStatus?.();
  }, [dialect, lessonMode, queryClient, refreshScreeningStatus]);

  const handleLessonAllCompleted = useCallback(async () => {
    if (lessonKindRef.current === "journey" || lessonKindRef.current === "personalized") {
      try {
        const res = await lessonApi.completeJourney();
        if (res?.progress) setJourneyLessonProgress(res.progress);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: lessonKeys.homeSummary(dialect) }),
          queryClient.invalidateQueries({ queryKey: progressKeys.sounds(dialect) }),
        ]);
      } catch {
        /* ignore */
      }
    }
  }, [dialect, queryClient]);

  const handleScreeningHalfReached = useCallback(async () => {
    await lessonApi.completeScreening().catch(() => {});
    refreshScreeningStatus?.();
  }, [refreshScreeningStatus]);

  const handleScreeningFinished = useCallback(async () => {
    setLessonSession(null);
    let finalScore = 0;
    try {
      const data = await lessonApi.completeScreening();
      if (data?.total_accuracy != null) finalScore = Number(data.total_accuracy);
    } catch {
      /* ignore */
    }
    const summary = await lessonApi.getHomeSummary(dialect).catch(() => null);
    if (summary?.total_accuracy != null) finalScore = Number(summary.total_accuracy);
    refreshScreeningStatus?.();
    setScreeningResult({ totalAccuracy: finalScore });
  }, [dialect, refreshScreeningStatus]);

  const loadNextLesson = useCallback(async () => {
    if (!lessonSession) return;
    if (lessonSession.kind === "personalized") {
      await lessonApi.markPracticed(lessonSession.phonemes || []).catch(() => {});
    }
    const data =
      lessonSession.kind === "phoneme"
        ? await lessonApi.getPhonemeLesson(lessonSession.phoneme || "", lessonSession.dialect, true)
        : await lessonApi.getPersonalizedLesson(lessonSession.dialect, true);
    const session = buildLessonSession(
      lessonSession.kind,
      data,
      { phoneme: lessonSession.phoneme, dialect: lessonSession.dialect },
      t,
      i18n.language
    );
    if (session) {
      setLessonSession(session);
      setLessonSessionKey((k) => k + 1);
    }
  }, [lessonSession, t, i18n.language]);

  const requestSentenceWords = useCallback(
    async (sentence: any) => {
      return textPracticeApi.getIpaWords(sentence.text, lessonSession?.dialect || dialect);
    },
    [dialect, lessonSession?.dialect]
  );

  const weakestPhonemes =
    Array.isArray(homeSummary?.weakest_phonemes) && homeSummary.weakest_phonemes.length > 0
      ? homeSummary.weakest_phonemes
      : DEFAULT_CORE_PHONEMES;
  const journey = journeyLessonProgress || homeSummary?.journey || null;
  const clarityRatio = Number(homeSummary?.total_accuracy);

  return {
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
    loadNextLesson:
      lessonSession?.kind === "personalized" || lessonSession?.kind === "phoneme"
        ? loadNextLesson
        : undefined,
    requestSentenceWords,
  };
}

export default usePhonemesViewModel;
