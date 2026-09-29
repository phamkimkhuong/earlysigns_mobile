import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { AppState, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useTranslation } from "react-i18next";
import { usePronunciationCheck } from "@/hooks/usePronunciationCheck";
import { getFriendlyErrorMessage } from "@/utils/localizedError";
import { isScreeningComplete, screeningAccuracy, screeningReducer, SCREENING_SENTENCE_COUNT } from "@/utils/screeningSession";
import UpgradeProModal from "@/components/ui/UpgradeProModal";
import ScreeningPracticeView, { type ScreeningPhase } from "./ScreeningPracticeView";
import type { LessonSentence, UserTier } from "@/types/domain";

export interface ScreeningSessionProps {
  sentences: LessonSentence[];
  dialect: string;
  userTier: UserTier | string;
  userKey: string;
  onClose: () => void;
  onComplete: () => Promise<boolean>;
}

export default function ScreeningSession({ sentences, dialect, userTier, userKey, onClose, onComplete }: ScreeningSessionProps) {
  const { t, i18n } = useTranslation();
  const [progress, dispatch] = useReducer(screeningReducer, { current: 0, results: {} });
  const [seconds, setSeconds] = useState(0);
  const [transition, setTransition] = useState<"starting" | "checking" | null>(null);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const [showSupport, setShowSupport] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [playing, setPlaying] = useState<"sample" | "replay" | null>(null);
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const attemptIndex = useRef<number | null>(null);
  const actionLocked = useRef(false);
  const mounted = useRef(true);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const playbackId = useRef(0);
  const quotaReached = useCallback(() => setQuotaOpen(true), []);
  const audio = usePronunciationCheck({ language: i18n.language, userTier, userKey, isScreening: true, autoStopOnSilence: false, onDailyLimitReached: quotaReached });
  const sentence = sentences[progress.current];
  const recorded = screeningAccuracy(progress.results[progress.current]) !== null;
  const phase: ScreeningPhase = saving ? "saving" : audio.isRecording ? "recording" : audio.checking || transition === "checking" ? "checking" : audio.isStarting || transition === "starting" ? "starting" : recorded ? "recorded" : "ready";
  const busy = ["saving", "recording", "checking", "starting"].includes(phase);

  const stopPlayback = useCallback(() => {
    playbackId.current += 1;
    try { playerRef.current?.remove(); } catch { /* Player already released. */ }
    playerRef.current = null;
    if (mounted.current) setPlaying(null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stopPlayback(); };
  }, [stopPlayback]);

  useEffect(() => {
    if (!audio.isRecording) return;
    const started = Date.now();
    setSeconds(0);
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(timer);
  }, [audio.isRecording]);

  useEffect(() => {
    const result = audio.result;
    const index = attemptIndex.current;
    if (!result || index === null) return;
    attemptIndex.current = null;
    if (screeningAccuracy(result) === null) {
      setLocalError(t("screeningPractice.invalidResult"));
      return;
    }
    dispatch({ type: "recorded", index, result });
    if (audio.audioUri) setRecordings(previous => ({ ...previous, [index]: audio.audioUri! }));
    setLocalError("");
  }, [audio.result, audio.audioUri, t]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") return;
      stopPlayback();
      if (audio.isRecording || audio.isStarting) {
        attemptIndex.current = null;
        void audio.cancelRecording().catch(() => {});
        setLocalError(t("screeningPractice.interrupted"));
      }
    });
    return () => subscription.remove();
  }, [audio.isRecording, audio.isStarting, audio.cancelRecording, stopPlayback, t]);

  const message = (error: unknown, key: string) => getFriendlyErrorMessage(error, t(key), i18n.language.startsWith("vi") ? "vi" : "en");

  async function record() {
    if (actionLocked.current || busy || !sentence) return;
    actionLocked.current = true;
    stopPlayback();
    setLocalError("");
    setTransition("starting");
    attemptIndex.current = progress.current;
    try { await audio.startRecording({ text: sentence.text, dialect }); }
    catch (error) { if (mounted.current) setLocalError(message(error, "screeningPractice.recordError")); }
    finally { actionLocked.current = false; if (mounted.current) setTransition(null); }
  }

  async function primary() {
    if (actionLocked.current || saving || audio.checking || audio.isStarting) return;
    if (audio.isRecording) {
      actionLocked.current = true;
      setTransition("checking");
      try { await audio.stopRecording({ check: true }); }
      catch (error) { if (mounted.current) setLocalError(message(error, "screeningPractice.recordError")); }
      finally { actionLocked.current = false; if (mounted.current) setTransition(null); }
      return;
    }
    if (!recorded) { await record(); return; }
    stopPlayback();
    if (progress.current < SCREENING_SENTENCE_COUNT - 1) {
      move("next");
      return;
    }
    if (!isScreeningComplete(progress.results)) return;
    actionLocked.current = true;
    setSaving(true);
    setLocalError("");
    try {
      if (!await onComplete() && mounted.current) setLocalError(t("screeningPractice.saveError"));
    } catch (error) { if (mounted.current) setLocalError(message(error, "screeningPractice.saveError")); }
    finally { actionLocked.current = false; if (mounted.current) setSaving(false); }
  }

  function move(direction: "previous" | "next") {
    if (busy || actionLocked.current) return;
    stopPlayback();
    attemptIndex.current = null;
    audio.clearResult();
    setLocalError("");
    setShowSupport(false);
    setShowScore(false);
    dispatch({ type: direction });
  }

  async function play(kind: "sample" | "replay") {
    if (busy || actionLocked.current) return;
    if (playing === kind) { stopPlayback(); return; }
    stopPlayback();
    const uri = kind === "sample" ? sentence?.audio_url : recordings[progress.current];
    if (typeof uri !== "string" || !uri) return;
    const id = playbackId.current;
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!mounted.current || id !== playbackId.current) return;
      const player = createAudioPlayer({ uri });
      playerRef.current = player;
      player.addListener("playbackStatusUpdate", status => { if (status.didJustFinish && playerRef.current === player) stopPlayback(); });
      setPlaying(kind);
      player.play();
    } catch (error) {
      if (mounted.current && id === playbackId.current) { stopPlayback(); setLocalError(message(error, "screeningPractice.audioError")); }
    }
  }

  async function discard() {
    stopPlayback();
    attemptIndex.current = null;
    await audio.cancelRecording().catch(() => {});
    onClose();
  }

  function requestClose() {
    if (saving) return;
    if (confirmExit) { setConfirmExit(false); return; }
    stopPlayback();
    if (busy || Object.keys(progress.results).length) setConfirmExit(true);
    else void discard();
  }

  const error = localError || (audio.micError ? `${t(`sentence.micError.${audio.micError.type}.title`)} ${t(`sentence.micError.${audio.micError.type}.body`)}` : audio.error === "No speech detected. Try again." ? t("screeningPractice.noSpeech") : audio.error);
  if (!sentence) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={requestClose}>
      <SafeAreaView className="flex-1 bg-white">
        <ScreeningPracticeView t={t} sentence={sentence} current={progress.current} completed={Object.keys(progress.results).map(Number)}
          phase={phase} seconds={seconds} error={error} showSupport={showSupport} showScore={showScore}
          score={screeningAccuracy(progress.results[progress.current])} canReplay={Boolean(recordings[progress.current])}
          samplePlaying={playing === "sample"} replayPlaying={playing === "replay"} confirmExit={confirmExit}
          onClose={requestClose} onStay={() => setConfirmExit(false)} onDiscard={() => void discard()}
          onPrimary={() => void primary()} onPrevious={() => move("previous")} onRetryRecording={() => void record()}
          onSupport={() => setShowSupport(value => !value)} onScore={() => setShowScore(value => !value)}
          onSample={() => void play("sample")} onReplay={() => void play("replay")} />
        <UpgradeProModal open={quotaOpen} onClose={() => setQuotaOpen(false)} />
      </SafeAreaView>
    </Modal>
  );
}
