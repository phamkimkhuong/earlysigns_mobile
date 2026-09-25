import { Platform } from "react-native";
import { API_BASE, MOBILE_APP_CLIENT } from "./config";
import { useAuthStore, AUTH_TOKEN_KEY, DEVICE_ID_KEY } from "@/store/useAuthStore";
import { useBillingStore } from "@/store/useBillingStore";
import { getItem } from "@/services/storage";
import { reportApiError } from "./errorReporter";
import { xhrFormDataFetch } from "@/utils/nativeFormDataFetch";
import { parseErrorDetail } from "@/utils/errors";
import { logger } from "./logger";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeoutMs?: number;
  skipAuth?: boolean;
}

export class AppHttpError extends Error {
  status: number;
  detail: any;
  isAuthError: boolean;
  isQuotaError: boolean;

  constructor(status: number, message: string, detail: any = null) {
    super(message);
    this.name = "AppHttpError";
    this.status = status;
    this.detail = detail;
    this.isAuthError = status === 401;
    this.isQuotaError = status === 402;
  }
}

function buildUrl(path: string, params?: Record<string, any>): string {
  let url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }
  return url;
}

export async function httpRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    headers = {},
    body,
    params,
    timeoutMs = 30_000,
    skipAuth = false,
  } = options;

  const url = buildUrl(path, params);

  // Read auth token from Zustand store, falling back to storage
  const token = skipAuth ? "" : useAuthStore.getState().token || getItem(AUTH_TOKEN_KEY) || "";
  const deviceId = useAuthStore.getState().deviceId || getItem(DEVICE_ID_KEY) || "";

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    "X-Client-App": MOBILE_APP_CLIENT,
    ...headers,
  };

  if (deviceId && !finalHeaders["X-Device-Id"]) {
    finalHeaders["X-Device-Id"] = deviceId;
  }

  if (token && !finalHeaders["Authorization"]) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isFormData && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }

  // Timeout controller
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  // Start timing & log outgoing request
  const startTime = Date.now();
  logger.httpReq(method, url, { headers: finalHeaders, body, params });

  try {
    let res: Response | { ok: boolean; status: number; json: () => Promise<any>; text: () => Promise<string> };

    if (isFormData && Platform.OS !== "web") {
      res = await xhrFormDataFetch(url, {
        method,
        headers: finalHeaders,
        body,
        signal: controller?.signal,
        timeout: timeoutMs,
      });
    } else {
      res = await fetch(url, {
        method,
        headers: finalHeaders,
        body: isFormData ? body : body ? JSON.stringify(body) : undefined,
        signal: controller?.signal,
      });
    }

    if (timer) clearTimeout(timer);

    const data = await res.json().catch(() => ({}));
    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const parsedError = parseErrorDetail(data?.detail);
      const errorMessage = parsedError.message || `Request failed with status ${res.status}`;

      logger.httpErr(method, url, res.status, durationMs, data?.detail || data || errorMessage);

      reportApiError({
        path,
        method,
        status: res.status,
        message: errorMessage,
        userEmail: useAuthStore.getState().email,
        userId: useAuthStore.getState().userId,
      });

      // Handle 401 Unauthorized globally
      if (res.status === 401 && !skipAuth) {
        useAuthStore.getState().logout();
      }

      // Handle 402 Quota exhausted globally
      if (res.status === 402 && data?.detail?.usage) {
        useBillingStore.getState().setUsage(data.detail.usage);
      }

      throw new AppHttpError(res.status, errorMessage, data?.detail || data);
    }

    logger.httpRes(method, url, res.status, durationMs, data);
    return data as T;
  } catch (err: any) {
    if (timer) clearTimeout(timer);
    const durationMs = Date.now() - startTime;
    if (err instanceof AppHttpError) throw err;
    const isAbort = err?.name === "AbortError";
    const msg = isAbort ? "Yêu cầu mạng quá thời gian (Timeout)" : err?.message || "Lỗi kết nối mạng";
    logger.httpErr(method, url, 0, durationMs, msg);
    throw new AppHttpError(0, msg, err);
  }
}

export const httpClient = {
  get<T = any>(path: string, params?: Record<string, any>, options?: Omit<RequestOptions, "method" | "params">): Promise<T> {
    return httpRequest<T>(path, { ...options, method: "GET", params });
  },

  post<T = any>(path: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return httpRequest<T>(path, { ...options, method: "POST", body });
  },

  put<T = any>(path: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return httpRequest<T>(path, { ...options, method: "PUT", body });
  },

  delete<T = any>(path: string, body?: any, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return httpRequest<T>(path, { ...options, method: "DELETE", body });
  },

  upload<T = any>(path: string, formData: FormData, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return httpRequest<T>(path, { ...options, method: "POST", body: formData });
  },
};

export default httpClient;
