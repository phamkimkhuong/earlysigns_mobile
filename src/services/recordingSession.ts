import { AppState, Platform } from "react-native";
import { logger } from "@/core/logger";
import {
  AudioModule, AudioQuality, IOSOutputFormat,
  getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync,
  type AudioRecorder, type RecordingOptions,
} from "expo-audio";
const nativeAudioModule = AudioModule;
const NativeRecorder = nativeAudioModule.AudioRecorder;

export type RecordingPhase = "idle" | "requesting" | "preparing" | "recording" | "stopping";

export class MicrophonePermissionError extends Error {
  constructor(public readonly canAskAgain: boolean) {
    super("Microphone permission denied");
    this.name = "MicrophonePermissionError";
  }
}

const OPTIONS: RecordingOptions = {
  extension: ".wav", sampleRate: 16000, numberOfChannels: 1, bitRate: 128000,
  isMeteringEnabled: true,
  android: { extension: ".m4a", outputFormat: "mpeg4", audioEncoder: "aac" },
  ios: {
    extension: ".wav", outputFormat: IOSOutputFormat.LINEARPCM, audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false,
  },
  web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
};

// Audio mode is global. Old cleanup must finish before another screen prepares its recorder.
// Preserve ownership/ordering when Metro replaces this module during Fast Refresh.
const audioGlobal = globalThis as typeof globalThis & {
  __earlySignsRecording?: { owner: RecordingSession | null; queue: Promise<unknown> };
};
const runtime = audioGlobal.__earlySignsRecording ??= { owner: null, queue: Promise.resolve() };
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = runtime.queue.then(operation);
  runtime.queue = next.catch(() => {});
  return next;
}
export function prepareAudioPlayback(): Promise<boolean> {
  return serialize(async () => {
    if (runtime.owner) return false;
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    return runtime.owner === null;
  });
}
function isForeground() {
  return AppState.currentState === "active" || AppState.currentState == null;
}

/** Owns the native object, including its release after any pending prepare/stop finishes. */
export class RecordingSession {
  phase: RecordingPhase = "idle";
  private recorder: AudioRecorder | null = null;
  private listener: { remove(): void } | null = null;
  private prepared = false;
  private modeChanged = false;
  private generation = 0;
  private disposed = false;
  private permissionTransition = false;
  private windowFocused = true;
  private startPending = false;
  private waitingForForeground = false;
  private wake: (() => void) | null = null;
  private appSubscription: { remove(): void };
  private focusSubscriptions: { remove(): void }[] = [];

  constructor(
    private onPhase: (phase: RecordingPhase) => void,
    private onError: (error: unknown) => void,
    private onInterrupt: () => void,
  ) {
    this.appSubscription = AppState.addEventListener("change", state => {
      this.trace("app-state", { state });
      this.wake?.();
      // Permission results and lifecycle events may arrive in either order.
      // Protect the entire grant-to-record transition, not just the request Promise.
      if (state === "active" || this.waitingForForeground ||
        (this.permissionTransition && this.startPending && this.phase !== "recording")) return;
      this.onInterrupt();
      if (this.phase !== "idle") void this.cancel("background");
    });
    if (Platform.OS === "android") {
      this.focusSubscriptions = [
        AppState.addEventListener("blur", () => {
          this.windowFocused = false;
          this.trace("window-blur");
          this.wake?.();
        }),
        AppState.addEventListener("focus", () => {
          this.windowFocused = true;
          this.trace("window-focus");
          this.wake?.();
        }),
      ];
    }
  }

  private trace(event: string, details?: Record<string, unknown>) {
    logger.debug("Recording", event, {
      generation: this.generation, phase: this.phase,
      appState: AppState.currentState, windowFocused: this.windowFocused, ...details,
    });
  }

  private readyToRecord() {
    return isForeground() && (Platform.OS !== "android" || this.windowFocused);
  }

  private setPhase(phase: RecordingPhase) {
    this.phase = phase;
    this.trace("phase");
    if (!this.disposed) this.onPhase(phase);
  }

  private valid(id: number) {
    return !this.disposed && id === this.generation;
  }

  private async waitForForeground(id: number) {
    if (this.readyToRecord()) return;
    this.waitingForForeground = true;
    this.trace("wait-for-foreground");
    await new Promise<void>(resolve => {
      const timer = setTimeout(resolve, 5000);
      this.wake = () => {
        if (!this.valid(id) || this.readyToRecord()) {
          clearTimeout(timer);
          resolve();
        }
      };
    });
    this.wake = null;
    this.waitingForForeground = false;
    if (this.valid(id) && !this.readyToRecord()) {
      throw new Error("Microphone requires the app to be in the foreground with window focus");
    }
  }

