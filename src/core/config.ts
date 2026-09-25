import Constants from "expo-constants";

interface ExtraConfig {
  apiBase?: string;
  [key: string]: any;
}

const extra: ExtraConfig = (Constants.expoConfig?.extra as ExtraConfig) || {};

export const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE ||
  extra.apiBase ||
  "http://localhost:8000";

// Mobile practice is intentionally available without an account or subscription.
export const MOBILE_FREE_ACCESS: boolean = true;
export const MOBILE_APP_CLIENT: string = "mobile-free";
export const GOOGLE_CLIENT_ID: string =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  extra.googleClientId ||
  "";

export { API_ENDPOINTS } from "./apiEndpoints";
