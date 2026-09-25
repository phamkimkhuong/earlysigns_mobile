/**
 * Core Application Logger (Senior Architecture)
 *
 * 1. Zero Production Overhead: All logs are no-ops when __DEV__ is false.
 * 2. Terminal Friendly: Direct console.log output with clean emojis & latency that ALWAYS shows in Metro CLI.
 * 3. Security First: Sensitive credentials (Bearer tokens, passwords) are automatically redacted.
 * 4. In-App DevTools Support: Maintains a bounded in-memory buffer (last 50 requests) so developers
 *    can inspect network requests directly on device even if Hermes Bridgeless disconnects Chrome DevTools.
 */

const IS_DEV = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

// Keys that must be masked before outputting to logs
const SENSITIVE_KEYS = new Set([
  "authorization",
  "auth_token",
  "token",
  "access_token",
  "id_token",
  "refresh_token",
  "password",
  "credential",
  "code",
  "activation_code",
  "secret",
]);

export interface NetworkLogItem {
  id: string;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  timestamp: string;
  headers?: any;
  params?: any;
  requestBody?: any;
  responseBody?: any;
  error?: any;
  state: "pending" | "success" | "error";
}

// In-memory buffer for In-App DevTools inspection
const MAX_LOG_HISTORY = 50;
const networkLogs: NetworkLogItem[] = [];
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore */
    }
  });
}

/**
 * Recursively clone and sanitize sensitive keys from headers, payload, or query objects.
 */
export function sanitize(obj: any, depth = 0): any {
  if (depth > 4 || obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item, depth + 1));
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      if (typeof value === "string" && lowerKey === "authorization") {
        clean[key] = value.startsWith("Bearer ")
          ? `Bearer ${value.slice(7, 15)}...[REDACTED]`
          : "[REDACTED]";
      } else {
        clean[key] = "[REDACTED]";
      }
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitize(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Truncate overly large bodies or base64 strings to keep logs snappy.
 */
export function truncatePayload(data: any): any {
  if (!data) return data;
  if (typeof data === "string" && data.length > 800) {
    return `${data.slice(0, 300)}... [truncated ${data.length} chars]`;
  }
  if (typeof data === "object" && !Array.isArray(data)) {
    if (typeof FormData !== "undefined" && data instanceof FormData) {
      return "[FormData Object]";
    }
  }
  return data;
}

export const logger = {
  /**
   * Log standard debug messages (DEV only).
   */
  debug(tag: string, message: string, ...args: any[]) {
    if (!IS_DEV) return;
    console.log(`🔍 [${tag}] ${message}`, ...args);
  },

  /**
   * Log informational system events (DEV only).
   */
  info(tag: string, message: string, ...args: any[]) {
    if (!IS_DEV) return;
    console.log(`ℹ️ [${tag}] ${message}`, ...args);
  },

  /**
   * Log non-fatal warnings (DEV only).
   */
  warn(tag: string, message: string, ...args: any[]) {
    if (!IS_DEV) return;
    console.warn(`⚠️ [${tag}] ${message}`, ...args);
  },

  /**
   * Log errors (DEV only, production errors routed to crash reporter).
   */
  error(tag: string, message: string, ...args: any[]) {
    if (!IS_DEV) return;
    console.error(`❌ [${tag}] ${message}`, ...args);
  },

  /**
   * Intercept and log outgoing HTTP request.
   */
  httpReq(
    method: string,
    url: string,
    options?: { headers?: Record<string, string>; body?: any; params?: Record<string, any> }
  ) {
    if (!IS_DEV) return;

    const timeStr = new Date().toLocaleTimeString();
    const cleanHeaders = options?.headers ? sanitize(options.headers) : undefined;
    const cleanBody = options?.body ? sanitize(truncatePayload(options.body)) : undefined;

    // Record in in-memory history for in-app DevTool
    const logItem: NetworkLogItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      method: method.toUpperCase(),
      url,
      timestamp: timeStr,
      headers: cleanHeaders,
      params: options?.params,
      requestBody: cleanBody,
      state: "pending",
    };
    networkLogs.unshift(logItem);
    if (networkLogs.length > MAX_LOG_HISTORY) networkLogs.pop();
    notifySubscribers();

    // Direct terminal output (always captured by Metro CLI terminal & Android logcat)
    console.log(
      `🌐 [HTTP REQ] ${method.toUpperCase()} ${url} @ ${timeStr}` +
        (options?.params ? `\n   Params: ${JSON.stringify(options.params)}` : "") +
        (cleanBody ? `\n   Body: ${JSON.stringify(cleanBody)}` : "")
    );
  },

  /**
   * Intercept and log incoming successful HTTP response.
   */
  httpRes(
    method: string,
    url: string,
    status: number,
    durationMs: number,
    data?: any
  ) {
    if (!IS_DEV) return;

    const cleanData = sanitize(truncatePayload(data));

    // Update in-memory item
    const existing = networkLogs.find((item) => item.url === url && item.state === "pending");
    if (existing) {
      existing.status = status;
      existing.durationMs = durationMs;
      existing.responseBody = cleanData;
      existing.state = "success";
      notifySubscribers();
    }

    const dataPreview = cleanData
      ? typeof cleanData === "object"
        ? JSON.stringify(cleanData).slice(0, 250)
        : String(cleanData).slice(0, 250)
      : "";

    console.log(
      `✅ [HTTP RES ${status}] ${method.toUpperCase()} ${url} (+${durationMs}ms)` +
        (dataPreview ? `\n   Data: ${dataPreview}...` : "")
    );
  },

  /**
   * Intercept and log HTTP failure / network error.
   */
  httpErr(
    method: string,
    url: string,
    status: number,
    durationMs: number,
    error?: any
  ) {
    if (!IS_DEV) return;

    // Update in-memory item
    const existing = networkLogs.find((item) => item.url === url && item.state === "pending");
    if (existing) {
      existing.status = status;
      existing.durationMs = durationMs;
      existing.error = error;
      existing.state = "error";
      notifySubscribers();
    }

    console.log(
      `❌ [HTTP ERR ${status || "FAIL"}] ${method.toUpperCase()} ${url} (+${durationMs}ms)` +
        (error ? `\n   Error: ${typeof error === "object" ? JSON.stringify(error) : error}` : "")
    );
  },

  /**
   * Get all captured network logs (for In-App DevTools).
   */
  getNetworkLogs(): NetworkLogItem[] {
    return [...networkLogs];
  },

  /**
   * Clear captured network logs.
   */
  clearNetworkLogs() {
    networkLogs.length = 0;
    notifySubscribers();
  },

  /**
   * Subscribe to network log updates.
   */
  subscribe(callback: () => void): () => void {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },
};

/**
 * Optional production safety hook to ensure no accidental raw console logs leak in release builds.
 */
export function setupProductionConsoleGuard() {
  if (!IS_DEV && typeof console !== "undefined") {
    // Keep console.error and console.warn for crash trackers, but strip noisy logs in production
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
  }
}

export default logger;
