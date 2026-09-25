import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  AudioQuality,
  IOSOutputFormat,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioStream,
} from "expo-audio";
import type { AudioStreamBuffer } from "expo-audio";
import { File, Paths } from "expo-file-system";
import { useTranslation } from "react-i18next";
import { MOBILE_FREE_ACCESS, API_ENDPOINTS } from "@/core/config";
import { incrementDailyUsage, isPronunciationQuotaExhausted } from "@/services/usageLimits";
import { parseErrorDetail } from "@/utils/errors";
import { appendLocalFile } from "@/utils/formDataFile";
import { progressApi } from "@/api";
import { useBillingStore } from "@/store/useBillingStore";
import { httpClient, AppHttpError } from "@/core/httpClient";
import { float32ToWavBytes, pcm16ToWavBytes } from "@/utils/audio";
import type { SentenceCheckResult, UserTier, MicError, Dialect } from "@/types/domain";

const MAX_RECORDING_MS = 60_000;
const SHORT_SILENCE_MS = 700;
const VAD_CALIBRATION_MS = 350;
const DEFAULT_NOISE_FLOOR_DB = -50;
const CHECK_RETRY_DELAY_MS = 400;
const CHECK_TIMEOUT_MS = 90_000;
const LOW_SCORE_THRESHOLD = 0.4;

const RECORDING_OPTIONS: any = {
  isMeteringEnabled: true,
  extension: ".wav",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    extension: ".wav",
    outputFormat: "mpeg4",
    audioEncoder: "aac",
    sampleRate: 16000,
  },
  ios: {
    extension: ".wav",
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 128000,
  },
};

function releasePlayer(player: any) {
  if (!player) return;
  try {
    player.remove();
  } catch {
    /* ignore */
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableCheckError(e: any): boolean {
  if (!e) return false;
  if (e.code === "DAILY_LIMIT_REACHED") return false;
  const status = Number(e.status);
  if (Number.isFinite(status)) {
    if (status === 408 || status === 429 || status === 502 || status === 503 || status === 504) {
      return true;
    }
    if (status >= 400 && status < 500) return false;
  }
  if (e.name === "TypeError" || e.name === "AbortError") return true;
  const msg = String(e.message || e || "");
  return /failed to fetch|networkerror|load failed|network request failed|timed out|aborted/i.test(msg);
}

function classifyMicError(e: any): MicError {
  const name = e?.name || "";
  const message = String(e?.message || e || "");
  if (/not.?allowed|denied|permission/i.test(name + message)) {
    return { type: "denied", raw: message };
  }
  if (/not.?found|unavailable/i.test(name + message)) {
    return { type: "notFound", raw: message };
  }
  return { type: "generic", raw: message };
}

function normalizeAccuracy(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nativeAudioPart() {
  return { name: "speech.wav", type: "audio/wav" };
}

async function appendAudio(form: FormData, uri: string) {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    const blob = await res.blob();
    if (!blob.type.includes("wav")) {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          const pcm = decoded.getChannelData(0);
          const wavBytes = float32ToWavBytes(pcm, decoded.sampleRate || 16000);
          const wavBlob = new Blob([wavBytes as any], { type: "audio/wav" });
          form.append("audio", wavBlob, "speech.wav");
          return;
        }
      } catch {
        /* fallback below */
      }
    }
    form.append("audio", blob, "speech.wav");
    return;
  }
  await appendLocalFile(form, "audio", uri, nativeAudioPart().name, nativeAudioPart().type);
}

export interface UsePronunciationCheckOptions {
  authFetch?: (input: string, init?: any) => Promise<Response>;
  language?: string;
  onUsageUpdated?: (usage: any) => void;
  onDailyLimitReached?: (tier: "anonymous" | "free") => void;
  userTier?: UserTier | string;
  userKey?: string;
  onProgressLogged?: (payload: any) => void;
  isScreening?: boolean;
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
  replayRecording: () => Promise<void>;
}

