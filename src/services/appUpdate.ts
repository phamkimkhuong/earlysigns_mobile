import { Platform, Linking } from "react-native";
import Constants from "expo-constants";
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_API_KEY,
  FIREBASE_APP_ID,
} from "@/core/config";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import { getItem, setItem } from "@/services/storage";

export interface AppVersionConfig {
  min_version: string;
  latest_version: string;
  force_update: boolean;
  title?: string;
  message?: string;
  store_url_android?: string;
  store_url_ios?: string;
}

export interface UpdateCheckResult {
  shouldUpdate: boolean;
  isForce: boolean;
  currentVersion: string;
  latestVersion: string;
  minVersion: string;
  config: AppVersionConfig;
  storeUrl: string;
}

const SOFT_DISMISSED_VERSION_KEY = "earlysigns_update_soft_dismissed_version";
const SOFT_DISMISSED_TIME_KEY = "earlysigns_update_soft_dismissed_time";

// Cache in memory for 5 minutes to avoid spamming Google servers
let cachedConfig: AppVersionConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export const DEFAULT_STORE_URL_ANDROID = process.env.EXPO_PUBLIC_STORE_URL_ANDROID ||
  "https://play.google.com/store/apps/details?id=net.earlysigns.app";
export const DEFAULT_STORE_URL_IOS = process.env.EXPO_PUBLIC_STORE_URL_IOS ||
  "https://apps.apple.com/app/id6744393118";

/**
 * Compare two semver-like version strings (e.g. "1.0.0" vs "1.0.1")
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  const clean1 = (v1 || "").replace(/^v/i, "").trim();
  const clean2 = (v2 || "").replace(/^v/i, "").trim();

  const parts1 = clean1.split(".").map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split(".").map((p) => parseInt(p, 10) || 0);

  const length = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < length; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Retrieve current running application version from Expo Constants
 */
export function getCurrentAppVersion(): string {
  const version =
    Constants.expoConfig?.version ||
    (Constants as { nativeAppVersion?: string }).nativeAppVersion ||
    "1.0.0";
  return version;
}

/**
 * Get appropriate store URL for current platform
 */
export function getStoreUrl(config?: AppVersionConfig): string {
  if (Platform.OS === "ios") {
    return config?.store_url_ios || DEFAULT_STORE_URL_IOS;
  }
  return config?.store_url_android || DEFAULT_STORE_URL_ANDROID;
}

/**
 * Fetch Remote Config from Firebase REST client endpoint
 */
export async function fetchRemoteVersionConfig(): Promise<AppVersionConfig | null> {
  const now = Date.now();
  if (cachedConfig && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  const endpoint = `https://firebaseremoteconfig.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/namespaces/firebase:fetch?key=${FIREBASE_API_KEY}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const deviceId = getOrCreateDeviceId();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appId: FIREBASE_APP_ID,
        appInstanceId: deviceId || "default-instance-id",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[appUpdate] Remote config fetch failed with status: ${response.status}`);
      return cachedConfig;
    }

    const data = await response.json();
    const rawConfig = data?.entries?.app_version_config;

    if (!rawConfig) {
      return cachedConfig;
    }

    let parsed: AppVersionConfig;
    if (typeof rawConfig === "string") {
      parsed = JSON.parse(rawConfig);
    } else {
      parsed = rawConfig;
    }

    cachedConfig = parsed;
    lastFetchTime = now;
    return parsed;
  } catch {
    clearTimeout(timeoutId);
    // Silent fail in case of offline/network issues to never disrupt user experience
    return cachedConfig;
  }
}

/**
 * Check if the application requires a soft or force update
 */
export async function checkAppUpdate(options?: {
  ignoreDismissed?: boolean;
}): Promise<UpdateCheckResult | null> {
  const config = await fetchRemoteVersionConfig();
  if (!config) {
    return null;
  }

  const currentVersion = getCurrentAppVersion();
  const minVersion = config.min_version || "1.0.0";
  const latestVersion = config.latest_version || currentVersion;
  const storeUrl = getStoreUrl(config);

  // 1. Force update condition: current < min_version OR force_update flag is true
  const isBelowMin = compareVersions(currentVersion, minVersion) < 0;
  const isForce = isBelowMin || Boolean(config.force_update);

  if (isForce) {
    return {
      shouldUpdate: true,
      isForce: true,
      currentVersion,
      latestVersion,
      minVersion,
      config,
      storeUrl,
    };
  }

  // 2. Soft update condition: current < latest_version
  const isBelowLatest = compareVersions(currentVersion, latestVersion) < 0;
  if (!isBelowLatest) {
    return null;
  }

  // Check if user dismissed this soft update recently (e.g. within 24h for the same version)
  if (!options?.ignoreDismissed) {
    const dismissedVersion = getItem(SOFT_DISMISSED_VERSION_KEY);
    const dismissedTimeStr = getItem(SOFT_DISMISSED_TIME_KEY);
    const dismissedTime = dismissedTimeStr ? parseInt(dismissedTimeStr, 10) : 0;
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (
      dismissedVersion === latestVersion &&
      Date.now() - dismissedTime < oneDayMs
    ) {
      return null;
    }
  }

  return {
    shouldUpdate: true,
    isForce: false,
    currentVersion,
    latestVersion,
    minVersion,
    config,
    storeUrl,
  };
}

/**
 * Remember that user dismissed soft update for the current target version
 */
export function dismissSoftUpdate(targetVersion: string): void {
  setItem(SOFT_DISMISSED_VERSION_KEY, targetVersion);
  setItem(SOFT_DISMISSED_TIME_KEY, String(Date.now()));
}

/**
 * Open the store URL in default browser / App Store / Play Store app
 */
export async function openStore(storeUrl?: string): Promise<boolean> {
  const url = storeUrl || getStoreUrl();
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
  } catch (err) {
    console.warn("[appUpdate] Failed to open store URL:", err);
  }
  return false;
}
