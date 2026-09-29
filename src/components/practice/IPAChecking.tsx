import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { createAudioPlayer } from "expo-audio";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Crown, Mic, MicOff, Play, Volume2 } from "lucide-react-native";
import { usePronunciationCheck } from "@/hooks/usePronunciationCheck";
import { buildSoundAnalysisRows } from "@/utils/pronunciationAnalysis";
import { checkResultScoreColor } from "@/utils/checkResultScoreColor";
import { isQuotaExhausted } from "@/services/usageLimits";
import { stripHtml } from "@/utils/errors";
import { hapticFeedback } from "@/utils/haptics";
import { setItem } from "@/services/storage";
import { safeNavigate } from "@/navigation/nav";
import PrimaryButton from "@/components/ui/PrimaryButton";
import UpgradeProModal from "@/components/ui/UpgradeProModal";
import ScoreWords from "./ScoreWords";
import SoundAnalysis from "./SoundAnalysis";
import StagedAiProgress from "./StagedAiProgress";
import type { Dialect, SentenceCheckResult, UserTier } from "@/types/domain";

const LOW_SCORE_THRESHOLD = 0.4;
const DISPLAY_WORD_RE = /\w+(?:['']\w+)?/gu;

function extractPendingDisplayWords(text?: string | null): any[] {
  const words: any[] = [];
  const source = String(text || "");
  const re = new RegExp(DISPLAY_WORD_RE.source, DISPLAY_WORD_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    words.push({ word: match[0], ipa: "", pending: true });
  }
  return words;
}

function sentenceWordsKey(sentence?: IPASentence | null): string {
  if (!sentence) return "";
  return `${sentence.index ?? ""}::${sentence.text ?? ""}`;
}

export interface IPASentence {
  index?: number;
  text: string;
  audio_url?: string;
  words?: any[];
  [key: string]: any;
}

export interface IPACheckingProps {
  open: boolean;
  onClose: () => void;
  sentences: IPASentence[];
  dialect?: Dialect | string;
  authFetch?: (path: string, options?: any) => Promise<Response>;
  onUsageUpdated?: (usage: any) => void;
  autoRecordKey?: any;
  sessionKey?: any;
  loadNextLesson?: () => Promise<void>;
  onPracticePhoneme?: (phoneme: string) => void;
  onLessonAllCompleted?: () => void;
  journeyData?: any;
  lessonTitle?: string;
  instructionsHtml?: string;
  userTier?: UserTier | string;
  userKey?: string;
  usageStatus?: any;
  onDailyLimitReached?: (tier?: any) => void;
  mode?: "lesson" | "screening" | string;
  screeningHalfThreshold?: number;
  onScreeningHalfReached?: () => void;
  onScreeningFinished?: () => void;
  onRequestSampleAudio?: (sentence: IPASentence) => Promise<string | null>;
  onRequestSentenceWords?: (sentence: IPASentence) => Promise<any[]>;
}

