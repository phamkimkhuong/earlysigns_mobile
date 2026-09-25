import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Film,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react-native";
import YoutubePlayer from "@/components/practice/YoutubePlayer";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/services/Auth";
import { usePronunciationCheck } from "@/hooks/usePronunciationCheck";
import { useSegmentIpa } from "@/hooks/useSegmentIpa";
import { buildSoundAnalysisRows } from "@/utils/pronunciationAnalysis";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { useBillingStore } from "@/store/useBillingStore";
import { checkResultScoreColorFromPct } from "@/utils/checkResultScoreColor";
import { formatMs, topicLabel } from "@/utils/errors";
import DialectToggle from "@/components/ui/DialectToggle";
import IPAChecking from "@/components/practice/IPAChecking";
import ScoreWords from "@/components/practice/ScoreWords";
import SoundAnalysis from "@/components/practice/SoundAnalysis";
import StagedAiProgress from "@/components/practice/StagedAiProgress";
import { VideoPracticeSkeleton } from "@/components/ui/Skeleton";
import { videoApi, lessonApi, billingApi } from "@/api";
import type { Dialect, VideoSegment } from "@/types/domain";

const SENTENCE_PRE_ROLL_MS = 500;
const SENTENCE_END_ROLL_MS = 500;

function segmentSeekSec(seg: VideoSegment): number {
  return Math.max(0, (seg.start_ms - SENTENCE_PRE_ROLL_MS) / 1000);
}

function segmentEndMs(
  seg: VideoSegment,
  { endRoll = false, durationMs = Infinity }: { endRoll?: boolean; durationMs?: number } = {}
): number {
  const extra = endRoll ? SENTENCE_END_ROLL_MS : 0;
  return Math.min(seg.end_ms + extra, durationMs);
}

