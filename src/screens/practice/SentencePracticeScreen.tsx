import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Mic,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react-native";
import { createAudioPlayer } from "expo-audio";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";
import { usePronunciationCheck } from "@/hooks/usePronunciationCheck";
import { buildSoundAnalysisRows } from "@/utils/pronunciationAnalysis";
import { checkResultScoreColor } from "@/utils/checkResultScoreColor";
import {
  isQuotaExhausted,
  isAudioQuotaExhausted,
  incrementQuotaUsage,
  resolveUserKey,
  resolveUserTier,
} from "@/services/usageLimits";
import { hapticFeedback } from "@/utils/haptics";
import { useAuthStore } from "@/store/useAuthStore";
import { useBillingStore } from "@/store/useBillingStore";
import { textPracticeApi } from "@/api/textPracticeApi";
import { safeNavigate } from "@/navigation/nav";
import UpgradeProModal from "@/components/ui/UpgradeProModal";
import ScoreWords from "@/components/practice/ScoreWords";
import SoundAnalysis from "@/components/practice/SoundAnalysis";
import StagedAiProgress from "@/components/practice/StagedAiProgress";
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
  const [sampleLoading, setSampleLoading] = useState(false);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureKey, setUpgradeFeatureKey] = useState<"generic" | "sampleAudio">("sampleAudio");
  const [isCompletedAll, setIsCompletedAll] = useState(false);

  const sampleSoundRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const totalSentences = sentences.length || 1;
  const currentSentence = sentences[currentIndex] || null;

  const isProOrTrial = userTier === "pro" || userTier === "trial";
  const hasPreloadedAudio = Boolean(currentSentence?.audio_url);
  const canPlaySampleAudio = isProOrTrial || hasPreloadedAudio;

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
    language: i18n.resolvedLanguage || i18n.language || "vi",
    onUsageUpdated: (u) => useBillingStore.getState().setUsage(u),
    userTier,
    userKey,
  });

  // Cleanup audio player on unmount
  useEffect(() => {
    return () => {
      if (sampleSoundRef.current) {
        try {
          sampleSoundRef.current.remove();
        } catch {
          /* ignore */
        }
        sampleSoundRef.current = null;
      }
    };
  }, []);

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
      .catch(() => {});

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
  const scoreColor = scorePct != null ? checkResultScoreColor(sentenceScore01) : "#0284c7";

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
    if (!currentSentence) return;
    if (!hasPreloadedAudio && !isProOrTrial) {
      hapticFeedback.warning();
      setUpgradeFeatureKey("sampleAudio");
      setShowUpgradeModal(true);
      return;
    }

    try {
      setSampleLoading(true);
      setSamplePlaying(true);
      let url: string | null = currentSentence.audio_url || null;
      if (!url) {
        url = await textPracticeApi.generateAudio(currentSentence.text, dialect);
        if (url) {
          currentSentence.audio_url = url;
          incrementQuotaUsage(userKey, "audio");
          useBillingStore.getState().decrementDailyRemaining();
        }
      }
      setSampleLoading(false);

      if (!url) {
        setSamplePlaying(false);
        return;
      }

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
      setSampleLoading(false);
      setSamplePlaying(false);
    }
  }

  // Handle Replay User Voice
  async function handleReplay() {
    if (replayPlaying) return;
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
    if (isQuotaExhausted({ userTier, userKey, usageStatus })) {
      hapticFeedback.warning();
      setUpgradeFeatureKey("generic");
      setShowUpgradeModal(true);
      return;
    }

    if (isRecording || isStarting) {
      await stopRecording({ check: true });
      return;
    }

    if (!currentSentence?.text) return;
    await startRecording({ text: currentSentence.text, dialect });
  }

  // Navigation between sentences
  function goToSentence(index: number) {
    if (index < 0 || index >= totalSentences) return;
    hapticFeedback.light();
    if (sampleSoundRef.current) {
      try {
        sampleSoundRef.current.remove();
      } catch {
        /* ignore */
      }
      sampleSoundRef.current = null;
    }
    setSamplePlaying(false);
    clearResult();
    setCurrentIndex(index);
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

  // Performance rating evaluation
  const scoreBadge = useMemo(() => {
    if (scorePct == null) return null;
    if (scorePct >= 80) {
      return {
        text: t("sentence.excellent", "Xuất sắc!"),
        sub: t("sentence.excellentDesc", "Phát âm rất chuẩn xác"),
        bg: "#ecfdf5",
        border: "#a7f3d0",
        color: "#059669",
        emoji: "🎉",
      };
    }
    if (scorePct >= 60) {
      return {
        text: t("sentence.good", "Khá tốt"),
        sub: t("sentence.goodDesc", "Ngữ điệu tự nhiên, tiếp tục phát huy"),
        bg: "#f0f9ff",
        border: "#bae6fd",
        color: "#0284c7",
        emoji: "👍",
      };
    }
    if (scorePct >= 40) {
      return {
        text: t("sentence.needWork", "Cần cố gắng"),
        sub: t("sentence.needWorkDesc", "Chú ý các âm gạch đỏ bên dưới"),
        bg: "#fffbeb",
        border: "#fde68a",
        color: "#d97706",
        emoji: "💪",
      };
    }
    return {
      text: t("sentence.tryAgainBand", "Hãy thử lại"),
      sub: t("sentence.tryAgainBandDesc", "Nói chậm rãi và rõ ràng hơn"),
      bg: "#fef2f2",
      border: "#fecaca",
      color: "#dc2626",
      emoji: "🔥",
    };
  }, [scorePct, t]);

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
            <Text className="text-2xl font-black text-[#0c2340] text-center">
              {t("sentence.allFinishedTitle", "Hoàn thành bài luyện tập!")}
            </Text>
            <Text className="text-[15px] text-slate-500 text-center leading-6">
              {t("sentence.allFinishedDesc", "Bạn đã hoàn thành tất cả các câu trong bài học này.")}
            </Text>
          </View>

          <View className="w-full bg-[#edf5fc] rounded-3xl p-5 items-center border border-sky-200 gap-2">
            <Text className="text-xs font-bold text-sky-800 uppercase tracking-wider">
              {t("sentence.averageScore", "Điểm trung bình")}
            </Text>
            <Text className="text-5xl font-black text-[#0a2644]">
              {avgScore}%
            </Text>
            <Text className="text-xs text-slate-500 font-medium">
              {t("sentence.sentencesDone", { count: totalSentences, total: totalSentences })}
            </Text>
          </View>

          <View className="w-full gap-3 mt-3">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.goBack()}
              className="w-full py-4 rounded-2xl bg-[#0a2644] items-center justify-center active:opacity-90 shadow-sm"
            >
              <Text className="text-base font-extrabold text-white">
                {t("common.back", "Quay lại")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#f8fafc]">
      {/* 1. NATIVE MOBILE HEADER */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        {/* Back Button */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Quay lại")}
          activeOpacity={0.7}
          onPress={() => {
            hapticFeedback.light();
            navigation.goBack();
          }}
          className="w-10 h-10 rounded-full bg-[#f8fafc] border border-slate-200 items-center justify-center active:opacity-70"
        >
          <ChevronLeft size={22} color="#0c2340" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* Center Title & Counter */}
        <View className="flex-1 items-center mx-3">
          <Text numberOfLines={1} className="text-base font-bold text-[#0c2340]">
            {lessonTitle}
          </Text>
          <Text className="text-xs font-semibold text-slate-500 mt-0.5">
            {t("sentence.progressIndicator", "Câu {{current}} / {{total}}", {
              current: currentIndex + 1,
              total: totalSentences,
            })}
          </Text>
        </View>

        {/* Dialect Accent Badge */}
        <View className="flex-row items-center px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200">
          <Text className="text-xs font-extrabold text-sky-800">
            {dialect === "us" ? "US 🇺🇸" : "UK 🇬🇧"}
          </Text>
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
                  activeOpacity={0.7}
                  onPress={() => goToSentence(i)}
                  className={`h-2 rounded-full ${
                    isCurrent ? "w-6 bg-[#0284c7]" : isDone ? "w-2 bg-emerald-500" : "w-2 bg-slate-300"
                  }`}
                />
              );
            })}
          </View>
        ) : null}

        {/* HERO SENTENCE CARD */}
        <View className="bg-white rounded-3xl p-6 border border-slate-200 gap-4 shadow-sm">
          {/* Card Top Tag Row */}
          <View className="flex-row items-center justify-between">
            <View className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200">
              <Text className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                {t("sentence.sentenceLabel", "CÂU {{index}}", { index: currentIndex + 1 })}
              </Text>
            </View>

            {storedResult ? (
              <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={13} color="#059669" />
                <Text className="text-xs font-bold text-emerald-700">
                  {t("sentence.tested", "Đã luyện")}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Single High-Contrast English Sentence (NO DUPLICATION) */}
          {currentSentence?.text ? (
            <Text className="text-2xl font-black text-[#0c2340] leading-9 text-center">
              {currentSentence.text}
            </Text>
          ) : null}

          {/* Clean Phonetic IPA Guide (rendered without repeating the word) */}
          <View className="items-center justify-center py-2 px-3 rounded-xl bg-[#f0f9ff] border border-sky-100 min-h-[36px]">
            <ScoreWords
              words={displayWords}
              alignment={storedResult?.char_alignment}
              showWord={false}
              showResultDetails={scorePct != null}
              loadingIpa={!displayWords.some((w: any) => w.ipa)}
            />
          </View>

          {/* Sample Audio Pill Button */}
          <View className="items-center mt-1">
            <TouchableOpacity
              activeOpacity={0.75}
              disabled={samplePlaying}
              onPress={handleSampleAudio}
              className="flex-row items-center justify-center gap-2 py-2.5 px-5 rounded-2xl bg-sky-50 border border-sky-200 active:opacity-75"
              style={{ opacity: samplePlaying ? 0.75 : 1 }}
            >
              {sampleLoading ? (
                <ActivityIndicator size="small" color="#0284c7" />
              ) : (
                <Volume2 size={17} color="#0284c7" />
              )}
              <Text className="text-sm font-bold text-sky-800">
                {samplePlaying
                  ? t("sentence.playingSample", "Đang phát mẫu...")
                  : t("sentence.listenToSample", "Nghe phát âm mẫu")}
              </Text>
              {!canPlaySampleAudio ? (
                <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 shrink-0">
                  <Crown size={12} color="#b45309" />
                  <Text numberOfLines={1} className="text-xs font-black text-amber-900">
                    PRO
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Progress Card (during check) */}
        {checking ? <StagedAiProgress active={checking} variant="card" /> : null}

        {/* ERROR / MIC ISSUE ALERT CARD */}
        {error || micError ? (
          <View className="bg-red-50 rounded-2xl p-4 border border-red-200 gap-2">
            <Text className="text-sm font-bold text-red-700">
              {t("sentence.recordingIssue", "Chưa nhận diện được giọng nói")}
            </Text>
            <Text className="text-xs text-red-600 leading-5">
              {error ||
                (micError ? t(`sentence.micError.${micError.type}.body`, "Lỗi micro") : null) ||
                t("sentence.trySpeakingLouder", "Vui lòng giữ mic gần miệng và phát âm rõ ràng hơn.")}
            </Text>
          </View>
        ) : null}

        {/* SCORE & DETAILED FEEDBACK CARD (after speaking) */}
        {scorePct != null && scoreBadge ? (
          <View className="bg-white rounded-3xl p-5 border border-slate-200 items-center gap-4 shadow-sm">
            {/* Score Ring */}
            <View
              className="w-32 h-32 rounded-full items-center justify-center border-8"
              style={{ borderColor: scoreColor + "25" }}
            >
              <View
                className="w-26 h-26 rounded-full items-center justify-center flex-row"
                style={{ backgroundColor: scoreColor + "12" }}
              >
                <Text className="text-3xl font-black" style={{ color: scoreColor }}>
                  {scorePct}%
                </Text>
              </View>
            </View>

            {/* Performance Badge */}
            <View
              className="items-center gap-1 px-4 py-2 rounded-2xl border"
              style={{
                backgroundColor: scoreBadge.bg,
                borderColor: scoreBadge.border,
              }}
            >
              <Text className="text-sm font-black" style={{ color: scoreBadge.color }}>
                {scoreBadge.emoji} {scoreBadge.text}
              </Text>
              <Text className="text-xs font-medium" style={{ color: scoreBadge.color, opacity: 0.9 }}>
                {scoreBadge.sub}
              </Text>
            </View>

            {/* Replay User Recording Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleReplay}
              disabled={replayPlaying}
              className="flex-row items-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 border border-slate-200 active:opacity-70"
            >
              <RotateCcw size={15} color="#475569" />
              <Text className="text-xs font-bold text-slate-700">
                {replayPlaying
                  ? t("sentence.replaying", "Đang phát giọng bạn...")
                  : t("sentence.listenYourVoice", "Nghe lại giọng của bạn")}
              </Text>
            </TouchableOpacity>

            {/* Sound Analysis Accordion */}
            {soundRows.length > 0 ? (
              <View className="w-full mt-2">
                <SoundAnalysis rows={soundRows} words={displayWords} />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* 4. FIXED BOTTOM ACTION DOCK (Ocean Navy & Sky Theme) */}
      <View
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-5 pt-3 gap-3 shadow-lg"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}
      >
        {/* Mic Hero & Arrow Navigation Row */}
        <View className="flex-row items-center justify-between">
          {/* Previous Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={currentIndex === 0}
            onPress={() => goToSentence(currentIndex - 1)}
            className="w-12 h-12 rounded-full bg-[#f8fafc] border border-slate-200 items-center justify-center active:opacity-70"
            style={{ opacity: currentIndex === 0 ? 0.35 : 1 }}
          >
            <ChevronLeft size={24} color={currentIndex === 0 ? "#94a3b8" : "#0c2340"} />
          </TouchableOpacity>

          {/* Hero Mic Button with Halo Ring */}
          <View
            className="w-[92px] h-[92px] rounded-full items-center justify-center border-2"
            style={{
              backgroundColor: isRecording ? "#fee2e2" : "#e0f2fe",
              borderColor: isRecording ? "#fca5a5" : "#bae6fd",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={checking}
              onPress={handleRecordToggle}
              className="w-[72px] h-[72px] rounded-full items-center justify-center shadow-lg active:opacity-90"
              style={{
                backgroundColor: isRecording ? "#ef4444" : "#0284c7",
                shadowColor: isRecording ? "#ef4444" : "#0284c7",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {checking ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : isRecording ? (
                <Square size={26} color="#ffffff" fill="#ffffff" />
              ) : (
                <Mic size={32} color="#ffffff" strokeWidth={2.4} />
              )}
            </TouchableOpacity>
          </View>

          {/* Next / Complete Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={currentIndex === totalSentences - 1 && scorePct == null}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={t("sentence.nextSentence", "Câu tiếp theo")}
            className="w-12 h-12 rounded-full border items-center justify-center active:opacity-70"
            style={{
              backgroundColor:
                currentIndex === totalSentences - 1 && scorePct != null
                  ? "#ecfdf5"
                  : "#f8fafc",
              borderColor:
                currentIndex === totalSentences - 1 && scorePct != null
                  ? "#a7f3d0"
                  : "#e2e8f0",
              opacity:
                currentIndex === totalSentences - 1 && scorePct == null
                  ? 0.35
                  : 1,
            }}
          >
            {currentIndex === totalSentences - 1 && scorePct != null ? (
              <CheckCircle2 size={22} color="#059669" strokeWidth={2.5} />
            ) : (
              <ChevronRight
                size={24}
                color={
                  currentIndex === totalSentences - 1 && scorePct == null
                    ? "#94a3b8"
                    : "#0c2340"
                }
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Status Prompt text below mic */}
        <Text className="text-xs font-semibold text-slate-500 text-center">
          {isRecording
            ? t("sentence.listeningHint", "Đang lắng nghe... Chạm để dừng")
            : checking
            ? t("sentence.evaluatingHint", "AI đang phân tích ngữ âm...")
            : t("sentence.tapToRecord", "Chạm vào mic để bắt đầu nói")}
        </Text>
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