export default function IPAChecking({
  open,
  onClose,
  sentences,
  dialect = "uk",
  authFetch,
  onUsageUpdated,
  autoRecordKey,
  sessionKey,
  loadNextLesson,
  onPracticePhoneme,
  onLessonAllCompleted,
  journeyData = null,
  lessonTitle,
  instructionsHtml,
  userTier = "anonymous",
  userKey = "__anonymous__",
  usageStatus = null,
  onDailyLimitReached,
  mode = "lesson",
  screeningHalfThreshold = 5,
  onScreeningHalfReached,
  onScreeningFinished,
  onRequestSampleAudio,
  onRequestSentenceWords,
}: IPACheckingProps) {
  const isScreening = mode === "screening";
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resultsByIndex, setResultsByIndex] = useState<Record<number, SentenceCheckResult>>({});
  const [showDetails, setShowDetails] = useState(false);
  const [instructionsDismissed, setInstructionsDismissed] = useState(false);
  const [nextLessonLoading, setNextLessonLoading] = useState(false);
  const [practicePhonemeLoading] = useState("");
  const [resolvedWordsByKey, setResolvedWordsByKey] = useState<Record<string, any[]>>({});
  const [samplePlaying, setSamplePlaying] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureKey, setUpgradeFeatureKey] = useState<"generic" | "sampleAudio">("sampleAudio");
  const halfFiredRef = useRef(false);
  const allFiredRef = useRef(false);
  const sampleSoundRef = useRef<any>(null);

  const {
    isRecording,
    isStarting,
    checking,
    result,
    error,
    micError,
    startRecording,
    stopRecording,
    replayRecording,
    clearResult,
  } = usePronunciationCheck({
    authFetch,
    language: i18n.resolvedLanguage || i18n.language || "vi",
    onUsageUpdated,
    onDailyLimitReached,
    userTier,
    userKey,
    isScreening,
  });

  useEffect(() => {
    setCurrentIndex(0);
    setResultsByIndex({});
    setShowDetails(false);
    setInstructionsDismissed(!instructionsHtml);
    halfFiredRef.current = false;
    allFiredRef.current = false;
    clearResult();
  }, [sessionKey, open, instructionsHtml, clearResult]);

  useEffect(() => {
    return () => {
      if (sampleSoundRef.current) {
        try { sampleSoundRef.current.remove(); } catch { /* ignore */ }
        sampleSoundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (result) {
      setResultsByIndex((prev) => ({ ...prev, [currentIndex]: result }));
      const score = Number(result.accuracy ?? result.overall_score ?? 0);
      if (score >= 0.8) hapticFeedback.success();
      else if (score < 0.4) hapticFeedback.warning();
      else hapticFeedback.light();
    }
  }, [result, currentIndex]);

  const currentSentence = sentences?.[currentIndex] || null;

  useEffect(() => {
    if (!open || !currentSentence || !onRequestSentenceWords) return;
    const key = sentenceWordsKey(currentSentence);
    if (resolvedWordsByKey[key] || (currentSentence.words || []).length) return;
    let cancelled = false;
    onRequestSentenceWords(currentSentence)
      .then((words) => {
        if (!cancelled && Array.isArray(words)) {
          setResolvedWordsByKey((prev) => ({ ...prev, [key]: words }));
        }
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [open, currentSentence, onRequestSentenceWords, resolvedWordsByKey]);

  useEffect(() => {
    if (!open || !autoRecordKey || !currentSentence?.text) return;
    const timer = setTimeout(() => {
      startRecording({ text: currentSentence.text, dialect });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoRecordKey, sessionKey]);

  const isProOrTrial = userTier === "pro" || userTier === "trial";
  const hasPreloadedAudio = Boolean(currentSentence?.audio_url);
  const canPlaySampleAudio = isProOrTrial || hasPreloadedAudio;

  const storedResult: SentenceCheckResult | null = resultsByIndex[currentIndex] || result;
  const sentenceScore01 = useMemo(() => {
    const n = Number(storedResult?.accuracy);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(1, n));
  }, [storedResult]);
  const scorePct = sentenceScore01 == null ? null : Math.round(sentenceScore01 * 1000) / 10;
  const showResultDetails = scorePct != null && scorePct >= LOW_SCORE_THRESHOLD * 100;
  const showTryAgain = scorePct != null && scorePct < LOW_SCORE_THRESHOLD * 100 && !checking && !isRecording;
  const displayWords = useMemo(() => {
    const key = sentenceWordsKey(currentSentence);
    const loaded = resolvedWordsByKey[key] || currentSentence?.words;
    if (Array.isArray(loaded) && loaded.length) return loaded;
    return extractPendingDisplayWords(currentSentence?.text);
  }, [currentSentence, resolvedWordsByKey]);
  const soundRows = useMemo(
    () => buildSoundAnalysisRows(storedResult?.char_alignment),
    [storedResult]
  );

  useEffect(() => {
    if (!open || !sentences?.length) return;
    const completed = Object.keys(resultsByIndex).length;
    if (isScreening && completed > 0) {
      setItem("earlysigns_screening_progress", String(completed));
    }
    if (!halfFiredRef.current && isScreening && completed >= screeningHalfThreshold) {
      halfFiredRef.current = true;
      onScreeningHalfReached?.();
    }
    if (!allFiredRef.current && completed >= sentences.length) {
      allFiredRef.current = true;
      if (isScreening) {
        setItem("earlysigns_screening_progress", String(sentences.length));
        onScreeningFinished?.();
      } else {
        onLessonAllCompleted?.();
      }
    }
  }, [
    open, resultsByIndex, sentences, isScreening, screeningHalfThreshold,
    onScreeningHalfReached, onScreeningFinished, onLessonAllCompleted,
  ]);

  const showNextLessonBtn =
    Boolean(loadNextLesson) &&
    currentIndex >= (sentences?.length || 1) - 1 &&
    showResultDetails;

  async function handleSample() {
    if (!currentSentence) return;
    if (!hasPreloadedAudio && !isProOrTrial) {
      hapticFeedback.warning();
      setUpgradeFeatureKey("sampleAudio");
      setShowUpgradeModal(true);
      return;
    }
    try {
      setSamplePlaying(true);
      const url = currentSentence.audio_url || (await onRequestSampleAudio?.(currentSentence));
      if (!url) { setSamplePlaying(false); return; }
      currentSentence.audio_url = url;
      if (sampleSoundRef.current) {
        try { sampleSoundRef.current.remove(); } catch { /* ignore */ }
        sampleSoundRef.current = null;
      }
      const player = createAudioPlayer({ uri: url });
      sampleSoundRef.current = player;
      player.addListener("playbackStatusUpdate", (status: any) => {
        if (status?.didJustFinish) {
          setSamplePlaying(false);
          try { player.remove(); } catch { /* ignore */ }
          if (sampleSoundRef.current === player) sampleSoundRef.current = null;
        }
      });
      player.play();
    } catch {
      setSamplePlaying(false);
    }
  }

  async function handleRecordToggle() {
    hapticFeedback.light();
    if (isQuotaExhausted({ userTier, userKey, usageStatus })) {
      hapticFeedback.warning();
      if (onDailyLimitReached) onDailyLimitReached(userTier);
      else {
        setUpgradeFeatureKey("generic");
        setShowUpgradeModal(true);
      }
      return;
    }
    if (isRecording || isStarting) {
      await stopRecording({ check: true });
      return;
    }
    if (!currentSentence?.text) return;
    await startRecording({ text: currentSentence.text, dialect });
  }

  if (!open) return null;

  const totalSentences = sentences?.length || 1;
  const scoreColor = scorePct != null ? checkResultScoreColor(sentenceScore01) : "#4f46e5";

  const scoreBandLabel = (() => {
    if (scorePct == null) return null;
    if (scorePct >= 80) return "Xuat sac!";
    if (scorePct >= 60) return "Kha tot";
    if (scorePct >= 40) return "Can co gang hon";
    return "Hay thu lai";
  })();

  const micLabel = isStarting
    ? t("videos.practice.startingMic")
    : isRecording
      ? t("sentence.stopRecording")
      : checking
        ? t("sentence.checking")
        : t("sentence.startRecording");

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>

        {/* HEADER */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(15,23,42,0.07)",
            backgroundColor: "#ffffff",
          }}
        >
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("common.close", "Dong bai hoc")}
            onPress={onClose}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: pressed ? "#f1f5f9" : "#f8fafc",
              alignItems: "center",
              justifyContent: "center",
            })}
          >
            <Text style={{ fontSize: 18, color: "#64748b", lineHeight: 22 }}>x</Text>
          </Pressable>

          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text
              style={{ fontSize: 15, fontWeight: "700", color: "#0f172a" }}
              numberOfLines={1}
            >
              {lessonTitle || t("sentence.current", { current: currentIndex + 1, total: totalSentences })}
            </Text>
            {journeyData?.current_module != null ? (
              <Text style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
                {t("home.journey.moduleOf", {
                  current: journeyData.current_module,
                  total: journeyData.total_modules || journeyData.current_module,
                })}
              </Text>
            ) : null}
          </View>

          <View style={{ backgroundColor: "#4f46e5", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#ffffff" }}>
              {currentIndex + 1}/{totalSentences}
            </Text>
          </View>
        </View>

        {/* PROGRESS DOTS */}
        {totalSentences > 1 ? (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              paddingVertical: 10,
              backgroundColor: "#ffffff",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(15,23,42,0.05)",
            }}
          >
            {sentences.map((_, i) => {
              const isDone = resultsByIndex[i] != null;
              const isCurrent = i === currentIndex;
              return (
                <View
                  key={i}
                  style={{
                    width: isCurrent ? 20 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isCurrent ? "#4f46e5" : isDone ? "#10b981" : "#cbd5e1",
                  }}
                />
              );
            })}
          </View>
        ) : null}

        {/* SCROLL CONTENT */}
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {instructionsHtml && !instructionsDismissed ? (
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: "rgba(15,23,42,0.08)",
                gap: 16,
              }}
            >
              <Text style={{ fontSize: 15, color: "#334155", lineHeight: 24 }}>
                {stripHtml(instructionsHtml)}
              </Text>
              <PrimaryButton
                title={t("sentence.startRecording")}
                onPress={() => setInstructionsDismissed(true)}
              />
            </View>
          ) : (
            <>
              {/* Sentence Card */}
              <View
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: "rgba(15,23,42,0.08)",
                  gap: 14,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                {currentSentence?.text ? (
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "700",
                      color: "#0f172a",
                      lineHeight: 32,
                      textAlign: "center",
                    }}
                  >
                    {currentSentence.text}
                  </Text>
                ) : null}

                <View style={{ alignItems: "center" }}>
                  <ScoreWords
                    words={displayWords}
                    alignment={storedResult?.char_alignment}
                    showResultDetails={showResultDetails}
                    loadingIpa={!displayWords.some((w: any) => w.ipa)}
                  />
                </View>

                {onRequestSampleAudio || currentSentence?.audio_url ? (
                  <Pressable
                    onPress={samplePlaying ? undefined : handleSample}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "rgba(79,70,229,0.25)",
                      backgroundColor: pressed ? "#ede9fe" : "#f5f3ff",
                      opacity: samplePlaying ? 0.7 : 1,
                    })}
                  >
                    <Volume2 size={16} color="#4f46e5" />
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#4f46e5" }}>
                      {samplePlaying ? "Đang phát..." : t("sentence.listenToSample")}
                    </Text>
                    {!canPlaySampleAudio ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: "#fef3c7",
                          borderWidth: 1,
                          borderColor: "#fde68a",
                          flexShrink: 0,
                        }}
                      >
                        <Crown size={12} color="#b45309" />
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 12,
                            fontWeight: "800",
                            color: "#92400e",
                          }}
                        >
                          PRO
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                ) : null}
              </View>

              {/* AI Progress */}
              {checking ? <StagedAiProgress active={checking} variant="card" /> : null}

              {/* Score Result Card */}
              {showResultDetails && scorePct != null ? (
                <View
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 20,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: scoreColor + "40",
                    alignItems: "center",
                    gap: 12,
                    shadowColor: scoreColor,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    elevation: 3,
                  }}
                >
                  {/* Score ring */}
                  <View
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      borderWidth: 8,
                      borderColor: scoreColor + "30",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        backgroundColor: scoreColor + "15",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontSize: 34, fontWeight: "900", color: scoreColor, lineHeight: 38 }}>
                        {scorePct}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: scoreColor }}>%</Text>
                    </View>
                  </View>

                  {scoreBandLabel ? (
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#334155" }}>
                      {scoreBandLabel}
                    </Text>
                  ) : null}

                  <Pressable
                    onPress={replayRecording}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      backgroundColor: pressed ? "#f1f5f9" : "#f8fafc",
                      borderWidth: 1,
                      borderColor: "rgba(15,23,42,0.1)",
                    })}
                  >
                    <Play size={14} color="#475569" />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569" }}>
                      {t("sentence.listenToRecording")}
                    </Text>
                  </Pressable>

                  {showDetails ? (
                    <SoundAnalysis
                      rows={soundRows}
                      words={displayWords}
                      onPracticePhoneme={onPracticePhoneme}
                      practicePhonemeLoading={practicePhonemeLoading}
                      disabled={isRecording || checking}
                    />
                  ) : (
                    <Pressable
                      onPress={() => setShowDetails(true)}
                      style={({ pressed }) => ({
                        paddingVertical: 10,
                        paddingHorizontal: 20,
                        borderRadius: 10,
                        backgroundColor: pressed ? "#f1f5f9" : "#f8fafc",
                        borderWidth: 1,
                        borderColor: "rgba(15,23,42,0.1)",
                      })}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#475569" }}>
                        {t("result.soundAnalysis.viewDetails")}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : null}

              {/* Low Score Card */}
              {showTryAgain ? (
                <View
                  style={{
                    backgroundColor: "#fff7ed",
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: "#fed7aa",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#9a3412", textAlign: "center" }}>
                    {t("sentence.tryAgainLowScore")}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#c2410c", textAlign: "center" }}>
                    Lắng nghe mẫu rồi thử lại nhé!
                  </Text>
                </View>
              ) : null}

              {/* Errors */}
              {micError ? (
                <View
                  style={{
                    backgroundColor: "#fef2f2",
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "#fecaca",
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#991b1b" }}>
                    {t(`sentence.micError.${micError.type}.title`)}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#b91c1c", lineHeight: 20 }}>
                    {t(`sentence.micError.${micError.type}.body`)}
                  </Text>
                </View>
              ) : error ? (
                <View
                  style={{
                    backgroundColor: "#fef2f2",
                    borderRadius: 14,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "#fecaca",
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#b91c1c" }}>{error}</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        {/* BOTTOM ACTION BAR */}
        {(!instructionsHtml || instructionsDismissed) ? (
          <View
            style={{
              backgroundColor: "#ffffff",
              borderTopWidth: 1,
              borderTopColor: "rgba(15,23,42,0.07)",
              paddingHorizontal: 20,
              paddingVertical: 16,
              paddingBottom: 8,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              {/* Prev */}
              <Pressable
                onPress={() => {
                  setCurrentIndex((v) => Math.max(0, v - 1));
                  setShowDetails(false);
                  clearResult();
                }}
                disabled={currentIndex === 0 || isRecording || checking}
                accessible
                accessibilityRole="button"
                accessibilityLabel={t("sentence.previous")}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: pressed ? "#e2e8f0" : "#f8fafc",
                  borderWidth: 1,
                  borderColor: "rgba(15,23,42,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: currentIndex === 0 || isRecording || checking ? 0.35 : 1,
                })}
              >
                <ChevronLeft size={22} color="#475569" />
              </Pressable>

              {/* Mic hero */}
              <View style={{ alignItems: "center", gap: 6 }}>
                <Pressable
                  onPress={isStarting || checking || !currentSentence?.text ? undefined : handleRecordToggle}
                  disabled={isStarting || checking || !currentSentence?.text}
                  accessible
                  accessibilityRole="button"
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                  <View
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 44,
                      backgroundColor: isRecording ? "rgba(239,68,68,0.12)" : "rgba(79,70,229,0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: 34,
                        backgroundColor:
                          isStarting || checking || !currentSentence?.text
                            ? "#cbd5e1"
                            : isRecording
                              ? "#ef4444"
                              : "#4f46e5",
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: isRecording ? "#ef4444" : "#4f46e5",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.35,
                        shadowRadius: 10,
                        elevation: 8,
                      }}
                    >
                      {isRecording
                        ? <MicOff size={28} color="#ffffff" />
                        : <Mic size={28} color="#ffffff" />}
                    </View>
                  </View>
                </Pressable>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#64748b" }} numberOfLines={1}>
                  {micLabel}
                </Text>
              </View>

              {/* Next */}
              {showNextLessonBtn ? (
                <Pressable
                  onPress={async () => {
                    setNextLessonLoading(true);
                    try { await loadNextLesson?.(); }
                    finally { setNextLessonLoading(false); }
                  }}
                  disabled={nextLessonLoading}
                  accessible
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: pressed ? "#4338ca" : "#4f46e5",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: nextLessonLoading ? 0.7 : 1,
                    shadowColor: "#4f46e5",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 4,
                  })}
                >
                  <ChevronRight size={22} color="#ffffff" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    setCurrentIndex((v) => Math.min(sentences.length - 1, v + 1));
                    setShowDetails(false);
                    clearResult();
                  }}
                  disabled={currentIndex >= sentences.length - 1 || isRecording || checking}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={t("sentence.next")}
                  style={({ pressed }) => ({
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: pressed ? "#e2e8f0" : "#f8fafc",
                    borderWidth: 1,
                    borderColor: "rgba(15,23,42,0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: currentIndex >= sentences.length - 1 || isRecording || checking ? 0.35 : 1,
                  })}
                >
                  <ChevronRight size={22} color="#475569" />
                </Pressable>
              )}
            </View>

            {/* Retry shortcut */}
            {showTryAgain ? (
              <Pressable
                onPress={handleRecordToggle}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: pressed ? "#ede9fe" : "#f5f3ff",
                  borderWidth: 1,
                  borderColor: "rgba(79,70,229,0.2)",
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#4f46e5" }}>
                  {t("sentence.tryAgainCheckFailed")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <UpgradeProModal
          open={showUpgradeModal}
          featureKey={upgradeFeatureKey}
          onClose={() => setShowUpgradeModal(false)}
          onUpgrade={() => {
            setShowUpgradeModal(false);
            onClose();
            safeNavigate("Payment");
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
