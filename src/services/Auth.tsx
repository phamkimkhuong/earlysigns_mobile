import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { API_BASE, MOBILE_APP_CLIENT, API_ENDPOINTS } from "@/core/config";
import { reportApiError } from "@/core/errorReporter";
import { xhrFormDataFetch } from "@/utils/nativeFormDataFetch";
import i18n, { setStoredLanguage } from "@/core/i18n";
import { clearSessionDataCaches, seedBillingUsage } from "./sessionData";
import {
  getItem,
  hasCompletedOnboarding,
  hydrateStorage,
  removeItem,
  setCompletedOnboarding,
  setItem,
} from "./storage";
import { useAuthStore } from "@/store/useAuthStore";
import { logger } from "@/core/logger";
import type { Dialect } from "@/types/domain";

export const AUTH_TOKEN_KEY = "earlysigns_auth_token";
export const AUTH_USER_ID_KEY = "earlysigns_auth_user_id";
export const DEVICE_ID_KEY = "earlysigns_device_id";
export const USER_DIALECT_KEY = "earlysigns_user_dialect";
const DEFAULT_DIALECT: Dialect = "uk";

export interface ScreeningStatus {
  requires_screening: boolean;
  screening_completed: boolean;
  score_unlocked: boolean;
  show_screening_prompt: boolean;
}

export interface AuthContextType {
  ready: boolean;
  authLoading: boolean;
  authToken: string;
  authEmail: string;
  authUserId: string;
  deviceId: string;
  userDialect: Dialect;
  hasOnboarded: boolean;
  completeOnboarding: () => void;
  requiresScreening: boolean;
  screeningCompleted: boolean;
  scoreUnlocked: boolean;
  showScreeningPrompt: boolean;
  updateUserDialect: (nextDialect: Dialect | string) => Promise<Dialect>;
  updateUserLanguage: (nextLanguage: string) => Promise<string>;
  refreshUserDialect: () => Promise<Dialect>;
  refreshScreeningStatus: () => Promise<ScreeningStatus | null>;
  handleLoginSuccess: (params: { token: string; email?: string; userId?: string }) => Promise<void>;
  clearAuthState: () => void;
  handleLogout: () => Promise<void>;
  appAuthFetch: (path: string, options?: any) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeDialect(_value?: unknown): Dialect {
  return "uk";
}

function normalizeLanguage(value: unknown): string {
  return String(value || "vi").toLowerCase().startsWith("vi") ? "vi" : "en";
}

function getOrCreateDeviceId(): string {
  const existing = getItem(DEVICE_ID_KEY);
  if (existing && existing.length >= 8) return existing;
  const generated =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authToken, setAuthToken] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [userDialect, setUserDialectState] = useState<Dialect>(DEFAULT_DIALECT);
  const [deviceId, setDeviceId] = useState("");
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [requiresScreening, setRequiresScreening] = useState(false);
  const [screeningCompleted, setScreeningCompleted] = useState(false);
  const [scoreUnlocked, setScoreUnlocked] = useState(false);
  const [showScreeningPrompt, setShowScreeningPrompt] = useState(false);

  const completeOnboarding = useCallback(() => {
    setHasOnboarded(true);
    setCompletedOnboarding(true);
  }, []);

  const persistDialect = useCallback((value: unknown): Dialect => {
    const normalized = normalizeDialect(value);
    setUserDialectState(normalized);
    setItem(USER_DIALECT_KEY, normalized);
    useAuthStore.getState().setDialect(normalized);
    return normalized;
  }, []);

  const persistLanguage = useCallback((value: unknown): string => {
    const normalized = normalizeLanguage(value);
    setStoredLanguage(normalized);
    if (i18n.language !== normalized) {
      i18n.changeLanguage(normalized);
    }
    return normalized;
  }, []);

  const clearAuthState = useCallback(() => {
    removeItem(AUTH_TOKEN_KEY);
    removeItem(AUTH_USER_ID_KEY);
    useAuthStore.getState().logout();
    setAuthToken("");
    setAuthEmail("");
    setAuthUserId("");
    setRequiresScreening(false);
    setScreeningCompleted(false);
    setScoreUnlocked(false);
    setShowScreeningPrompt(false);
    clearSessionDataCaches();
  }, []);

