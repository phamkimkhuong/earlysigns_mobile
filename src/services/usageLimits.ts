import { getItem, setItem } from "./storage";
import { MOBILE_FREE_ACCESS } from "@/core/config";
import type { UserTier } from "@/types/domain";

const STORAGE_KEY_MONTHLY = "earlysigns_monthly_quota_v2";

// Monthly Quotas per Spec Section 14
export const MONTHLY_LIMIT_PRONUNCIATION = 100;
export const MONTHLY_LIMIT_OCR = 20;
export const MONTHLY_LIMIT_AUDIO = 20;

// Anonymous limits
export const ANONYMOUS_PRONUNCIATION_LIMIT = 5;
export const ANONYMOUS_OCR_LIMIT = 2;
export const ANONYMOUS_AUDIO_LIMIT = 2;

// Legacy aliases for backward compatibility
export const ANONYMOUS_DAILY_LIMIT = ANONYMOUS_PRONUNCIATION_LIMIT;
export const FREE_DAILY_LIMIT = MONTHLY_LIMIT_PRONUNCIATION;

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
  const limits = getQuotaLimitsForTier(userTier);
  const isUnlimited = userTier === "pro" || userTier === "trial" || MOBILE_FREE_ACCESS;

  // Pronunciation checks: use server usageStatus if available, else local store
  let pronUsed = getQuotaUsage(userKey, "pronunciation");
  let pronRemaining = isUnlimited ? Infinity : Math.max(0, limits.pronunciation - pronUsed);

  if (
    !isUnlimited &&
    usageStatus &&
    typeof usageStatus.daily_remaining === "number" &&
    Number.isFinite(usageStatus.daily_remaining)
  ) {
    pronRemaining = usageStatus.daily_remaining;
    pronUsed = Math.max(0, limits.pronunciation - pronRemaining);
  }

  // OCR and Audio
  const ocrUsed = getQuotaUsage(userKey, "ocr");
  const ocrRemaining = isUnlimited ? Infinity : Math.max(0, limits.ocr - ocrUsed);

  const audioUsed = getQuotaUsage(userKey, "audio");
  const audioRemaining = isUnlimited ? Infinity : Math.max(0, limits.audio - audioUsed);

  return {
    isUnlimited,
    pronunciation: {
      used: pronUsed,
      limit: limits.pronunciation,
      remaining: pronRemaining,
      isExhausted: !isUnlimited && pronRemaining <= 0,
      isLow: !isUnlimited && pronRemaining > 0 && pronRemaining <= 10,
    },
    ocr: {
      used: ocrUsed,
      limit: limits.ocr,
      remaining: ocrRemaining,
      isExhausted: !isUnlimited && ocrRemaining <= 0,
      isLow: !isUnlimited && ocrRemaining > 0 && ocrRemaining <= 3,
    },
    audio: {
      used: audioUsed,
      limit: limits.audio,
      remaining: audioRemaining,
      isExhausted: !isUnlimited && audioRemaining <= 0,
      isLow: !isUnlimited && audioRemaining > 0 && audioRemaining <= 3,
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
  const limit = getQuotaLimitsForTier(userTier || "anonymous").pronunciation;
  return getQuotaUsage(key, "pronunciation") >= limit;
}

export function isOcrQuotaExhausted({
  userTier,
  userKey,
}: {
  userTier?: UserTier | string;
  userKey?: string;
} = {}): boolean {
  if (MOBILE_FREE_ACCESS) return false;
  if (userTier === "pro" || userTier === "trial") return false;
  const key = userKey || "__anonymous__";
  const limit = getQuotaLimitsForTier(userTier || "anonymous").ocr;
  return getQuotaUsage(key, "ocr") >= limit;
}

export function isAudioQuotaExhausted({
  userTier,
  userKey,
}: {
  userTier?: UserTier | string;
  userKey?: string;
} = {}): boolean {
  if (MOBILE_FREE_ACCESS) return false;
  if (userTier === "pro" || userTier === "trial") return false;
  const key = userKey || "__anonymous__";
  const limit = getQuotaLimitsForTier(userTier || "anonymous").audio;
  return getQuotaUsage(key, "audio") >= limit;
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
