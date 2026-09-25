import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/api";
import type { BillingUsage } from "@/types/domain";

export const billingKeys = {
  all: ["billing"] as const,
  usage: () => [...billingKeys.all, "usage"] as const,
  packages: () => [...billingKeys.all, "packages"] as const,
};

/**
 * Fetch user billing usage, subscription status, and daily quota
 */
export function useBillingUsageQuery(enabled: boolean = true) {
  return useQuery<BillingUsage | null>({
    queryKey: billingKeys.usage(),
    queryFn: () => billingApi.getUsage(),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
    gcTime: 1000 * 60 * 30, // 30 minutes in cache
  });
}

/**
 * Fetch available billing packages and store pricing
 */
export function usePackagesQuery(options: { enabled?: boolean } = {}) {
  return useQuery<any[]>({
    queryKey: billingKeys.packages(),
    queryFn: () => billingApi.getPackages(),
    enabled: options.enabled ?? true,
    staleTime: 1000 * 60 * 30, // 30 minutes fresh
  });
}
