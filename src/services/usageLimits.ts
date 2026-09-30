import { getItem, setItem } from "./storage";
import type { UserTier } from "@/types/domain";

const STORAGE_KEY_DAILY = "earlysigns_daily_quota_v3";
export const STORAGE_KEY_MONTHLY = "earlysigns_monthly_quota_v2";

// Shared daily quota: 20 daily uses across all AI features (Pronunciation, OCR, Audio)
export const DAILY_SHARED_LIMIT = 20;
export const DAILY_LIMIT_PRONUNCIATION = DAILY_SHARED_LIMIT;
export const MONTHLY_LIMIT_PRONUNCIATION = DAILY_SHARED_LIMIT;
export const MONTHLY_LIMIT_OCR = DAILY_SHARED_LIMIT;
export const MONTHLY_LIMIT_AUDIO = DAILY_SHARED_LIMIT;

// Anonymous limits
export const ANONYMOUS_PRONUNCIATION_LIMIT = 5;
export const ANONYMOUS_OCR_LIMIT = 2;
export const ANONYMOUS_AUDIO_LIMIT = 2;

// Legacy aliases for backward compatibility
export const ANONYMOUS_DAILY_LIMIT = ANONYMOUS_PRONUNCIATION_LIMIT;
export const FREE_DAILY_LIMIT = DAILY_LIMIT_PRONUNCIATION;

export type QuotaType = "pronunciation" | "ocr" | "audio";

interface UserQuotaRecord {
  pronunciation?: number;
  ocr?: number;
  audio?: number;
}

interface DailyStore {
  day: string; // YYYY-MM-DD
  users: Record<string, UserQuotaRecord>;
}

export function resolveUserTier({
  authToken,
  hasActiveSubscription,
  isInTrial,
}: {
  authToken?: string | null;
  hasActiveSubscription?: boolean;
  isInTrial?: boolean;
}): UserTier {
  if (!authToken) return "anonymous";
  if (hasActiveSubscription) return "pro";
  if (isInTrial) return "trial";
  return "free";
}

export function resolveUserKey({
  authToken,
  authEmail,
}: {
  authToken?: string | null;
  authEmail?: string | null;
}): string {
  if (!authToken) return "__anonymous__";
  const normalized = String(authEmail || "").trim().toLowerCase();
  return normalized || "__signed_in__";
}

function getCurrentDayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readDailyStore(): DailyStore {
  const currentDay = getCurrentDayKey();
  try {
    const raw = getItem(STORAGE_KEY_DAILY);
    if (!raw) return { day: currentDay, users: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.day !== currentDay) {
      return { day: currentDay, users: {} };
    }
    return {
      day: currentDay,
      users: parsed.users && typeof parsed.users === "object" ? parsed.users : {},
    };
  } catch {
    return { day: currentDay, users: {} };
  }
}

