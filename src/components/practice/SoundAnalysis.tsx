import React from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { colors } from "@/core/theme";
import { SoundAnalysisRow } from "@/types";

export interface SoundAnalysisProps {
  rows?: SoundAnalysisRow[] | null;
  onPracticePhoneme?: (phoneme: string) => void;
  practicePhonemeLoading?: string;
  disabled?: boolean;
}

export default function SoundAnalysis({
  rows,
  onPracticePhoneme,
  practicePhonemeLoading,
  disabled,
}: SoundAnalysisProps) {
  const { t } = useTranslation();
  if (!rows) return null;
  return (
    <View className="mt-3 gap-2">
      <Text className="font-bold text-appText text-base">{t("result.soundAnalysis.title")}</Text>
      {rows.length === 0 ? (
        <Text className="text-appTextMuted">{t("result.soundAnalysis.empty")}</Text>
      ) : (
        rows.map((row) => {
          const isStressMark = row.expected === "ˈ";
          const isSeparatorMark = row.expected === ".";
          const isFixedMarkerError =
            (isStressMark || isSeparatorMark) &&
            (row.status === "deleted" || row.status === "replaced");
          const markerType = isStressMark ? "stress" : "separator";
          const explanation = isFixedMarkerError
            ? t(`result.soundAnalysis.marker.${markerType}.explanation`)
            : row.status === "correct"
              ? t("result.soundAnalysis.correct")
              : row.status === "deleted"
                ? t("result.soundAnalysis.missed")
                : t("result.soundAnalysis.replaced", { pronounced: row.pronounced || "" });
          const needsTip = row.status === "deleted" || row.status === "replaced";
          const tipText = isFixedMarkerError
            ? t(`result.soundAnalysis.marker.${markerType}.tip`)
            : row.tipText;
          const statusColor =
            row.status === "correct"
              ? colors.success
              : row.status === "deleted"
                ? colors.danger
                : colors.warning;
          return (
            <View key={row.id} className="border-l-[3px] pl-2.5 py-2 gap-1" style={{ borderLeftColor: statusColor }}>
              <Text className="font-bold text-appText">/{row.expected}/</Text>
              <Text className="text-appTextSecondary">{explanation}</Text>
              {needsTip && tipText ? (
                <Text className="text-appText text-[13px]">
                  {t("result.soundAnalysis.tipLabel")} {tipText}
                </Text>
              ) : null}
              {needsTip && !isFixedMarkerError && onPracticePhoneme ? (
                <PrimaryButton
                  title={
                    practicePhonemeLoading === row.expected
                      ? t("result.soundAnalysis.learnLoading")
                      : t("result.soundAnalysis.learnPhoneme", { phoneme: row.expected })
                  }
                  variant="ghost"
                  disabled={disabled || Boolean(practicePhonemeLoading)}
                  onPress={() => onPracticePhoneme(row.expected)}
                />
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );
}
