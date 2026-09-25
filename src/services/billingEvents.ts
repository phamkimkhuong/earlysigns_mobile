export type UsageListener = (usage: Record<string, any> | null) => void;
export type SummaryListener = (summary: Record<string, any>) => void;

const usageListeners = new Set<UsageListener>();
const summaryListeners = new Set<SummaryListener>();

export const BILLING_USAGE_CHANGED = "earlysigns:billing-usage-changed";
export const HOME_SUMMARY_CHANGED = "earlysigns:home-summary-changed";

export function notifyBillingUsageChanged(usage: Record<string, any> | null | undefined): void {
  const payload = usage && typeof usage === "object" ? usage : null;
  usageListeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeBillingUsage(fn: UsageListener): () => void {
  usageListeners.add(fn);
  return () => {
    usageListeners.delete(fn);
  };
}

export function notifyHomeSummaryChanged(summary: Record<string, any> | null | undefined): void {
  const payload = summary && typeof summary === "object" ? summary : {};
  summaryListeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeHomeSummary(fn: SummaryListener): () => void {
  summaryListeners.add(fn);
  return () => {
    summaryListeners.delete(fn);
  };
}
