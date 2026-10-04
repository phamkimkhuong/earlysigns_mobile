import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Check, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { hapticFeedback } from "@/utils/haptics";
import type { SoundAnalysisRow } from "@/types";

export interface SoundAnalysisWord {
  word: string;
  ipa?: string;
  [key: string]: any;
}

export interface SoundAnalysisProps {
  rows?: SoundAnalysisRow[] | null;
  words?: SoundAnalysisWord[];
  onPracticePhoneme?: (phoneme: string) => void;
  practicePhonemeLoading?: string;
  disabled?: boolean;
}

export default function SoundAnalysis({
  rows,
  words = [],
  onPracticePhoneme,
  practicePhonemeLoading,
  disabled,
}: SoundAnalysisProps) {
  const { t } = useTranslation();

  // Group phoneme rows by word index, filtering technical delimiters (. and ˈ) from error counts
  const wordsWithPhonemes = useMemo(() => {
    if (!words || !words.length) return [];
    const hasWordIndexes = (rows || []).some((r) => typeof r.wordIndex === "number");
    return words.map((w, index) => {
      const phonemes = (rows || []).filter((r) =>
        hasWordIndexes ? r.wordIndex === index : words.length === 1 || index === 0
      );
      // Real phonemes excluding syllable dots and standalone stress marks, spaces, delimiters
      const realPhonemes = phonemes.filter((r) => {
        const exp = (r.expected || "").trim();
        return exp !== "" && exp !== "." && exp !== "ˈ" && exp !== "ˌ" && exp !== "+";
      });
      const errorPhonemes = realPhonemes.filter(
        (r) => r.status === "replaced" || r.status === "deleted"
      );
      const correctPhonemes = realPhonemes.filter((r) => r.status === "correct");
      const hasErrors = errorPhonemes.length > 0;
      const isPerfect = realPhonemes.length > 0 && !hasErrors;
      return {
        word: w.word,
        ipa: w.ipa || "",
        index,
        phonemes,
        realPhonemes,
        errorPhonemes,
        correctPhonemes,
        hasErrors,
        isPerfect,
        errorCount: errorPhonemes.length,
      };
    });
  }, [words, rows]);

  // Find the first word that contains pronunciation errors
  const firstErrorWordIndex = useMemo(() => {
    if (!wordsWithPhonemes.length) return 0;
    const foundIdx = wordsWithPhonemes.findIndex((w) => w.hasErrors);
    return foundIdx >= 0 ? foundIdx : 0;
  }, [wordsWithPhonemes]);

  const [selectedWordIndex, setSelectedWordIndex] = useState(0);

  // Sync to first error word whenever new rows arrive
  useEffect(() => {
    setSelectedWordIndex(firstErrorWordIndex);
  }, [firstErrorWordIndex]);

  if (!rows || rows.length === 0) {
    return (
      <View className="mt-2 p-4 bg-slate-50 rounded-2xl items-center">
        <Text className="text-slate-500 text-xs">
          {t("result.soundAnalysis.empty")}
        </Text>
      </View>
    );
  }

  const hasWordGrouping =
    wordsWithPhonemes.length > 0 &&
    wordsWithPhonemes.some((w) => w.phonemes.length > 0);

  // Table renderer for error phonemes (Web-identical 2-column layout: Âm | Phân tích)
  const renderErrorPhonemeTable = (items: SoundAnalysisRow[]) => (
    <View
      className="rounded-2xl overflow-hidden mt-1"
      style={{
        borderWidth: 1,
        borderColor: "#e2e8f0",
      }}
    >
      {/* Table Header: Âm | Phân tích */}
      <View
        className="flex-row items-center px-3.5 py-2.5"
        style={{
          backgroundColor: "#f1f5f9",
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
        }}
      >
        <Text
          style={{
            width: 72,
            fontSize: 13,
            fontWeight: "700",
            color: "#64748b",
          }}
        >
          {t("result.soundAnalysis.soundColumn", "Âm")}
        </Text>
        <Text
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: "700",
            color: "#64748b",
          }}
        >
          {t("result.soundAnalysis.analysisColumn", "Phân tích")}
        </Text>
      </View>

      {/* Table Rows */}
      {items.map((row, index) => {
        const isDeleted = row.status === "deleted";
        const cleanExpected = (row.expected || "").trim().replace(/^\/+|\/+$/g, "") || "?";
        const cleanPronounced = (row.pronounced || row.expected || "").trim().replace(/^\/+|\/+$/g, "");

        const explanation =
          isDeleted
            ? t("result.soundAnalysis.missed")
            : t("result.soundAnalysis.replaced", {
              pronounced: cleanPronounced || cleanExpected,
            });
        const tipText = row.tipText;

        const rowBg = isDeleted ? "#fff1f2" : "#fffbeb";
        const rowBorderColor = isDeleted ? "#ffe4e6" : "#fef3c7";
        const accentColor = isDeleted ? "#dc2626" : "#d97706";
        const isLast = index === items.length - 1;

        return (
          <View
            key={row.id || `phoneme-row-${index}-${cleanExpected}`}
            className="flex-row items-start px-3.5 py-3"
            style={{
              backgroundColor: rowBg,
              borderBottomWidth: isLast ? 0 : 1,
              borderBottomColor: rowBorderColor,
            }}
          >
            {/* Cột 1: Âm */}
            <View style={{ width: 72, paddingTop: 1 }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: accentColor,
                }}
              >
                {`/${cleanExpected}/`}
              </Text>
            </View>

            {/* Cột 2: Phân tích */}
            <View style={{ flex: 1, gap: 6, paddingLeft: 4 }}>
              {/* Lời nhận xét */}
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: accentColor,
                  lineHeight: 20,
                }}
              >
                {explanation}
              </Text>

              {/* Mẹo */}
              {tipText ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: "#334155",
                    lineHeight: 19,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: "#334155" }}>
                    {t("result.soundAnalysis.tipLabel", "Mẹo:")}{" "}
                  </Text>
                  {tipText}
                </Text>
              ) : null}

              {/* Nút Học âm */}
              {onPracticePhoneme ? (
                <TouchableOpacity
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={t("result.soundAnalysis.learnPhoneme", {
                    phoneme: cleanExpected,
                  })}
                  activeOpacity={0.8}
                  disabled={disabled || Boolean(practicePhonemeLoading)}
                  onPress={() => {
                    hapticFeedback.light();
                    onPracticePhoneme(cleanExpected);
                  }}
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor:
                      practicePhonemeLoading === cleanExpected
                        ? "#93c5fd"
                        : "#2383E2",
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 3,
                  }}
                >
                  {practicePhonemeLoading === cleanExpected ? (
                    <ActivityIndicator size={12} color="#ffffff" />
                  ) : null}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: "#ffffff",
                    }}
                  >
                    {practicePhonemeLoading === cleanExpected
                      ? t("result.soundAnalysis.learnLoading")
                      : t("result.soundAnalysis.learnPhoneme", {
                        phoneme: cleanExpected,
                      })}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );

  // If no word grouping data is available, fall back to flat list view (errors only)
  if (!hasWordGrouping) {
    const errorRows = (rows || []).filter((r) => {
      const isError = r.status === "replaced" || r.status === "deleted";
      if (!isError) return false;
      const expected = (r.expected || "").trim();
      return Boolean(expected && expected !== "." && expected !== "ˈ" && expected !== "ˌ" && expected !== "+");
    });

    return (
      <View className="mt-3 gap-2.5 w-full">
        <Text className="font-bold text-slate-900 text-base">
          {t("result.soundAnalysis.title")}
        </Text>
        {errorRows.length === 0 ? (
          <View
            className="rounded-2xl p-4 items-center justify-center gap-2 flex-row"
            style={{
              backgroundColor: "#f0fdf4",
              borderColor: "#bbf7d0",
              borderWidth: 1,
            }}
          >
            <Check size={18} color="#16a34a" strokeWidth={3} />
            <Text className="text-xs font-bold text-emerald-800">
              {t("result.soundAnalysis.allWordsPerfect")}
            </Text>
          </View>
        ) : (
          renderErrorPhonemeTable(errorRows)
        )}
      </View>
    );
  }

  // Active word details
  const activeWord =
    wordsWithPhonemes[selectedWordIndex] || wordsWithPhonemes[0];

  return (
    <View className="mt-2 gap-3 w-full">
      {/* 1. SECTION TITLE & HELPER HINT */}
      <View className="gap-0.5">
        <Text className="font-black text-slate-900 text-base">
          {t("result.soundAnalysis.title")}
        </Text>
      </View>

      {/* 2. INTERACTIVE HORIZONTAL WORD CHIPS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {wordsWithPhonemes.map((w) => {
          const isSelected = selectedWordIndex === w.index;
          return (
            <TouchableOpacity
              key={`word-chip-${w.index}-${w.word}`}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${w.word}, ${w.hasErrors
                ? `${w.errorCount} âm cần sửa`
                : w.isPerfect
                  ? "Phát âm chuẩn xác"
                  : ""
                }`}
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.75}
              onPress={() => {
                hapticFeedback.selection();
                setSelectedWordIndex(w.index);
              }}
              className="flex-row items-center gap-1.5 px-3 py-2 rounded-2xl"
              style={{
                backgroundColor: isSelected
                  ? "#2383e2"
                  : w.hasErrors
                    ? "#fffbeb"
                    : w.isPerfect
                      ? "#f0fdf4"
                      : "#f7f6f3",
                borderWidth: 1.5,
                borderColor: isSelected
                  ? "#1d4ed8"
                  : w.hasErrors
                    ? "#fcd34d"
                    : w.isPerfect
                      ? "#86efac"
                      : "#e2e8f0",
                elevation: isSelected ? 2 : 0,
              }}
            >
              <Text
                className="text-xs font-bold"
                style={{
                  color: isSelected
                    ? "#ffffff"
                    : w.hasErrors
                      ? "#92400e"
                      : w.isPerfect
                        ? "#166534"
                        : "#334155",
                }}
              >
                {w.word}
              </Text>

              {/* Status indicator dot or badge */}
              {w.hasErrors ? (
                <View
                  className="min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isSelected ? "#e03e3e" : "#cb912f",
                  }}
                >
                  <Text className="text-[11px] font-black text-white leading-none">
                    {w.errorCount}
                  </Text>
                </View>
              ) : w.isPerfect ? (
                <View
                  className="w-4 h-4 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isSelected ? "#0f7b6c" : "#22c55e",
                  }}
                >
                  <Check size={11} color="#ffffff" strokeWidth={3} />
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 3. ACTIVE WORD INSPECTOR */}
      <View className="w-full gap-3 pt-1">
        {/* Header of Inspector: Word name, Color-Coded IPA & Status Badge */}
        <View className="border-b border-slate-100 pb-3 gap-2">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-xl font-black text-slate-900 tracking-tight">
              {activeWord.word}
            </Text>

            {activeWord.isPerfect ? (
              <View
                className="flex-row items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  backgroundColor: "#f0fdf4",
                  borderColor: "#bbf7d0",
                  borderWidth: 1,
                }}
              >
                <Check size={13} color="#16a34a" strokeWidth={3} />
                <Text className="text-xs font-bold text-emerald-800">
                  {t("result.soundAnalysis.wordPerfect")}
                </Text>
              </View>
            ) : activeWord.hasErrors ? (
              <View
                className="px-3 py-1 rounded-full"
                style={{
                  backgroundColor: "#fff1f2",
                  borderColor: "#fecdd3",
                  borderWidth: 1,
                }}
              >
                <Text className="text-xs font-bold text-rose-700">
                  {t("result.soundAnalysis.wordErrors", {
                    count: activeWord.errorCount,
                  })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Color-Coded IPA directly under word, matching Web experience */}
          {activeWord.phonemes.length > 0 || (activeWord.ipa && activeWord.ipa.trim().replace(/^\/+|\/+$/g, "")) ? (
            <View className="flex-row items-center flex-wrap pt-0.5">
              <Text className="text-base font-bold text-slate-400">{"/"}</Text>
              {activeWord.phonemes.length > 0 ? (
                activeWord.phonemes.map((p, pIdx) => {
                  if (p.expected === ".") {
                    return (
                      <Text key={`ipa-dot-${pIdx}`} className="text-base font-bold text-slate-300">
                        {"."}
                      </Text>
                    );
                  }
                  if (p.expected === "ˈ") {
                    return (
                      <Text key={`ipa-stress-${pIdx}`} className="text-base font-black text-slate-700">
                        {"ˈ"}
                      </Text>
                    );
                  }
                  const color =
                    p.status === "correct"
                      ? "#16a34a"
                      : p.status === "replaced"
                        ? "#d97706"
                        : p.status === "deleted"
                          ? "#dc2626"
                          : "#64748b";
                  const charText = p.expected;
                  return (
                    <Text
                      key={`ipa-char-${pIdx}-${p.expected}`}
                      style={{
                        color,
                        fontSize: 15,
                        fontWeight: "800",
                        textDecorationLine: p.status === "deleted" ? "line-through" : "none",
                      }}
                    >
                      {charText}
                    </Text>
                  );
                })
              ) : (
                <Text className="text-base font-bold text-indigo-600">
                  {activeWord.ipa.trim().replace(/^\/+|\/+$/g, "")}
                </Text>
              )}
              <Text className="text-base font-bold text-slate-400">{"/"}</Text>
            </View>
          ) : null}
        </View>

        {/* Phonemes List of the Selected Word (Errors only) */}
        <View className="gap-2.5 pt-1">
          {activeWord.errorPhonemes.length === 0 ? (
            <View
              className="rounded-2xl p-4 items-center justify-center gap-2 flex-row"
              style={{
                backgroundColor: "#f0fdf4",
                borderColor: "#bbf7d0",
                borderWidth: 1,
              }}
            >
              <Check size={18} color="#16a34a" strokeWidth={3} />
              <Text className="text-xs font-bold text-emerald-800">
                {t(
                  "result.soundAnalysis.allPhonemesCorrect",
                  "Tất cả các âm trong từ này đều chuẩn xác! 🎉"
                )}
              </Text>
            </View>
          ) : (
            <>
              {renderErrorPhonemeTable(activeWord.errorPhonemes)}
            </>
          )}
        </View>

        {/* Footer Navigation: Previous / Next Word */}
        {wordsWithPhonemes.length > 1 ? (
          <View className="flex-row items-center justify-between pt-2.5 border-t border-slate-100 mt-1">
            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t("result.soundAnalysis.prevWord")}
              accessibilityState={{ disabled: selectedWordIndex === 0 }}
              activeOpacity={0.7}
              disabled={selectedWordIndex === 0}
              onPress={() => {
                hapticFeedback.selection();
                setSelectedWordIndex((prev) => Math.max(0, prev - 1));
              }}
              className="flex-row items-center gap-1 py-1.5 px-2.5 rounded-lg"
              style={{
                opacity: selectedWordIndex === 0 ? 0.35 : 1,
              }}
            >
              <ChevronLeft size={16} color="#475569" />
              <Text className="text-xs font-bold text-slate-700">
                {t("result.soundAnalysis.prevWord")}
              </Text>
            </TouchableOpacity>

            <Text className="text-xs font-bold text-slate-400">
              {t("result.soundAnalysis.wordProgress", {
                current: selectedWordIndex + 1,
                total: wordsWithPhonemes.length,
              })}
            </Text>

            <TouchableOpacity
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t("result.soundAnalysis.nextWord")}
              accessibilityState={{
                disabled: selectedWordIndex >= wordsWithPhonemes.length - 1,
              }}
              activeOpacity={0.7}
              disabled={selectedWordIndex >= wordsWithPhonemes.length - 1}
              onPress={() => {
                hapticFeedback.selection();
                setSelectedWordIndex((prev) =>
                  Math.min(wordsWithPhonemes.length - 1, prev + 1)
                );
              }}
              className="flex-row items-center gap-1 py-1.5 px-2.5 rounded-lg"
              style={{
                opacity:
                  selectedWordIndex >= wordsWithPhonemes.length - 1 ? 0.35 : 1,
              }}
            >
              <Text className="text-xs font-bold text-slate-700">
                {t("result.soundAnalysis.nextWord")}
              </Text>
              <ChevronRight size={16} color="#475569" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}
