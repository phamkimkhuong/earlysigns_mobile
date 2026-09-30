import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
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
  showDetails = false,
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
        padding: 22,
        borderWidth: 1,
        borderColor: scoreColor + "30",
        alignItems: "center",
        gap: 14,
        shadowColor: scoreColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* 1. Score ring with score and % on the SAME row */}
      <View
        style={{
          width: 124,
          height: 124,
          borderRadius: 62,
          borderWidth: 8,
          borderColor: scoreColor + "25",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 102,
            height: 102,
            borderRadius: 51,
            backgroundColor: scoreColor + "12",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          }}
        >
          <Text
            style={{
              fontSize: 38,
              fontWeight: "900",
              color: scoreColor,
              letterSpacing: -1,
            }}
          >
            {scorePct}
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: scoreColor,
              marginLeft: 2,
              marginTop: -10,
            }}
          >
            %
          </Text>
        </View>
      </View>

      {/* 2. Accented Vietnamese Score Band Badge */}
      {scoreBandInfo ? (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: scoreBandInfo.bg,
            borderWidth: 1,
            borderColor: scoreBandInfo.border,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: scoreBandInfo.color,
            }}
          >
            {scoreBandInfo.label}
          </Text>
        </View>
      ) : null}

      {/* 3. Senior Audio Player Pill Card for Replay */}
      {onReplayVoice ? (
        <Pressable
          onPress={onReplayVoice}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("sentence.listenToRecording", "Nghe lại bản ghi âm")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: 18,
            backgroundColor: pressed ? "#f1f5f9" : "#f8fafc",
            borderWidth: 1,
            borderColor: replayPlaying ? "#38bdf8" : "#e2e8f0",
          })}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: replayPlaying ? "#0284c7" : "#e0f2fe",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {replayPlaying ? (
              <Square size={14} color="#ffffff" fill="#ffffff" />
            ) : (
              <Play size={15} color="#0284c7" fill="#0284c7" style={{ marginLeft: 2 }} />
            )}
          </View>

          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: replayPlaying ? "#0284c7" : "#0f172a",
              }}
            >
              {replayPlaying
                ? t("sentence.replaying", "Đang phát giọng bạn...")
                : t("sentence.listenToRecording", "Nghe lại bản ghi âm")}
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
              {replayPlaying
                ? t("sentence.tapToStop", "Chạm để tạm dừng")
                : t("sentence.voicePreview", "Giọng nói của bạn lúc làm bài")}
            </Text>
          </View>
        </Pressable>
      ) : null}

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
            {t("result.soundAnalysis.viewDetails", "Xem phân tích chi tiết âm vị")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
