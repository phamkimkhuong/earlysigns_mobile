import { useCallback, useEffect, useRef, useState } from "react";
import { videoApi } from "@/api";
import { API_ENDPOINTS } from "@/core/config";

const cache = new Map<string, any[]>();
const inflight = new Map<string, Promise<any[]>>();

export function cacheKey(dialect?: string, text?: string): string {
  return `${dialect || ""}:${String(text || "").trim().toLowerCase()}`;
}

async function fetchSegmentIpa(
  authFetch: (url: string, init?: any) => Promise<Response>,
  text: string,
  dialect?: string
): Promise<any[]> {
  const res = await authFetch(API_ENDPOINTS.VIDEOS.SEGMENT_IPA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, dialect }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.detail === "string" ? data.detail : "Failed to load IPA");
  }
  return Array.isArray(data.words) ? data.words : [];
}

export async function loadSegmentIpa(
  authFetch?: ((url: string, init?: any) => Promise<Response>) | null,
  text?: string,
  dialect?: string
): Promise<any[]> {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];
  const key = cacheKey(dialect, trimmed);
  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;
  const promise = (
    authFetch
      ? fetchSegmentIpa(authFetch, trimmed, dialect)
      : videoApi.getSegmentIpa(trimmed, dialect)
  )
    .then((rows) => {
      cache.set(key, rows);
      return rows;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

export interface UseSegmentIpaParams {
  authFetch?: ((url: string, init?: any) => Promise<Response>) | null;
  text?: string;
  dialect?: string;
  prefetchText?: string;
}

export interface UseSegmentIpaResult {
  words: any[];
  loading: boolean;
  error: string;
}

export function useSegmentIpa({
  authFetch,
  text,
  dialect,
  prefetchText = "",
}: UseSegmentIpaParams): UseSegmentIpaResult {
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const requestIdRef = useRef<number>(0);
  const authFetchRef = useRef(authFetch);

  useEffect(() => {
    authFetchRef.current = authFetch;
  }, [authFetch]);

  const loadWords = useCallback(async (targetText: string, targetDialect?: string) => {
    return loadSegmentIpa(authFetchRef.current, targetText, targetDialect);
  }, []);

  useEffect(() => {
    const trimmed = String(text || "").trim();
    if (!trimmed) {
      setWords([]);
      setLoading(false);
      setError("");
      return undefined;
    }
    const key = cacheKey(dialect, trimmed);
    if (cache.has(key)) {
      setWords(cache.get(key)!);
      setLoading(false);
      setError("");
    } else {
      setWords([]);
      setLoading(true);
      setError("");
    }
    let cancelled = false;
    requestIdRef.current += 1;
    const reqId = requestIdRef.current;
    (async () => {
      try {
        const rows = await loadWords(trimmed, dialect);
        if (cancelled || reqId !== requestIdRef.current) return;
        setWords(rows);
        setError("");
      } catch (err: any) {
        if (cancelled || reqId !== requestIdRef.current) return;
        setWords([]);
        setError(String(err?.message || err));
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, text, dialect, loadWords]);

  useEffect(() => {
    const trimmed = String(prefetchText || "").trim();
    if (!trimmed) return undefined;
    const key = cacheKey(dialect, trimmed);
    if (cache.has(key) || inflight.has(key)) return undefined;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      try {
        await loadWords(trimmed, dialect);
      } catch {
        /* silent prefetch */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, prefetchText, dialect, loadWords]);

  return { words, loading, error };
}

export function clearSegmentIpaCache(): void {
  cache.clear();
  inflight.clear();
}