  async start(): Promise<boolean> {
    if (this.disposed || this.startPending || this.phase !== "idle") {
      this.trace("start-ignored", { disposed: this.disposed, startPending: this.startPending });
      return false;
    }
    if (runtime.owner && runtime.owner !== this) {
      this.onError(new Error("Microphone is being used by another recording screen"));
      return false;
    }
    runtime.owner = this;
    this.startPending = true;
    const id = ++this.generation;
    this.setPhase("requesting"); // Lock before the first await, including permission lookup.
    try {
      let permission = await getRecordingPermissionsAsync();
      this.trace("permission-query", { granted: permission.granted, canAskAgain: permission.canAskAgain });
      if (!this.valid(id)) return false;
      if (!permission.granted) {
        // Android's query can retain Expo's blocked flag after Settings changes
        // to "Ask every time". One request per user tap refreshes that flag.
        if (Platform.OS !== "android" && permission.canAskAgain === false) {
          throw new MicrophonePermissionError(false);
        }
        this.permissionTransition = true;
        permission = await requestRecordingPermissionsAsync();
        this.trace("permission-result", { granted: permission.granted, canAskAgain: permission.canAskAgain });
      }
      if (!this.valid(id)) return false;
      if (!permission.granted) throw new MicrophonePermissionError(permission.canAskAgain !== false);
      await this.waitForForeground(id);
      if (!this.valid(id)) return false;
      this.setPhase("preparing");
      return await serialize(async () => {
        if (!this.valid(id)) return false;
        await this.waitForForeground(id);
        if (!this.valid(id)) return false;
        this.modeChanged = true;
        await setAudioModeAsync({
          allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: false,
          shouldPlayInBackground: false, interruptionMode: "duckOthers",
          shouldRouteThroughEarpiece: false,
        });
        if (!this.valid(id)) return false;
        await this.waitForForeground(id);
        if (!this.valid(id)) return false;
        const currentRecorder = this.recorder ?? new NativeRecorder({ ...OPTIONS, ...OPTIONS[Platform.OS as "android" | "ios" | "web"] });
        if (!this.recorder) {
          this.recorder = currentRecorder;
          this.listener = currentRecorder.addListener("recordingStatusUpdate", status => {
            if (this.phase !== "recording" || (!status.hasError && !status.isFinished)) return;
            // Android queues completion; an older file must not cancel the next attempt.
            if (status.url && status.url !== currentRecorder.uri) return;
            this.onError(new Error(status.error || "Recording was interrupted"));
            this.onInterrupt();
            void this.cancel("native-error");
          });
        }
        await currentRecorder.prepareToRecordAsync();
        this.prepared = true;
        if (!this.valid(id)) return false;
        await this.waitForForeground(id);
        if (!this.valid(id)) return false;
        currentRecorder.record();
        if (!currentRecorder.getStatus().isRecording) {
          throw new Error("Native recorder did not enter recording state");
        }
        this.setPhase("recording");
        return true;
      });
    } catch (error) {
      this.trace("start-failed", { error: String(error), valid: this.valid(id) });
      if (this.valid(id)) {
        if (error instanceof MicrophonePermissionError) {
          // No native recording work was started. Do not wait behind pending
          // audio cleanup just to display a denied/blocked permission result.
          if (runtime.owner === this) runtime.owner = null;
          this.setPhase("idle");
          this.onError(error);
          return false;
        }
        this.onError(error);
        await serialize(async () => { if (this.valid(id)) { await this.finish(); this.release(); } });
      }
      return false;
    } finally {
      this.permissionTransition = false;
      this.startPending = false;
      if (this.valid(id) && this.getPhase() !== "recording" && this.getPhase() !== "idle") {
        await serialize(() => this.finish());
        this.setPhase("idle");
      } else if (!this.disposed && this.getPhase() === "stopping") {
        const cancelledId = this.generation;
        await serialize(async () => { if (this.valid(cancelledId)) await this.finish(); });
        if (this.valid(cancelledId)) this.setPhase("idle");
      }
    }
  }

  private getPhase(): RecordingPhase { return this.phase; }

  private async finish(): Promise<string | null> {
    let uri: string | null = null;
    try {
      if (this.prepared && this.recorder) {
        this.prepared = false;
        await this.recorder.stop();
        uri = this.recorder.uri;
      }
    } catch (error) {
      if (!this.disposed) this.onError(error);
      this.release();
    } finally {
      if (runtime.owner === this) {
        if (this.modeChanged) {
          this.modeChanged = false;
          try { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: "mixWithOthers" }); }
          catch (error) { if (!this.disposed) this.onError(error); }
        }
        runtime.owner = null;
      }
    }
    return uri;
  }

  async stop(): Promise<string | null> {
    if (this.phase !== "recording" || this.disposed) return null;
    const id = this.generation;
    this.setPhase("stopping");
    const uri = await serialize(() => this.finish());
    if (!this.valid(id)) return null;
    this.setPhase("idle");
    return uri;
  }

  async cancel(reason = "screen-or-user"): Promise<void> {
    this.trace("cancel", { reason });
    const id = ++this.generation;
    this.wake?.();
    if (this.phase === "idle" && !this.startPending) {
      // Changing/replaying a sentence only clears a stopped recorder. No async
      // recording work remains, so do not expose a false busy phase to the UI.
      this.release();
      return;
    }
    this.setPhase("stopping");
    await serialize(async () => { await this.finish(); this.release(); });
    if (this.valid(id) && !this.startPending) this.setPhase("idle");
  }

  metering(): number | undefined {
    if (this.phase !== "recording") return undefined;
    try { return this.recorder?.getStatus().metering; }
    catch { return undefined; }
  }

  private release() {
    const listener = this.listener;
    const recorder = this.recorder;
    this.listener = null;
    this.recorder = null;
    this.prepared = false;
    try { listener?.remove(); } catch { /* Already removed. */ }
    try { recorder?.release(); } catch (error) { console.warn("[Recording] Recorder release failed:", error); }
  }

  dispose() {
    this.disposed = true;
    this.appSubscription.remove();
    this.focusSubscriptions.forEach(subscription => subscription.remove());
    void this.cancel("dispose").then(() => this.release());
  }
}
