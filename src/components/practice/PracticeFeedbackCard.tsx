import React, { useMemo } from "react";
import { Pressable, TouchableOpacity, View } from "react-native";
import { AppText } from "../ui/AppText";
import { Play, Square } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import Svg, { Circle } from "react-native-svg";
import SoundAnalysis from "./SoundAnalysis";
import type { SoundAnalysisRow } from "@/types";

export interface PracticeFeedbackCardProps {
  scorePct?: number | null;
  checking?: boolean;
  replayPlaying?: boolean;
  onReplayVoice?: () => void;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  soundRows?: SoundAnalysisRow[];
  words?: any[];
  onPracticePhoneme?: (phoneme: string) => void;
  practicePhonemeLoading?: string;
  isRecording?: boolean;
}

export default function PracticeFeedbackCard({
  scorePct,
  checking = false,
  replayPlaying = false,
  onReplayVoice,
  showDetails = false,
  onToggleDetails,
  soundRows = [],
  words = [],
  onPracticePhoneme,
  practicePhonemeLoading = "",
  isRecording = false,
}: PracticeFeedbackCardProps) {
  const { t } = useTranslation();

  const clampedScore = useMemo(() => {
    if (scorePct == null || !Number.isFinite(Number(scorePct))) return 0;
    return Math.max(0, Math.min(100, Number(scorePct)));
  }, [scorePct]);

  const scoreBandInfo = useMemo(() => {
    if (scorePct == null) return null;
    if (clampedScore >= 80) {
      return {
        bg: "#ecfdf5",
        border: "#a7f3d0",
        color: "#059669",
        ringTrack: "#d1fae5",
      };
    }
    if (clampedScore >= 60) {
      return {
        bg: "#f0f9ff",
        border: "#bae6fd",
        color: "#0284c7",
        ringTrack: "#e0f2fe",
      };
    }
    if (clampedScore >= 40) {
      return {
        bg: "#fffbeb",
        border: "#fde68a",
        color: "#d97706",
        ringTrack: "#fef3c7",
      };
    }
    return {
      bg: "#fef2f2",
      border: "#fecaca",
      color: "#dc2626",
      ringTrack: "#fee2e2",
    };
  }, [clampedScore, scorePct]);

  const ringSize = 78;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;
  const displayScore = Math.round(clampedScore);

  if (checking || scorePct == null || !scoreBandInfo) return null;

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 24,
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderWidth: 1.5,
        borderColor: scoreBandInfo.border,
        gap: 14,
        shadowColor: scoreBandInfo.color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* 1. TOP COMPACT FEEDBACK SUMMARY (Side-by-Side Dual Wings) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: 16,
        }}
      >
        {/* LEFT WING: Precise Circular Progress Gauge Ring (78x78px) */}
        <View
          style={{
            width: ringSize,
            height: ringSize,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            position: "relative",
          }}
        >
          {/* SVG Circular Progress Track & Dynamic Progress Arc */}
          <Svg
            width={ringSize}
            height={ringSize}
            style={{ transform: [{ rotate: "-90deg" }] }}
          >
            {/* Background Track Ring */}
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={scoreBandInfo.ringTrack}
              strokeWidth={strokeWidth}
              fill={scoreBandInfo.bg}
            />
            {/* Progress Arc corresponding exactly to score */}
            {clampedScore > 0 ? (
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                stroke={scoreBandInfo.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            ) : null}
          </Svg>

          {/* Centered Score Label (Clean integer fit, perfectly balanced in ring) */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
            }}
          >
            <AppText
              style={{
                fontSize: 22,
                fontWeight: "900",
                color: scoreBandInfo.color,
                letterSpacing: -0.5,
              }}
            >
              {displayScore}
            </AppText>
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "800",
                color: scoreBandInfo.color,
                marginLeft: 1,
                marginTop: -4,
              }}
            >
              %
            </AppText>
          </View>
        </View>

        {/* RIGHT WING: Pronunciation Score Label + Voice Replay Pill */}
        <View style={{ flex: 1, gap: 8, justifyContent: "center" }}>
          {/* Row 1: Pronunciation Score Label */}
          <AppText
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#64748b",
            }}
            numberOfLines={1}
          >
            {t("result.pronunciationScore", "Điểm phát âm")}
          </AppText>

          {/* Row 2: Replay Voice Pill Card (Cùng 1 hàng, không bao giờ ngắt dòng) */}
          {onReplayVoice ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onReplayVoice}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t("sentence.listenToRecording", "Nghe lại bản ghi âm")}
              className="flex-row items-center"
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "nowrap",
                gap: 8,
                paddingVertical: 7,
                paddingHorizontal: 12,
                borderRadius: 14,
                backgroundColor: replayPlaying ? "#f0f9ff" : "#F7F6F2",
                borderWidth: 1,
                borderColor: replayPlaying ? "#38bdf8" : "#e2e8f0",
                width: "100%",
              }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: replayPlaying ? "#0284c7" : "#e0f2fe",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {replayPlaying ? (
                  <Square size={11} color="#ffffff" fill="#ffffff" />
                ) : (
                  <Play size={11} color="#0284c7" fill="#0284c7" style={{ marginLeft: 1.5 }} />
                )}
              </View>

              <AppText
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: replayPlaying ? "#0284c7" : "#0f172a",
                  flexShrink: 1,
                }}
              >
                {replayPlaying
                  ? t("sentence.replaying", "Đang phát giọng bạn...")
                  : t("sentence.listenToRecording", "Nghe lại bản ghi âm")}
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 4. Detailed Sound Analysis */}
      {showDetails ? (
        <SoundAnalysis
          rows={soundRows}
          words={words}
          onPracticePhoneme={onPracticePhoneme}
          practicePhonemeLoading={practicePhonemeLoading}
          disabled={isRecording || checking}
        />
      ) : onToggleDetails ? (
        <Pressable
          onPress={onToggleDetails}
          style={({ pressed }) => ({
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 14,
            backgroundColor: pressed ? "#f1f5f9" : "#F7F6F2",
            borderWidth: 1,
            borderColor: "rgba(15,23,42,0.08)",
          })}
        >
          <AppText style={{ fontSize: 13, fontWeight: "700", color: "#475569" }}>
            {t("result.soundAnalysis.viewDetails", "Xem phân tích chi tiết")}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
