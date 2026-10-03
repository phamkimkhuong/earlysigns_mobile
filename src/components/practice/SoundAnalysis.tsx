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
import PrimaryButton from "@/components/ui/PrimaryButton";
import { colors } from "@/core/theme";
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
    return words.map((w, index) => {
      const phonemes = (rows || []).filter((r) => r.wordIndex === index);
      // Real phonemes excluding syllable dots and standalone stress marks
      const realPhonemes = phonemes.filter(
        (r) => r.expected !== "." && r.expected !== "ˈ"
      );
      const errorPhonemes = realPhonemes.filter(
        (r) => r.status === "replaced" || r.status === "deleted" || r.status === "inserted"
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

  // If no word grouping data is available, fall back to flat list view (errors only)
  if (!hasWordGrouping) {
    const errorRows = (rows || []).filter(
      (r) =>
        (r.status === "replaced" || r.status === "deleted" || r.status === "inserted") &&
        r.expected !== "." &&
        r.expected !== "ˈ"
    );

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
          errorRows.map((row) => {
            const isInserted = row.status === "inserted";
            const explanation =
              row.status === "deleted"
                ? t("result.soundAnalysis.missed")
                : isInserted
                  ? t("result.soundAnalysis.inserted", {
                    pronounced: row.pronounced || row.expected,
                  })
                  : t("result.soundAnalysis.replaced", {
                    pronounced: row.pronounced || "",
                  });
            const tipText = row.tipText;
            const statusColor =
              row.status === "deleted"
                ? colors.danger
                : isInserted
                  ? "#64748b"
                  : colors.warning;
            return (
              <View
                key={row.id}
                className="border-l-[3px] pl-2.5 py-2 gap-1.5"
                style={{ borderLeftColor: statusColor }}
              >
                <Text className="font-bold text-slate-900">
                  {isInserted ? `+/${row.pronounced || row.expected}/` : `/${row.expected}/`}
                </Text>
                <Text className="text-slate-600 text-xs">{explanation}</Text>
                {!isInserted && tipText ? (
                  <Text className="text-slate-700 text-xs">
                    {t("result.soundAnalysis.tipLabel")} {tipText}
                  </Text>
                ) : null}
                {!isInserted && onPracticePhoneme ? (
                  <PrimaryButton
                    title={
                      practicePhonemeLoading === row.expected
                        ? t("result.soundAnalysis.learnLoading")
                        : t("result.soundAnalysis.learnPhoneme", {
                          phoneme: row.expected,
                        })
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

  // Active word details
  const activeWord =
    wordsWithPhonemes[selectedWordIndex] || wordsWithPhonemes[0];

  // Visual phoneme chips: attach stress mark ˈ to the following sound, omit .
  const phonemeChips = (() => {
    if (!activeWord?.phonemes?.length) return [];
    const chips: {
      id: string;
      display: string;
      expected: string;
      status: string;
      isError: boolean;
    }[] = [];

    let pendingStress = false;
    for (const row of activeWord.phonemes) {
      if (row.expected === "ˈ") {
        pendingStress = true;
        continue;
      }
      if (row.expected === ".") {
        continue;
      }
      const rawText = pendingStress ? `ˈ${row.expected}` : row.expected;
      pendingStress = false;
      const isError =
        row.status === "replaced" || row.status === "deleted" || row.status === "inserted";
      const display =
        row.status === "inserted"
          ? rawText.startsWith("+")
            ? rawText
            : `+${row.pronounced || rawText}`
          : rawText;
      chips.push({
        id: row.id,
        display,
        expected: row.expected,
        status: row.status,
        isError,
      });
    }
    return chips;
  })();

  return (
    <View className="mt-2 gap-3 w-full">
      {/* 1. SECTION TITLE & HELPER HINT */}
      <View className="gap-0.5">
        <Text className="font-black text-slate-900 text-base">
          {t("result.soundAnalysis.title")}
        </Text>
        <Text className="text-xs font-medium text-slate-500">
          {t("result.soundAnalysis.selectWordHint")}
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
                  ? "#2383E2"
                  : w.hasErrors
                    ? "#fffbeb"
                    : w.isPerfect
                      ? "#f0fdf4"
                      : "#f8fafc",
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
                    backgroundColor: isSelected ? "#ef4444" : "#f59e0b",
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
                    backgroundColor: isSelected ? "#10b981" : "#22c55e",
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
          <View className="flex-row items-center flex-wrap gap-0.5">
            <Text className="text-base font-bold text-slate-400">/</Text>
            {activeWord.phonemes.length > 0 ? (
              activeWord.phonemes.map((p, pIdx) => {
                if (p.expected === ".") {
                  return (
                    <Text key={`ipa-dot-${pIdx}`} className="text-base font-bold text-slate-300">
                      .
                    </Text>
                  );
                }
                if (p.expected === "ˈ") {
                  return (
                    <Text key={`ipa-stress-${pIdx}`} className="text-base font-black text-slate-700">
                      ˈ
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
                    {p.status === "inserted"
                      ? (p.pronounced || p.expected).startsWith("+")
                        ? (p.pronounced || p.expected)
                        : `+${p.pronounced || p.expected}`
                      : p.expected}
                  </Text>
                );
              })
            ) : activeWord.ipa ? (
              <Text className="text-base font-bold text-indigo-600">
                {activeWord.ipa}
              </Text>
            ) : null}
            <Text className="text-base font-bold text-slate-400">/</Text>
          </View>

          {/* Dải Chip âm vị trực quan (Interactive Phoneme Chips) */}
          {phonemeChips.length > 0 ? (
            <View className="flex-row flex-wrap items-center gap-1.5 pt-1">
              {phonemeChips.map((chip) => {
                const isCorrect = chip.status === "correct";
                const isInserted = chip.status === "inserted";
                const isDeleted = chip.status === "deleted";

                const chipBg = isCorrect
                  ? "#f0fdf4"
                  : isInserted
                    ? "#f8fafc"
                    : isDeleted
                      ? "#fef2f2"
                      : "#fffbeb";

                const chipBorder = isCorrect
                  ? "#bbf7d0"
                  : isInserted
                    ? "#cbd5e1"
                    : isDeleted
                      ? "#fca5a5"
                      : "#fde68a";

                const chipText = isCorrect
                  ? "#166534"
                  : isInserted
                    ? "#475569"
                    : isDeleted
                      ? "#b91c1c"
                      : "#78350f";

                return (
                  <View
                    key={`chip-${chip.id}`}
                    className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-xl"
                    style={{
                      backgroundColor: chipBg,
                      borderColor: chipBorder,
                      borderWidth: 1.5,
                    }}
                  >
                    <Text
                      className="text-sm font-black"
                      style={{
                        color: chipText,
                        textDecorationLine: isDeleted ? "line-through" : "none",
                      }}
                    >
                      {chip.display}
                    </Text>
                    {isCorrect ? (
                      <Check size={12} color="#16a34a" strokeWidth={3} />
                    ) : null}
                  </View>
                );
              })}
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
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("result.soundAnalysis.errorsTitle", "Các âm cần cải thiện")}
              </Text>
              {activeWord.errorPhonemes.map((row) => {
                const isInserted = row.status === "inserted";
                const isDeleted = row.status === "deleted";

                const explanation =
                  isDeleted
                    ? t("result.soundAnalysis.missed")
                    : isInserted
                      ? t("result.soundAnalysis.inserted", {
                        pronounced: row.pronounced || row.expected,
                      })
                      : t("result.soundAnalysis.replaced", {
                        pronounced: row.pronounced || "",
                      });
                const tipText = row.tipText;

                const cardBg = isInserted
                  ? "#f8fafc"
                  : isDeleted
                    ? "#fef2f2"
                    : "#fffbeb";

                const cardBorder = isInserted
                  ? "#e2e8f0"
                  : isDeleted
                    ? "#fecdd3"
                    : "#fde68a";

                const badgeBg = isInserted
                  ? "#f1f5f9"
                  : isDeleted
                    ? "#fee2e2"
                    : "#fef3c7";

                const badgeTextColor = isInserted
                  ? "#334155"
                  : isDeleted
                    ? "#991b1b"
                    : "#78350f";

                const statusLabelColor = isInserted
                  ? "#64748b"
                  : isDeleted
                    ? "#dc2626"
                    : "#92400e";

                const textColor = isInserted
                  ? "#475569"
                  : isDeleted
                    ? "#991b1b"
                    : "#78350f";

                const tipLabelColor = isInserted
                  ? "#64748b"
                  : isDeleted
                    ? "#dc2626"
                    : "#92400e";

                const badgeLabel = isInserted
                  ? t("result.soundAnalysis.insertedBadge", "Âm thừa")
                  : isDeleted
                    ? t("result.soundAnalysis.missedBadge", "Âm bị thiếu")
                    : t("result.soundAnalysis.needsImprovement", "Cần sửa");

                const phonemeDisplay = isInserted
                  ? (row.pronounced || row.expected).startsWith("+")
                    ? `/${row.pronounced || row.expected}/`
                    : `+/${row.pronounced || row.expected}/`
                  : `/${row.expected}/`;

                return (
                  <View
                    key={row.id}
                    className="rounded-2xl p-3.5 gap-2.5"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: cardBorder,
                      borderWidth: 1,
                    }}
                  >
                    {/* Phoneme Badge & Error Status */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View
                          className="px-2.5 py-1 rounded-lg"
                          style={{
                            backgroundColor: badgeBg,
                          }}
                        >
                          <Text
                            className="text-base font-black"
                            style={{
                              color: badgeTextColor,
                              textDecorationLine: isDeleted ? "line-through" : "none",
                            }}
                          >
                            {phonemeDisplay}
                          </Text>
                        </View>
                        <Text
                          className="text-xs font-bold"
                          style={{
                            color: statusLabelColor,
                          }}
                        >
                          {badgeLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Explanation */}
                    <Text
                      className="text-xs font-semibold leading-relaxed"
                      style={{
                        color: textColor,
                      }}
                    >
                      {explanation}
                    </Text>

                    {/* Pronunciation Tip */}
                    {!isInserted && tipText ? (
                      <View className="flex-row items-start gap-1.5 pt-0.5">
                        <Text
                          className="text-xs font-bold shrink-0"
                          style={{
                            color: tipLabelColor,
                          }}
                        >
                          💡 {t("result.soundAnalysis.tipLabel")}
                        </Text>
                        <Text
                          className="flex-1 text-xs font-medium leading-relaxed"
                          style={{
                            color: textColor,
                          }}
                        >
                          {tipText}
                        </Text>
                      </View>
                    ) : null}

                    {/* Learn Phoneme CTA Button (#2383E2 Blue) */}
                    {!isInserted && onPracticePhoneme ? (
                      <TouchableOpacity
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={t(
                          "result.soundAnalysis.learnPhoneme",
                          { phoneme: row.expected }
                        )}
                        activeOpacity={0.8}
                        disabled={disabled || Boolean(practicePhonemeLoading)}
                        onPress={() => {
                          hapticFeedback.light();
                          onPracticePhoneme(row.expected);
                        }}
                        className="self-start px-3.5 py-2 rounded-xl flex-row items-center gap-1.5 mt-0.5"
                        style={{
                          backgroundColor:
                            practicePhonemeLoading === row.expected
                              ? "#93c5fd"
                              : "#2383E2",
                        }}
                      >
                        {practicePhonemeLoading === row.expected ? (
                          <ActivityIndicator size={12} color="#ffffff" />
                        ) : null}
                        <Text className="text-xs font-bold text-white">
                          {practicePhonemeLoading === row.expected
                            ? t("result.soundAnalysis.learnLoading")
                            : t("result.soundAnalysis.learnPhoneme", {
                              phoneme: row.expected,
                            })}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
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
