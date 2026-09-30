import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AudioLines,
  ChevronDown,
  ChevronUp,
  Mic,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { hapticFeedback } from "@/utils/haptics";
import { checkResultScoreColorFromPct } from "@/utils/checkResultScoreColor";
import SoundAnalysis from "./SoundAnalysis";
import StagedAiProgress from "./StagedAiProgress";
import MicErrorCard from "./MicErrorCard";
import type { MicError, SentenceCheckResult } from "@/types/domain";

export interface VideoRecordingHubProps {
  isRecording: boolean;
  isStarting: boolean;
  checking: boolean;
  onRecordToggle: () => void;
  disabled?: boolean;
  micError?: MicError | null;
  checkError?: string;
  result?: SentenceCheckResult | null;
  scorePct?: number | null;
  showResultDetails?: boolean;
  showDetails?: boolean;
  replayRecording: () => Promise<void>;
  onToggleDetails: () => void;
  soundRows?: any[];
  words?: { word: string; ipa?: string }[];
  onPracticePhoneme?: (phoneme: string) => void;
  hasSentence: boolean;
  maxSeconds?: number;
}

export default function VideoRecordingHub({
  isRecording,
  isStarting,
  checking,
  onRecordToggle,
  disabled = false,
  micError,
  checkError,
  result,
  scorePct,
  showResultDetails = false,
  showDetails = false,
  replayRecording,
  onToggleDetails,
  soundRows = [],
  words = [],
  onPracticePhoneme,
  hasSentence,
  maxSeconds = 25,
}: VideoRecordingHubProps) {
  const { t } = useTranslation();

  // Timer counter during recording (00:00 / 00:25)
  const [recordSeconds, setRecordSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Animated values for multi-layer sound waves (React 19 safe useState)
  const [wave1] = useState(() => new Animated.Value(1));
  const [wave2] = useState(() => new Animated.Value(1));
  const [wave3] = useState(() => new Animated.Value(1));
  const [waveOpacity1] = useState(() => new Animated.Value(0.5));
  const [waveOpacity2] = useState(() => new Animated.Value(0.35));
  const [waveOpacity3] = useState(() => new Animated.Value(0.2));

  // Gentle breathing halo for idle state
  const [idleBreath] = useState(() => new Animated.Value(1));
  const [idleOpacity] = useState(() => new Animated.Value(0.2));

  // 5 equalizer bars for voice visualizer
  const [bar1] = useState(() => new Animated.Value(8));
  const [bar2] = useState(() => new Animated.Value(14));
  const [bar3] = useState(() => new Animated.Value(10));
  const [bar4] = useState(() => new Animated.Value(16));
  const [bar5] = useState(() => new Animated.Value(8));

  // Recording seconds timer without synchronous effect setState
  useEffect(() => {
    if (!isRecording) {
      startTimeRef.current = null;
      setRecordSeconds(0);
      return;
    }
    startTimeRef.current = Date.now();
    setRecordSeconds(0);
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordSeconds(Math.min(elapsed, maxSeconds));
      }
    }, 500);
    return () => {
      clearInterval(interval);
      startTimeRef.current = null;
    };
  }, [isRecording, maxSeconds]);

  // Format MM:SS
  const formattedTime = useMemo(() => {
    const elapsed = isRecording ? recordSeconds : 0;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [isRecording, recordSeconds]);

  const maxTimeFormatted = useMemo(() => {
    const mins = Math.floor(maxSeconds / 60);
    const secs = maxSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [maxSeconds]);

  const remainingSeconds = Math.max(0, maxSeconds - recordSeconds);
  const isNearLimit = isRecording && remainingSeconds <= 5;

  // Multi-tier ripple soundwaves animation when recording
  useEffect(() => {
    if (!isRecording) {
      wave1.setValue(1);
      wave2.setValue(1);
      wave3.setValue(1);
      waveOpacity1.setValue(0);
      waveOpacity2.setValue(0);
      waveOpacity3.setValue(0);
      return;
    }

    const createRipple = (scaleVal: Animated.Value, opacityVal: Animated.Value, maxScale: number, delayMs: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.parallel([
            Animated.timing(scaleVal, {
              toValue: maxScale,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(opacityVal, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleVal, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacityVal, {
              toValue: 0.45,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const anim1 = createRipple(wave1, waveOpacity1, 1.35, 0);
    const anim2 = createRipple(wave2, waveOpacity2, 1.65, 350);
    const anim3 = createRipple(wave3, waveOpacity3, 1.95, 700);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [isRecording, wave1, wave2, wave3, waveOpacity1, waveOpacity2, waveOpacity3]);

  // Gentle idle breathing halo
  useEffect(() => {
    if (isRecording || checking || isStarting) {
      idleBreath.setValue(1);
      idleOpacity.setValue(0);
      return;
    }

    const idleLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(idleBreath, {
            toValue: 1.12,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(idleOpacity, {
            toValue: 0.35,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(idleBreath, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(idleOpacity, {
            toValue: 0.15,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    idleLoop.start();
    return () => idleLoop.stop();
  }, [isRecording, checking, isStarting, idleBreath, idleOpacity]);

  // Dancing equalizer bars when recording
  useEffect(() => {
    if (!isRecording) return;

    const animateBar = (bar: Animated.Value, minH: number, maxH: number, dur: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: maxH,
            duration: dur,
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: minH,
            duration: dur,
            useNativeDriver: false,
          }),
        ])
      );
    };

    const b1 = animateBar(bar1, 6, 22, 280);
    const b2 = animateBar(bar2, 10, 30, 320);
    const b3 = animateBar(bar3, 8, 26, 260);
    const b4 = animateBar(bar4, 12, 34, 340);
    const b5 = animateBar(bar5, 6, 20, 300);

    b1.start();
    b2.start();
    b3.start();
    b4.start();
    b5.start();

    return () => {
      b1.stop();
      b2.stop();
      b3.stop();
      b4.stop();
      b5.stop();
    };
  }, [isRecording, bar1, bar2, bar3, bar4, bar5]);

  const handlePress = () => {
    hapticFeedback.medium();
    onRecordToggle();
  };

  const handleReplay = async () => {
    hapticFeedback.light();
    await replayRecording();
  };

  const handleToggleDetails = () => {
    hapticFeedback.selection();
    onToggleDetails();
  };

  return (
    <View
      className="bg-white rounded-3xl p-4 items-center gap-2"
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
      {/* 1. TOP DYNAMIC STATUS PILL (Only during active recording/starting/checking states) */}
      {isStarting ? (
        <View className="items-center">
          <View className="flex-row items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200">
            <ActivityIndicator size={11} color="#d97706" />
            <Text className="text-xs font-bold text-amber-800">
              {t("videos.practice.startingMic")}
            </Text>
          </View>
        </View>
      ) : isRecording ? (
        <View className="items-center">
          <View
            className="flex-row items-center gap-2 px-4 py-1.5 rounded-full"
            style={{
              backgroundColor: isNearLimit ? "#fff7ed" : "#fff1f2",
              borderColor: isNearLimit ? "#fdba74" : "#fecdd3",
              borderWidth: 1,
            }}
          >
            <View
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: isNearLimit ? "#ea580c" : "#f43f5e" }}
            />
            <Text
              className="text-xs font-black tracking-wide"
              style={{ color: isNearLimit ? "#c2410c" : "#be123c" }}
            >
              {isNearLimit
                ? `${t("videos.practice.endingSoon", "Sắp hết giờ")} (${remainingSeconds}s) • ${formattedTime} / ${maxTimeFormatted}`
                : `${t("videos.practice.record")} • ${formattedTime} / ${maxTimeFormatted}`}
            </Text>
          </View>
        </View>
      ) : checking ? (
        <View className="items-center">
          <View className="flex-row items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200">
            <ActivityIndicator size={11} color="#4f46e5" />
            <Text className="text-xs font-bold text-indigo-700">
              {t("sentence.checking")}
            </Text>
          </View>
        </View>
      ) : null}

      {/* 2. HERO MICROPHONE BUTTON WITH MULTI-TIER WAVES */}
      <View className="items-center justify-center relative my-0.5" style={{ width: 110, height: 110 }}>
        {/* Multi-tier Ripple Sound Waves (Recording) */}
        {isRecording ? (
          <>
            <Animated.View
              style={{
                position: "absolute",
                width: 82,
                height: 82,
                borderRadius: 41,
                backgroundColor: "rgba(244, 63, 94, 0.2)",
                borderWidth: 1.5,
                borderColor: "rgba(244, 63, 94, 0.4)",
                transform: [{ scale: wave1 }],
                opacity: waveOpacity1,
              }}
            />
            <Animated.View
              style={{
                position: "absolute",
                width: 82,
                height: 82,
                borderRadius: 41,
                backgroundColor: "rgba(244, 63, 94, 0.15)",
                borderWidth: 1.5,
                borderColor: "rgba(244, 63, 94, 0.3)",
                transform: [{ scale: wave2 }],
                opacity: waveOpacity2,
              }}
            />
            <Animated.View
              style={{
                position: "absolute",
                width: 82,
                height: 82,
                borderRadius: 41,
                backgroundColor: "rgba(244, 63, 94, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(244, 63, 94, 0.2)",
                transform: [{ scale: wave3 }],
                opacity: waveOpacity3,
              }}
            />
          </>
        ) : null}

        {/* Ambient Breathing Halo (Idle) */}
        {!isRecording && !checking && !isStarting ? (
          <Animated.View
            style={{
              position: "absolute",
              width: 98,
              height: 98,
              borderRadius: 49,
              backgroundColor: "#0a2644",
              transform: [{ scale: idleBreath }],
              opacity: idleOpacity,
            }}
          />
        ) : null}

        {/* Hero Circular Action Button */}
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={
            isRecording
              ? t("videos.practice.accessibilityStopRecording") || "Dừng thu âm và gửi AI chấm điểm"
              : isStarting
              ? t("videos.practice.accessibilityStarting") || "Đang khởi động micro..."
              : checking
              ? t("videos.practice.accessibilityAnalyzing") || "Hệ thống AI đang chấm điểm, vui lòng đợi..."
              : t("videos.practice.accessibilityStartRecording") || "Bắt đầu thu âm phát âm"
          }
          accessibilityHint={
            isRecording
              ? t("videos.practice.accessibilityRecordHint") || "Nhấn đúp để kết thúc bài nói và gửi chấm điểm"
              : t("videos.practice.accessibilityRecordHint") || "Nhấn đúp để bắt đầu thu âm câu luyện tập"
          }
          accessibilityState={{
            disabled: !!(disabled || isStarting || checking || !hasSentence),
            busy: !!(isStarting || checking),
          }}
          activeOpacity={0.85}
          disabled={disabled || isStarting || checking || !hasSentence}
          onPress={handlePress}
          className="w-[82px] h-[82px] rounded-full items-center justify-center"
          style={{
            elevation: 8,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            borderWidth: 3,
            borderColor: isRecording ? "#fecdd3" : "#1e3a5f",
            backgroundColor: isRecording
              ? "#f43f5e"
              : isStarting
              ? "#f59e0b"
              : checking
              ? "#1e3a5f"
              : "#0a2644",
            shadowColor: isRecording ? "#f43f5e" : "#0a2644",
          }}
        >
          {isStarting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : isRecording ? (
            <Square size={26} color="#ffffff" fill="#ffffff" />
          ) : (
            <Mic size={34} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* 3. DANCING VOICE WAVEFORM BARS (During Recording) */}
      {isRecording ? (
        <View className="flex-row items-center justify-center gap-1.5 h-8 -mt-1">
          <Animated.View style={{ width: 4, height: bar1, backgroundColor: "#f43f5e", borderRadius: 2 }} />
          <Animated.View style={{ width: 4, height: bar2, backgroundColor: "#f43f5e", borderRadius: 2 }} />
          <Animated.View style={{ width: 4, height: bar3, backgroundColor: "#e11d48", borderRadius: 2 }} />
          <Animated.View style={{ width: 4, height: bar4, backgroundColor: "#f43f5e", borderRadius: 2 }} />
          <Animated.View style={{ width: 4, height: bar5, backgroundColor: "#f43f5e", borderRadius: 2 }} />
        </View>
      ) : null}

      {/* 4. GUIDANCE & ACTION PROMPTS */}
      <View className="items-center px-4">
        <Text className="text-base font-black text-slate-900 text-center">
          {isStarting
            ? t("videos.practice.startingMic")
            : isRecording
            ? t("videos.practice.recordingNow")
            : checking
            ? t("sentence.checking")
            : showResultDetails
            ? t("videos.practice.practiceSentence")
            : t("videos.practice.tapToRecord")}
        </Text>
        <Text className="text-xs font-medium text-slate-500 text-center mt-0.5 leading-relaxed">
          {isRecording
            ? t("videos.practice.pausesOnSilence")
            : checking
            ? t("sentence.aiProgress.title")
            : t("videos.practice.tapHint", "Chạm mic để bắt đầu luyện nói")}
        </Text>
      </View>

      {/* 5. STAGED AI PROGRESS */}
      {checking ? (
        <View className="w-full pt-1">
          <StagedAiProgress active={checking} variant="compact" />
        </View>
      ) : null}

      {/* 6. ERROR NOTIFICATIONS */}
      <MicErrorCard micError={micError} error={checkError} />

      {/* 7. AI EVALUATION SCORE CARD (Seamless Flat Layout) */}
      {showResultDetails && !checking && !isRecording ? (
        <View className="w-full pt-4 mt-1 border-t border-slate-100 items-center gap-3">
          {/* Score Crown */}
          <View className="items-center">
            <Text
              className="text-4xl font-black tracking-tight"
              style={{ color: checkResultScoreColorFromPct(scorePct) }}
            >
              {scorePct != null ? `${scorePct}%` : "--"}
            </Text>
            <Text className="text-xs font-extrabold text-slate-700 mt-1">
              {scorePct != null && scorePct >= 80
                ? t("videos.practice.excellentScore")
                : scorePct != null && scorePct >= 50
                ? t("videos.practice.goodScore")
                : t("videos.practice.practiceMoreScore")}
            </Text>
          </View>

          {/* Action Row */}
          <View className="flex-row items-center gap-2 w-full pt-1">
            {/* Replay My Voice */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t("videos.practice.accessibilityPlayVoice") || t("videos.practice.listenMyVoice") || "Nghe lại giọng tôi"}
              activeOpacity={0.8}
              onPress={handleReplay}
              className="flex-1 py-2.5 bg-white rounded-xl items-center justify-center flex-row gap-1.5"
              style={{
                borderWidth: 1,
                borderColor: "#cbd5e1",
                elevation: 1,
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
              }}
            >
              <Volume2 size={16} color="#4f46e5" />
              <Text className="text-xs font-bold text-slate-800">
                {t("videos.practice.listenMyVoice")}
              </Text>
            </TouchableOpacity>

            {/* Toggle Phoneme Details */}
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t("videos.practice.accessibilityViewPhonemes") || t("videos.practice.viewPhonemeDetails") || "Phân tích âm vị"}
              accessibilityState={{ expanded: showDetails }}
              activeOpacity={0.8}
              onPress={handleToggleDetails}
              className="flex-1 py-2.5 bg-indigo-600 rounded-xl items-center justify-center flex-row gap-1.5 shadow-sm active:bg-indigo-700"
            >
              <AudioLines size={16} color="#ffffff" />
              <Text className="text-xs font-bold text-white">
                {t("videos.practice.viewPhonemeDetails")}
              </Text>
              {showDetails ? (
                <ChevronUp size={14} color="#ffffff" />
              ) : (
                <ChevronDown size={14} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Re-record Button */}
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t("sentence.tryAgainLowScore") || "Luyện lại câu này"}
            activeOpacity={0.8}
            onPress={handlePress}
            className="flex-row items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg"
          >
            <RotateCcw size={13} color="#64748b" />
            <Text className="text-xs font-bold text-slate-500">
              {t("sentence.tryAgainLowScore")}
            </Text>
          </TouchableOpacity>

          {/* Expandable Sound Breakdown */}
          {showDetails ? (
            <View className="w-full pt-2">
              <SoundAnalysis
                rows={soundRows}
                words={words}
                onPracticePhoneme={onPracticePhoneme}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
