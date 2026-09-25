/**
 * Centralized Backend API Endpoints Configuration
 *
 * To change the Backend Base URL:
 * - Update EXPO_PUBLIC_API_BASE in .env (or app.json extra.apiBase)
 * - Or edit API_BASE in src/core/config.ts
 *
 * To change or version any Endpoint Path (e.g. /api/v2/...):
 * - Edit the corresponding entry in API_ENDPOINTS below.
 */

export const API_ENDPOINTS = {
  // 1. Authentication & Account
  AUTH: {
    ME: "/api/auth/me",
    REQUEST_OTP: "/api/auth/request-otp",
    VERIFY_OTP: "/api/auth/verify-otp",
    GOOGLE: "/api/auth/google",
    APPLE: "/api/auth/apple",
    LOGOUT: "/api/auth/logout",
    PREFERENCES: "/api/auth/preferences",
    DELETE_ACCOUNT: "/api/auth/delete-account",
  },

  // 2. Pronunciation AI Check Engine
  CHECK: "/api/check/",

  // 3. Lessons & Learning Journey
  LESSONS: {
    HOME_SUMMARY: (dialect: string = "uk") =>
      `/api/lessons/home-summary?dialect=${encodeURIComponent(dialect)}`,
    PERSONALIZED: (dialect: string = "uk", lazyAssets: boolean = true) =>
      `/api/lessons/personalized?dialect=${encodeURIComponent(dialect)}${
        lazyAssets ? "&lazy_assets=true" : ""
      }`,
    PHONEME: (phoneme: string, dialect: string = "uk", lazyAssets: boolean = true) =>
      `/api/lessons/phoneme/${encodeURIComponent(phoneme)}?dialect=${encodeURIComponent(dialect)}${
        lazyAssets ? "&lazy_assets=true" : ""
      }`,
    PRACTICED: "/api/lessons/practiced",
    JOURNEY_COMPLETE: "/api/lessons/journey-complete",
  },

  // 4. Initial Screening Assessment
  SCREENING: {
    SENTENCES: (dialect: string = "uk") =>
      `/api/screening/sentences?dialect=${encodeURIComponent(dialect)}`,
    COMPLETE: "/api/screening/complete",
  },

  // 5. YouTube Video Practice Catalog
  VIDEOS: {
    LIST: "/api/videos/",
    TOPICS: "/api/videos/topics",
    VIEWED: (limit?: number) =>
      limit ? `/api/videos/viewed?limit=${encodeURIComponent(String(limit))}` : "/api/videos/viewed",
    DETAIL: (youtubeId: string) => `/api/videos/${encodeURIComponent(youtubeId)}`,
    VIEW_START: (youtubeId: string) =>
      `/api/videos/${encodeURIComponent(youtubeId)}/view/start`,
    VIEW_SEGMENT: (youtubeId: string) =>
      `/api/videos/${encodeURIComponent(youtubeId)}/view/segment`,
    SEGMENT_IPA: "/api/videos/segment-ipa",
  },

  // 6. Free Text & Camera OCR Practice
  TEXT_PRACTICE: {
    PREPARE: "/api/prepare/",
    OCR: "/api/text-practice/ocr",
    IPA: "/api/text-practice/ipa",
    AUDIO: "/api/text-practice/audio",
    PASSAGES: "/api/history/passages",
  },

  // 7. Progress & Historical Charts
  PROGRESS: {
    SOUNDS: (dialect: string = "uk") =>
      `/api/progress/sounds?dialect=${encodeURIComponent(dialect)}`,
    HISTORY: (start: string, end: string) =>
      `/api/progress/history?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    LOG_SOUND: "/api/progress/sounds/log",
  },

  // 8. Billing, Quotas & In-App Purchases (IAP)
  BILLING: {
    USAGE: "/api/billing/usage",
    PACKAGES: "/api/billing/packages",
    ACTIVATE_CODE: "/api/billing/activate-code",
    IAP_VERIFY: "/api/billing/iap-verify",
    IAP_RESTORE: "/api/billing/iap-restore",
    CHECKOUT_VERIFY: (orderCode: string) =>
      `/api/billing/checkout/verify?order_code=${encodeURIComponent(orderCode)}`,
  },

  // 9. Error Telemetry Reporting
  ERROR_REPORT: "/api/error-report/",
} as const;

export default API_ENDPOINTS;
