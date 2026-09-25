const DEFAULT_TIMEOUT_MS = 90_000;

export interface XhrResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
  json(): Promise<any>;
  clone(): XhrResponse;
}

export interface XhrFetchOptions {
  method?: string;
  headers?: Record<string, any>;
  body?: any;
  signal?: AbortSignal | null;
  timeout?: number;
}

function parseAllHeaders(raw: string | null): Record<string, string> {
  const headers: Record<string, string> = {};
  String(raw || "")
    .trim()
    .split(/[\r\n]+/)
    .forEach((line) => {
      const index = line.indexOf(":");
      if (index === -1) return;
      const key = line.slice(0, index).trim().toLowerCase();
      const value = line.slice(index + 1).trim();
      if (key) headers[key] = value;
    });
  return headers;
}

function createXhrResponse(xhr: XMLHttpRequest): XhrResponse {
  const status = Number(xhr.status) || 0;
  const text = String(xhr.responseText || "");
  const headerMap = parseAllHeaders(xhr.getAllResponseHeaders());
  const response: XhrResponse = {
    ok: status >= 200 && status < 300,
    status,
    statusText: xhr.statusText || "",
    headers: {
      get(name: string): string | null {
        return headerMap[String(name || "").toLowerCase()] ?? null;
      },
    },
    async text(): Promise<string> {
      return text;
    },
    async json(): Promise<any> {
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    },
    clone(): XhrResponse {
      return response;
    },
  };
  return response;
}

/**
 * Upload FormData with React Native XMLHttpRequest.
 * Expo SDK 57 replaces global fetch and cannot send `{ uri, name, type }` parts.
 */
export function xhrFormDataFetch(
  url: string,
  { method = "POST", headers = {}, body, signal, timeout }: XhrFetchOptions = {}
): Promise<XhrResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    const finish = <T>(cb: (val: T) => void, value: T) => {
      if (settled) return;
      settled = true;
      cb(value);
    };

    xhr.onload = () => finish(resolve, createXhrResponse(xhr));
    xhr.onerror = (e: any) => {
      if (__DEV__) {
        console.warn(`[XHR Form Err] URL: ${url} | Status: ${xhr.status} | ReadyState: ${xhr.readyState}`, e);
      }
      finish(
        reject,
        Object.assign(new TypeError("Network request failed"), { name: "TypeError" })
      );
    };
    xhr.ontimeout = () =>
      finish(reject, Object.assign(new Error("Upload timed out."), { name: "TypeError" }));
    xhr.onabort = () =>
      finish(reject, Object.assign(new Error("Upload aborted."), { name: "AbortError" }));

    if (signal) {
      if (signal.aborted) {
        finish(reject, Object.assign(new Error("Upload aborted."), { name: "AbortError" }));
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          try {
            xhr.abort();
          } catch {
            /* ignore */
          }
        },
        { once: true }
      );
    }

    xhr.open(method || "POST", url);
    xhr.timeout = Number.isFinite(timeout) ? (timeout as number) : DEFAULT_TIMEOUT_MS;
    Object.entries(headers || {}).forEach(([key, value]) => {
      if (value == null) return;
      if (String(key).toLowerCase() === "content-type") return;
      xhr.setRequestHeader(key, String(value));
    });
    xhr.send(body);
  });
}
