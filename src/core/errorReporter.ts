import { API_BASE, API_ENDPOINTS } from "./config";

export interface ReportApiErrorOptions {
  path?: string;
  method?: string;
  status?: number | null;
  message?: string;
  userEmail?: string;
  userId?: string;
  context?: Record<string, any>;
}

export function reportApiError({
  path = "",
  method = "GET",
  status = null,
  message = "",
  userEmail = "",
  userId = "",
  context = {},
}: ReportApiErrorOptions): void {
  try {
    fetch(`${API_BASE}${API_ENDPOINTS.ERROR_REPORT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error_message: String(message || "").slice(0, 5000),
        path: String(path || ""),
        method: String(method || "GET"),
        status: status ?? null,
        page_url: "earlysigns-mobile",
        user_email: String(userEmail || ""),
        user_id: String(userId || ""),
        context: context || {},
      }),
    }).catch(() => {});
  } catch {
    /* never crash the app */
  }
}
