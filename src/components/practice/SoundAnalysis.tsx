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

  // Group phoneme rows by word index
  const wordsWithPhonemes = useMemo(() => {
    if (!words || !words.length) return [];
    return words.map((w, index) => {
      const phonemes = (rows || []).filter((r) => r.wordIndex === index);
      const errorPhonemes = phonemes.filter(
        (r) => r.status === "replaced" || r.status === "deleted" || r.status === "inserted"
      );
      const correctPhonemes = phonemes.filter((r) => r.status === "correct");
      const hasErrors = errorPhonemes.length > 0;
      const isPerfect = phonemes.length > 0 && !hasErrors;
      return {
        word: w.word,
        ipa: w.ipa || "",
        index,
        phonemes,
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

  // If no word grouping data is available, fall back to flat list view
  if (!hasWordGrouping) {
    return (
      <View className="mt-3 gap-2 w-full">
        <Text className="font-bold text-slate-900 text-base">
          {t("result.soundAnalysis.title")}
        </Text>
        {rows.map((row) => {
          const isStressMark = row.expected === "ˈ";
          const isSeparatorMark = row.expected === ".";
          const isFixedMarkerError =
            (isStressMark || isSeparatorMark) &&
            (row.status === "deleted" || row.status === "replaced");
          const markerType = isStressMark ? "stress" : "separator";
          const isInserted = row.status === "inserted";
          const explanation = isFixedMarkerError
            ? t(`result.soundAnalysis.marker.${markerType}.explanation`)
            : row.status === "correct"
            ? t("result.soundAnalysis.correct")
            : row.status === "deleted"
            ? t("result.soundAnalysis.missed")
            : isInserted
            ? t("result.soundAnalysis.inserted", {
                pronounced: row.pronounced || row.expected,
              })
            : t("result.soundAnalysis.replaced", {
                pronounced: row.pronounced || "",
              });
          const needsTip = row.status === "deleted" || row.status === "replaced" || isInserted;
          const tipText = isFixedMarkerError
            ? t(`result.soundAnalysis.marker.${markerType}.tip`)
            : row.tipText;
          const statusColor =
            row.status === "correct"
              ? colors.success
              : row.status === "deleted"
              ? colors.danger
              : isInserted
              ? "#ea580c"
              : colors.warning;
          return (
            <View
              key={row.id}
              className="border-l-[3px] pl-2.5 py-2 gap-1"
              style={{ borderLeftColor: statusColor }}
            >
              <Text className="font-bold text-slate-900">
                {isInserted ? `+/${row.pronounced || row.expected}/` : `/${row.expected}/`}
              </Text>
              <Text className="text-slate-600 text-xs">{explanation}</Text>
              {needsTip && tipText ? (
                <Text className="text-slate-700 text-xs">
                  {t("result.soundAnalysis.tipLabel")} {tipText}
                </Text>
              ) : null}
              {needsTip && !isFixedMarkerError && !isInserted && onPracticePhoneme ? (
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
        })}
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
              accessibilityLabel={`${w.word}, ${
                w.hasErrors
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
                  ? "#4f46e5"
                  : w.hasErrors
                  ? "#fffbeb"
                  : w.isPerfect
                  ? "#f0fdf4"
                  : "#f8fafc",
                borderWidth: 1.5,
                borderColor: isSelected
                  ? "#4338ca"
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

      {/* 3. ACTIVE WORD INSPECTOR (Seamless & Flat) */}
      <View className="w-full gap-3 pt-1">
        {/* Header of Inspector: Word name, IPA & Status Badge */}
        <View className="flex-row items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <View className="gap-0.5 flex-1">
            <Text className="text-xl font-black text-slate-900 tracking-tight">
              {activeWord.word}
            </Text>
            {activeWord.ipa ? (
              <Text className="text-xs font-bold text-indigo-600 tracking-wide">
                /{activeWord.ipa}/
              </Text>
            ) : null}
          </View>

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

        {/* Phonemes List of the Selected Word */}
        <View className="gap-2.5">
          {activeWord.phonemes.length === 0 ? (
            <Text className="text-xs text-slate-400 italic py-2 text-center">
              {t("result.soundAnalysis.noPhonemesForWord")}
            </Text>
          ) : (
            activeWord.phonemes.map((row) => {
              const isStressMark = row.expected === "ˈ";
              const isSeparatorMark = row.expected === ".";
              const isFixedMarkerError =
                (isStressMark || isSeparatorMark) &&
                (row.status === "deleted" || row.status === "replaced");
              const markerType = isStressMark ? "stress" : "separator";
              const isInserted = row.status === "inserted";
              const isError =
                row.status === "replaced" || row.status === "deleted" || isInserted;

              const explanation = isFixedMarkerError
                ? t(`result.soundAnalysis.marker.${markerType}.explanation`)
                : row.status === "correct"
                ? t("result.soundAnalysis.correct")
                : row.status === "deleted"
                ? t("result.soundAnalysis.missed")
                : isInserted
                ? t("result.soundAnalysis.inserted", {
                    pronounced: row.pronounced || row.expected,
                  })
                : t("result.soundAnalysis.replaced", {
                    pronounced: row.pronounced || "",
                  });

              const tipText = isFixedMarkerError
                ? t(`result.soundAnalysis.marker.${markerType}.tip`)
                : row.tipText;

              if (isError) {
                return (
                  <View
                    key={row.id}
                    className="rounded-2xl p-3.5 gap-2"
                    style={{
                      backgroundColor: isInserted ? "#fff7ed" : "#fffbeb",
                      borderColor: isInserted ? "#fed7aa" : "#fde68a",
                      borderWidth: 1,
                    }}
                  >
                    {/* Phoneme Badge & Error Status */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View
                          className="px-2.5 py-1 rounded-lg"
                          style={{
                            backgroundColor: isInserted ? "#ffedd5" : "#fef3c7",
                          }}
                        >
                          <Text
                            className="text-base font-black"
                            style={{
                              color: isInserted ? "#c2410c" : "#78350f",
                            }}
                          >
                            {isInserted
                              ? `+/${row.pronounced || row.expected}/`
                              : `/${row.expected}/`}
                          </Text>
                        </View>
                        <Text
                          className="text-xs font-bold"
                          style={{
                            color: isInserted ? "#c2410c" : "#92400e",
                          }}
                        >
                          {isInserted
                            ? t("result.soundAnalysis.insertedBadge")
                            : t("result.soundAnalysis.needsImprovement")}
                        </Text>
                      </View>
                    </View>

                    {/* Explanation */}
                    <Text
                      className="text-xs font-semibold leading-relaxed"
                      style={{
                        color: isInserted ? "#9a3412" : "#78350f",
                      }}
                    >
                      {explanation}
                    </Text>

                    {/* Pronunciation Tip (Inline, seamless layout) */}
                    {tipText ? (
                      <View className="flex-row items-start gap-1.5 pt-0.5">
                        <Text
                          className="text-xs font-bold shrink-0"
                          style={{
                            color: isInserted ? "#9a3412" : "#78350f",
                          }}
                        >
                          💡 {t("result.soundAnalysis.tipLabel")}
                        </Text>
                        <Text
                          className="flex-1 text-xs font-medium leading-relaxed"
                          style={{
                            color: isInserted ? "#7c2d12" : "#78350f",
                          }}
                        >
                          {tipText}
                        </Text>
                      </View>
                    ) : null}

                    {/* Learn Phoneme CTA Button */}
                    {!isFixedMarkerError && !isInserted && onPracticePhoneme ? (
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
                              ? "#818cf8"
                              : "#4f46e5",
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
              }

              // Correct Phoneme Row (Calm & Compact)
              return (
                <View
                  key={row.id}
                  className="flex-row items-center justify-between py-2 px-3 rounded-xl"
                  style={{
                    backgroundColor: "#f0fdf4",
                    borderColor: "#dcfce7",
                    borderWidth: 1,
                  }}
                >
                  <View className="flex-row items-center gap-2">
                    <Check size={14} color="#16a34a" strokeWidth={3} />
                    <Text className="text-sm font-bold text-slate-800">
                      /{row.expected}/
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-emerald-700">
                    {t("result.soundAnalysis.correctSound")}
                  </Text>
                </View>
              );
            })
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
