import React, { useMemo } from "react";
import { ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui/AppText";
import AppModal from "@/components/ui/AppModal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { checkResultScoreColor } from "@/utils/checkResultScoreColor";

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
          style={{ backgroundColor: "#2383e2", borderRadius: 16 }}
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", paddingVertical: 4 }}>
        <AppText className="text-[13px] font-semibold text-slate-500 mb-1">
          {t("screening.result.scoreLabel")}
        </AppText>
        <AppText style={{ color }} className="text-5xl font-black text-center">
          {hasScore ? `${pct}%` : "—"}
        </AppText>
        <AppText className="text-lg font-extrabold text-slate-900 text-center mt-2">
          {hasScore ? t(`screening.result.levels.${level}.label`) : t("phonemesHome.profileTitle")}
        </AppText>
        <AppText className="text-[15px] leading-6 text-slate-600 text-center mt-2.5">
          {hasScore ? t(`screening.result.levels.${level}.message`) : t("screeningPractice.scorePending")}
        </AppText>
      </ScrollView>
    </AppModal>
  );
}
