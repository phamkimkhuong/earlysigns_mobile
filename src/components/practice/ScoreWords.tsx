import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { buildWordScores, tokenizeIpa } from "@/utils/pronunciationAnalysis";
import { colors } from "@/core/theme";
import { WordAlignmentItem } from "@/types";

export interface ScoreWordsItem {
  word: string;
  ipa?: string;
  accuracy?: number;
  [key: string]: any;
}

export interface ScoreWordsProps {
  words?: ScoreWordsItem[];
  alignment?: WordAlignmentItem[];
  showIpa?: boolean;
  showResultDetails?: boolean;
  loadingIpa?: boolean;
}

const PHONE_COLORS: Record<string, string> = {
  correct: colors.success,
  deleted: colors.danger,
  replaced: colors.warning,
  neutral: colors.textSecondary,
};

export default function ScoreWords({
  words = [],
  alignment,
  showIpa = true,
  showResultDetails = false,
  loadingIpa = false,
}: ScoreWordsProps) {
  const wordScores = useMemo(() => buildWordScores(words, alignment), [words, alignment]);
  if (!words.length) return null;
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {words.map((w, i) => {
        const ipaTokens = wordScores[i]?.ipaTokens || tokenizeIpa(w?.ipa || "");
        const alignedPhones = wordScores[i]?.alignment || [];
        const phones =
          showResultDetails && alignedPhones.length
            ? alignedPhones.filter((p) => p?.status !== "inserted")
            : ipaTokens.map((phone) => ({ char: phone, status: "neutral" }));
        return (
          <View key={`${w.word}-${i}`} className="items-center max-w-[120px]">
            <Text className="text-appText text-base font-semibold">{w.word || ""}</Text>
            {showIpa ? (
              <Text className="text-appTextSecondary text-[13px] mt-0.5">
                /
                {w.ipa
                  ? phones.map((phone, phoneIndex) => (
                      <Text
                        key={`${w.word}-${i}-${phoneIndex}`}
                        style={{ color: PHONE_COLORS[phone?.status || ""] || PHONE_COLORS.neutral }}
                      >
                        {phone?.char || ""}
                      </Text>
                    ))
                  : loadingIpa
                    ? "…"
                    : "—"}
                /
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
