/** Pick en/vi message from API error detail based on active i18n language. */
export function pickLocalizedMessage(detail: any, language?: string, fallback = ""): string {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail || fallback;
  if (typeof detail === "object") {
    const msg = detail.message;
    if (msg && typeof msg === "object") {
      const lang = String(language || "vi").toLowerCase();
      if (lang.startsWith("vi")) {
        return msg.vi || msg.en || fallback;
      }
      return msg.en || msg.vi || fallback;
    }
    if (typeof msg === "string") return msg || fallback;
    if (typeof detail.message === "string") return detail.message || fallback;
  }
  return fallback;
}

export function parseApiError(data: any, language?: string, fallback = "Request failed."): string {
  return pickLocalizedMessage(data?.detail, language, fallback);
}
