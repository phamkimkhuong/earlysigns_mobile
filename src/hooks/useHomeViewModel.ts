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
import { getHomeClarityPercent } from "@/utils/homeProgress";
import type { RootStackParamList } from "@/types/navigation";

type FeatureRoute = "Videos" | "Text" | "Phonemes" | "Journey";

export function useHomeViewModel(navigation: any) {
  const { t } = useTranslation();
  const { authToken, authEmail, userDialect, scoreUnlocked } = useAuth();
  const dialect = userDialect || "uk";
  const queryClient = useQueryClient();

  // TanStack Query: Home summary & Billing usage
  const summaryQuery = useHomeSummaryQuery(dialect, Boolean(authToken));
  const { data: usageData } = useBillingUsageQuery(Boolean(authToken));
  const { data: sounds = [] } = useProgressSoundsQuery(dialect, Boolean(authToken));

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

  const quota = authToken && usageStatus && userTier === "free"
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
  const weakestPhonemes: { sound: string }[] = Array.isArray(homeSummary?.weakest_phonemes)
    ? homeSummary.weakest_phonemes.filter((item: any) => typeof item?.sound === "string" && item.sound.trim())
    : [];

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
    quota: quota && !quota.isUnlimited ? quota : null,
    summaryLoading: Boolean(authToken) && summaryQuery.isLoading && !homeSummary,
    summaryError: Boolean(authToken) && summaryQuery.isError && !homeSummary,
    navigateWithGate,
  };
}

export default useHomeViewModel;
