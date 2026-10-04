import { useIsFocused } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  RotateCcw,
} from "lucide-react-native";
import VideoPlayerFrame from "@/components/practice/VideoPlayerFrame";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/services/Auth";
import { usePronunciationCheck } from "@/hooks/usePronunciationCheck";
import { useSegmentIpa } from "@/hooks/useSegmentIpa";
import { buildSoundAnalysisRows } from "@/utils/pronunciationAnalysis";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { useBillingStore } from "@/store/useBillingStore";
import { topicLabel } from "@/utils/errors";
import ScoreWords from "@/components/practice/ScoreWords";
import VideoRecordingHub from "@/components/practice/VideoRecordingHub";
import UpgradeProModal from "@/components/ui/UpgradeProModal";
import { VideoPracticeSkeleton } from "@/components/ui/Skeleton";
import { videoApi, billingApi } from "@/api";
import { useVideoDetailQuery } from "@/hooks/queries/useVideoQueries";
import {
  scheduleIncompleteLessonReminder,
  cancelIncompleteLessonReminder,
} from "@/services/notifications";
import { getItem, setItem } from "@/services/storage";
import type { Dialect, VideoSegment } from "@/types/domain";

const SENTENCE_PRE_ROLL_MS = 250;
const STORAGE_KEY_LAST_PRACTICED_PREFIX = "earlysigns_video_last_index_";

function segmentSeekSec(seg: VideoSegment, prevSeg?: VideoSegment | null): number {
  let seekMs = Math.max(0, seg.start_ms - SENTENCE_PRE_ROLL_MS);
  if (prevSeg && prevSeg.end_ms > 0 && seekMs < prevSeg.end_ms) {
    seekMs = Math.min(seg.start_ms, prevSeg.end_ms + 40);
  }
  return seekMs / 1000;
}

