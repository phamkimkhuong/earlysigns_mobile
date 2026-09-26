import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/services/Auth";
import { getMonthlyQuotaSnapshot, resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { useBillingStore } from "@/store/useBillingStore";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  useHomeSummaryQuery,
  lessonKeys,
} from "@/hooks/queries/useLessonQueries";
import {
  useBillingUsageQuery,
  billingKeys,
} from "@/hooks/queries/useBillingQueries";
import { useProgressSoundsQuery, progressKeys } from "@/hooks/queries/useProgressQueries";
import { useViewedVideosQuery, videoKeys } from "@/hooks/queries/useVideoQueries";
import { getHomeClarityPercent } from "@/utils/homeProgress";
import type { RootStackParamList } from "@/types/navigation";

type FeatureRoute = "Videos" | "Text" | "Phonemes" | "Journey";

export function useHomeViewModel(navigation: any) {
  const { t } = useTranslation();
  const { authToken, authEmail, userDialect, scoreUnlocked } = useAuth();
  const dialect = userDialect || "uk";
  const queryClient = useQueryClient();

  // TanStack Query: Home summary, Billing usage, Sounds & Viewed videos
  const summaryQuery = useHomeSummaryQuery(dialect, Boolean(authToken));
  const { data: usageData } = useBillingUsageQuery(Boolean(authToken));
  const { data: sounds = [] } = useProgressSoundsQuery(dialect, Boolean(authToken));
  const { data: viewedVideos = [] } = useViewedVideosQuery(1, Boolean(authToken));

  const storeHomeSummary = useBillingStore((s) => s.homeSummary);
  const storeUsage = useBillingStore((s) => s.usage);

  // Disabled queries may still contain cached data; never show it to guests.
  const homeSummary = authToken ? summaryQuery.data || storeHomeSummary : null;
  const usageStatus = authToken ? usageData || storeUsage : null;

  const { refreshing, onRefresh } = usePullToRefresh(
    useCallback(async () => {
      if (!authToken) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: lessonKeys.all }),
        queryClient.invalidateQueries({ queryKey: billingKeys.all }),
        queryClient.invalidateQueries({ queryKey: progressKeys.all }),
        queryClient.invalidateQueries({ queryKey: videoKeys.all }),
      ]);
    }, [authToken, queryClient])
  );

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
    <Route extends FeatureRoute>(targetRoute: Route, targetParams?: RootStackParamList[Route]) => {
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

  const quota = authToken && userTier === "free"
    ? getMonthlyQuotaSnapshot({ userKey, userTier, usageStatus })
    : null;
  const clarityPct = useMemo(
    () => authToken && scoreUnlocked
      ? getHomeClarityPercent(sounds, homeSummary?.total_accuracy)
      : null,
    [authToken, scoreUnlocked, sounds, homeSummary?.total_accuracy],
  );
  const rawStreak = Number(homeSummary?.streak_days);
  const streakDays = homeSummary?.streak_days != null && Number.isFinite(rawStreak) && rawStreak >= 0
    ? Math.floor(rawStreak)
    : null;
  const journey = homeSummary?.journey || null;

  // Real video progress from viewed videos API
  const recentVideo = authToken && viewedVideos && viewedVideos.length > 0 ? viewedVideos[0] : null;
  const videoProgress = useMemo(() => {
    if (!recentVideo) return null;
    const played = Number(recentVideo.played_count) || 0;
    const total = Number(recentVideo.segment_count) || 0;
    const pct = typeof recentVideo.played_pct === "number"
      ? Math.min(100, Math.max(0, Math.round(recentVideo.played_pct)))
      : total > 0
      ? Math.min(100, Math.max(0, Math.round((played / total) * 100)))
      : 0;
    return {
      youtubeId: recentVideo.youtube_id,
      title: recentVideo.title,
      topic: recentVideo.topic || "EVERYDAY ENGLISH",
      played,
      total,
      pct,
    };
  }, [recentVideo]);

  // Robust phonemes extraction
  const rawWeakest = homeSummary?.weakest_phonemes || homeSummary?.weak_phonemes;
  const weakestPhonemes: { sound: string }[] = Array.isArray(rawWeakest)
    ? rawWeakest
        .map((item: any) => {
          if (typeof item === "string") {
            const clean = item.replace(/^\/+|\/+$/g, "").trim();
            return clean ? { sound: clean } : null;
          }
          if (item && typeof item === "object") {
            const raw = String(item.sound || item.phoneme || item.ipa || "");
            const clean = raw.replace(/^\/+|\/+$/g, "").trim();
            return clean ? { sound: clean } : null;
          }
          return null;
        })
        .filter((item): item is { sound: string } => Boolean(item && item.sound))
    : [];

  // Journey progress percentage from journey milestones or clarity
  const journeyProgressPct = useMemo(() => {
    if (clarityPct != null) return clarityPct;
    if (journey?.milestones && Array.isArray(journey.milestones)) {
      const completed = journey.milestones.filter((ms: any) => ms.status === "completed").length;
      const total = journey.milestones.length;
      if (total > 0) return Math.min(100, Math.round((completed / total) * 100));
    }
    return null;
  }, [clarityPct, journey]);

  return {
    t,
    dialect,
    authToken,
    authEmail,
    userName: authEmail?.split("@")[0] || "",
    refreshing,
    onRefresh,
    homeSummary,
    usageStatus,
    userTier,
    userKey,
    streakDays,
    clarityPct,
    journey,
    journeyProgressPct,
    weakestPhonemes,
    recentVideo,
    videoProgress,
    quota: quota && !quota.isUnlimited ? quota : null,
    summaryLoading: Boolean(authToken) && summaryQuery.isLoading && !homeSummary,
    summaryError: Boolean(authToken) && summaryQuery.isError && !homeSummary,
    navigateWithGate,
  };
}

export default useHomeViewModel;
