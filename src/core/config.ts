import Constants from "expo-constants";

interface ExtraConfig {
  apiBase?: string;
  [key: string]: any;
}

const extra: ExtraConfig = (Constants.expoConfig?.extra as ExtraConfig) || {};

const DEFAULT_API_BASE = __DEV__ ? "http://localhost:8000" : "https://api-vps.earlysigns.net";

export const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE ||
  extra.apiBase ||
  DEFAULT_API_BASE;

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

export const FACEBOOK_CLIENT_TOKEN: string =
  process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN ||
  extra.facebookClientToken ||
  "";

export const FIREBASE_PROJECT_ID: string =
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
  extra.firebaseProjectId ||
  "earlysigns-679f9";

export const FIREBASE_API_KEY: string =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
  extra.firebaseApiKey ||
  "AIzaSyC4JMUV2NH_PT7OHBp5X8Em6wku9SRbmdM";

export const FIREBASE_APP_ID: string =
  process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
  extra.firebaseAppId ||
  "1:674439311811:android:b64eda5e99ce0b9effcd76";

export { API_ENDPOINTS } from "./apiEndpoints";
