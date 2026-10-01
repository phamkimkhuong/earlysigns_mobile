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
import { progressKeys, useProgressSoundsQuery } from "@/hooks/queries/useProgressQueries";
import type { Dialect, LessonSession } from "@/types/domain";
import { getFriendlyErrorMessage } from "@/utils/localizedError";

const EMPTY_SOUND_RECORDS: any[] = [];

const safeUseProgressSoundsQuery =
  typeof useProgressSoundsQuery === "function"
    ? useProgressSoundsQuery
    : () => ({ data: EMPTY_SOUND_RECORDS } as any);

export function usePhonemesViewModel(navigation: any) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const {
    authToken,
    authEmail,
    authLoading,
    userDialect,
    screeningCompleted,
    refreshScreeningStatus,
  } = useAuth();
  const dialect: Dialect = userDialect || "uk";

  // TanStack Query: Home summary, Billing usage & 44 sounds progress
  const summaryQuery = useHomeSummaryQuery(dialect, Boolean(authToken && !authLoading));
  useBillingUsageQuery(Boolean(authToken && !authLoading));
  const soundsProgressQuery = safeUseProgressSoundsQuery(dialect, Boolean(authToken && !authLoading));
  const soundRecords = soundsProgressQuery?.data ?? EMPTY_SOUND_RECORDS;

  const homeSummary = authToken ? summaryQuery.data : null;
  const usageStatus = useBillingStore((s) => s.usage);

  const [lessonSession, setLessonSession] = useState<LessonSession | null>(null);
  const [lessonSessionKey, setLessonSessionKey] = useState(0);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState("");
  const [lessonMode, setLessonMode] = useState<"lesson" | "screening">("lesson");
  const [screeningResult, setScreeningResult] = useState<{ totalAccuracy?: number } | null>(null);
  const [screeningLoading] = useState(false);
  const [screeningError, setScreeningError] = useState("");
  const [screeningConfirmed, setScreeningConfirmed] = useState(false);
  const [phonemeLoading, setPhonemeLoading] = useState<string | null>(null);
  const startingRef = useRef(false);
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
    if (startingRef.current) return;
    if (!authToken) {
      navigation.navigate("Login", { next: "Phonemes" });
      return;
    }
    startingRef.current = true;
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
      setLessonError(getFriendlyErrorMessage(e, t("phonemesHome.startError"), i18n.language.startsWith("vi") ? "vi" : "en"));
    } finally {
      startingRef.current = false;
      setLessonLoading(false);
    }
  }, [authToken, dialect, i18n.language, navigation, t]);

  const startScreeningTest = useCallback(async () => {
    if (startingRef.current) return;
    if (!authToken) {
      navigation.navigate("Login", { next: "Screening" });
      return;
    }
    (navigation as any).navigate("Screening", { dialect });
  }, [authToken, dialect, navigation]);

  const startPhoneme = useCallback(async (phoneme: string) => {
    if (startingRef.current) return;
    if (!authToken) {
      navigation.navigate("Login", { next: "Phonemes" });
      return;
    }
    const cleanPhoneme = String(phoneme || "").replace(/^\/+|\/+$/g, "").trim();
    if (!cleanPhoneme) return;
    startingRef.current = true;
    setPhonemeLoading(phoneme);
    setLessonError("");
    try {
      const data = await lessonApi.getPhonemeLesson(cleanPhoneme, dialect, true);
      const session = buildLessonSession("phoneme", data, { phoneme: cleanPhoneme, dialect }, t, i18n.language);
      if (!session) {
        setLessonError(t("lesson.empty"));
        return;
      }
      lessonKindRef.current = session.kind;
      setLessonSession(session);
      setLessonSessionKey((k) => k + 1);
      setLessonMode("lesson");
    } catch (e) {
      setLessonError(getFriendlyErrorMessage(e, t("phonemesHome.startError"), i18n.language.startsWith("vi") ? "vi" : "en"));
    } finally {
      startingRef.current = false;
      setPhonemeLoading(null);
    }
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
        if (res?.journey) setJourneyLessonProgress(res.journey);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: lessonKeys.homeSummary(dialect) }),
          queryClient.invalidateQueries({ queryKey: progressKeys.sounds(dialect) }),
        ]);
      } catch {
        /* ignore */
      }
    }
  }, [dialect, queryClient]);

  const handleScreeningFinished = useCallback(async () => {
    setScreeningError("");
    try {
      const data = await lessonApi.completeScreening();
      const status = await refreshScreeningStatus?.();
      const confirmed = data?.screening_completed === true || data?.screening_status?.screening_completed === true || status?.screening_completed === true;
      if (!confirmed) {
        setScreeningError(t("screeningPractice.saveError"));
        return false;
      }
      setScreeningConfirmed(true);
      const summary = await summaryQuery.refetch();
      const rawScore = data?.total_accuracy ?? summary.data?.total_accuracy;
      const validScore = rawScore != null && rawScore !== "" && Number.isFinite(Number(rawScore)) && Number(rawScore) >= 0 && Number(rawScore) <= 1;
      setLessonSession(null);
      setScreeningResult({ totalAccuracy: validScore ? Number(rawScore) : undefined });
      return true;
    } catch (e) {
      setScreeningError(getFriendlyErrorMessage(e, t("phonemesHome.screeningSaveError"), i18n.language.startsWith("vi") ? "vi" : "en"));
      return false;
    }
  }, [refreshScreeningStatus, summaryQuery, t, i18n.language]);

  const loadNextLesson = useCallback(async () => {
    if (!lessonSession) return;
    if (lessonSession.kind === "personalized") {
      await lessonApi.markPracticed(lessonSession.phonemes || []).catch(() => { });
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

  const weakestPhonemes = useMemo(() => {
    const items: any[] = Array.isArray(homeSummary?.weakest_phonemes) ? homeSummary.weakest_phonemes : [];
    const seen = new Set<string>();
    return items.filter(item => item?.accuracy != null && item.accuracy !== "" && Number.isFinite(Number(item.accuracy)) && Number(item.accuracy) >= 0 && Number(item.accuracy) <= 1)
      .map(item => ({ sound: String(item.sound || "").trim().replace(/^\/+|\/+$/g, ""), accuracy: Number(item.accuracy) }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .filter(item => {
        if (!item.sound || seen.has(item.sound)) return false;
        seen.add(item.sound);
        return true;
      });
  }, [homeSummary]);
  const dailyMissionPhonemes = useMemo(() => {
    if (Array.isArray(homeSummary?.daily_mission_phonemes)) {
      return homeSummary.daily_mission_phonemes
        .map((s: any) => String(s || "").trim().replace(/^\/+|\/+$/g, ""))
        .filter(Boolean);
    }
    return [];
  }, [homeSummary]);

  const soundsAccuracyMap = useMemo(() => {
    const map = new Map<string, { accuracyPct: number; checksCount: number }>();
    (soundRecords || []).forEach((r: any) => {
      const soundKey = r?.sound || r?.phoneme || r?.ipa;
      if (soundKey) {
        const clean = String(soundKey).replace(/^\/+|\/+$/g, "").trim().toLowerCase();
        const rawAcc = r.accuracy ?? r.accuracy_score ?? r.score;
        if (rawAcc != null && Number.isFinite(Number(rawAcc))) {
          const num = Number(rawAcc);
          const accuracyPct = num > 1 ? Math.round(num) : Math.round(num * 100);
          map.set(clean, {
            accuracyPct,
            checksCount: Number(r.checks_count ?? r.count ?? 1),
          });
        }
      }
    });
    // Merge from weakest_phonemes in homeSummary
    const weakList = Array.isArray(homeSummary?.weakest_phonemes) ? homeSummary.weakest_phonemes : [];
    weakList.forEach((item: any) => {
      if (item?.sound) {
        const clean = String(item.sound).replace(/^\/+|\/+$/g, "").trim().toLowerCase();
        if (!map.has(clean) && item.accuracy != null && Number.isFinite(Number(item.accuracy))) {
          const num = Number(item.accuracy);
          const accuracyPct = num > 1 ? Math.round(num) : Math.round(num * 100);
          map.set(clean, {
            accuracyPct,
            checksCount: 1,
          });
        }
      }
    });
    return map;
  }, [soundRecords, homeSummary]);

  const journey = journeyLessonProgress || homeSummary?.journey || null;

  return {
    authToken,
    t,
    dialect,
    screeningCompleted: Boolean(screeningCompleted || screeningConfirmed),
    summaryLoading: summaryQuery.isLoading,
    summaryError: summaryQuery.isError,
    retrySummary: () => { void summaryQuery.refetch(); },
    phonemeLoading,
    screeningError,
    screeningLoading,
    startScreeningTest,
    homeSummary,
    dailyMissionPhonemes,
    soundsAccuracyMap,
    journey,
    lessonLoading,
    lessonError,
    startPersonalizedLesson,
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
    handleScreeningFinished,
    loadNextLesson:
      lessonSession?.kind === "personalized" || lessonSession?.kind === "phoneme"
        ? loadNextLesson
        : undefined,
    requestSentenceWords,
  };
}

export default usePhonemesViewModel;
