import React, { useMemo } from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { Play, Square } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { checkResultScoreColor } from "@/utils/checkResultScoreColor";
import SoundAnalysis from "./SoundAnalysis";
import StagedAiProgress from "./StagedAiProgress";
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
  showDetails = true,
  onToggleDetails,
  soundRows = [],
  words = [],
  onPracticePhoneme,
  practicePhonemeLoading = "",
  isRecording = false,
}: PracticeFeedbackCardProps) {
  const { t } = useTranslation();

  const score01 = scorePct != null ? scorePct / 100 : 0;
  const scoreColor = checkResultScoreColor(score01);

  const scoreBandInfo = useMemo(() => {
    if (scorePct == null) return null;
    if (scorePct >= 80) {
      return {
        label: t("result.scoreBand.excellent", "Xuất sắc!"),
        bg: "#ecfdf5",
        border: "#a7f3d0",
        color: "#059669",
      };
    }
    if (scorePct >= 60) {
      return {
        label: t("result.scoreBand.good", "Khá tốt"),
        bg: "#f0f9ff",
        border: "#bae6fd",
        color: "#0284c7",
      };
    }
    if (scorePct >= 40) {
      return {
        label: t("result.scoreBand.needsWork", "Cần cố gắng hơn"),
        bg: "#fffbeb",
        border: "#fde68a",
        color: "#d97706",
      };
    }
    return {
      label: t("result.scoreBand.tryAgain", "Hãy thử lại"),
      bg: "#fef2f2",
      border: "#fecaca",
      color: "#dc2626",
    };
  }, [scorePct, t]);

  if (checking) {
    return <StagedAiProgress active={checking} variant="card" />;
  }

  if (scorePct == null) return null;

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 24,
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: scoreColor + "30",
        gap: 14,
        shadowColor: scoreColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* 1. TOP COMPACT FEEDBACK SUMMARY (Side-by-Side Dual Wings - */}
      <View
        className="flex-row items-center w-full justify-between"
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: 16,
        }}
      >
        {/* LEFT WING: Compact Score Ring (76x76px) */}
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            borderWidth: 5,
            borderColor: scoreColor + "25",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: scoreColor + "0a",
            flexShrink: 0,
          }}
        >
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              backgroundColor: scoreColor + "15",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
            }}
          >
            <Text
              style={{
                fontSize: 26,
                fontWeight: "900",
                color: scoreColor,
                letterSpacing: -0.5,
              }}
            >
              {scorePct}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: scoreColor,
                marginLeft: 1,
                marginTop: -6,
              }}
            >
              %
            </Text>
          </View>
        </View>

        {/* RIGHT WING: Score Band Badge + Voice Replay Pill */}
        <View style={{ flex: 1, gap: 10, justifyContent: "center" }}>
          {/* Row 1: Accented Vietnamese Score Band Badge */}
          {scoreBandInfo ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4.5,
                  borderRadius: 12,
                  backgroundColor: scoreBandInfo.bg,
                  borderWidth: 1,
                  borderColor: scoreBandInfo.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "800",
                    color: scoreBandInfo.color,
                  }}
                  numberOfLines={1}
                >
                  {scoreBandInfo.label}
                </Text>
              </View>
            </View>
          ) : null}

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
                backgroundColor: replayPlaying ? "#f0f9ff" : "#f8fafc",
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

              <Text
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
              </Text>
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
            backgroundColor: pressed ? "#f1f5f9" : "#f8fafc",
            borderWidth: 1,
            borderColor: "rgba(15,23,42,0.08)",
          })}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#475569" }}>
            {t("result.soundAnalysis.viewDetails", "Xem phân tích chi tiết")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
