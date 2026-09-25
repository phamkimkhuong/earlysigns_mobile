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
  Film,
  RotateCcw,
} from "lucide-react-native";
import YoutubePlayer from "@/components/practice/YoutubePlayer";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/services/Auth";
import { usePronunciationCheck } from "@/hooks/usePronunciationCheck";
import { useSegmentIpa } from "@/hooks/useSegmentIpa";
import { buildSoundAnalysisRows } from "@/utils/pronunciationAnalysis";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";
import { useBillingStore } from "@/store/useBillingStore";
import { topicLabel } from "@/utils/errors";
import DialectToggle from "@/components/ui/DialectToggle";
import IPAChecking from "@/components/practice/IPAChecking";
import ScoreWords from "@/components/practice/ScoreWords";
import VideoRecordingHub from "@/components/practice/VideoRecordingHub";
import { VideoPracticeSkeleton } from "@/components/ui/Skeleton";
import { videoApi, lessonApi, billingApi } from "@/api";
import type { Dialect, VideoSegment } from "@/types/domain";

const SENTENCE_PRE_ROLL_MS = 250;

function segmentSeekSec(seg: VideoSegment, prevSeg?: VideoSegment | null): number {
  let seekMs = Math.max(0, seg.start_ms - SENTENCE_PRE_ROLL_MS);
  if (prevSeg && prevSeg.end_ms > 0 && seekMs < prevSeg.end_ms) {
    seekMs = Math.min(seg.start_ms, prevSeg.end_ms + 40);
  }
  return seekMs / 1000;
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

  useEffect(() => {
    practiceDialectRef.current = practiceDialect;
  }, [practiceDialect]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

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
      playTargetRef.current = null;
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

      if (seek === "preroll" && playerRef.current) {
        seekTimeRef.current = Date.now();
        playerRef.current.seekTo?.(seekSec, true);
      }

      if (play) {
        pauseLockRef.current = false;
        playingRef.current = true;
        setPlaying(true);

        // Fallback safety timeout: guarantees the video pauses even if WebView bridge stalls
        const maxDurationMs = Math.max(1200, targetEndMs - seekMs + 600);
        fallbackTimerRef.current = setTimeout(() => {
          if (playingRef.current && playTargetRef.current?.index === index) {
            stopPlayback(index);
          }
        }, maxDurationMs);
      } else {
        pauseLockRef.current = true;
        playingRef.current = false;
        setPlaying(false);
      }
    },
    [clearResult, stopPlayback]
  );

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
          armSentence(0, { play: false, seek: "preroll" });
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
  }, [youtubeId, armSentence, t]);

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
      notifySegmentPlayed(activeIndexRef.current);
    }
  }, [result, notifySegmentPlayed]);

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
        <View className="bg-[#1e2538] px-4 pt-3 pb-6 gap-3.5">
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
              className="w-10 h-10 rounded-2xl bg-slate-800/90 items-center justify-center border border-slate-700/80"
            >
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>

            {/* Video Title / Topic Header */}
            <View className="flex-1 px-3 items-center">
              <Text
                className="text-[10px] font-black text-indigo-400 uppercase tracking-widest"
                numberOfLines={1}
              >
                {video ? topicLabel(video.topic, t) : t("videos.breadcrumb.videos")}
              </Text>
              <Text
                className="text-sm font-extrabold text-white text-center mt-0.5"
                numberOfLines={1}
              >
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

          {/* Integrated Header Progress Bar */}
          {video && segments.length > 0 ? (
            <View className="gap-1.5 pt-1">
              <View className="flex-row items-center justify-between px-1">
                <Text className="text-2xs font-bold text-slate-300">
                  {t("videos.practice.sentenceProgress", {
                    current: activeIndex + 1,
                    total: segments.length || 1,
                  })}
                </Text>
                <Text className="text-2xs font-extrabold text-indigo-300">
                  {progressPercent}%
                </Text>
              </View>
              <View className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <View
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
            </View>
          ) : null}
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-3 rounded-t-[32px] px-4 pt-4 pb-24 gap-3.5">
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
                <YoutubePlayer
                  ref={playerRef}
                  height={205}
                  videoId={youtubeId}
                  play={playing}
                  onReady={() => setPlayerReady(true)}
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
                    } else if (state === "paused" || state === "ended") {
                      playingRef.current = false;
                      setPlaying(false);
                    }
                  }}
                />
              </View>

              {/* CARD 2: INTERACTIVE SUBTITLE & KARAOKE CARD */}
              <View
                className="bg-white rounded-3xl p-5 gap-3"
                style={{
                  borderColor: "#f1f5f9",
                  borderWidth: 1,
                  elevation: 2,
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                }}
              >
                {/* Card Sub-header Toolbar */}
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-2.5">
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full bg-indigo-500" />
                    <Text className="text-2xs font-extrabold uppercase tracking-wider text-slate-500">
                      {t("videos.practice.practiceSentence")}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    {/* Toggle Vietnamese Translation */}
                    {current?.translation_vi ? (
                      <TouchableOpacity
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
                          className={`text-2xs font-bold ${showTranslation ? "text-indigo-700" : "text-slate-600"
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
                      className={`p-1.5 rounded-full border ${hideTranscript
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-slate-50 border-slate-200"
                        }`}
                    >
                      <Film size={14} color={hideTranscript ? "#4f46e5" : "#64748b"} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Subtitle Content */}
                {hideTranscript ? (
                  <View className="py-6 items-center justify-center gap-2">
                    <Text className="text-xs text-slate-400 font-medium">
                      {t("videos.practice.listeningModeActive")}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setHideTranscript(false)}
                      className="px-3 py-1 bg-slate-100 rounded-full"
                    >
                      <Text className="text-2xs font-bold text-slate-700">
                        {t("videos.practice.showSubtitles")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : current?.text ? (
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
                      <View className="bg-indigo-50/50 border border-indigo-100/70 rounded-2xl p-3.5 mt-1">
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
              </View>

              {/* TOOLBAR: THUMB-FRIENDLY SENTENCE NAVIGATION */}
              <View className="flex-row items-center justify-between gap-2.5 px-0.5">
                {/* Previous Sentence */}
                <TouchableOpacity
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
                  activeOpacity={0.85}
                  disabled={!playerReady || !current}
                  onPress={() =>
                    armSentence(activeIndex, {
                      play: true,
                      seek: "preroll",
                      endRoll: false,
                    })
                  }
                  className="flex-[1.25] py-3.5 rounded-2xl bg-indigo-600 active:bg-indigo-700 items-center justify-center flex-row gap-2"
                  style={{
                    elevation: 3,
                    shadowColor: "#4f46e5",
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

              {/* CARD 3: HERO RECORDING CTA & AI FEEDBACK HUB */}
              <VideoRecordingHub
                isRecording={isRecording}
                isStarting={isStarting}
                checking={checking}
                onRecordToggle={handleRecordToggle}
                disabled={!playerReady}
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
                hasSentence={Boolean(current?.text)}
              />
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
