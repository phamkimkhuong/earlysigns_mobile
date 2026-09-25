export interface ParsedErrorDetail {
  code: string;
  message: string;
  usage?: any;
  retryable?: boolean;
}

export function parseErrorDetail(rawDetail: any): ParsedErrorDetail {
  if (!rawDetail) return { code: "", message: "" };
  if (typeof rawDetail === "string") return { code: "", message: rawDetail };
  if (typeof rawDetail === "object") {
    return {
      code: String(rawDetail.code || ""),
      message: String(rawDetail.message || rawDetail.detail || "Request failed."),
      usage: rawDetail.usage || null,
      retryable: rawDetail.retryable !== false,
    };
  }
  return { code: "", message: String(rawDetail) };
}

export function stripHtml(html: string | null | undefined): string {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function formatDuration(ms: number | string | null | undefined): string {
  const totalSec = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatMs(ms: number | string | null | undefined): string {
  const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatVnd(amount: number | string | null | undefined, language: string = "vi"): string {
  const value = Number(amount || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  const locale = String(language || "vi").toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
  return `${value.toLocaleString(locale)} VNĐ`;
}

export function formatExpiryDate(ts: number | string | null | undefined, language?: string): string {
  const seconds = Number(ts || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const locale = String(language || "vi").toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
  try {
    return new Date(seconds * 1000).toLocaleString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(seconds * 1000).toISOString();
  }
}

export function topicLabel(topic: string | undefined, t: (key: string) => string): string {
  const key = `videos.topics.${topic}`;
  const translated = t(key);
  return translated === key ? String(topic || "").replace(/-/g, " ") : translated;
}

export function videoThumbnail(video?: { thumbnail_url?: string; youtube_id?: string } | null): string {
  const url = String(video?.thumbnail_url || "").trim();
  if (url) return url;
  const id = String(video?.youtube_id || "").trim();
  if (id) return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
  return "";
}
