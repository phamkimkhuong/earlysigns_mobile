import React, { useMemo } from "react";
import { Text } from "react-native";
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
  const level = screeningLevel(pct);
  const color = checkResultScoreColor(ratio);
  if (!open) return null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("screening.result.title")}
      footer={<PrimaryButton title={t("screening.result.close")} onPress={onClose} />}
    >
      <Text style={{ fontSize: 42, fontWeight: "800", color, textAlign: "center" }}>
        {pct}%
      </Text>
      <Text style={{ color: colors.text, textAlign: "center", marginTop: 8, fontWeight: "700" }}>
        {t(`screening.result.levels.${level}.label`)}
      </Text>
      <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
        {t(`screening.result.levels.${level}.message`)}
      </Text>
    </AppModal>
  );
}
