import { create } from "zustand";
import { getItem, setItem, removeItem } from "@/services/storage";
import type { Dialect } from "@/types/domain";

export const AUTH_TOKEN_KEY = "earlysigns_auth_token";
export const AUTH_USER_ID_KEY = "earlysigns_auth_user_id";
export const DEVICE_ID_KEY = "earlysigns_device_id";
export const USER_DIALECT_KEY = "earlysigns_user_dialect";

export interface ScreeningStatus {
  requires_screening: boolean;
  screening_completed: boolean;
  score_unlocked: boolean;
  show_screening_prompt: boolean;
}

interface AuthState {
  token: string;
  email: string;
  userId: string;
  deviceId: string;
  dialect: Dialect;
  isAuthenticated: boolean;
  screeningStatus: ScreeningStatus | null;
  isGuest: boolean;
  setAuth: (payload: { token: string; email?: string; userId?: string }) => void;
  setIsGuest: (isGuest: boolean) => void;
  setDialect: (dialect: Dialect) => void;
  setDeviceId: (deviceId: string) => void;
  setScreeningStatus: (status: ScreeningStatus | null) => void;
  logout: () => void;
  syncFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Initialize synchronously from storage cache
  const initialToken = getItem(AUTH_TOKEN_KEY) || "";
  const initialUserId = getItem(AUTH_USER_ID_KEY) || "";
  const initialDeviceId = getItem(DEVICE_ID_KEY) || "";
  const initialDialect = (getItem(USER_DIALECT_KEY) as Dialect) || "uk";

  return {
    token: initialToken,
    email: "",
    userId: initialUserId,
    deviceId: initialDeviceId,
    dialect: initialDialect,
    isAuthenticated: Boolean(initialToken),
    screeningStatus: null,
    isGuest: !initialToken,

    setAuth: ({ token, email = "", userId = "" }) => {
      setItem(AUTH_TOKEN_KEY, token);
      if (userId) setItem(AUTH_USER_ID_KEY, userId);
      set({
        token,
        email,
        userId: userId || "",
        isAuthenticated: Boolean(token),
        isGuest: false,
      });
    },

    setIsGuest: (isGuest) => set({ isGuest }),

    setDialect: (dialect) => {
      setItem(USER_DIALECT_KEY, dialect);
      set({ dialect });
    },

    setDeviceId: (deviceId) => {
      setItem(DEVICE_ID_KEY, deviceId);
      set({ deviceId });
    },

    setScreeningStatus: (screeningStatus) => set({ screeningStatus }),

    logout: () => {
      removeItem(AUTH_TOKEN_KEY);
      removeItem(AUTH_USER_ID_KEY);
      set({
        token: "",
        email: "",
        userId: "",
        isAuthenticated: false,
        isGuest: true,
        screeningStatus: null,
      });
    },

    syncFromStorage: () => {
      const token = getItem(AUTH_TOKEN_KEY) || "";
      const userId = getItem(AUTH_USER_ID_KEY) || "";
      const deviceId = getItem(DEVICE_ID_KEY) || "";
      const dialect = (getItem(USER_DIALECT_KEY) as Dialect) || "uk";
      set({
        token,
        userId,
        deviceId,
        dialect,
        isAuthenticated: Boolean(token),
      });
    },
  };
});
