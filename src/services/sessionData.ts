import { notifyBillingUsageChanged, notifyHomeSummaryChanged } from "./billingEvents";
import type { BillingUsage, HomeSummary } from "@/types/domain";
import { API_ENDPOINTS } from "@/core/config";

interface UsageState {
  token: string;
  data: BillingUsage | null;
  inflight: Promise<BillingUsage | null> | null;
}

interface SummaryState {
  token: string;
  dialect: string;
  data: HomeSummary | null;
  inflight: Promise<HomeSummary | null> | null;
}

function emptyUsage(): UsageState {
  return { token: "", data: null, inflight: null };
}

function emptySummary(): SummaryState {
  return { token: "", dialect: "", data: null, inflight: null };
}

let usageState: UsageState = emptyUsage();
let summaryState: SummaryState = emptySummary();

function parseDetailMessage(data: any, fallback: string): string {
  const detail = data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (detail && typeof detail === "object" && detail.message) {
    return String(detail.message);
  }
  return fallback;
}

export function clearSessionDataCaches(): void {
  usageState = emptyUsage();
  summaryState = emptySummary();
}

export function getCachedBillingUsage(token?: string | null): BillingUsage | null {
  if (!token || usageState.token !== token) return null;
  return usageState.data;
}

export function getCachedHomeSummary(token?: string | null, dialect?: string): HomeSummary | null {
  if (!token || summaryState.token !== token || summaryState.dialect !== dialect) {
    return null;
  }
  return summaryState.data;
}

export function seedBillingUsage(token: string, usage: BillingUsage): void {
  if (!token || !usage || typeof usage !== "object") return;
  usageState = { token, data: usage, inflight: null };
  notifyBillingUsageChanged(usage);
}

export function setCachedHomeSummary(token: string, dialect: string, summary: HomeSummary): void {
  if (!token || !summary || typeof summary !== "object") return;
  summaryState = { token, dialect: dialect || "uk", data: summary, inflight: null };
  notifyHomeSummaryChanged(summary);
}

export interface LoadBillingUsageParams {
  authToken?: string | null;
  authFetch?: (input: string, init?: any) => Promise<Response>;
  force?: boolean;
}

export async function loadBillingUsage({
  authToken,
  authFetch,
  force = false,
}: LoadBillingUsageParams): Promise<BillingUsage | null> {
  if (!authToken || typeof authFetch !== "function") return null;
  if (force) {
    usageState = { token: authToken, data: null, inflight: null };
  }
  if (usageState.token === authToken && usageState.data) {
    return usageState.data;
  }
  if (usageState.token === authToken && usageState.inflight) {
    return usageState.inflight;
  }

  const promiseHolder: { current: Promise<BillingUsage | null> | null } = { current: null };
  const promise: Promise<BillingUsage | null> = (async () => {
    try {
      const res = await authFetch(API_ENDPOINTS.BILLING.USAGE);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parseDetailMessage(data, "Failed to load usage."));
      }
      const usage: BillingUsage | null = data.usage || null;
      usageState = { token: authToken, data: usage, inflight: null };
      notifyBillingUsageChanged(usage);
      return usage;
    } catch (err) {
      if (usageState.inflight === promiseHolder.current) {
        usageState = { ...usageState, inflight: null };
      }
      throw err;
    }
  })();
  promiseHolder.current = promise;

  usageState = {
    token: authToken,
    data: usageState.token === authToken ? usageState.data : null,
    inflight: promise,
  };
  return promise;
}

export interface LoadHomeSummaryParams {
  authToken?: string | null;
  dialect?: string;
  authFetch?: (input: string, init?: any) => Promise<Response>;
  force?: boolean;
}

export async function loadHomeSummary({
  authToken,
  dialect,
  authFetch,
  force = false,
}: LoadHomeSummaryParams): Promise<HomeSummary | null> {
  if (!authToken || typeof authFetch !== "function") return null;
  const dialectKey = dialect || "uk";
  if (force) {
    summaryState = { token: authToken || "", dialect: dialectKey, data: null, inflight: null };
  }
  if (
    summaryState.token === authToken &&
    summaryState.dialect === dialectKey &&
    summaryState.data
  ) {
    return summaryState.data;
  }
  if (
    summaryState.token === authToken &&
    summaryState.dialect === dialectKey &&
    summaryState.inflight
  ) {
    return summaryState.inflight;
  }

  const promiseHolder: { current: Promise<HomeSummary | null> | null } = { current: null };
  const promise: Promise<HomeSummary | null> = (async () => {
    try {
      const res = await authFetch(API_ENDPOINTS.LESSONS.HOME_SUMMARY(dialectKey));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(parseDetailMessage(data, "Failed to load home summary."));
      }
      const summary: HomeSummary | null = data || null;
      summaryState = {
        token: authToken || "",
        dialect: dialectKey,
        data: summary,
        inflight: null,
      };
      notifyHomeSummaryChanged(summary);
      return summary;
    } catch (err) {
      if (summaryState.inflight === promiseHolder.current) {
        summaryState = { ...summaryState, inflight: null };
      }
      throw err;
    }
  })();
  promiseHolder.current = promise;


  summaryState = {
    token: authToken || "",
    dialect: dialectKey,
    data:
      summaryState.token === authToken && summaryState.dialect === dialectKey
        ? summaryState.data
        : null,
    inflight: promise,
  };
  return promise;
}

export function invalidateBillingUsageCache(): void {
  usageState = emptyUsage();
}

export function invalidateHomeSummaryCache(): void {
  summaryState = emptySummary();
}
