import { create } from "zustand";
import type { BillingUsage, HomeSummary } from "@/types/domain";
import { subscribeBillingUsage, subscribeHomeSummary } from "@/services/billingEvents";
import { getCachedBillingUsage, getCachedHomeSummary } from "@/services/sessionData";

interface BillingStoreState {
  usage: BillingUsage | null;
  homeSummary: HomeSummary | null;
  loading: boolean;
  isPro: boolean;
  setUsage: (usage: BillingUsage | null) => void;
  setHomeSummary: (summary: HomeSummary | null) => void;
  setLoading: (loading: boolean) => void;
  decrementDailyRemaining: () => void;
  syncFromCache: (token?: string | null, dialect?: string) => void;
  reset: () => void;
}

export const useBillingStore = create<BillingStoreState>((set) => {
  // Auto-listen to legacy billing events for seamless bidirectional sync
  subscribeBillingUsage((usage) => {
    const bUsage = (usage as BillingUsage) || null;
    set({
      usage: bUsage,
      isPro: bUsage?.tier === "pro" || Boolean(bUsage?.has_active_subscription),
    });
  });

  subscribeHomeSummary((homeSummary) => {
    set({ homeSummary: (homeSummary as HomeSummary) || null });
  });

  return {
    usage: null,
    homeSummary: null,
    loading: false,
    isPro: false,

    setUsage: (usage) => {
      set({
        usage,
        isPro: usage?.tier === "pro" || Boolean(usage?.has_active_subscription),
      });
    },

    setHomeSummary: (homeSummary) => set({ homeSummary }),

    setLoading: (loading) => set({ loading }),

    decrementDailyRemaining: () => {
      set((state) => {
        if (!state.usage || state.isPro) return state;
        const current = state.usage.daily_remaining ?? 0;
        const next = Math.max(0, current - 1);
        return {
          ...state,
          usage: {
            ...state.usage,
            daily_remaining: next,
          },
        };
      });
    },

    syncFromCache: (token, dialect) => {
      const cachedUsage = getCachedBillingUsage(token);
      const cachedSummary = getCachedHomeSummary(token, dialect);
      set({
        usage: cachedUsage,
        isPro: cachedUsage?.tier === "pro" || Boolean(cachedUsage?.has_active_subscription),
        homeSummary: cachedSummary,
      });
    },

    reset: () => {
      set({
        usage: null,
        homeSummary: null,
        loading: false,
        isPro: false,
      });
    },
  };
});