export default function VideoPracticeScreen({ route, navigation }: { route: any; navigation: any }) {
  const youtubeId = decodeURIComponent(route.params?.youtubeId || "");
  const isFocused = useIsFocused();
  const { t, i18n } = useTranslation();
  const {
    authToken,
    authEmail,
    userDialect,
  } = useAuth();

  const {
    data: detailData,
    isLoading: detailLoading,
    error: detailError,
  } = useVideoDetailQuery(youtubeId);

  const loading = detailLoading && !detailData;
  const error = detailError ? String((detailError as any)?.message || t("videos.practice.notFound")) : "";

  const video = detailData;
  const segments = useMemo(() => [...(detailData?.segments || [])].sort(
    (a: VideoSegment, b: VideoSegment) => a.start_ms - b.start_ms,
  ), [detailData?.segments]);
  const initialPlayback = useMemo(() => {
    const stored = getItem(`${STORAGE_KEY_LAST_PRACTICED_PREFIX}${youtubeId}`);
    const playedCount = detailData?.played_count;
    const candidates = [route.params?.initialIndex, stored == null ? NaN : parseInt(stored, 10),
    typeof playedCount === "number" && playedCount < segments.length ? playedCount : 0, 0];
    const selected = candidates.find(value => typeof value === "number" && Number.isFinite(value) && value >= 0) ?? 0;
    const index = Math.max(0, Math.min(segments.length - 1, Math.floor(selected)));
    return { index, seconds: segments[index] ? segmentSeekSec(segments[index], segments[index - 1]) : 0 };
  }, [detailData?.played_count, route.params?.initialIndex, segments, youtubeId]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [detailsExpandedFor, setDetailsExpandedFor] = useState<string | null>(null);
  const practiceDialect: Dialect = detailData?.dialect || userDialect || "uk";
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const usageStatus = useBillingStore((s) => s.usage);

  const playerRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseLockRef = useRef(true);
  const pauseTimestampRef = useRef<number>(0);
  const seekTimeRef = useRef<number>(0);
  const playTargetRef = useRef<{
    index: number;
    startMs: number;
    endMs: number;
    seekMs: number;
  } | null>(null);
  const activeIndexRef = useRef(0);
  const segmentsRef = useRef<VideoSegment[]>([]);
  const videoDurationRef = useRef(Infinity);
  const viewStartedRef = useRef(false);
  const reportedSegmentsRef = useRef(new Set<number>());
  const videoRef = useRef<any>(null);
  const practiceDialectRef = useRef<Dialect>(userDialect || "uk");
  const playingRef = useRef(playing);
  const isCheckingTimeRef = useRef(false);
  const hasPracticedRef = useRef(false);

  useEffect(() => {
    practiceDialectRef.current = practiceDialect;
  }, [practiceDialect]);

  useEffect(() => {
    return () => {
      const hasSegments = segmentsRef.current.length > 0;
      const isFinished = hasSegments && activeIndexRef.current >= segmentsRef.current.length - 1;

      if (isFinished) {
        cancelIncompleteLessonReminder().catch(() => { });
      } else if (hasPracticedRef.current && hasSegments) {
        scheduleIncompleteLessonReminder({
          youtubeId,
          title: detailData?.title,
          delayHours: 3,
          initialIndex: activeIndexRef.current,
        }).catch(() => { });
      }
    };
  }, [youtubeId, detailData?.title]);

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
    enabled: isFocused,
    language: i18n.resolvedLanguage || i18n.language || "vi",
    userTier,
    userKey,
    onUsageUpdated: (u) => useBillingStore.getState().setUsage(u),
    onDailyLimitReached: () => setShowUpgradeModal(true),
  });

  useEffect(() => {
    if (!authToken || useBillingStore.getState().usage) return;
    billingApi.getUsage().catch(() => { });
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

  const stopPlayback = useCallback(
    (index: number) => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      pauseTimestampRef.current = Date.now();
      pauseLockRef.current = true;
      playingRef.current = false;
      setPlaying(false);
      notifySegmentPlayed(index);
    },
    [notifySegmentPlayed]
  );

  const armSentence = useCallback(
    async (
      index: number,
      {
        play,
        seek = "none",
        endRoll = false,
      }: { play: boolean; seek?: "none" | "preroll"; endRoll?: boolean }
    ) => {
      const segs = segmentsRef.current;
      const seg = segs[index];
      if (!seg) return;
      activeIndexRef.current = index;
      setActiveIndex(index);
      clearResult();

      if (youtubeId) {
        try {
          setItem(`${STORAGE_KEY_LAST_PRACTICED_PREFIX}${youtubeId}`, String(index));
        } catch {
          /* ignore */
        }
      }

      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      const prevSeg = segs[index - 1] || null;
      const nextSeg = segs[index + 1] || null;
      let targetEndMs = seg.end_ms + (endRoll ? 250 : 0);
      if (nextSeg && targetEndMs > nextSeg.start_ms) {
        targetEndMs = Math.max(seg.end_ms, nextSeg.start_ms - 30);
      }
      targetEndMs = Math.min(targetEndMs, videoDurationRef.current);

      const seekSec = segmentSeekSec(seg, prevSeg);
      const seekMs = Math.round(seekSec * 1000);

      playTargetRef.current = {
        index,
        startMs: seg.start_ms,
        endMs: targetEndMs,
        seekMs,
      };
      playingRef.current = false;

      if (seek === "preroll" && playerReady && playerRef.current) {
        seekTimeRef.current = Date.now();
        playerRef.current.seekTo?.(seekSec, true);
      }

      if (play) {
        pauseLockRef.current = false;
        setPlaying(true);
      } else {
        pauseLockRef.current = true;
        playingRef.current = false;
        setPlaying(false);
      }
    },
    [clearResult, playerReady, youtubeId]
  );

  const resetPlayer = useCallback(() => {
    setPlayerReady(false);
    setPlaying(false);
    playingRef.current = false;
    pauseLockRef.current = true;
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
  }, []);

  useEffect(() => {
    resetPlayer();
  }, [resetPlayer, youtubeId]);

  useEffect(() => {
    if (isFocused) return;
    pauseLockRef.current = true;
    pauseTimestampRef.current = Date.now();
    playingRef.current = false;
    setPlaying(false);
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
  }, [isFocused]);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    hasInitializedRef.current = false;
  }, [youtubeId]);

  useEffect(() => {
    if (!detailData) return;
    videoRef.current = detailData;
    const segs = segments;
    segmentsRef.current = segs;
    videoDurationRef.current = Number(detailData?.duration_ms || Infinity);
    if (detailData?.dialect) {
      practiceDialectRef.current = detailData.dialect;
    }
    if (segs.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const clampedIndex = initialPlayback.index;
      activeIndexRef.current = clampedIndex;
      setActiveIndex(clampedIndex);
      hasPracticedRef.current = false;
      // The iframe receives this position on its first mount. Seeking an
      // unstarted YouTube player here can start playback without a user tap.
      armSentence(clampedIndex, { play: false });
    }
  }, [detailData, armSentence, initialPlayback.index, segments]);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const player = playerRef.current;
      const target = playTargetRef.current;
      if (!playingRef.current || !player || !target || isCheckingTimeRef.current) return;

      // Skip early ticks while player WebView is seeking to seekSec
      if (Date.now() - seekTimeRef.current < 250) return;

      isCheckingTimeRef.current = true;
      try {
        const sec = await Promise.race([
          player.getCurrentTime(),
          new Promise<number>((_, reject) =>
            setTimeout(() => reject(new Error("time query timeout")), 350)
          ),
        ]);
        if (playTargetRef.current !== target || !playingRef.current) return;
        const ms = Number(sec) * 1000;

        // Skip stale pre-seek time if seek was backward
        if (Date.now() - seekTimeRef.current < 1200 && ms > target.endMs + 1000) {
          return;
        }

        // Sentence playback finished speaking: stop and pause definitively!
        if (ms >= target.endMs) {
          stopPlayback(target.index);
        }
      } catch {
        // ignore player query errors / timeouts
      } finally {
        isCheckingTimeRef.current = false;
      }
    }, 100);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [stopPlayback]);

  // Ghi nhận câu khi người dùng thực hiện luyện nói và nhận được kết quả chấm điểm AI
  useEffect(() => {
    if (result) {
      hasPracticedRef.current = true;
      notifySegmentPlayed(activeIndexRef.current);
    }
  }, [result, notifySegmentPlayed]);

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
    if (isStarting || checking) return;
    if (isRecording) {
      await stopRecording({ check: true });
      return;
    }
    if (!current?.text) return;
    pauseLockRef.current = true;
    pauseTimestampRef.current = Date.now();
    playingRef.current = false;
    setPlaying(false);
    hasPracticedRef.current = true;
    try {
      await startRecording({ text: current.text, dialect: practiceDialect });
    } catch {
      // Handled internally in usePronunciationCheck
    }
  }, [
    isRecording,
    isStarting,
    checking,
    stopRecording,
    startRecording,
    current,
    practiceDialect,
  ]);

  const progressPercent = Math.round(
    ((activeIndex + 1) / Math.max(1, segments.length)) * 100
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
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
            backgroundColor: "#F7F6F2",
          }}
        />

        {/* 1. TOP NAVIGATION BAR */}
        <View className="bg-appBg px-4 py-3 border-b border-slate-200 gap-3">
          <View className="flex-row items-center justify-between">
            {/* Back Button */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t("common.back", "Quay lại danh sách video")}
              activeOpacity={0.7}
              onPress={() => {
                if (navigation?.canGoBack?.()) {
                  navigation.goBack();
                } else {
                  navigation?.navigate?.("Videos");
                }
              }}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center active:opacity-70"
            >
              <ChevronLeft size={22} color="#0c2340" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Video Title / Topic Header */}
            <View className="flex-1 px-3 items-center">
              <Text
                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                numberOfLines={1}
              >
                {video ? topicLabel(video.topic, t) : t("videos.breadcrumb.videos")}
              </Text>
              <Text
                className="text-[15px] font-bold text-[#0c2340] text-center mt-0.5"
                numberOfLines={1}
              >
                {video?.title || t("videos.practice.mainAria")}
              </Text>
            </View>

            {/* Right placeholder to keep Title centered */}
            <View className="w-10 h-10" />
          </View>

          {/* Integrated Header Progress Bar */}
          {video && segments.length > 0 ? (
            <View className="gap-1.5 pt-1">
              <View className="flex-row items-center justify-between px-1">
                <Text className="text-xs font-semibold text-slate-500">
                  {t("videos.practice.sentenceProgress", {
                    current: activeIndex + 1,
                    total: segments.length || 1,
                  })}
                </Text>
                <Text className="text-xs font-bold text-[#0c2340]">
                  {progressPercent}%
                </Text>
              </View>
              <View className="h-1.5 rounded-full overflow-hidden bg-slate-200">
                <View
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
            </View>
          ) : null}
        </View>

        {/* 2. MAIN CONTENT */}
        <View className="flex-1 bg-appBg px-4 pt-3 pb-24 gap-3.5">
          {loading ? <VideoPracticeSkeleton /> : null}

          {error ? (
            <View className="bg-rose-50 border border-rose-200 rounded-3xl p-4 items-center gap-2">
              <Text className="text-danger font-bold text-sm text-center">{error}</Text>
            </View>
          ) : null}

          {video ? (
            <>
              {/* CARD 1: CINEMATIC VIDEO PLAYER */}
              <View
                className="rounded-3xl overflow-hidden bg-black"
                style={{
                  elevation: 4,
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                }}
              >
                <VideoPlayerFrame
                  key={youtubeId}
                  ref={playerRef}
                  videoId={youtubeId}
                  thumbnail={video.thumbnail_url}
                  startSeconds={initialPlayback.seconds}
                  play={playing}
                  onPlay={() => { void armSentence(activeIndexRef.current, { play: true, seek: "preroll" }); }}
                  onReset={resetPlayer}
                  onReady={() => {
                    setPlayerReady(true);
                    const target = playTargetRef.current;
                    // A tap while loading is queued, including sentence zero.
                    if (!pauseLockRef.current && target && playerRef.current) {
                      seekTimeRef.current = Date.now();
                      playerRef.current.seekTo?.(target.seekMs / 1000, true);
                    }
                  }}
                  onChangeState={(state: string) => {
                    if (state === "playing") {
                      // Discard ghost "playing" events fired by WebView right after a programmatic pause
                      if (pauseLockRef.current && Date.now() - pauseTimestampRef.current < 800) {
                        playingRef.current = false;
                        setPlaying(false);
                        return;
                      }
                      pauseLockRef.current = false;
                      notifyViewStart();
                      playingRef.current = true;
                      setPlaying(true);
                      const target = playTargetRef.current;
                      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                      if (target) {
                        fallbackTimerRef.current = setTimeout(() => {
                          if (playingRef.current && playTargetRef.current === target) stopPlayback(target.index);
                        }, Math.max(1200, target.endMs - target.seekMs + 600));
                      }
                    } else if (state === "buffering") {
                      // Network loading time is not sentence playback time.
                      playingRef.current = false;
                      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                    } else if (state === "paused" || state === "ended") {
                      if (!playingRef.current && !pauseLockRef.current && state === "paused") return;
                      playingRef.current = false;
                      setPlaying(false);
                      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                    }
                  }}
                />
              </View>

              {/* TOOLBAR: THUMB-FRIENDLY SENTENCE NAVIGATION */}
              <View className="flex-row items-center justify-between gap-2.5 px-0.5">
                {/* Previous Sentence */}
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={t("videos.practice.prevSentence", "Câu trước")}
                  accessibilityState={{ disabled: !playerReady || activeIndex === 0 }}
                  activeOpacity={0.8}
                  disabled={!playerReady || activeIndex === 0}
                  onPress={() =>
                    armSentence(activeIndex - 1, {
                      play: true,
                      seek: "preroll",
                      endRoll: false,
                    })
                  }
                  className={`flex-1 py-3 rounded-2xl items-center justify-center flex-row gap-1 ${activeIndex === 0
                    ? "bg-slate-100 opacity-40"
                    : "bg-white active:bg-slate-50"
                    }`}
                  style={{
                    borderWidth: 1,
                    borderColor: activeIndex === 0 ? "#e2e8f0" : "#cbd5e1",
                    elevation: activeIndex === 0 ? 0 : 1,
                  }}
                >
                  <ChevronLeft
                    size={16}
                    color={activeIndex === 0 ? "#94a3b8" : "#334155"}
                  />
                  <Text className="text-xs font-bold text-slate-700">
                    {t("videos.practice.prevSentence")}
                  </Text>
                </TouchableOpacity>

                {/* Replay Video Sentence (Hero Action) */}
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={t("videos.practice.replaySentence", "Phát lại")}
                  accessibilityState={{ disabled: !current, busy: !playerReady && playing }}
                  activeOpacity={0.85}
                  disabled={!current}
                  onPress={() =>
                    armSentence(activeIndex, {
                      play: true,
                      seek: "preroll",
                      endRoll: false,
                    })
                  }
                  className="flex-[1.25] py-3.5 rounded-2xl items-center justify-center flex-row gap-2"
                  style={{
                    backgroundColor: "#2383E2",
                    elevation: 3,
                    shadowColor: "#2383E2",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                  }}
                >
                  <RotateCcw size={16} color="#ffffff" />
                  <Text className="text-xs font-black text-white tracking-wide">
                    {t("videos.practice.replaySentence")}
                  </Text>
                </TouchableOpacity>

                {/* Next Sentence */}
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={t("videos.practice.nextSentence", "Câu tiếp theo")}
                  accessibilityState={{ disabled: !playerReady || activeIndex >= segments.length - 1 }}
                  activeOpacity={0.8}
                  disabled={!playerReady || activeIndex >= segments.length - 1}
                  onPress={() =>
                    armSentence(activeIndex + 1, {
                      play: true,
                      seek: "preroll",
                      endRoll: false,
                    })
                  }
                  className={`flex-1 py-3 rounded-2xl items-center justify-center flex-row gap-1 ${activeIndex >= segments.length - 1
                    ? "bg-slate-100 opacity-40"
                    : "bg-white active:bg-slate-50"
                    }`}
                  style={{
                    borderWidth: 1,
                    borderColor: activeIndex >= segments.length - 1 ? "#e2e8f0" : "#cbd5e1",
                    elevation: activeIndex >= segments.length - 1 ? 0 : 1,
                  }}
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

              {/* COMBINED CARD: SUBTITLE & RECORDING HUB   */}
              <VideoRecordingHub
                isRecording={isRecording}
                isStarting={isStarting}
                checking={checking}
                onRecordToggle={handleRecordToggle}
                disabled={!current?.text}
                maxSeconds={25}
                micError={micError}
                checkError={checkError}
                result={result}
                scorePct={scorePct}
                showResultDetails={showResultDetails}
                showDetails={showDetails}
                replayRecording={replayRecording}
                onToggleDetails={() =>
                  setDetailsExpandedFor((prev) =>
                    prev === currentResultKey ? null : currentResultKey
                  )
                }
                soundRows={soundRows}
                words={practiceWords}
                onPracticePhoneme={(phoneme) =>
                  navigation.navigate("PhonemePractice", { phoneme, dialect: practiceDialect })
                }
                hasSentence={Boolean(current?.text)}
              >
                {/* Card Sub-header Toolbar: Toggle Vietnamese Translation */}
                {current?.translation_vi ? (
                  <View className="flex-row justify-end border-b border-slate-100 pb-1">
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t("videos.practice.toggleTranslation")}
                      accessibilityState={{ selected: showTranslation }}
                      activeOpacity={0.7}
                      onPress={() => setShowTranslation((v) => !v)}
                      className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full border ${showTranslation
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
                        className={`text-xs font-bold ${showTranslation ? "text-indigo-700" : "text-slate-600"
                          }`}
                      >
                        {t("videos.practice.toggleTranslation")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Subtitle / Sentence Content */}
                {current?.text ? (
                  <View className="gap-2.5 py-1">
                    {/* IPA Word Breakdown with Alignment */}
                    <ScoreWords
                      words={practiceWords}
                      alignment={result?.char_alignment}
                      showResultDetails={showResultDetails}
                      loadingIpa={segmentIpaLoading}
                    />

                    {/* Collapsible Vietnamese Translation */}
                    {showTranslation && current.translation_vi ? (
                      <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5 mt-1">
                        <Text className="text-xs text-indigo-950 font-medium leading-relaxed italic">
                          💡 {current.translation_vi}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {segmentIpaError ? (
                  <Text className="text-danger text-xs">{segmentIpaError}</Text>
                ) : null}
              </VideoRecordingHub>
            </>
          ) : null}
        </View>
      </ScrollView>

      <UpgradeProModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureKey="dailyLimit"
        onUpgrade={() => {
          navigation.navigate("Payment");
        }}
      />
    </SafeAreaView>
  );
}
