import React, { useMemo } from "react";
import { ScrollView, Text } from "react-native";
import { useTranslation } from "react-i18next";
import AppModal from "@/components/ui/AppModal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { checkResultScoreColor } from "@/utils/checkResultScoreColor";
import { colors } from "@/core/theme";

export interface ScreeningResultModalProps {
  open: boolean;
  totalAccuracy?: number | string | null;
  onClose: () => void;
}

function screeningLevel(pct: number): "beginner" | "elementary" | "intermediate" | "upperIntermediate" | "advanced" {
  if (pct <= 40) return "beginner";
  if (pct <= 60) return "elementary";
  if (pct <= 75) return "intermediate";
  if (pct <= 90) return "upperIntermediate";
  return "advanced";
}

export default function ScreeningResultModal({ open, totalAccuracy, onClose }: ScreeningResultModalProps) {
  const { t } = useTranslation();
  const ratio = useMemo(
    () => Math.max(0, Math.min(1, Number(totalAccuracy) || 0)),
    [totalAccuracy]
  );
  const pct = Math.round(ratio * 100);
  const hasScore = totalAccuracy != null && totalAccuracy !== "" && Number.isFinite(Number(totalAccuracy));
  const level = screeningLevel(pct);
  const color = checkResultScoreColor(ratio);
  if (!open) return null;

  const buttonTitle = hasScore
    ? t(`screening.result.levels.${level}.cta`, t("common.continue", "Tiếp tục"))
    : t("common.continue", "Tiếp tục");

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("screening.result.title")}
      footer={
        <PrimaryButton
          title={buttonTitle}
          onPress={onClose}
          style={{ backgroundColor: "#0c2340", borderRadius: 16 }}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", paddingVertical: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 }}>
          {t("screening.result.scoreLabel")}
        </Text>
        <Text style={{ fontSize: 44, fontWeight: "800", color, textAlign: "center" }}>
          {hasScore ? `${pct}%` : "—"}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center", marginTop: 6 }}>
          {hasScore ? t(`screening.result.levels.${level}.label`) : t("phonemesHome.profileTitle")}
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textSecondary, textAlign: "center", marginTop: 10 }}>
          {hasScore ? t(`screening.result.levels.${level}.message`) : t("screeningPractice.scorePending")}
        </Text>
      </ScrollView>
    </AppModal>
  );
}
