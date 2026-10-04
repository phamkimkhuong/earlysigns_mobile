import { releaseAudioPlayer } from "@/utils/audioPlayer";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { AppText } from "../ui/AppText";
import { createAudioPlayer } from "expo-audio";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronLeft } from "lucide-react-native";
import { usePronunciationCheck } from "@/hooks/usePronunciationCheck";
import { buildSoundAnalysisRows } from "@/utils/pronunciationAnalysis";
import { hapticFeedback } from "@/utils/haptics";
import { setItem } from "@/services/storage";
import { safeNavigate } from "@/navigation/nav";
import PrimaryButton from "@/components/ui/PrimaryButton";
import UpgradeProModal from "@/components/ui/UpgradeProModal";
import FormattedHtmlText from "./FormattedHtmlText";
import PracticePromptCard from "./PracticePromptCard";
import PracticeFeedbackCard from "./PracticeFeedbackCard";
import SpeechRecordingDock from "./SpeechRecordingDock";
import MicErrorCard from "./MicErrorCard";
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
  onShowGuide?: () => void;
  asModal?: boolean;
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
  onShowGuide,
  asModal = true,
}: IPACheckingProps) {
  const isFocused = useIsFocused();
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
  const [upgradeFeatureKey, setUpgradeFeatureKey] = useState<"dailyLimit" | "generic" | "sampleAudio">("dailyLimit");
  const [replayPlaying, setReplayPlaying] = useState(false);
  const sampleAudioUrlsRef = useRef<Record<string, string>>({});
  const halfFiredRef = useRef(false);
  const allFiredRef = useRef(false);
  const sampleSoundRef = useRef<any>(null);
  const sampleGeneration = useRef(0);
  const sampleMounted = useRef(false);
  const replayTimeoutRef = useRef<any>(null);

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
    enabled: open && isFocused,
    authFetch,
    language: i18n.resolvedLanguage || i18n.language || "vi",
    onUsageUpdated,
    onDailyLimitReached:
      onDailyLimitReached ||
      ((_tier) => {
        setUpgradeFeatureKey("dailyLimit");
        setShowUpgradeModal(true);
      }),
    userTier,
    userKey,
    isScreening,
  });

  const handleReplayVoice = async () => {
    if (replayPlaying) return;
    stopSample();
    try {
      setReplayPlaying(true);
      await replayRecording();
      if (replayTimeoutRef.current) clearTimeout(replayTimeoutRef.current);
      replayTimeoutRef.current = setTimeout(() => {
        setReplayPlaying(false);
      }, 3000);
    } catch {
      setReplayPlaying(false);
    }
  };

  useEffect(() => {
    setCurrentIndex(0);
    setResultsByIndex({});
    setShowDetails(false);
    setInstructionsDismissed(!instructionsHtml);
    setReplayPlaying(false);
    halfFiredRef.current = false;
    allFiredRef.current = false;
    clearResult();
  }, [sessionKey, open, instructionsHtml, clearResult]);

  const stopSample = useCallback(() => {
    ++sampleGeneration.current;
    releaseAudioPlayer(sampleSoundRef.current);
    sampleSoundRef.current = null;
    if (sampleMounted.current) setSamplePlaying(false);
  }, []);
  useEffect(() => {
    sampleMounted.current = true;
    return () => {
      sampleMounted.current = false;
      stopSample();
      if (replayTimeoutRef.current) clearTimeout(replayTimeoutRef.current);
    };
  }, [stopSample]);
  useEffect(() => {
    stopSample();
  }, [open, isFocused, currentIndex, isRecording, isStarting, checking, stopSample]);


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
  const currentSentenceText =
    typeof currentSentence === "string"
      ? currentSentence
      : currentSentence?.text || currentSentence?.sentence || "";

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

  const storedResult: SentenceCheckResult | null = resultsByIndex[currentIndex] || result;
  const sentenceScore01 = useMemo(() => {
    const n = Number(storedResult?.accuracy);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(1, n));
  }, [storedResult]);
  const scorePct = sentenceScore01 == null ? null : Math.round(sentenceScore01 * 1000) / 10;
  const showResultDetails = scorePct != null && scorePct >= LOW_SCORE_THRESHOLD * 100;
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
    if (!currentSentence || isRecording || isStarting || checking) return;
    stopSample();
    const sampleId = sampleGeneration.current;
    try {
      setSamplePlaying(true);
      const sentenceKey = sentenceWordsKey(currentSentence);
      const cachedUrl = sampleAudioUrlsRef.current[sentenceKey];
      const url = currentSentence.audio_url || cachedUrl || (await onRequestSampleAudio?.(currentSentence));
      if (sampleId !== sampleGeneration.current || !sampleMounted.current) return;
      if (!url) { setSamplePlaying(false); return; }
      if (!currentSentence.audio_url) {
        sampleAudioUrlsRef.current[sentenceKey] = url;
      }
      if (sampleSoundRef.current) {
        try { releaseAudioPlayer(sampleSoundRef.current); } catch { /* ignore */ }
        sampleSoundRef.current = null;
      }
      const player = createAudioPlayer({ uri: url });
      sampleSoundRef.current = player;
      player.addListener("playbackStatusUpdate", (status: any) => {
        if (status?.didJustFinish) {
          setSamplePlaying(false);
          try { releaseAudioPlayer(player); } catch { /* ignore */ }
          if (sampleSoundRef.current === player) sampleSoundRef.current = null;
        }
      });
      player.play();
    } catch {
      if (sampleId === sampleGeneration.current && sampleMounted.current) setSamplePlaying(false);
    }
  }

  async function handleRecordToggle() {
    hapticFeedback.light();
    if (isStarting || checking) return;
    if (isRecording) {
      await stopRecording({ check: true });
      return;
    }
    if (!currentSentenceText) return;
    stopSample();
    await startRecording({ text: currentSentenceText, dialect });
  }

  if (!open) return null;

  const totalSentences = sentences?.length || 1;

  const content = (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#F7F6F2" }}>

      {/* HEADER */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
          backgroundColor: "#F7F6F2",
        }}
      >
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Quay lại")}
          onPress={onClose}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: pressed ? "#e2e8f0" : "#ffffff",
            borderWidth: 1,
            borderColor: "rgba(15,23,42,0.08)",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <ChevronLeft size={22} color="#0c2340" />
        </Pressable>

        <View style={{ flex: 1, marginHorizontal: 12, justifyContent: "center" }}>
          <AppText
            style={{ fontSize: 17, fontWeight: "800", color: "#0c2340" }}
            numberOfLines={1}
          >
            {lessonTitle || t("sentence.current", { current: currentIndex + 1, total: totalSentences })}
          </AppText>
          {journeyData?.current_module != null ? (
            <AppText style={{ fontSize: 13, fontWeight: "500", color: "#64748b", marginTop: 2 }}>
              {t("home.journey.moduleOf", {
                current: journeyData.current_module,
                total: journeyData.total_modules || journeyData.current_module,
              })}
            </AppText>
          ) : null}
        </View>

        {onShowGuide ? (
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t("phonemeGuide.viewGuide", "Xem hướng dẫn")}
            activeOpacity={0.7}
            onPress={onShowGuide}
            className="flex-row items-center shrink-0"
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "nowrap",
              flexShrink: 0,
              gap: 6,
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: "#f0f9ff",
              borderWidth: 1,
              borderColor: "#bae6fd",
            }}
          >
            <BookOpen size={16} color="#0284c7" />
            <AppText
              numberOfLines={1}
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#0284c7",
              }}
            >
              {t("phonemeGuide.guideBtn", "Hướng dẫn")}
            </AppText>
          </TouchableOpacity>
        ) : null}
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
            <View className="leading-6 flex-wrap">
              <FormattedHtmlText
                html={instructionsHtml}
                style={{ fontSize: 15, color: "#334155", lineHeight: 24 }}
                boldStyle={{ fontWeight: "700", color: "#0284c7" }}
                italicStyle={{ fontStyle: "italic", color: "#0c2340" }}
              />
            </View>
            <PrimaryButton
              title={t("sentence.startRecording")}
              onPress={() => setInstructionsDismissed(true)}
            />
          </View>
        ) : (
          <>
            {/* Unified Practice Prompt Card */}
            <PracticePromptCard
              text={currentSentence?.text}
              words={displayWords}
              alignment={storedResult?.char_alignment}
              showResultDetails={showResultDetails}
              loadingIpa={!displayWords.some((w: any) => w.ipa)}
              onPlaySample={
                onRequestSampleAudio || currentSentence?.audio_url
                  ? handleSample
                  : undefined
              }
              samplePlaying={samplePlaying}
            />

            {/* Unified Practice Feedback Card */}
            <PracticeFeedbackCard
              scorePct={scorePct}
              checking={checking}
              replayPlaying={replayPlaying}
              onReplayVoice={handleReplayVoice}
              showDetails={showDetails}
              onToggleDetails={() => setShowDetails((v) => !v)}
              soundRows={soundRows}
              words={displayWords}
              onPracticePhoneme={onPracticePhoneme}
              practicePhonemeLoading={practicePhonemeLoading}
              isRecording={isRecording}
            />

            {/* Errors */}
            <MicErrorCard micError={micError} error={error} />
          </>
        )}
      </ScrollView>

      {/* BOTTOM ACTION BAR (Unified SpeechRecordingDock with 25s auto-stop & ripple waves) */}
      {(!instructionsHtml || instructionsDismissed) ? (
        <SpeechRecordingDock
          isRecording={isRecording}
          isStarting={isStarting}
          checking={checking}
          disabled={!currentSentenceText || nextLessonLoading}
          onRecordToggle={handleRecordToggle}
          maxSeconds={25}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < totalSentences - 1 || showNextLessonBtn}
          isLast={currentIndex >= totalSentences - 1}
          hasScore={scorePct != null}
          onPrev={() => {
            setCurrentIndex((v) => Math.max(0, v - 1));
            setShowDetails(false);
            clearResult();
          }}
          onNext={() => {
            if (showNextLessonBtn) {
              setNextLessonLoading(true);
              void loadNextLesson?.().finally(() => setNextLessonLoading(false));
            } else if (currentIndex < totalSentences - 1) {
              setCurrentIndex((v) => v + 1);
              setShowDetails(false);
              clearResult();
            }
          }}
        />
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
  );

  if (asModal === false) {
    return content;
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}
