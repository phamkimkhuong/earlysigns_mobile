import { releaseAudioPlayer } from "@/utils/audioPlayer";
import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { AppText } from "@/components";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronLeft,
} from "lucide-react-native";
import { createAudioPlayer } from "expo-audio";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";
import { usePronunciationCheck } from "@/hooks/usePronunciationCheck";
import { buildSoundAnalysisRows } from "@/utils/pronunciationAnalysis";
import {
  resolveUserKey,
  resolveUserTier,
} from "@/services/usageLimits";
import { hapticFeedback } from "@/utils/haptics";
import { useAuthStore } from "@/store/useAuthStore";
import { useBillingStore } from "@/store/useBillingStore";
import { textPracticeApi } from "@/api/textPracticeApi";
import { safeNavigate } from "@/navigation/nav";
import UpgradeProModal from "@/components/ui/UpgradeProModal";
import PracticePromptCard from "@/components/practice/PracticePromptCard";
import PracticeFeedbackCard from "@/components/practice/PracticeFeedbackCard";
import SpeechRecordingDock from "@/components/practice/SpeechRecordingDock";
import MicErrorCard from "@/components/practice/MicErrorCard";
import type { Dialect, SentenceCheckResult } from "@/types/domain";

type Props = NativeStackScreenProps<RootStackParamList, "SentencePractice">;

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