export function usePronunciationCheck({
  authFetch,
  language = "vi",
  onUsageUpdated,
  onDailyLimitReached,
  userTier = "free",
  userKey = "",
  onProgressLogged,
  isScreening = false,
}: UsePronunciationCheckOptions): UsePronunciationCheckResult {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SentenceCheckResult | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [micError, setMicError] = useState<MicError | null>(null);

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recordingRef = useRef(false);
  const sessionRef = useRef(0);
  const targetRef = useRef<{ text: string; dialect: string } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechSeenRef = useRef(false);
  const sessionCountedRef = useRef(false);
  const soundRef = useRef<any>(null);

  const streamChunksRef = useRef<Uint8Array[]>([]);
  const streamFormatRef = useRef<{ sampleRate: number; channels: number } | null>(null);
  const useStreamRef = useRef(false);
  const stopRecordingRef = useRef<((options?: { check?: boolean }) => Promise<SentenceCheckResult | null>) | null>(null);

  const noiseFloorDbRef = useRef<number>(DEFAULT_NOISE_FLOOR_DB);
  const noiseSamplesRef = useRef<number[]>([]);
  const isCalibratedRef = useRef<boolean>(false);
  const recordingStartTimeRef = useRef<number>(0);

  const handleBuffer = useCallback((buffer: AudioStreamBuffer) => {
    if (!recordingRef.current) return;

    // Track actual stream format provided by hardware/OS
    if (!streamFormatRef.current && buffer.sampleRate && buffer.channels) {
      streamFormatRef.current = {
        sampleRate: buffer.sampleRate,
        channels: buffer.channels,
      };
    }

    const chunk = new Uint8Array(buffer.data);
    streamChunksRef.current.push(chunk);

    const int16 = new Int16Array(buffer.data);
    if (int16.length === 0) return;

    let sumSq = 0;
    for (let i = 0; i < int16.length; i++) {
      const s = int16[i] / 32768.0;
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / int16.length);
    const db = rms > 0.00001 ? 20 * Math.log10(rms) : -120;
    const elapsed = Date.now() - recordingStartTimeRef.current;

    // Phase 1: Calibrate ambient noise floor during initial ~350ms
    if (!isCalibratedRef.current) {
      if (db > -25) {
        // Immediate loud speech
        noiseFloorDbRef.current = DEFAULT_NOISE_FLOOR_DB;
        isCalibratedRef.current = true;
        speechSeenRef.current = true;
      } else {
        noiseSamplesRef.current.push(db);
        if (elapsed >= VAD_CALIBRATION_MS) {
          const sorted = [...noiseSamplesRef.current].sort((a, b) => a - b);
          const medianNoise = sorted[Math.floor(sorted.length / 2)] ?? DEFAULT_NOISE_FLOOR_DB;
          // Clamp noise floor between -65 dB (quiet) and -30 dB (noisy room)
          noiseFloorDbRef.current = Math.min(-30, Math.max(-65, medianNoise));
          isCalibratedRef.current = true;
        }
      }
    }

    // Phase 2: Adaptive speech thresholds with hysteresis
    const noiseFloor = noiseFloorDbRef.current;
    const speechStartThreshold = Math.max(-42, noiseFloor + 12);
    const speechEndThreshold = Math.max(-48, noiseFloor + 6);

    if (!speechSeenRef.current) {
      if (db > speechStartThreshold) {
        speechSeenRef.current = true;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
    } else {
      if (db > speechEndThreshold) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (!silenceTimerRef.current) {
        const currentSession = sessionRef.current;
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          if (sessionRef.current === currentSession) {
            void stopRecordingRef.current?.({ check: true });
          }
        }, SHORT_SILENCE_MS);
      }
    }
  }, []);

  const { stream } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: "int16",
    onBuffer: handleBuffer,
  });

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearMeterTimer = useCallback(() => {
    if (meterTimerRef.current) {
      clearInterval(meterTimerRef.current);
      meterTimerRef.current = null;
    }
  }, []);

  const stopRecorder = useCallback(async (): Promise<string | null> => {
    clearMeterTimer();
    if (!recordingRef.current) return null;
    recordingRef.current = false;

    if (useStreamRef.current && stream) {
      try {
        stream.stop();
      } catch {
        /* ignore */
      }
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          interruptionMode: "mixWithOthers",
        });
      } catch {
        /* ignore */
      }

      const chunks = streamChunksRef.current;
      let totalBytes = 0;
      for (const c of chunks) totalBytes += c.byteLength;
      if (totalBytes === 0) {
        streamChunksRef.current = [];
        return null;
      }

      const allPcm = new Uint8Array(totalBytes);
      let offset = 0;
      for (const c of chunks) {
        allPcm.set(c, offset);
        offset += c.byteLength;
      }
      // Immediately free chunk arrays to release memory
      streamChunksRef.current = [];

      const actualSampleRate = streamFormatRef.current?.sampleRate ?? 16000;
      const actualChannels = streamFormatRef.current?.channels ?? 1;

      const wavBytes = pcm16ToWavBytes(allPcm, actualSampleRate, actualChannels);
      const destFile = new File(Paths.cache, `speech-${Date.now()}.wav`);
      if (destFile.exists) destFile.delete();
      await destFile.create();
      // Write Uint8Array directly - no base64 string allocations
      destFile.write(wavBytes);
      return destFile.uri;
    }

    const uriBeforeStop = recorder.uri || recorder.getStatus?.()?.url || null;
    try {
      await recorder.stop();
    } catch {
      /* ignore */
    }
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
      });
    } catch {
      /* ignore */
    }
    return uriBeforeStop || recorder.uri || recorder.getStatus?.()?.url || null;
  }, [clearMeterTimer, recorder, stream]);

  const logSoundProgress = useCallback(
    async (charAlignment: any) => {
      if (!Array.isArray(charAlignment) || charAlignment.length === 0) return null;
      try {
        const payload = await progressApi.logSoundProgress(charAlignment);
        if (payload) onProgressLogged?.(payload);
        return payload;
      } catch {
        return null;
      }
    },
    [onProgressLogged]
  );

  const recordLocalCheckUsage = useCallback(() => {
    if (MOBILE_FREE_ACCESS) return;
    if (userTier === "pro" || userTier === "trial") return;
    if (sessionCountedRef.current) return;
    sessionCountedRef.current = true;
    if (userKey) incrementDailyUsage(userKey);
  }, [userKey, userTier]);

  const postCheck = useCallback(
    async (
      uri: string,
      { text, dialect }: { text: string; dialect?: Dialect | string },
      shouldCountUsage: boolean
    ) => {
      const form = new FormData();
      form.append("sentence", text);
      form.append("dialect", dialect || "uk");
      form.append("language", language);
      form.append("count_usage", shouldCountUsage ? "true" : "false");
      if (isScreening) form.append("is_screening", "true");
      await appendAudio(form, uri);
      if (authFetch) {
        const controller = new AbortController();
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

  const checkPronunciation = useCallback(
    async (
      uri: string,
      { text, dialect }: { text: string; dialect?: Dialect | string },
      { updateUi = true, countUsage }: { updateUi?: boolean; countUsage?: boolean } = {}
    ): Promise<SentenceCheckResult | null> => {
      if (!uri || !text) return null;
      const shouldCountUsage = countUsage !== undefined ? Boolean(countUsage) : updateUi;
      if (updateUi) {
        setChecking(true);
        setError("");
      }
      try {
        let data: SentenceCheckResult;
        try {
          data = await postCheck(uri, { text, dialect }, shouldCountUsage);
        } catch (firstErr: any) {
          if (!isRetryableCheckError(firstErr)) throw firstErr;
          await sleep(CHECK_RETRY_DELAY_MS);
          data = await postCheck(uri, { text, dialect }, shouldCountUsage);
        }
        if (data.usage) {
          useBillingStore.getState().setUsage(data.usage);
          onUsageUpdated?.(data.usage);
        }
        if (updateUi) {
          if (shouldCountUsage) recordLocalCheckUsage();
          setResult(data);
          setAudioUri(uri);
          const accuracy = normalizeAccuracy(data?.accuracy);
          if (accuracy != null && accuracy >= LOW_SCORE_THRESHOLD) {
            await logSoundProgress(data.char_alignment);
          }
        }
        return data;
      } catch (e: any) {
        if (e?.code === "DAILY_LIMIT_REACHED") {
          if (e?.usage) {
            useBillingStore.getState().setUsage(e.usage);
            onUsageUpdated?.(e.usage);
          }
          onDailyLimitReached?.(userTier === "anonymous" ? "anonymous" : "free");
          if (updateUi) setError("");
          return null;
        }
        if (!updateUi) return null;
        setError(
          isRetryableCheckError(e)
            ? t("sentence.serverError.checkFailed")
            : String(e?.message || e)
        );
        return null;
      } finally {
        if (updateUi) setChecking(false);
      }
    },
    [
      logSoundProgress,
      onDailyLimitReached,
      onUsageUpdated,
      postCheck,
      recordLocalCheckUsage,
      t,
      userTier,
    ]
  );

  const stopRecording = useCallback(
    async ({ check = true }: { check?: boolean } = {}): Promise<SentenceCheckResult | null> => {
      const sessionId = sessionRef.current;
      const target = targetRef.current;
      clearTimers();
      setIsRecording(false);
      setIsStarting(false);
      const uri = await stopRecorder();
      if (!check || !target || sessionId !== sessionRef.current) return null;
      if (!uri) {
        setError("No speech detected. Try again.");
        return null;
      }
      return checkPronunciation(uri, target, { updateUi: true, countUsage: true });
    },
    [checkPronunciation, clearTimers, stopRecorder]
  );

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const startRecording = useCallback(
    async ({ text, dialect }: { text: string; dialect?: Dialect | string }) => {
      if (!text) return;
      if (isPronunciationQuotaExhausted({ userTier, userKey })) {
        onDailyLimitReached?.(userTier === "anonymous" ? "anonymous" : "free");
        return;
      }
      const sessionId = sessionRef.current + 1;
      sessionRef.current = sessionId;
      clearTimers();
      targetRef.current = { text, dialect: dialect || "uk" };
      sessionCountedRef.current = false;
      speechSeenRef.current = false;
      setResult(null);
      setAudioUri(null);
      setError("");
      setMicError(null);
      setIsStarting(true);
      setIsRecording(false);
      await stopRecorder();

      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          throw Object.assign(new Error("Microphone permission denied"), {
            name: "NotAllowedError",
          });
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: "duckOthers",
          shouldRouteThroughEarpiece: false,
        });
        if (sessionRef.current !== sessionId) return;

        // Reset VAD state & stream format
        noiseFloorDbRef.current = DEFAULT_NOISE_FLOOR_DB;
        noiseSamplesRef.current = [];
        isCalibratedRef.current = false;
        recordingStartTimeRef.current = Date.now();
        streamChunksRef.current = [];
        streamFormatRef.current = null;

        if (Platform.OS !== "web") {
          if (!stream || typeof stream.start !== "function") {
            throw new Error(t("sentence.micError.generic.body") || "Microphone stream is not available on this device.");
          }
          useStreamRef.current = true;
          await stream.start();
        } else {
          // Web fallback: useAudioRecorder (decoded to WAV in appendAudio via Web Audio API)
          useStreamRef.current = false;
          await recorder.prepareToRecordAsync();
          recorder.record();
          meterTimerRef.current = setInterval(() => {
            if (sessionRef.current !== sessionId) return;
            const status = recorder.getStatus();
            if (!status?.isRecording) return;
            const metering = Number(status.metering);
            const isSpeech = Number.isFinite(metering) && metering > -32;
            if (isSpeech) {
              speechSeenRef.current = true;
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
              return;
            }
            if (speechSeenRef.current && !silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                silenceTimerRef.current = null;
                if (sessionRef.current === sessionId) {
                  void stopRecordingRef.current?.({ check: true });
                }
              }, SHORT_SILENCE_MS);
            }
          }, 80);
        }

        if (sessionRef.current !== sessionId) {
          try {
            if (useStreamRef.current && stream) stream.stop();
            else await recorder.stop();
          } catch {
            /* ignore */
          }
          return;
        }

        recordingRef.current = true;
        setIsRecording(true);
        setIsStarting(false);
        timeoutRef.current = setTimeout(() => {
          if (sessionRef.current === sessionId) {
            void stopRecordingRef.current?.({ check: true });
          }
        }, MAX_RECORDING_MS);
      } catch (e: any) {
        if (sessionRef.current !== sessionId) return;
        setIsRecording(false);
        setIsStarting(false);
        const classified = classifyMicError(e);
        setMicError(classified);
        setError(
          classified.type === "denied"
            ? t("sentence.micError.denied.body")
            : classified.type === "notFound"
            ? t("sentence.micError.notFound.body")
            : t("sentence.micError.generic.body") || "Unable to start microphone recording. Please try again."
        );
      }
    },
    [clearTimers, onDailyLimitReached, recorder, stopRecorder, stream, t, userKey, userTier]
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setAudioUri(null);
    setError("");
  }, []);

  const replayRecording = useCallback(async () => {
    if (!audioUri) return;
    try {
      releasePlayer(soundRef.current);
      soundRef.current = null;
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      const player = createAudioPlayer({ uri: audioUri });
      soundRef.current = player;
      player.addListener("playbackStatusUpdate", (status: any) => {
        if (status?.didJustFinish) {
          releasePlayer(player);
          if (soundRef.current === player) soundRef.current = null;
        }
      });
      player.play();
    } catch {
      /* ignore replay errors */
    }
  }, [audioUri]);

  useEffect(() => {
    return () => {
      clearTimers();
      sessionRef.current += 1;
      streamChunksRef.current = [];
      void stopRecorder();
      releasePlayer(soundRef.current);
      soundRef.current = null;
      if (Platform.OS !== "web") {
        setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      }
    };
  }, [clearTimers, stopRecorder]);

  return {
    isRecording,
    isStarting,
    checking,
    result,
    audioUri,
    audioBlob: audioUri,
    error,
    micError,
    startRecording,
    stopRecording,
    checkPronunciation,
    clearResult,
    replayRecording,
  };
}