  const appAuthFetch = useCallback(
    async function appAuthFetch(path: string, options: any = {}): Promise<Response> {
      const headers = { ...(options.headers || {}) };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      if (deviceId) headers["X-Device-Id"] = deviceId;
      headers["X-App-Client"] = MOBILE_APP_CLIENT;
      const isFormData =
        typeof FormData !== "undefined" && options.body instanceof FormData;
      if (isFormData) {
        delete headers["Content-Type"];
        delete headers["content-type"];
      }
      const url = `${API_BASE}${path}`;
      const method = options.method || "GET";
      const startTime = Date.now();
      logger.httpReq(method, url, { headers, body: options.body });

      const res: Response =
        isFormData && Platform.OS !== "web"
          ? ((await xhrFormDataFetch(url, { ...options, headers })) as unknown as Response)
          : await fetch(url, { ...options, headers });

      const durationMs = Date.now() - startTime;
      if (res.status >= 200 && res.status < 300) {
        logger.httpRes(method, url, res.status, durationMs);
      } else {
        logger.httpErr(method, url, res.status, durationMs, `HTTP ${res.status}`);
      }

      if (res.status === 401) {
        clearAuthState();
        throw new Error("Session expired. Please log in again.");
      }
      if (res.status >= 400) {
        res
          .clone()
          .json()
          .catch(() => ({}))
          .then((data: any) => {
            const detail = data?.detail;
            const message =
              typeof detail === "string" ? detail : detail?.message || `HTTP ${res.status}`;
            reportApiError({
              path,
              method: options.method || "GET",
              status: res.status,
              message,
              userEmail: authEmail,
              userId: authUserId,
            });
          });
      }
      return res;
    },
    [authToken, authEmail, authUserId, deviceId, clearAuthState]
  );

  const applyMePayload = useCallback(
    (data: any) => {
      setRequiresScreening(Boolean(data.requires_screening));
      setScreeningCompleted(Boolean(data.screening_completed));
      setScoreUnlocked(Boolean(data.score_unlocked));
      setShowScreeningPrompt(Boolean(data.show_screening_prompt ?? data.requires_screening));
      if (data.dialect) persistDialect(data.dialect);
      if (data.language) persistLanguage(data.language);
      if (data.email) setAuthEmail(data.email);
      if (data.user_id) {
        setAuthUserId(data.user_id);
        setItem(AUTH_USER_ID_KEY, data.user_id);
      }
      if (data.usage && authToken) seedBillingUsage(authToken, data.usage);
    },
    [authToken, persistDialect, persistLanguage]
  );