export default function SentencePracticeScreen({ navigation, route }: Props) {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const sentences = route.params?.sentences || [];
  const dialect = (route.params?.dialect || "uk") as Dialect;
  const lessonTitle = route.params?.lessonTitle || t("textPractice.practiceTitle", "Luyện phát âm câu");

  const authToken = useAuthStore((s) => s.token);
  const authEmail = useAuthStore((s) => s.email);
  const usageStatus = useBillingStore((s) => s.usage);

  const userTier = useMemo(
    () =>
      resolveUserTier({
        authToken,
        hasActiveSubscription: Boolean(usageStatus?.has_active_subscription),
        isInTrial: Boolean(usageStatus?.is_in_trial),
      }),
    [authToken, usageStatus]
  );
  const userKey = useMemo(
    () => resolveUserKey({ authToken, authEmail }),
    [authToken, authEmail]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [resultsByIndex, setResultsByIndex] = useState<Record<number, SentenceCheckResult>>({});
  const [resolvedWordsByIndex, setResolvedWordsByIndex] = useState<Record<number, any[]>>({});
  const [samplePlaying, setSamplePlaying] = useState(false);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureKey, setUpgradeFeatureKey] = useState<"dailyLimit" | "generic" | "sampleAudio">("dailyLimit");
  const [isCompletedAll, setIsCompletedAll] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const sampleSoundRef = useRef<any>(null);
  const sampleGeneration = useRef(0);
  const sampleMounted = useRef(false);
  const sampleAudioUrlsRef = useRef<Record<number, string>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const totalSentences = sentences.length || 1;
  const currentSentence = sentences[currentIndex] || null;
  const currentSentenceText =
    typeof currentSentence === "string"
      ? currentSentence
      : currentSentence?.text || currentSentence?.sentence || "";

  const isProOrTrial = userTier === "pro" || userTier === "trial";
  const hasPreloadedAudio = Boolean(currentSentence?.audio_url);

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
    enabled: isFocused,
    language: i18n.resolvedLanguage || i18n.language || "vi",
    onUsageUpdated: (u) => useBillingStore.getState().setUsage(u),
    onDailyLimitReached: () => {
      setUpgradeFeatureKey("dailyLimit");
      setShowUpgradeModal(true);
    },
    userTier,
    userKey,
  });

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
    };
  }, [stopSample]);
  useEffect(() => {
    stopSample();
  }, [isFocused, currentIndex, isRecording, isStarting, checking, stopSample]);


  // Save result when check finishes
  useEffect(() => {
    if (result) {
      setResultsByIndex((prev) => ({ ...prev, [currentIndex]: result }));
      const score = Number(result.accuracy ?? result.overall_score ?? 0);
      if (score >= 0.8) hapticFeedback.success();
      else if (score < 0.4) hapticFeedback.warning();
      else hapticFeedback.light();
    }
  }, [result, currentIndex]);

  // Load IPA words for current sentence if not already cached
  useEffect(() => {
    if (!currentSentence?.text) return;
    if (resolvedWordsByIndex[currentIndex] || (currentSentence.words || []).length) return;

    let cancelled = false;
    textPracticeApi
      .getIpaWords(currentSentence.text, dialect)
      .then((words) => {
        if (!cancelled && Array.isArray(words)) {
          setResolvedWordsByIndex((prev) => ({ ...prev, [currentIndex]: words }));
        }
      })
      .catch(() => { });

    return () => {
      cancelled = true;
    };
  }, [currentIndex, currentSentence, dialect, resolvedWordsByIndex]);

  const storedResult: SentenceCheckResult | null = resultsByIndex[currentIndex] || result;

  const sentenceScore01 = useMemo(() => {
    const n = Number(storedResult?.accuracy);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(1, n));
  }, [storedResult]);

  const scorePct = sentenceScore01 == null ? null : Math.round(sentenceScore01 * 1000) / 10;

  const displayWords = useMemo(() => {
    const loaded = resolvedWordsByIndex[currentIndex] || currentSentence?.words;
    if (Array.isArray(loaded) && loaded.length) return loaded;
    return extractPendingDisplayWords(currentSentence?.text);
  }, [currentSentence, currentIndex, resolvedWordsByIndex]);

  const soundRows = useMemo(
    () => buildSoundAnalysisRows(storedResult?.char_alignment),
    [storedResult]
  );

  const completedCount = Object.keys(resultsByIndex).length;
  const progressRatio = totalSentences > 0 ? completedCount / totalSentences : 0;

  // Handle Play Sample Audio
  async function handleSampleAudio() {
    if (!currentSentence || isRecording || isStarting || checking) return;
    stopSample();
    const sampleId = sampleGeneration.current;
    if (!hasPreloadedAudio && !isProOrTrial) {
      hapticFeedback.warning();
      setUpgradeFeatureKey("sampleAudio");
      setShowUpgradeModal(true);
      return;
    }

    try {
      setSamplePlaying(true);
      let url: string | null = currentSentence.audio_url || sampleAudioUrlsRef.current[currentIndex] || null;
      if (!url) {
        url = await textPracticeApi.generateAudio(currentSentence.text, dialect);
        if (url) {
          sampleAudioUrlsRef.current[currentIndex] = url;
        }
      }

      if (sampleId !== sampleGeneration.current || !sampleMounted.current) return;
      if (!url) {
        setSamplePlaying(false);
        return;
      }

      if (sampleSoundRef.current) {
        try {
          releaseAudioPlayer(sampleSoundRef.current);
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
            releaseAudioPlayer(player);
          } catch {
            /* ignore */
          }
          if (sampleSoundRef.current === player) sampleSoundRef.current = null;
        }
      });
      player.play();
    } catch {
      if (sampleId === sampleGeneration.current && sampleMounted.current) setSamplePlaying(false);
    }
  }

  // Handle Replay User Voice
  async function handleReplay() {
    if (replayPlaying) return;
    stopSample();
    try {
      setReplayPlaying(true);
      await replayRecording();
    } catch {
      /* ignore */
    } finally {
      setReplayPlaying(false);
    }
  }

  // Handle Record Toggle
  async function handleRecordToggle() {
    hapticFeedback.light();
    if (isStarting || checking) return;
    if (isRecording) {
      await stopRecording({ check: true });
      return;
    }

    if (!currentSentenceText) return;
    stopSample();
    try {
      await startRecording({ text: currentSentenceText, dialect });
    } catch {
      // Handled internally in usePronunciationCheck
    }
  }

  // Navigation between sentences
  function goToSentence(index: number) {
    if (index < 0 || index >= totalSentences) return;
    hapticFeedback.light();
    stopSample();
    clearResult();
    setCurrentIndex(index);
    setShowDetails(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleNext() {
    if (currentIndex < totalSentences - 1) {
      goToSentence(currentIndex + 1);
    } else {
      hapticFeedback.success();
      setIsCompletedAll(true);
    }
  }

  // All sentences completed celebration view
  if (isCompletedAll) {
    const scores = Object.values(resultsByIndex).map((r) => Number(r.accuracy || 0));
    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)
        : 0;

    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 p-6 justify-center items-center gap-5">
          <View className="w-24 h-24 rounded-full bg-emerald-50 items-center justify-center border-2 border-emerald-200">
            <CheckCircle2 size={54} color="#10b981" />
          </View>

          <View className="items-center gap-2">
            <AppText className="text-2xl font-black text-[#0c2340] text-center">
              {t("sentence.allFinishedTitle", "Hoàn thành bài luyện tập!")}
            </AppText>
            <AppText className="text-[15px] text-slate-500 text-center leading-6">
              {t("sentence.allFinishedDesc", "Bạn đã hoàn thành tất cả các câu trong bài học này.")}
            </AppText>
          </View>

          <View className="w-full bg-[#edf5fc] rounded-3xl p-5 items-center border border-sky-200 gap-2">
            <AppText className="text-xs font-bold text-sky-800 uppercase tracking-wider">
              {t("sentence.averageScore", "Điểm trung bình")}
            </AppText>
            <AppText className="text-5xl font-black text-[#0a2644]">
              {avgScore}%
            </AppText>
            <AppText className="text-xs text-slate-500 font-medium">
              {t("sentence.sentencesDone", { count: totalSentences, total: totalSentences })}
            </AppText>
          </View>

          <View className="w-full gap-3 mt-3">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common.back", "Quay lại")}
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
              className="w-full py-4 rounded-2xl bg-[#0a2644] items-center justify-center active:opacity-90 shadow-sm"
            >
              <AppText className="text-base font-extrabold text-white">
                {t("common.back", "Quay lại")}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
      {/* 1. NATIVE MOBILE HEADER */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-appBg border-b border-slate-200">
        {/* Back Button */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Quay lại")}
          activeOpacity={0.7}
          onPress={() => {
            hapticFeedback.light();
            navigation.goBack();
          }}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center active:opacity-70"
        >
          <ChevronLeft size={22} color="#0c2340" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Center Title & Counter */}
        <View className="flex-1 items-center mx-3">
          <AppText numberOfLines={1} className="text-base font-bold text-[#0c2340]">
            {lessonTitle}
          </AppText>
          <AppText className="text-xs font-semibold text-slate-500 mt-0.5">
            {t("sentence.progressIndicator", "Câu {{current}} / {{total}}", {
              current: currentIndex + 1,
              total: totalSentences,
            })}
          </AppText>
        </View>
      </View>

      {/* 2. LINEAR SMOOTH PROGRESS BAR (Teal Accent like Video Card) */}
      <View className="h-1 w-full bg-slate-200">
        <View
          className="h-full bg-[#2dd4bf] rounded-full"
          style={{ width: `${Math.max(8, Math.round(progressRatio * 100))}%` }}
        />
      </View>

      {/* 3. SCROLLABLE CONTENT */}
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 160,
          gap: 16,
        }}
      >
        {/* Step Indicator Dots (when multiple sentences) */}
        {totalSentences > 1 ? (
          <View className="flex-row justify-center items-center gap-1.5 py-1">
            {sentences.map((_, i) => {
              const isDone = resultsByIndex[i] != null;
              const isCurrent = i === currentIndex;
              return (
                <TouchableOpacity
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={t("sentence.goToSentence", {
                    defaultValue: `Chuyển tới câu ${i + 1}`,
                    index: i + 1,
                  })}
                  accessibilityState={{ selected: isCurrent }}
                  activeOpacity={0.7}
                  onPress={() => goToSentence(i)}
                  className={`h-2 rounded-full ${isCurrent ? "w-6 bg-[#0284c7]" : isDone ? "w-2 bg-emerald-500" : "w-2 bg-slate-300"
                    }`}
                />
              );
            })}
          </View>
        ) : null}

        {/* HERO SENTENCE CARD */}
        {/* Practice Prompt Card */}
        <PracticePromptCard
          text={currentSentence?.text}
          words={displayWords}
          alignment={storedResult?.char_alignment}
          showResultDetails={scorePct != null}
          loadingIpa={!displayWords.some((w: any) => w.ipa)}
          onPlaySample={handleSampleAudio}
          samplePlaying={samplePlaying}
        />
        {/* ERROR / MIC ISSUE ALERT CARD */}
        <MicErrorCard micError={micError} error={error} />
        {/* Practice Feedback Card */}
        <PracticeFeedbackCard
          scorePct={scorePct}
          checking={checking}
          replayPlaying={replayPlaying}
          onReplayVoice={handleReplay}
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails((v) => !v)}
          soundRows={soundRows}
          words={displayWords}
          onPracticePhoneme={(phoneme) =>
            navigation.navigate("PhonemePractice", { phoneme, dialect })
          }
          isRecording={isRecording}
        />
      </ScrollView>

      {/* 4. FIXED BOTTOM ACTION DOCK (Unified SpeechRecordingDock) */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white shadow-lg"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <SpeechRecordingDock
          isRecording={isRecording}
          isStarting={isStarting}
          checking={checking}
          disabled={!currentSentenceText}
          onRecordToggle={handleRecordToggle}
          maxSeconds={25}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < totalSentences - 1}
          isLast={currentIndex === totalSentences - 1}
          hasScore={scorePct != null}
          onPrev={() => goToSentence(currentIndex - 1)}
          onNext={handleNext}
        />
      </View>

      {/* 5. UPGRADE PRO MODAL */}
      <UpgradeProModal
        open={showUpgradeModal}
        featureKey={upgradeFeatureKey}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => {
          setShowUpgradeModal(false);
          safeNavigate("Payment");
        }}
      />
    </SafeAreaView>
  );
}
