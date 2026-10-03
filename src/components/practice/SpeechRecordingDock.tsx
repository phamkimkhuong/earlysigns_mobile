import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CheckCircle2, ChevronLeft, ChevronRight, Mic, Square } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { hapticFeedback } from "@/utils/haptics";

export interface SpeechRecordingDockProps {
  isRecording: boolean;
  isStarting?: boolean;
  checking?: boolean;
  disabled?: boolean;
  onRecordToggle: () => void;
  maxSeconds?: number;
  // Navigation controls
  hasPrev?: boolean;
  hasNext?: boolean;
  isLast?: boolean;
  hasScore?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  statusHint?: string;
}

export default function SpeechRecordingDock({
  isRecording,
  isStarting = false,
  checking = false,
  disabled = false,
  onRecordToggle,
  maxSeconds = 25,
  hasPrev = false,
  hasNext = false,
  isLast = false,
  hasScore = false,
  onPrev,
  onNext,
  statusHint,
}: SpeechRecordingDockProps) {
  const { t } = useTranslation();

  // Timer counter during recording (00:00 / 00:25)
  const [recordSeconds, setRecordSeconds] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const autoStoppedRef = useRef(false);

  // Animated values for multi-layer sound waves
  const [wave1] = useState(() => new Animated.Value(1));
  const [wave2] = useState(() => new Animated.Value(1));
  const [wave3] = useState(() => new Animated.Value(1));
  const [waveOpacity1] = useState(() => new Animated.Value(0.5));
  const [waveOpacity2] = useState(() => new Animated.Value(0.35));
  const [waveOpacity3] = useState(() => new Animated.Value(0.2));

  // Gentle breathing halo for idle state
  const [idleBreath] = useState(() => new Animated.Value(1));
  const [idleOpacity] = useState(() => new Animated.Value(0.2));

  // Equalizer bars for audio wave animation
  const [bar1] = useState(() => new Animated.Value(6));
  const [bar2] = useState(() => new Animated.Value(12));
  const [bar3] = useState(() => new Animated.Value(8));
  const [bar4] = useState(() => new Animated.Value(14));
  const [bar5] = useState(() => new Animated.Value(6));

  // Recording seconds timer & AUTO-STOP SAFETY LIMIT
  useEffect(() => {
    if (!isRecording) {
      startTimeRef.current = null;
      setRecordSeconds(0);
      autoStoppedRef.current = false;
      return;
    }

    startTimeRef.current = Date.now();
    setRecordSeconds(0);
    autoStoppedRef.current = false;

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordSeconds(Math.min(elapsed, maxSeconds));

        // Auto-stop when reaching maxSeconds to prevent runaway recording
        if (elapsed >= maxSeconds && !autoStoppedRef.current) {
          autoStoppedRef.current = true;
          clearInterval(interval);
          hapticFeedback.warning();
          onRecordToggle();
        }
      }
    }, 500);

    return () => {
      clearInterval(interval);
      startTimeRef.current = null;
    };
  }, [isRecording, maxSeconds, onRecordToggle]);

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
            toValue: 1.14,
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

  // Equalizer dancing animation
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

    const b1 = animateBar(bar1, 6, 20, 280);
    const b2 = animateBar(bar2, 10, 28, 320);
    const b3 = animateBar(bar3, 8, 24, 260);
    const b4 = animateBar(bar4, 12, 32, 340);
    const b5 = animateBar(bar5, 6, 18, 300);

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
    if (disabled || isStarting || checking) return;
    hapticFeedback.medium();
    onRecordToggle();
  };

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderTopWidth: 1,
        borderTopColor: "rgba(15,23,42,0.07)",
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        gap: 10,
        alignItems: "center",
      }}
    >
      {/* 1. STATUS BADGE / COUNTDOWN TIMER PILL */}
      {isStarting ? (
        <View
          className="flex-row items-center gap-1.5 px-3.5 py-1 rounded-full border"
          style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}
        >
          <ActivityIndicator size={11} color="#2383e2" />
          <Text className="text-xs font-bold text-blue-800">
            {t("videos.practice.startingMic", "Đang khởi động micro...")}
          </Text>
        </View>
      ) : isRecording ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 5,
            borderRadius: 20,
            backgroundColor: isNearLimit ? "#fff7ed" : "#fff1f2",
            borderWidth: 1,
            borderColor: isNearLimit ? "#fdba74" : "#fecdd3",
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isNearLimit ? "#ea580c" : "#f43f5e",
            }}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "800",
              color: isNearLimit ? "#c2410c" : "#be123c",
            }}
          >
            {isNearLimit
              ? `${t("videos.practice.endingSoon", "Sắp hết giờ")} (${remainingSeconds}s) • ${formattedTime} / ${maxTimeFormatted}`
              : `${t("videos.practice.record", "Đang ghi âm")} • ${formattedTime} / ${maxTimeFormatted}`}
          </Text>
        </View>
      ) : checking ? (
        <View
          className="flex-row items-center gap-1.5 px-3.5 py-1 rounded-full border"
          style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}
        >
          <ActivityIndicator size={11} color="#2383e2" />
          <Text className="text-xs font-bold text-blue-800">
            {t("sentence.checking", "Đang phân tích...")}
          </Text>
        </View>
      ) : null}

      {/* 2. DOCK NAVIGATION ROW: PREV | HERO MIC BUTTON | NEXT */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        {/* Previous Sentence Button */}
        {onPrev ? (
          <Pressable
            onPress={onPrev}
            disabled={!hasPrev || isRecording || isStarting || checking}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("sentence.previous", "Câu trước")}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: pressed ? "#e2e8f0" : "#f8fafc",
              borderWidth: 1,
              borderColor: "rgba(15,23,42,0.1)",
              alignItems: "center",
              justifyContent: "center",
              opacity: !hasPrev || isRecording || isStarting || checking ? 0.35 : 1,
            })}
          >
            <ChevronLeft size={22} color="#475569" />
          </Pressable>
        ) : (
          <View style={{ width: 48 }} />
        )}

        {/* Hero Mic Button with Ripple Waves & Equalizer */}
        <View
          pointerEvents="box-none"
          style={{
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            width: 104,
            height: 104,
          }}
        >
          {/* Multi-tier Ripple Sound Waves during recording */}
          {isRecording ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: "rgba(224, 62, 62, 0.25)",
                  transform: [{ scale: wave1 }],
                  opacity: waveOpacity1,
                }}
              />
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: "rgba(224, 62, 62, 0.18)",
                  transform: [{ scale: wave2 }],
                  opacity: waveOpacity2,
                }}
              />
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: "rgba(224, 62, 62, 0.12)",
                  transform: [{ scale: wave3 }],
                  opacity: waveOpacity3,
                }}
              />
            </>
          ) : (
            /* Idle Breathing Halo */
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 86,
                height: 86,
                borderRadius: 43,
                backgroundColor: "#2383E2",
                transform: [{ scale: idleBreath }],
                opacity: idleOpacity,
              }}
            />
          )}

          {/* Touchable Hero Mic Circle */}
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.85}
            disabled={disabled || isStarting || checking}
            accessible
            accessibilityRole="button"
            accessibilityLabel={
              isRecording
                ? t("sentence.stopRecording", "Dừng ghi âm")
                : t("sentence.startRecording", "Bắt đầu ghi âm")
            }
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: isRecording ? "#E03E3E" : checking ? "#1d4ed8" : "#2383E2",
              borderWidth: 2.5,
              borderColor: isRecording ? "#fca5a5" : isStarting ? "#93c5fd" : checking ? "#93c5fd" : "#60a5fa",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: isRecording ? "#E03E3E" : "#2383E2",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 6,
              opacity: disabled ? 0.45 : isStarting ? 0.65 : 1,
            }}
          >
            {checking || isStarting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : isRecording ? (
              <Square size={26} color="#ffffff" fill="#ffffff" />
            ) : (
              <Mic size={30} color="#ffffff" strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        </View>

        {/* Next / Complete Sentence Button */}
        {onNext ? (
          <Pressable
            onPress={onNext}
            disabled={(!hasNext && !hasScore) || isRecording || isStarting || checking}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("sentence.nextSentence", "Câu tiếp theo")}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: isLast && hasScore ? "#ecfdf5" : pressed ? "#e2e8f0" : "#f8fafc",
              borderWidth: 1,
              borderColor: isLast && hasScore ? "#a7f3d0" : "rgba(15,23,42,0.1)",
              alignItems: "center",
              justifyContent: "center",
              opacity: (!hasNext && !hasScore) || isRecording || isStarting || checking ? 0.35 : 1,
            })}
          >
            {isLast && hasScore ? (
              <CheckCircle2 size={22} color="#059669" strokeWidth={2.5} />
            ) : (
              <ChevronRight size={22} color="#475569" />
            )}
          </Pressable>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      {/* 3. SUBTLE STATUS HINT LABEL */}
      {!isRecording && !checking && !isStarting ? (
        <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>
          {statusHint || t("sentence.tapToRecord", "Chạm micro để bắt đầu nói")}
        </Text>
      ) : null}
    </View>
  );
}
