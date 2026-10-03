import { releaseAudioPlayer } from "@/utils/audioPlayer";
import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { Linking } from "react-native";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS } from "@/core/config";
import { isPronunciationQuotaExhausted } from "@/services/usageLimits";
import { RecordingSession, MicrophonePermissionError, prepareAudioPlayback, type RecordingPhase } from "@/services/recordingSession";
import { customAlert } from "@/utils/customAlert";
import { micErrorBodyKey } from "@/utils/micError";
import { parseErrorDetail } from "@/utils/errors";
import { appendLocalFile } from "@/utils/formDataFile";
import { progressApi } from "@/api";
import { useBillingStore } from "@/store/useBillingStore";
import { httpClient, AppHttpError } from "@/core/httpClient";
import type { SentenceCheckResult, UserTier, MicError, Dialect } from "@/types/domain";

const DEFAULT_MAX_RECORDING_MS = 25_000;
const CHECK_TIMEOUT_MS = 90_000;
const LOW_SCORE_THRESHOLD = 0.4;

function classifyMicError(error: unknown): MicError {
  if (error instanceof MicrophonePermissionError) {
    return { type: "denied", raw: error.message, canAskAgain: error.canAskAgain };
  }
  const message = String((error as Error)?.message || error || "");
  return { type: /permission|denied/i.test(message) ? "denied" : /not.?found|unavailable/i.test(message) ? "notFound" : "generic", raw: message };
}

async function appendAudio(form: FormData, uri: string) {
  const ext = uri.split("?")[0].split(".").pop()?.toLowerCase();
  const [name, type] = ext === "m4a" ? ["speech.m4a", "audio/mp4"] : ext === "webm" ? ["speech.webm", "audio/webm"] : ["speech.wav", "audio/wav"];
  await appendLocalFile(form, "audio", uri, name, type);
}

export interface UsePronunciationCheckOptions {
  enabled?: boolean;
  authFetch?: (input: string, init?: any) => Promise<Response>;
  language?: string;
  onUsageUpdated?: (usage: any) => void;
  onDailyLimitReached?: (tier: "anonymous" | "free") => void;
  userTier?: UserTier | string;
  userKey?: string;
  onProgressLogged?: (payload: any) => void;
  isScreening?: boolean;
  maxRecordingMs?: number;
  autoStopOnSilence?: boolean;
}

export interface UsePronunciationCheckResult {
  isRecording: boolean;
  isStarting: boolean;
  checking: boolean;
  result: SentenceCheckResult | null;
  audioUri: string | null;
  audioBlob: string | null;
  error: string;
  micError: MicError | null;
  startRecording: (target: { text: string; dialect?: Dialect | string }) => Promise<void>;
  stopRecording: (options?: { check?: boolean }) => Promise<SentenceCheckResult | null>;
  checkPronunciation: (
    uri: string,
    target: { text: string; dialect?: Dialect | string },
    options?: { updateUi?: boolean; countUsage?: boolean }
  ) => Promise<SentenceCheckResult | null>;
  clearResult: () => void;
  cancelRecording: () => Promise<void>;
  replayRecording: () => Promise<void>;
}

