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
  showWord?: boolean;
  showIpa?: boolean;
  showResultDetails?: boolean;
  loadingIpa?: boolean;
  showInserted?: boolean;
}

const PHONE_COLORS: Record<string, string> = {
  correct: colors.success,
  deleted: colors.danger,
  replaced: colors.warning,
  inserted: "#ea580c",
  neutral: colors.textSecondary,
};

export default function ScoreWords({
  words = [],
  alignment,
  showWord = true,
  showIpa = true,
  showResultDetails = false,
  loadingIpa = false,
  showInserted = false,
}: ScoreWordsProps) {
  const wordScores = useMemo(() => buildWordScores(words, alignment), [words, alignment]);
  if (!words.length) return null;
  return (
    <View className="flex-row flex-wrap gap-2.5">
      {words.map((w, i) => {
        const ipaTokens = wordScores[i]?.ipaTokens || tokenizeIpa(w?.ipa || "");
        const alignedPhones = wordScores[i]?.alignment || [];
        const insertedPhones = wordScores[i]?.inserted || [];
        const phones =
          showResultDetails && alignedPhones.length
            ? alignedPhones.filter((p) => p?.status !== "inserted")
            : ipaTokens.map((phone) => ({ char: phone, status: "neutral" }));
        return (
          <View key={`${w.word}-${i}`} className="items-center max-w-[120px]">
            {showWord ? (
              <Text className="text-appText text-base font-semibold">{w.word || ""}</Text>
            ) : null}
            {showIpa ? (
              <View className="flex-row items-center flex-wrap justify-center mt-0.5">
                <Text className="text-appTextSecondary text-[13px]">
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
                {showInserted && showResultDetails && insertedPhones.length > 0 ? (
                  <View className="flex-row items-center ml-1 gap-1">
                    {insertedPhones.map((ins, insIdx) => {
                      const sound = ins.predicted_char || ins.char || "";
                      return (
                        <View
                          key={`ins-${i}-${insIdx}`}
                          className="px-1.5 py-0.5 rounded-md shrink-0 flex-row items-center"
                          style={{ backgroundColor: "#ffedd5" }}
                        >
                          <Text
                            numberOfLines={1}
                            className="text-xs font-bold"
                            style={{ color: "#c2410c" }}
                          >
                            +{sound}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
