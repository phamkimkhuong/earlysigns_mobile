/** Trim and lowercase for stable login identity (matches backend normalize_login_email). */
export function normalizeLoginEmail(raw: string | null | undefined): string {
  return String(raw ?? "").trim().toLowerCase();
}
