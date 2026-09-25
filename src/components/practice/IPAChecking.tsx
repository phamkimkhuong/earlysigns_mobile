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
import { usePronunciationCheck } from "@/hooks/usePronunciationCheck";
import { buildSoundAnalysisRows } from "@/utils/pronunciationAnalysis";
import { checkResultScoreColor } from "@/utils/checkResultScoreColor";
import { isQuotaExhausted } from "@/services/usageLimits";
import { stripHtml } from "@/utils/errors";
import { hapticFeedback } from "@/utils/haptics";
import PrimaryButton from "@/components/ui/PrimaryButton";
import UpgradeProModal from "@/components/ui/UpgradeProModal";
import ScoreWords from "./ScoreWords";
import SoundAnalysis from "./SoundAnalysis";
import StagedAiProgress from "./StagedAiProgress";
import type { Dialect, SentenceCheckResult, UserTier } from "@/types/domain";

const LOW_SCORE_THRESHOLD = 0.4;
const DISPLAY_WORD_RE = /\w+(?:['’]\w+)?/gu;

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
    if (result) {
      setResultsByIndex((prev) => ({ ...prev, [currentIndex]: result }));
      const score = Number(result.accuracy ?? result.overall_score ?? 0);
      if (score >= 0.8) {
        hapticFeedback.success();
      } else if (score < 0.4) {
        hapticFeedback.warning();
      } else {
        hapticFeedback.light();
      }
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
    if (!halfFiredRef.current && isScreening && completed >= screeningHalfThreshold) {
      halfFiredRef.current = true;
      onScreeningHalfReached?.();
    }
    if (!allFiredRef.current && completed >= sentences.length) {
      allFiredRef.current = true;
      if (isScreening) onScreeningFinished?.();
      else onLessonAllCompleted?.();
    }
  }, [
    open,
    resultsByIndex,
    sentences,
    isScreening,
    screeningHalfThreshold,
    onScreeningHalfReached,
    onScreeningFinished,
    onLessonAllCompleted,
  ]);

  const showNextLessonBtn =
    Boolean(loadNextLesson) &&
    currentIndex >= (sentences?.length || 1) - 1 &&
    showResultDetails;

  async function handleSample() {
    if (!currentSentence) return;
    try {
      setSamplePlaying(true);
      const url =
        currentSentence.audio_url ||
        (await onRequestSampleAudio?.(currentSentence));
      if (!url) return;
      if (sampleSoundRef.current) {
        try {
          sampleSoundRef.current.remove();
        } catch {
          /* ignore */
        }
        sampleSoundRef.current = null;
      }
      const player = createAudioPlayer({ uri: url });
      sampleSoundRef.current = player;
      player.addListener("playbackStatusUpdate", (status: any) => {
        if (status?.didJustFinish) {
          setSamplePlaying(false);
          try {
            player.remove();
          } catch {
            /* ignore */
          }
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
      if (onDailyLimitReached) {
        onDailyLimitReached(userTier);
      } else {
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

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-appBg">
        <View className="flex-row items-center px-4 py-2.5 gap-3 border-b border-appBorder">
          <Pressable onPress={onClose}>
            <Text className="text-[22px] text-appText w-7">✕</Text>
          </Pressable>
          <Text className="flex-1 font-bold text-appText text-base" numberOfLines={1}>
            {lessonTitle || t("sentence.current", { current: currentIndex + 1, total: sentences.length })}
          </Text>
          <Text className="text-appTextMuted font-semibold">
            {currentIndex + 1}/{sentences.length}
          </Text>
        </View>
        {journeyData?.current_module != null ? (
          <Text className="px-4 text-appTextSecondary pt-2">
            {t("home.journey.moduleOf", {
              current: journeyData.current_module,
              total: journeyData.total_modules || journeyData.current_module,
            })}
          </Text>
        ) : null}
        <ScrollView contentContainerClassName="p-4 gap-3 pb-10">
          {instructionsHtml && !instructionsDismissed ? (
            <View className="gap-3">
              <Text className="text-appText leading-[22px]">{stripHtml(instructionsHtml)}</Text>
              <PrimaryButton
                title={t("sentence.startRecording")}
                onPress={() => setInstructionsDismissed(true)}
              />
            </View>
          ) : (
            <>
              <ScoreWords
                words={displayWords}
                alignment={storedResult?.char_alignment}
                showResultDetails={showResultDetails}
                loadingIpa={!displayWords.some((w: any) => w.ipa)}
              />
              {currentSentence?.text ? (
                <Text className="text-appText text-lg font-semibold">{currentSentence.text}</Text>
              ) : null}
              {onRequestSampleAudio || currentSentence?.audio_url ? (
                <PrimaryButton
                  title={t("sentence.listenToSample")}
                  variant="ghost"
                  loading={samplePlaying}
                  onPress={handleSample}
                />
              ) : null}
              {checking ? <StagedAiProgress active={checking} variant="card" /> : null}
              {micError ? (
                <Text className="text-danger">
                  {t(`sentence.micError.${micError.type}.title`)}{" "}
                  {t(`sentence.micError.${micError.type}.body`)}
                </Text>
              ) : null}
              {showTryAgain ? <Text className="text-appTextSecondary">{t("sentence.tryAgainLowScore")}</Text> : null}
              {error ? <Text className="text-danger">{error}</Text> : null}
              {showResultDetails ? (
                <Text className="text-4xl font-extrabold text-center" style={{ color: checkResultScoreColor(sentenceScore01) }}>
                  {scorePct}%
                </Text>
              ) : null}
              {showResultDetails ? (
                showDetails ? (
                  <SoundAnalysis
                    rows={soundRows}
                    onPracticePhoneme={onPracticePhoneme}
                    practicePhonemeLoading={practicePhonemeLoading}
                    disabled={isRecording || checking}
                  />
                ) : (
                  <PrimaryButton
                    title={t("result.soundAnalysis.viewDetails")}
                    variant="ghost"
                    onPress={() => setShowDetails(true)}
                  />
                )
              ) : null}
            </>
          )}
        </ScrollView>
        <View className="flex-row flex-wrap gap-2 p-3 border-t border-appBorder bg-appElevated">
          <PrimaryButton
            title={t("sentence.previous")}
            variant="ghost"
            disabled={currentIndex === 0 || isRecording || checking}
            onPress={() => {
              setCurrentIndex((v) => Math.max(0, v - 1));
              setShowDetails(false);
              clearResult();
            }}
          />
          <PrimaryButton
            title={
              isStarting
                ? t("videos.practice.startingMic")
                : isRecording
                  ? t("sentence.stopRecording")
                  : checking
                    ? t("sentence.checking")
                    : t("sentence.startRecording")
            }
            onPress={handleRecordToggle}
            disabled={isStarting || checking || !currentSentence?.text}
          />
          {showResultDetails ? (
            <PrimaryButton
              title={t("sentence.listenToRecording")}
              variant="ghost"
              onPress={replayRecording}
            />
          ) : null}
          {showNextLessonBtn ? (
            <PrimaryButton
              title={t("sentence.nextLesson")}
              loading={nextLessonLoading}
              onPress={async () => {
                setNextLessonLoading(true);
                try {
                  await loadNextLesson?.();
                } finally {
                  setNextLessonLoading(false);
                }
              }}
            />
          ) : (
            <PrimaryButton
              title={t("sentence.next")}
              variant="ghost"
              disabled={currentIndex >= sentences.length - 1 || isRecording || checking}
              onPress={() => {
                setCurrentIndex((v) => Math.min(sentences.length - 1, v + 1));
                setShowDetails(false);
                clearResult();
              }}
            />
          )}
        </View>
        <UpgradeProModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      </SafeAreaView>
    </Modal>
  );
}
