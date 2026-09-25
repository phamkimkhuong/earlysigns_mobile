/** Allow only same-origin relative redirects after login. */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let value = String(raw).trim();
  if (!value) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.startsWith("/login")) return null;
  return value;
}