function writeDailyStore(store: DailyStore): void {
  try {
    setItem(STORAGE_KEY_DAILY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/**
 * Get quota usage for a given user and type today
 */
export function getQuotaUsage(userKey: string, type: QuotaType): number {
  if (!userKey) return 0;
  const store = readDailyStore();
  const record = store.users[userKey];
  const value = Number(record?.[type] || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Increment quota usage for a given user and type today
 */
export function incrementQuotaUsage(userKey: string, type: QuotaType): number {
  if (!userKey) return 0;
  const store = readDailyStore();
  const record = store.users[userKey] || {};
  const current = Number(record[type] || 0);
  const next = (Number.isFinite(current) && current > 0 ? current : 0) + 1;
  record[type] = next;
  store.users[userKey] = record;
  writeDailyStore(store);
  return next;
}

/**
 * Get total shared AI usage today across pronunciation, OCR, and audio
 */
export function getLocalSharedUsage(userKey: string): number {
  if (!userKey) return 0;
  const store = readDailyStore();
  const record = store.users[userKey] || {};
  const pron = Number(record.pronunciation) || 0;
  const ocr = Number(record.ocr) || 0;
  const audio = Number(record.audio) || 0;
  return (
    (Number.isFinite(pron) && pron > 0 ? pron : 0) +
    (Number.isFinite(ocr) && ocr > 0 ? ocr : 0) +
    (Number.isFinite(audio) && audio > 0 ? audio : 0)
  );
}

/**
 * Get limits according to tier
 */
export function getQuotaLimitsForTier(tier: UserTier | string): {
  pronunciation: number;
  ocr: number;
  audio: number;
} {
  if (tier === "pro" || tier === "trial") {
    return {
      pronunciation: Infinity,
      ocr: Infinity,
      audio: Infinity,
    };
  }
  if (tier === "free") {
    return {
      pronunciation: MONTHLY_LIMIT_PRONUNCIATION,
      ocr: MONTHLY_LIMIT_OCR,
      audio: MONTHLY_LIMIT_AUDIO,
    };
  }
  return {
    pronunciation: ANONYMOUS_PRONUNCIATION_LIMIT,
    ocr: ANONYMOUS_OCR_LIMIT,
    audio: ANONYMOUS_AUDIO_LIMIT,
  };
}

/**
 * Get comprehensive quota snapshot for UI display
 * The 20 daily uses are shared across all AI features (Pronunciation, OCR, Audio)
 */
export function getMonthlyQuotaSnapshot({
  userKey,
  userTier,
  usageStatus,
}: {
  userKey: string;
  userTier: UserTier | string;
  usageStatus?: any;
}) {
  const isUnlimited = userTier === "pro" || userTier === "trial";

  const totalLimit =
    typeof usageStatus?.daily_limit === "number" && Number.isFinite(usageStatus.daily_limit)
      ? usageStatus.daily_limit
      : DAILY_SHARED_LIMIT;

  let pronRemaining = isUnlimited ? Infinity : totalLimit;
  let pronUsed = 0;

  if (!isUnlimited) {
    if (
      usageStatus &&
      typeof usageStatus.daily_remaining === "number" &&
      Number.isFinite(usageStatus.daily_remaining)
    ) {
      pronRemaining = Math.max(0, usageStatus.daily_remaining);
      pronUsed = Math.max(0, totalLimit - pronRemaining);
    } else {
      const pUsed = getQuotaUsage(userKey, "pronunciation");
      pronUsed = pUsed;
      pronRemaining = Math.max(0, totalLimit - pronUsed);
    }
  }

  const isExhausted = !isUnlimited && pronRemaining <= 0;
  const isLow = !isUnlimited && pronRemaining > 0 && pronRemaining <= 3;

  return {
    isUnlimited,
    shared: {
      used: pronUsed,
      limit: totalLimit,
      remaining: pronRemaining,
      isExhausted,
      isLow,
    },
    pronunciation: {
      used: pronUsed,
      limit: totalLimit,
      remaining: pronRemaining,
      isExhausted,
      isLow,
    },
    ocr: {
      used: 0,
      limit: isUnlimited ? Infinity : 0,
      remaining: isUnlimited ? Infinity : 0,
      isExhausted: !isUnlimited,
      isLow: false,
    },
    audio: {
      used: 0,
      limit: isUnlimited ? Infinity : 0,
      remaining: isUnlimited ? Infinity : 0,
      isExhausted: !isUnlimited,
      isLow: false,
    },
  };
}

export function isPronunciationQuotaExhausted({
  userTier,
  userKey,
  usageStatus,
}: {
  userTier?: UserTier | string;
  userKey?: string;
  usageStatus?: { daily_remaining?: number; [key: string]: any } | null;
} = {}): boolean {
  if (userTier === "pro" || userTier === "trial") return false;
  if (
    usageStatus &&
    typeof usageStatus.daily_remaining === "number" &&
    Number.isFinite(usageStatus.daily_remaining)
  ) {
    return usageStatus.daily_remaining <= 0;
  }
  const key = userKey || "__anonymous__";
  const limit =
    typeof usageStatus?.daily_limit === "number"
      ? usageStatus.daily_limit
      : userTier === "anonymous"
      ? ANONYMOUS_PRONUNCIATION_LIMIT
      : DAILY_SHARED_LIMIT;
  return getLocalSharedUsage(key) >= limit;
}

export function isOcrQuotaExhausted({
  userTier,
}: {
  userTier?: UserTier | string;
  userKey?: string;
  usageStatus?: { daily_remaining?: number; [key: string]: any } | null;
} = {}): boolean {
  if (userTier === "pro" || userTier === "trial") return false;
  // OCR is strictly a Pro-only feature
  return true;
}

export function isAudioQuotaExhausted({
  userTier,
}: {
  userTier?: UserTier | string;
  userKey?: string;
  usageStatus?: { daily_remaining?: number; [key: string]: any } | null;
} = {}): boolean {
  if (userTier === "pro" || userTier === "trial") return false;
  // Generating sample audio via TTS is strictly a Pro-only feature
  return true;
}

// Legacy backward-compatibility methods
export function getDailyLimitForTier(tier: UserTier | string): number {
  return getQuotaLimitsForTier(tier).pronunciation;
}

export function getDailyUsage(userKey: string): number {
  return getQuotaUsage(userKey, "pronunciation");
}

export function incrementDailyUsage(userKey: string): number {
  return incrementQuotaUsage(userKey, "pronunciation");
}

export function isDailyLimitReached(tier: UserTier | string, userKey: string): boolean {
  const limit = getDailyLimitForTier(tier);
  if (!Number.isFinite(limit)) return false;
  return getDailyUsage(userKey) >= limit;
}

export function isQuotaExhausted(params: {
  userTier?: UserTier | string;
  userKey?: string;
  usageStatus?: { daily_remaining?: number; [key: string]: any } | null;
} = {}): boolean {
  return isPronunciationQuotaExhausted(params);
}