  const handleLoginSuccess = useCallback(
    async ({ token, email, userId }: { token: string; email?: string; userId?: string }) => {
      setAuthToken(token || "");
      setAuthEmail(email || "");
      setHasOnboarded(true);
      setCompletedOnboarding(true);
      if (token) setItem(AUTH_TOKEN_KEY, token);
      if (userId) {
        setAuthUserId(userId);
        setItem(AUTH_USER_ID_KEY, userId);
      }
      useAuthStore.getState().setAuth({ token, email, userId });
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        if (deviceId) headers["X-Device-Id"] = deviceId;
        const res = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH.ME}`, { headers });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setRequiresScreening(Boolean(data.requires_screening));
          setScreeningCompleted(Boolean(data.screening_completed));
          setScoreUnlocked(Boolean(data.score_unlocked));
          setShowScreeningPrompt(Boolean(data.show_screening_prompt ?? data.requires_screening));
          if (data.dialect) persistDialect(data.dialect);
          if (data.language) persistLanguage(data.language);
          if (data.usage) seedBillingUsage(token, data.usage);
          if (data.user_id) {
            setAuthUserId(data.user_id);
            setItem(AUTH_USER_ID_KEY, data.user_id);
          }
        }
      } catch {
        /* Home still works without screening gate */
      }
    },
    [deviceId, persistDialect, persistLanguage]
  );

  const refreshUserDialect = useCallback(async (): Promise<Dialect> => {
    if (!authToken) return userDialect;
    const res = await appAuthFetch(API_ENDPOINTS.AUTH.ME);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || "Failed to load preferences.");
    }
    applyMePayload(data);
    return persistDialect(data.dialect || DEFAULT_DIALECT);
  }, [appAuthFetch, authToken, persistDialect, applyMePayload, userDialect]);

  const refreshScreeningStatus = useCallback(async (): Promise<ScreeningStatus | null> => {
    if (!authToken) return null;
    try {
      const res = await appAuthFetch(API_ENDPOINTS.AUTH.ME);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return null;
      applyMePayload(data);
      return {
        requires_screening: Boolean(data.requires_screening),
        screening_completed: Boolean(data.screening_completed),
        score_unlocked: Boolean(data.score_unlocked),
        show_screening_prompt: Boolean(data.show_screening_prompt ?? data.requires_screening),
      };
    } catch {
      return null;
    }
  }, [appAuthFetch, authToken, applyMePayload]);

  const updateUserDialect = useCallback(
    async (nextDialect: Dialect | string): Promise<Dialect> => {
      const normalized = normalizeDialect(nextDialect);
      const previous = userDialect;
      persistDialect(normalized);
      if (!authToken) return normalized;
      try {
        const res = await appAuthFetch(API_ENDPOINTS.AUTH.PREFERENCES, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dialect: normalized }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || "Failed to update accent.");
        if (data.dialect) persistDialect(data.dialect);
        if (data.language) persistLanguage(data.language);
        return normalized;
      } catch (e) {
        persistDialect(previous);
        throw e;
      }
    },
    [appAuthFetch, authToken, persistDialect, persistLanguage, userDialect]
  );

  const updateUserLanguage = useCallback(
    async (nextLanguage: string): Promise<string> => {
      const normalized = normalizeLanguage(nextLanguage);
      if (!authToken) return persistLanguage(normalized);
      const res = await appAuthFetch(API_ENDPOINTS.AUTH.PREFERENCES, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to update language.");
      return persistLanguage(data.language || normalized);
    },
    [appAuthFetch, authToken, persistLanguage]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await hydrateStorage();
      if (cancelled) return;
      const token = getItem(AUTH_TOKEN_KEY) || "";
      const userId = getItem(AUTH_USER_ID_KEY) || "";
      const dialect = normalizeDialect(getItem(USER_DIALECT_KEY) || DEFAULT_DIALECT);
      const id = getOrCreateDeviceId();
      setAuthToken(token);
      setAuthUserId(userId);
      setUserDialectState(dialect);
      setDeviceId(id);
      useAuthStore.getState().syncFromStorage();
      useAuthStore.getState().setDeviceId(id);
      setHasOnboarded(hasCompletedOnboarding());
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    async function validateToken() {
      if (!authToken) {
        setAuthLoading(false);
        return;
      }
      try {
        const res = await appAuthFetch(API_ENDPOINTS.AUTH.ME);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Authentication failed.");
        if (cancelled) return;
        applyMePayload(data);
      } catch {
        if (!cancelled) clearAuthState();
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }
    validateToken();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      if (authToken) {
        await appAuthFetch(API_ENDPOINTS.AUTH.LOGOUT, { method: "POST" });
      }
    } catch {
      /* local logout still applies */
    } finally {
      clearAuthState();
    }
  }, [authToken, appAuthFetch, clearAuthState]);

  const value = useMemo<AuthContextType>(
    () => ({
      ready,
      authLoading,
      authToken,
      authEmail,
      authUserId,
      deviceId,
      userDialect,
      hasOnboarded,
      completeOnboarding,
      requiresScreening,
      screeningCompleted,
      scoreUnlocked,
      showScreeningPrompt,
      updateUserDialect,
      updateUserLanguage,
      refreshUserDialect,
      refreshScreeningStatus,
      handleLoginSuccess,
      clearAuthState,
      handleLogout,
      appAuthFetch,
    }),
    [
      ready,
      authLoading,
      authToken,
      authEmail,
      authUserId,
      deviceId,
      userDialect,
      hasOnboarded,
      completeOnboarding,
      requiresScreening,
      screeningCompleted,
      scoreUnlocked,
      showScreeningPrompt,
      updateUserDialect,
      updateUserLanguage,
      refreshUserDialect,
      refreshScreeningStatus,
      handleLoginSuccess,
      clearAuthState,
      handleLogout,
      appAuthFetch,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