export default function VideoPracticeScreen({ route, navigation }: { route: any; navigation: any }) {
  const youtubeId = decodeURIComponent(route.params?.youtubeId || "");
  const { t, i18n } = useTranslation();
  const {
    authToken,
    authEmail,
    userDialect,
    updateUserDialect,
  } = useAuth();

  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [hideTranscript, setHideTranscript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [detailsExpandedFor, setDetailsExpandedFor] = useState<string | null>(null);
  const [phonemeLesson, setPhonemeLesson] = useState<any>(null);
  const [practiceDialect, setPracticeDialect] = useState<Dialect>(userDialect || "uk");
  const [dialectSaving, setDialectSaving] = useState(false);
  const usageStatus = useBillingStore((s) => s.usage);

  // React 19 safe Animated Value for Mic Pulse
  const [recordPulse] = useState(() => new Animated.Value(1));

  const playerRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseLockRef = useRef(true);
  const completedSentenceRef = useRef(false);
  const playTargetRef = useRef<{ index: number; endMs: number; continuous: boolean } | null>(null);
  const programmaticPlayRef = useRef(false);
  const activeIndexRef = useRef(0);
  const segmentsRef = useRef<VideoSegment[]>([]);
  const videoDurationRef = useRef(Infinity);
  const viewStartedRef = useRef(false);
  const reportedSegmentsRef = useRef(new Set<number>());
  const videoRef = useRef<any>(null);
  const practiceDialectRef = useRef<Dialect>(userDialect || "uk");
  practiceDialectRef.current = practiceDialect;

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
  const {
    isRecording,
    isStarting,
    checking,
    result,
    error: checkError,
    micError,
    startRecording,
    stopRecording,
    clearResult,
    replayRecording,
  } = usePronunciationCheck({
    language: i18n.resolvedLanguage || i18n.language || "vi",
    userTier,
    userKey,
    onUsageUpdated: (u) => useBillingStore.getState().setUsage(u),
  });

  // Pulsing ring animation when recording
  useEffect(() => {
    if (!isRecording) {
      recordPulse.setValue(1);
      return;
    }
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(recordPulse, {
          toValue: 1.25,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(recordPulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => {
      pulseLoop.stop();
    };
  }, [isRecording, recordPulse]);

  useEffect(() => {
    if (!authToken) return;
    billingApi.getUsage().catch(() => {});
  }, [authToken]);

  const notifyViewStart = useCallback(() => {
    if (!youtubeId || viewStartedRef.current) return;
    viewStartedRef.current = true;
    const v = videoRef.current;
    const segs = segmentsRef.current;
    videoApi.notifyViewStart(youtubeId, {
      segment_count: segs.length,
      title: v?.title || "",
      thumbnail_url: v?.thumbnail_url || "",
      level: v?.level || "",
      topic: v?.topic || "",
      channel: v?.channel || "",
      duration_ms: v?.duration_ms || 0,
      dialect: v?.dialect || practiceDialectRef.current,
    }).catch(() => {
      viewStartedRef.current = false;
    });
  }, [youtubeId]);

  const notifySegmentPlayed = useCallback(
    (index: number) => {
      if (reportedSegmentsRef.current.has(index) || !youtubeId) return;
      reportedSegmentsRef.current.add(index);
      notifyViewStart();
      videoApi.notifyViewSegment(youtubeId, index).catch(() => {
        reportedSegmentsRef.current.delete(index);
      });
    },
    [youtubeId, notifyViewStart]
  );

  const armSentence = useCallback(
    async (
      index: number,
      { play, seek = "none", endRoll = false }: { play: boolean; seek?: "none" | "preroll"; endRoll?: boolean }
    ) => {
      const segs = segmentsRef.current;
      const seg = segs[index];
      if (!seg) return;
      activeIndexRef.current = index;
      setActiveIndex(index);
      clearResult();
      notifySegmentPlayed(index);
      const targetEndMs = segmentEndMs(seg, {
        endRoll,
        durationMs: videoDurationRef.current,
      });
      playTargetRef.current = {
        index,
        endMs: targetEndMs,
        continuous: false,
      };
      completedSentenceRef.current = false;
      pauseLockRef.current = true;
      if (seek === "preroll" && playerRef.current) {
        playerRef.current.seekTo(segmentSeekSec(seg), true);
      }
      if (play) {
        programmaticPlayRef.current = true;
        setPlaying(true);
      } else {
        setPlaying(false);
      }
    },
    [clearResult, notifySegmentPlayed]
  );

  const armSentenceRef = useRef(armSentence);
  armSentenceRef.current = armSentence;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await videoApi.getVideoDetail(youtubeId);
        if (cancelled) return;
        videoRef.current = data;
        setVideo(data);
        const segs = (data?.segments || []).sort(
          (a: VideoSegment, b: VideoSegment) => a.start_ms - b.start_ms
        );
        segmentsRef.current = segs;
        videoDurationRef.current = Number(data?.duration_ms || Infinity);
        if (data?.dialect) {
          setPracticeDialect(data.dialect);
          practiceDialectRef.current = data.dialect;
        }
        if (segs.length > 0) {
          activeIndexRef.current = 0;
          setActiveIndex(0);
          armSentenceRef.current(0, { play: false, seek: "preroll" });
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || t("videos.practice.notFound"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [youtubeId, t]);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const player = playerRef.current;
      const target = playTargetRef.current;
      if (!player || !target) return;
      const sec = await player.getCurrentTime();
      const ms = sec * 1000;
      if (ms >= target.endMs) {
        completedSentenceRef.current = true;
        pauseLockRef.current = true;
        setPlaying(false);
        playTargetRef.current = null;
      }
    }, 100);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const segments = video?.segments || [];
  const current = segments[activeIndex] || null;
  const {
    words: segmentWords,
    loading: segmentIpaLoading,
    error: segmentIpaError,
  } = useSegmentIpa({
    text: current?.text || "",
    dialect: practiceDialect,
    prefetchText: segments[activeIndex + 1]?.text || "",
  });

  const sentenceScore01 = useMemo(() => {
    const n = Number(result?.accuracy);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(1, n));
  }, [result]);
  const scorePct = sentenceScore01 == null ? null : Math.round(sentenceScore01 * 1000) / 10;
  const showResultDetails = scorePct != null && scorePct >= 40;
  const practiceWords = useMemo(() => {
    if (segmentWords.length) return segmentWords;
    return (current?.text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word: string) => ({ word, ipa: "" }));
  }, [current, segmentWords]);
  const soundRows = useMemo(
    () => buildSoundAnalysisRows(result?.char_alignment),
    [result]
  );

  const currentResultKey = `${activeIndex}_${result?.overallScore ?? ""}_${result?.accuracy ?? ""}`;
  const showDetails = detailsExpandedFor === currentResultKey;

  const handleRecordToggle = useCallback(async () => {
    if (isRecording || isStarting) {
      await stopRecording({ check: true });
      return;
    }
    if (!current?.text) return;
    setPlaying(false);
    await startRecording({ text: current.text, dialect: practiceDialect });
  }, [
    isRecording,
    isStarting,
    stopRecording,
    startRecording,
    current,
    practiceDialect,
  ]);

  const progressPercent = Math.round(
    ((activeIndex + 1) / Math.max(1, segments.length)) * 100
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#1e2538]">
      <ScrollView
        className="flex-1 bg-appBg"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top elastic overscroll filler */}
        <View
          style={{
            position: "absolute",
            top: -1000,
            left: 0,
            right: 0,
            height: 1000,
            backgroundColor: "#1e2538",
          }}
        />

        {/* 1. LUXURY TOP NAVIGATION BAR */}
        <View className="bg-[#1e2538] px-4 pt-3 pb-7 gap-3">
          <View className="flex-row items-center justify-between">
            {/* Back Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (navigation?.canGoBack?.()) {
                  navigation.goBack();
                } else {
                  navigation?.navigate?.("Videos");
                }
              }}
              className="w-10 h-10 rounded-2xl bg-slate-800 items-center justify-center border border-slate-700"
            >
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>

            {/* Video Title / Topic Header */}
            <View className="flex-1 px-3">
              <Text
                className="text-2xs font-bold text-indigo-400 uppercase tracking-wider"
                numberOfLines={1}
              >
                {video ? topicLabel(video.topic, t) : t("videos.breadcrumb.videos")}
              </Text>
              <Text className="text-sm font-black text-white" numberOfLines={1}>
                {video?.title || t("videos.practice.mainAria")}
              </Text>
            </View>

            {/* Dialect Toggle */}
            <DialectToggle
              value={practiceDialect}
              saving={dialectSaving}
              onChange={async (next) => {
                setDialectSaving(true);
                try {
                  await updateUserDialect(next);
                  setPracticeDialect(next);
                  clearResult();
                } finally {
                  setDialectSaving(false);
                }
              }}
            />
          </View>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-4 rounded-t-[32px] px-4 pt-5 pb-24 gap-4">
          {loading ? <VideoPracticeSkeleton /> : null}

          {error ? (
            <View className="bg-rose-50 border border-rose-200 rounded-3xl p-4 items-center gap-2">
              <Text className="text-danger font-bold text-sm text-center">{error}</Text>
            </View>
          ) : null}

          {video ? (
            <>
              {/* CARD 1: CINEMATIC VIDEO PLAYER & STEPPER */}
              <View className="bg-white rounded-3xl p-3.5 border border-slate-200/90 shadow-sm gap-3">
                {/* YouTube Video Frame */}
                <View className="rounded-2xl overflow-hidden bg-black shadow-inner">
                  <YoutubePlayer
                    ref={playerRef}
                    height={210}
                    videoId={youtubeId}
                    play={playing}
                    onReady={() => setPlayerReady(true)}
                    onChangeState={(state: string) => {
                      if (
                        state === "playing" &&
                        pauseLockRef.current &&
                        !programmaticPlayRef.current
                      ) {
                        const idx = completedSentenceRef.current
                          ? Math.min(
                              activeIndexRef.current + 1,
                              segmentsRef.current.length - 1
                            )
                          : activeIndexRef.current;
                        armSentence(idx, { play: true, seek: "none" });
                      }
                    }}
                  />
                </View>

                {/* Sentence Stepper & Progress Tracker */}
                <View className="px-1 gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-xs font-black text-slate-800">
                        {t("videos.practice.sentenceProgress", {
                          current: activeIndex + 1,
                          total: segments.length || 1,
                        })}
                      </Text>
                      <Text className="text-2xs font-semibold text-indigo-600">
                        ({progressPercent}%)
                      </Text>
                    </View>
                    <Text className="text-2xs font-bold text-slate-500">
                      ⏱️ {current ? formatMs(current.start_ms) : "0:00"}
                    </Text>
                  </View>

                  {/* Progress Line */}
                  <View className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-indigo-600 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </View>
                </View>
              </View>

              {/* CARD 2: INTERACTIVE SUBTITLE & KARAOKE CARD */}
              <View className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm gap-3.5">
                {/* Card Sub-header */}
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-2.5">
                  <View className="flex-row items-center gap-2">
                    <View className="bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                      <Text className="text-2xs font-black text-indigo-700">
                        {t("videos.practice.sentenceProgress", {
                          current: activeIndex + 1,
                          total: segments.length,
                        })}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    {/* Toggle Vietnamese Translation */}
                    {current?.translation_vi ? (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setShowTranslation((v) => !v)}
                        className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full border ${
                          showTranslation
                            ? "bg-indigo-50 border-indigo-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        {showTranslation ? (
                          <EyeOff size={13} color="#4f46e5" />
                        ) : (
                          <Eye size={13} color="#64748b" />
                        )}
                        <Text
                          className={`text-2xs font-bold ${
                            showTranslation ? "text-indigo-700" : "text-slate-600"
                          }`}
                        >
                          {t("videos.practice.toggleTranslation")}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {/* Toggle Hide/Show Transcript */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setHideTranscript((v) => !v)}
                      className="p-1.5 rounded-full bg-slate-50 border border-slate-200"
                    >
                      <Film size={14} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Subtitle Content */}
                {!hideTranscript && current?.text ? (
                  <View className="gap-2.5">
                    <Text className="text-lg font-black text-slate-900 leading-relaxed tracking-tight">
                      {current.text}
                    </Text>

                    {/* IPA Word Breakdown with Accuracy Alignment */}
                    <ScoreWords
                      words={practiceWords}
                      alignment={result?.char_alignment}
                      showResultDetails={showResultDetails}
                      loadingIpa={segmentIpaLoading}
                    />

                    {/* Collapsible Vietnamese Translation */}
                    {showTranslation && current.translation_vi ? (
                      <View className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5 mt-1">
                        <Text className="text-xs text-indigo-950 font-medium leading-relaxed">
                          💡 {current.translation_vi}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {segmentIpaError ? (
                  <Text className="text-danger text-xs">{segmentIpaError}</Text>
                ) : null}
              </View>

              {/* TOOLBAR: THUMB-FRIENDLY SENTENCE NAVIGATION */}
              <View className="flex-row items-center justify-between gap-2 px-1">
                {/* Previous Sentence */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!playerReady || activeIndex === 0}
                  onPress={() =>
                    armSentence(activeIndex - 1, { play: true, seek: "preroll" })
                  }
                  className={`flex-1 py-3 rounded-2xl border items-center justify-center flex-row gap-1 ${
                    activeIndex === 0
                      ? "bg-slate-100 border-slate-200 opacity-40"
                      : "bg-white border-slate-200 active:bg-slate-50 shadow-sm"
                  }`}
                >
                  <ChevronLeft
                    size={16}
                    color={activeIndex === 0 ? "#94a3b8" : "#334155"}
                  />
                  <Text className="text-xs font-bold text-slate-700">
                    {t("videos.practice.prevSentence")}
                  </Text>
                </TouchableOpacity>

                {/* Replay Video Sentence (Highlighted) */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!playerReady || !current}
                  onPress={() =>
                    armSentence(activeIndex, {
                      play: true,
                      seek: "preroll",
                      endRoll: true,
                    })
                  }
                  className="flex-1 py-3 rounded-2xl bg-indigo-50 border border-indigo-200 active:bg-indigo-100 shadow-sm items-center justify-center flex-row gap-1.5"
                >
                  <RotateCcw size={16} color="#4f46e5" />
                  <Text className="text-xs font-black text-indigo-700">
                    {t("videos.practice.replaySentence")}
                  </Text>
                </TouchableOpacity>

                {/* Next Sentence */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={!playerReady || activeIndex >= segments.length - 1}
                  onPress={() =>
                    armSentence(activeIndex + 1, { play: true, seek: "none" })
                  }
                  className={`flex-1 py-3 rounded-2xl border items-center justify-center flex-row gap-1 ${
                    activeIndex >= segments.length - 1
                      ? "bg-slate-100 border-slate-200 opacity-40"
                      : "bg-white border-slate-200 active:bg-slate-50 shadow-sm"
                  }`}
                >
                  <Text className="text-xs font-bold text-slate-700">
                    {t("videos.practice.nextSentence")}
                  </Text>
                  <ChevronRight
                    size={16}
                    color={activeIndex >= segments.length - 1 ? "#94a3b8" : "#334155"}
                  />
                </TouchableOpacity>
              </View>

              {/* CARD 3: HERO RECORDING CTA & AI FEEDBACK HUB */}
              <View className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm items-center gap-4">
                {/* Circular Hero Microphone Button */}
                <View className="items-center justify-center relative my-1">
                  {isRecording ? (
                    <Animated.View
                      style={{
                        position: "absolute",
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        backgroundColor: "rgba(244, 63, 94, 0.25)",
                        transform: [{ scale: recordPulse }],
                      }}
                    />
                  ) : null}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={isStarting || checking || !current?.text}
                    onPress={handleRecordToggle}
                    className={`w-20 h-20 rounded-full items-center justify-center shadow-lg ${
                      isRecording
                        ? "bg-rose-500 shadow-rose-300"
                        : isStarting
                        ? "bg-slate-400"
                        : "bg-indigo-600 shadow-indigo-300"
                    }`}
                    style={{ elevation: 6 }}
                  >
                    {isStarting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : isRecording ? (
                      <Square size={26} color="#ffffff" fill="#ffffff" />
                    ) : (
                      <Mic size={32} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Status Text under Mic */}
                <View className="items-center">
                  <Text className="text-sm font-black text-slate-900">
                    {isStarting
                      ? t("videos.practice.startingMic")
                      : isRecording
                      ? t("videos.practice.recordingNow")
                      : checking
                      ? t("sentence.checking")
                      : t("videos.practice.tapToRecord")}
                  </Text>
                  <Text className="text-2xs font-medium text-slate-400 mt-0.5">
                    {t("videos.practice.pausesAfterEach")}
                  </Text>
                </View>

                {/* Staged AI Progress when checking */}
                {checking ? (
                  <View className="w-full">
                    <StagedAiProgress active={checking} variant="compact" />
                  </View>
                ) : null}

                {/* Error messages */}
                {micError ? (
                  <View className="bg-rose-50 border border-rose-200 rounded-2xl p-3 w-full">
                    <Text className="text-danger text-xs text-center font-semibold">
                      {t(`sentence.micError.${micError.type}.title`)}
                    </Text>
                  </View>
                ) : null}
                {checkError ? (
                  <View className="bg-rose-50 border border-rose-200 rounded-2xl p-3 w-full">
                    <Text className="text-danger text-xs text-center font-semibold">
                      {checkError}
                    </Text>
                  </View>
                ) : null}

                {/* AI Evaluation Score Banner */}
                {showResultDetails ? (
                  <View className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 items-center gap-3 mt-1">
                    <View className="items-center">
                      <Text
                        className="text-4xl font-black tracking-tight"
                        style={{ color: checkResultScoreColorFromPct(scorePct) }}
                      >
                        {scorePct}%
                      </Text>
                      <Text className="text-xs font-extrabold text-slate-700 mt-1">
                        {scorePct >= 80
                          ? t("videos.practice.excellentScore")
                          : scorePct >= 50
                          ? t("videos.practice.goodScore")
                          : t("videos.practice.practiceMoreScore")}
                      </Text>
                    </View>

                    {/* Result Actions */}
                    <View className="flex-row items-center gap-2 w-full pt-1">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={replayRecording}
                        className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl items-center justify-center flex-row gap-1.5 shadow-2xs"
                      >
                        <Volume2 size={16} color="#4f46e5" />
                        <Text className="text-xs font-bold text-slate-800">
                          {t("videos.practice.listenMyVoice")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() =>
                          setDetailsExpandedFor((prev) =>
                            prev === currentResultKey ? null : currentResultKey
                          )
                        }
                        className="flex-1 py-2.5 bg-indigo-600 rounded-xl items-center justify-center flex-row gap-1.5 shadow-sm"
                      >
                        <Sparkles size={16} color="#ffffff" />
                        <Text className="text-xs font-bold text-white">
                          {t("videos.practice.viewPhonemeDetails")}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Expandable Sound Analysis */}
                    {showDetails ? (
                      <View className="w-full pt-2">
                        <SoundAnalysis
                          rows={soundRows}
                          onPracticePhoneme={async (phoneme) => {
                            const data = await lessonApi.getPhonemeLesson(
                              phoneme,
                              practiceDialect,
                              false
                            );
                            const sentences = Array.isArray(data?.sentences)
                              ? data.sentences
                              : [];
                            if (!sentences.length) return;
                            setPhonemeLesson({
                              phoneme,
                              dialect: data.dialect || practiceDialect,
                              sentences,
                              title: t("lesson.titlePhoneme", { phoneme }),
                              sessionKey: Date.now(),
                            });
                          }}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Modal luyện âm IPA riêng lẻ từ SoundAnalysis */}
      <IPAChecking
        open={Boolean(phonemeLesson)}
        onClose={() => setPhonemeLesson(null)}
        sentences={phonemeLesson?.sentences || []}
        dialect={phonemeLesson?.dialect || practiceDialect}
        onUsageUpdated={(u) => useBillingStore.getState().setUsage(u)}
        sessionKey={phonemeLesson?.sessionKey}
        autoRecordKey={phonemeLesson?.sessionKey}
        lessonTitle={phonemeLesson?.title}
        userTier={userTier}
        userKey={userKey}
        usageStatus={usageStatus}
      />
    </SafeAreaView>
  );
}
