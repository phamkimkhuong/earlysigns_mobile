import { getItem, setItem } from "./storage";
import { MOBILE_FREE_ACCESS } from "@/core/config";
import type { UserTier } from "@/types/domain";

const STORAGE_KEY_MONTHLY = "earlysigns_monthly_quota_v2";

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

interface MonthlyStore {
  month: string; // YYYY-MM
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

function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function readMonthlyStore(): MonthlyStore {
  const currentMonth = getCurrentMonthKey();
  try {
    const raw = getItem(STORAGE_KEY_MONTHLY);
    if (!raw) return { month: currentMonth, users: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.month !== currentMonth) {
      return { month: currentMonth, users: {} };
    }
    return {
      month: currentMonth,
      users: parsed.users && typeof parsed.users === "object" ? parsed.users : {},
    };
  } catch {
    return { month: currentMonth, users: {} };
  }
}

function writeMonthlyStore(store: MonthlyStore): void {
  try {
    setItem(STORAGE_KEY_MONTHLY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

/**
 * Get quota usage for a given user and type
 */
export function getQuotaUsage(userKey: string, type: QuotaType): number {
  if (!userKey) return 0;
  const store = readMonthlyStore();
  const record = store.users[userKey];
  const value = Number(record?.[type] || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Increment quota usage for a given user and type
 */
export function incrementQuotaUsage(userKey: string, type: QuotaType): number {
  if (!userKey) return 0;
  const store = readMonthlyStore();
  const record = store.users[userKey] || {};
  const current = Number(record[type] || 0);
  const next = (Number.isFinite(current) && current > 0 ? current : 0) + 1;
  record[type] = next;
  store.users[userKey] = record;
  writeMonthlyStore(store);
  return next;
}

/**
 * Get total shared AI usage across pronunciation, OCR, and audio
 */
export function getLocalSharedUsage(userKey: string): number {
  if (!userKey) return 0;
  const store = readMonthlyStore();
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
  const isUnlimited = userTier === "pro" || userTier === "trial" || MOBILE_FREE_ACCESS;

  let sharedRemaining = isUnlimited ? Infinity : DAILY_SHARED_LIMIT;
  let sharedUsed = 0;

  if (!isUnlimited) {
    if (
      usageStatus &&
      typeof usageStatus.daily_remaining === "number" &&
      Number.isFinite(usageStatus.daily_remaining)
    ) {
      sharedRemaining = Math.max(0, usageStatus.daily_remaining);
      sharedUsed = Math.max(0, DAILY_SHARED_LIMIT - sharedRemaining);
    } else {
      const pronUsed = getQuotaUsage(userKey, "pronunciation");
      const ocrUsed = getQuotaUsage(userKey, "ocr");
      const audioUsed = getQuotaUsage(userKey, "audio");
      sharedUsed = pronUsed + ocrUsed + audioUsed;
      sharedRemaining = Math.max(0, DAILY_SHARED_LIMIT - sharedUsed);
    }
  }

  const isExhausted = !isUnlimited && sharedRemaining <= 0;
  const isLow = !isUnlimited && sharedRemaining > 0 && sharedRemaining <= 3;

  return {
    isUnlimited,
    shared: {
      used: sharedUsed,
      limit: DAILY_SHARED_LIMIT,
      remaining: sharedRemaining,
      isExhausted,
      isLow,
    },
    pronunciation: {
      used: sharedUsed,
      limit: DAILY_SHARED_LIMIT,
      remaining: sharedRemaining,
      isExhausted,
      isLow,
    },
    ocr: {
      used: sharedUsed,
      limit: DAILY_SHARED_LIMIT,
      remaining: sharedRemaining,
      isExhausted,
      isLow,
    },
    audio: {
      used: sharedUsed,
      limit: DAILY_SHARED_LIMIT,
      remaining: sharedRemaining,
      isExhausted,
      isLow,
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
  if (MOBILE_FREE_ACCESS) return false;
  if (userTier === "pro" || userTier === "trial") return false;
  if (
    usageStatus &&
    typeof usageStatus.daily_remaining === "number" &&
    Number.isFinite(usageStatus.daily_remaining)
  ) {
    return usageStatus.daily_remaining <= 0;
  }
  const key = userKey || "__anonymous__";
  return getLocalSharedUsage(key) >= DAILY_SHARED_LIMIT;
}

export function isOcrQuotaExhausted({
  userTier,
  userKey,
  usageStatus,
}: {
  userTier?: UserTier | string;
  userKey?: string;
  usageStatus?: { daily_remaining?: number; [key: string]: any } | null;
} = {}): boolean {
  if (MOBILE_FREE_ACCESS) return false;
  if (userTier === "pro" || userTier === "trial") return false;
  if (
    usageStatus &&
    typeof usageStatus.daily_remaining === "number" &&
    Number.isFinite(usageStatus.daily_remaining)
  ) {
    return usageStatus.daily_remaining <= 0;
  }
  const key = userKey || "__anonymous__";
  return getLocalSharedUsage(key) >= DAILY_SHARED_LIMIT;
}

export function isAudioQuotaExhausted({
  userTier,
  userKey,
  usageStatus,
}: {
  userTier?: UserTier | string;
  userKey?: string;
  usageStatus?: { daily_remaining?: number; [key: string]: any } | null;
} = {}): boolean {
  if (MOBILE_FREE_ACCESS) return false;
  if (userTier === "pro" || userTier === "trial") return false;
  if (
    usageStatus &&
    typeof usageStatus.daily_remaining === "number" &&
    Number.isFinite(usageStatus.daily_remaining)
  ) {
    return usageStatus.daily_remaining <= 0;
  }
  const key = userKey || "__anonymous__";
  return getLocalSharedUsage(key) >= DAILY_SHARED_LIMIT;
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
