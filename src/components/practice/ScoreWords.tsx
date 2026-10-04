import React, { useMemo } from "react";
import { View } from "react-native";
import { AppText } from "../ui/AppText";
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
  size?: "base" | "lg" | "xl";
  justifyCenter?: boolean;
}

const PHONE_COLORS: Record<string, string> = {
  correct: colors.success,
  deleted: colors.danger,
  replaced: colors.warning,
  neutral: colors.textSecondary,
};

const WORD_STYLES = {
  base: { wordSize: 16, wordWeight: "600" as const, ipaSize: 13 },
  lg: { wordSize: 18, wordWeight: "700" as const, ipaSize: 13 },
  xl: { wordSize: 20, wordWeight: "800" as const, ipaSize: 14 },
};

export default function ScoreWords({
  words = [],
  alignment,
  showWord = true,
  showIpa = true,
  showResultDetails = false,
  loadingIpa = false,
  showInserted = false,
  size = "base",
  justifyCenter = false,
}: ScoreWordsProps) {
  const wordScores = useMemo(() => buildWordScores(words, alignment), [words, alignment]);
  if (!words.length) return null;

  const currentSize = WORD_STYLES[size] || WORD_STYLES.base;

  return (
    <View
      className="flex-row flex-wrap"
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: size === "xl" ? 12 : 10,
        justifyContent: justifyCenter ? "center" : "flex-start",
      }}
    >
      {words.map((w, i) => {
        const ipaTokens = wordScores[i]?.ipaTokens || tokenizeIpa(w?.ipa || "");
        const alignedPhones = wordScores[i]?.alignment || [];
        const phones =
          showResultDetails && alignedPhones.length
            ? alignedPhones
            : ipaTokens.map((phone) => ({ char: phone, status: "neutral" }));
        return (
          <View
            key={`${w.word}-${i}`}
            className="items-center"
            style={{
              alignItems: "center",
              minWidth: 28,
              paddingHorizontal: 2,
            }}
          >
            {showWord ? (
              <AppText
                numberOfLines={1}
                style={{
                  fontSize: currentSize.wordSize,
                  fontWeight: currentSize.wordWeight,
                  color: "#0f172a",
                  textAlign: "center",
                }}
              >
                {w.word || ""}
              </AppText>
            ) : null}
            {showIpa ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 2,
                }}
              >
                <AppText
                  numberOfLines={1}
                  style={{
                    fontSize: currentSize.ipaSize,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  {"/"}
                  {w.ipa ? (
                    phones.map((phone, phoneIndex) => (
                      <AppText
                        key={`${w.word}-${i}-${phoneIndex}`}
                        style={{
                          color: PHONE_COLORS[phone?.status || ""] || PHONE_COLORS.neutral,
                        }}
                      >
                        {phone?.char || ""}
                      </AppText>
                    ))
                  ) : (
                    loadingIpa ? "…" : "—"
                  )}
                  {"/"}
                </AppText>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
