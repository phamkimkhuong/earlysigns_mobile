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

export const MOBILE_APP_CLIENT: string = "mobile-free";
export const GOOGLE_CLIENT_ID: string =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  extra.googleClientId ||
  "";

export const GOOGLE_IOS_CLIENT_ID: string =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  extra.googleIosClientId ||
  "";

export const REVENUECAT_APPLE_KEY: string =
  process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY ||
  extra.revenuecatAppleKey ||
  "";

export const REVENUECAT_GOOGLE_KEY: string =
  process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ||
  extra.revenuecatGoogleKey ||
  "";

export const FACEBOOK_APP_ID: string =
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ||
  extra.facebookAppId ||
  "";

export { API_ENDPOINTS } from "./apiEndpoints";
