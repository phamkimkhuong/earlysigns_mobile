import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";

function toFileUri(uri: string): string {
  const source = String(uri || "");
  if (!source) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(source)) return source;
  if (source.startsWith("/")) return `file://${source}`;
  return source;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function waitForStableFile(file: File, timeoutMs = 2500): Promise<File> {
  const started = Date.now();
  let lastSize = -1;
  let stableHits = 0;
  while (Date.now() - started < timeoutMs) {
    const size = file.exists ? Number(file.size) || 0 : 0;
    if (size > 0 && size === lastSize) {
      stableHits += 1;
      if (stableHits >= 2) return file;
    } else {
      stableHits = 0;
      lastSize = size;
    }
    await sleep(40);
  }
  if (!file.exists || Number(file.size) <= 0) {
    throw new Error("Recorded audio file is missing.");
  }
  return file;
}

async function snapshotLocalFile(uri: string, filename: string): Promise<string> {
  const original = new File(toFileUri(uri));
  await waitForStableFile(original);
  const dest = new File(Paths.cache, `upload-${Date.now()}-${filename}`);
  if (dest.exists) dest.delete();
  await withTimeout(original.copy(dest, { overwrite: true }), 4000, "Could not copy recorded audio.");
  if (!dest.exists || Number(dest.size) <= 0) {
    throw new Error("Recorded audio file is missing.");
  }
  return dest.uri;
}

export async function appendLocalFile(
  form: FormData,
  field: string,
  uri: string,
  filename: string,
  mimeType?: string
): Promise<void> {
  const source = String(uri || "");
  if (!source) throw new Error("Missing file to upload.");
  if (Platform.OS === "web" || source.startsWith("blob:")) {
    const res = await fetch(source);
    const blob = await res.blob();
    form.append(field, blob, filename);
    return;
  }

  let uploadUri = toFileUri(source);
  try {
    uploadUri = await snapshotLocalFile(source, filename);
  } catch {
    uploadUri = toFileUri(source);
  }

  (form as any).append(field, {
    uri: uploadUri,
    name: filename,
    type: mimeType || "application/octet-stream",
  });
}
