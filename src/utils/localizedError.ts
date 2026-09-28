import { getFriendlyErrorMessage } from "@/core/errorManager";

/**
 * Pick en/vi message from API error detail based on active i18n language.
 * Delegates to centralized errorManager.
 */
export function pickLocalizedMessage(detail: any, language?: string, fallback = ""): string {
  if (!detail) return fallback;
  const lang = String(language || "vi").toLowerCase().startsWith("en") ? "en" : "vi";
  return getFriendlyErrorMessage({ detail }, fallback, lang);
}

export function parseApiError(data: any, language?: string, fallback = "Request failed."): string {
  const lang = String(language || "vi").toLowerCase().startsWith("en") ? "en" : "vi";
  return getFriendlyErrorMessage(data, fallback, lang);
}

export { getFriendlyErrorMessage } from "@/core/errorManager";