export function usePronunciationCheck({
  enabled = true, authFetch, language = "vi", onUsageUpdated, onDailyLimitReached,
  userTier = "free", userKey = "", onProgressLogged, isScreening = false,
  maxRecordingMs = DEFAULT_MAX_RECORDING_MS, autoStopOnSilence = false,
}: UsePronunciationCheckOptions): UsePronunciationCheckResult {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<RecordingPhase>("idle");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SentenceCheckResult | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [micError, setMicError] = useState<MicError | null>(null);
  const mounted = useRef(false);
  const session = useRef<RecordingSession | null>(null);
  const attempt = useRef(0);
  const busy = useRef(false);
  const target = useRef<{ text: string; dialect?: Dialect | string } | null>(null);
  const request = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meter = useRef<ReturnType<typeof setInterval> | null>(null);
  const sound = useRef<AudioPlayer | null>(null);
  const soundListener = useRef<{ remove(): void } | null>(null);
  const replayId = useRef(0);
  const callbacks = useRef({ onUsageUpdated, onDailyLimitReached, onProgressLogged, t });
  useEffect(() => { callbacks.current = { onUsageUpdated, onDailyLimitReached, onProgressLogged, t }; }, [onUsageUpdated, onDailyLimitReached, onProgressLogged, t]);

  const stopPlayback = useCallback(() => {
    ++replayId.current;
    soundListener.current?.remove();
    soundListener.current = null;
    releaseAudioPlayer(sound.current);
    sound.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (meter.current) clearInterval(meter.current);
    timer.current = null;
    meter.current = null;
  }, []);

  const invalidate = useCallback(() => {
    ++attempt.current;
    request.current?.abort();
    request.current = null;
    busy.current = false;
    clearTimers();
    stopPlayback();
    if (mounted.current) setChecking(false);
  }, [clearTimers, stopPlayback]);

  useEffect(() => {
    mounted.current = true;
    const recorder = new RecordingSession(
      state => { if (mounted.current) setPhase(state); },
      failure => {
        if (!mounted.current) return;
        const classified = classifyMicError(failure);
        if (classified.type !== "denied") console.warn("[Recording] Native operation failed:", failure);
        setMicError(classified);
        const translate = callbacks.current.t;
        const message = translate(
          micErrorBodyKey(classified),
          classified.type === "denied" ? "Ứng dụng cần quyền micro để ghi âm phát âm của bạn." : "Không thể ghi âm. Vui lòng thử lại.",
        );
        setError(classified.type === "denied" ? "" : message);
        if (classified.type === "denied") {
          customAlert.alert(
            translate("sentence.micError.denied.title"),
            message,
            classified.canAskAgain === false ? [
              { text: translate("common.cancel"), style: "cancel" },
              { text: translate("sentence.micError.openSettings"), onPress: () => { void Linking.openSettings().catch(() => {}); } },
            ] : [{ text: translate("common.ok") }],
          );
        }
      },
      invalidate,
    );
    session.current = recorder;
    return () => {
      mounted.current = false;
      invalidate();
      session.current = null;
      recorder.dispose();
    };
  }, [invalidate]);

  const cancelRecording = useCallback(async () => {
    invalidate();
    await session.current?.cancel();
  }, [invalidate]);

  useEffect(() => { if (!enabled) void cancelRecording(); }, [enabled, cancelRecording]);

  const current = useCallback((id: number) => mounted.current && id === attempt.current, []);

  const postCheck = useCallback(
    async (
      uri: string,
      { text, dialect }: { text: string; dialect?: Dialect | string },
      shouldCountUsage: boolean,
      signal: AbortSignal
    ) => {
      const form = new FormData();
      form.append("sentence", text);
      form.append("dialect", dialect || "uk");
      form.append("language", language);
      form.append("count_usage", !isScreening && shouldCountUsage ? "true" : "false");
      if (isScreening) form.append("is_screening", "true");
      await appendAudio(form, uri);
      if (signal.aborted) throw new Error("Recording attempt cancelled");
      if (authFetch) {
        const controller = new AbortController();
        const abort = () => controller.abort();
        signal.addEventListener("abort", abort, { once: true });
        const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
        let res: Response;
        try {
          res = await authFetch(API_ENDPOINTS.CHECK, {
            method: "POST",
            body: form,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
          signal.removeEventListener("abort", abort);
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const parsed = parseErrorDetail(data.detail);
          const err: any = new Error(parsed.message || "Pronunciation check failed.");
          err.code = parsed.code || "";
          err.usage = parsed.usage || null;
          err.status = res.status;
          throw err;
        }
        return data;
      }

      try {
        const data = await httpClient.upload<SentenceCheckResult>(API_ENDPOINTS.CHECK, form, {
          timeoutMs: CHECK_TIMEOUT_MS,
          signal,
        });
        return data;
      } catch (err: any) {
        if (err instanceof AppHttpError) {
          const parsed = parseErrorDetail(err.detail);
          const wrapped: any = new Error(parsed.message || err.message);
          wrapped.code = parsed.code || "";
          wrapped.usage = parsed.usage || null;
          wrapped.status = err.status;
          throw wrapped;
        }
        throw err;
      }
    },
    [authFetch, language, isScreening]
  );

  const checkPronunciation = useCallback(async (
    uri: string, checkTarget: { text: string; dialect?: Dialect | string },
    { updateUi = true, countUsage = updateUi }: { updateUi?: boolean; countUsage?: boolean } = {},
  ): Promise<SentenceCheckResult | null> => {
    if (!uri || !checkTarget.text || request.current || !mounted.current) return null;
    const id = attempt.current;
    const controller = new AbortController();
    request.current = controller;
    if (updateUi) { setChecking(true); setError(""); }
    try {
      // A retry without a server idempotency key can count the same attempt twice.
      const data = await postCheck(uri, checkTarget, countUsage, controller.signal);
      if (!current(id)) return null;
      if (data.usage && !isScreening) {
        useBillingStore.getState().setUsage(data.usage);
        callbacks.current.onUsageUpdated?.(data.usage);
      }
      if (updateUi) {
        setResult(data);
        setAudioUri(uri);
        if (Number(data.accuracy) >= LOW_SCORE_THRESHOLD && Array.isArray(data.char_alignment) && data.char_alignment.length) {
          void progressApi.logSoundProgress(data.char_alignment).then(payload => {
            if (current(id) && payload) callbacks.current.onProgressLogged?.(payload);
          }).catch(() => {});
        }
      }
      return data;
    } catch (failure: any) {
      if (!current(id) || controller.signal.aborted) return null;
      if (failure?.code === "DAILY_LIMIT_REACHED" && !isScreening) {
        if (failure.usage) {
          useBillingStore.getState().setUsage(failure.usage);
          callbacks.current.onUsageUpdated?.(failure.usage);
        }
        callbacks.current.onDailyLimitReached?.(userTier === "anonymous" ? "anonymous" : "free");
      } else if (updateUi) {
        setError(failure?.status === 0 || failure?.name === "TypeError" || failure?.name === "AbortError"
          ? t("sentence.serverError.checkFailed") : String(failure?.message || failure));
      }
      return null;
    } finally {
      if (request.current === controller) request.current = null;
      if (current(id) && updateUi) setChecking(false);
    }
  }, [current, isScreening, postCheck, t, userTier]);

  const stopRecording = useCallback(async ({ check = true }: { check?: boolean } = {}): Promise<SentenceCheckResult | null> => {
    const recorder = session.current;
    if (recorder?.phase !== "recording") return null;
    const id = attempt.current;
    const checkTarget = target.current;
    clearTimers();
    if (check) setChecking(true); // Includes native stop; never expose an idle tappable gap.
    try {
      const uri = await recorder.stop();
      if (!current(id)) return null;
      if (!uri) { setError("No speech detected. Try again."); return null; }
      setAudioUri(uri);
      if (!check || !checkTarget) return null;
      return await checkPronunciation(uri, checkTarget, { countUsage: !isScreening });
    } finally {
      if (current(id)) { busy.current = false; setChecking(false); }
    }
  }, [checkPronunciation, clearTimers, current, isScreening]);

  const startRecording = useCallback(async (checkTarget: { text: string; dialect?: Dialect | string }) => {
    const recorder = session.current;
    if (!enabled || !checkTarget.text || busy.current || request.current || !recorder || recorder.phase !== "idle") return;
    if (!isScreening && isPronunciationQuotaExhausted({ userTier, userKey, usageStatus: useBillingStore.getState().usage })) {
      callbacks.current.onDailyLimitReached?.(userTier === "anonymous" ? "anonymous" : "free");
      return;
    }
    busy.current = true;
    const id = ++attempt.current;
    target.current = checkTarget;
    stopPlayback();
    setResult(null); setAudioUri(null); setError(""); setMicError(null);
    const started = await recorder.start();
    if (!current(id)) return;
    if (!started) { busy.current = false; return; }
    timer.current = setTimeout(() => { if (current(id)) void stopRecording(); }, maxRecordingMs);
    if (autoStopOnSilence) {
      let speechSeen = false;
      let silentSince: number | null = null;
      meter.current = setInterval(() => {
        const level = recorder.metering();
        if (!current(id) || level == null) return;
        if (level > -32) { speechSeen = true; silentSince = null; }
        else if (speechSeen) {
          silentSince ??= Date.now();
          if (Date.now() - silentSince >= 700) void stopRecording();
        }
      }, 80);
    }
  }, [autoStopOnSilence, current, enabled, isScreening, maxRecordingMs, stopPlayback, stopRecording, userKey, userTier]);

  const clearResult = useCallback(() => {
    void cancelRecording();
    setResult(null); setAudioUri(null); setError(""); setMicError(null);
  }, [cancelRecording]);

  const replayRecording = useCallback(async () => {
    if (!audioUri || busy.current || !enabled) return;
    stopPlayback();
    const id = replayId.current;
    try {
      if (!await prepareAudioPlayback()) return;
      if (!mounted.current || id !== replayId.current || busy.current) return;
      const player = createAudioPlayer({ uri: audioUri });
      sound.current = player;
      soundListener.current = player.addListener("playbackStatusUpdate", status => {
        if (status.didJustFinish && sound.current === player) stopPlayback();
      });
      player.play();
    } catch { if (id === replayId.current) stopPlayback(); }
  }, [audioUri, enabled, stopPlayback]);

  return {
    isRecording: phase === "recording",
    isStarting: phase === "requesting" || phase === "preparing" || phase === "stopping",
    checking, result, audioUri, audioBlob: audioUri, error, micError,
    startRecording, stopRecording, checkPronunciation, clearResult, replayRecording, cancelRecording,
  };
}
