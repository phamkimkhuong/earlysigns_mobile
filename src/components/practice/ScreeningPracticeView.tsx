import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { AlertCircle, Check, ChevronLeft, Mic, RotateCcw, Square, Volume2 } from "lucide-react-native";
import type { TFunction } from "i18next";
import type { LessonSentence, MicError } from "@/types/domain";
import { SCREENING_SENTENCE_COUNT } from "@/utils/screeningSession";
import MicErrorCard from "./MicErrorCard";

export type ScreeningPhase = "ready" | "starting" | "recording" | "checking" | "recorded" | "saving";

export interface ScreeningPracticeViewProps {
  t: TFunction;
  sentence: LessonSentence;
  current: number;
  completed: number[];
  phase: ScreeningPhase;
  seconds: number;
  micError?: MicError | null;
  error: string;
  showSupport: boolean;
  samplePlaying: boolean;
  replayPlaying: boolean;
  canReplay: boolean;
  score: number | null;
  showScore: boolean;
  confirmExit: boolean;
  onClose: () => void;
  onStay: () => void;
  onDiscard: () => void;
  onPrimary: () => void;
  onPrevious: () => void;
  onRetryRecording: () => void;
  onSupport: () => void;
  onScore: () => void;
  onSample: () => void;
  onReplay: () => void;
}

export default function ScreeningPracticeView(p: ScreeningPracticeViewProps) {
  const { t, phase } = p;
  const busy = ["starting", "recording", "checking", "saving"].includes(phase);
  const waiting = ["starting", "checking", "saving"].includes(phase);
  const playing = p.samplePlaying || p.replayPlaying;
  const last = p.current === SCREENING_SENTENCE_COUNT - 1;
  const primaryKey = phase === "recorded" ? (last ? "finish" : "next") : phase === "recording" ? "stop" : waiting ? phase : "record";
  const ipa = typeof p.sentence.ipa === "string" ? p.sentence.ipa :
    Array.isArray(p.sentence.words) ? p.sentence.words.map((word: any) => word.ipa || "").filter(Boolean).join(" ") : "";

  return (
    <View className="flex-1 min-h-0 bg-[#0a2644]">
      <View
        className="flex-1 min-h-0"
        accessibilityElementsHidden={p.confirmExit}
        importantForAccessibility={p.confirmExit ? "no-hide-descendants" : "auto"}
      >
        {/* 1. LUXURY NAVY HEADER */}
        <View className="bg-[#0a2644] pt-2 pb-5 px-5">
          {/* Top navigation bar */}
          <View className="flex-row items-center justify-between mb-3.5">
            <Pressable
              testID="screening-close"
              accessibilityRole="button"
              accessibilityLabel={t("common.back", "Quay lại")}
              onPress={p.onClose}
              disabled={phase === "saving"}
              className="w-10 h-10 items-center justify-center rounded-2xl border active:opacity-80"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderColor: "rgba(255, 255, 255, 0.16)",
              }}
            >
              <ChevronLeft size={22} color="#ffffff" />
            </Pressable>

            <Text accessibilityRole="header" className="text-base font-extrabold text-white">
              {t("screeningPractice.title")}
            </Text>

            {/* Step Counter Pill */}
            <View
              className="px-3 py-1.5 rounded-full border items-center justify-center"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderColor: "rgba(255, 255, 255, 0.16)",
              }}
            >
              <Text className="text-xs font-bold text-white shrink-0" numberOfLines={1}>
                {p.current + 1}/{SCREENING_SENTENCE_COUNT}
              </Text>
            </View>
          </View>

          {/* Segmented Progress Capsules */}
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={t("screeningPractice.progress", { count: p.completed.length, total: SCREENING_SENTENCE_COUNT })}
            accessibilityValue={{ min: 0, max: SCREENING_SENTENCE_COUNT, now: p.completed.length }}
            className="flex-row gap-2 mt-1"
          >
            {Array.from({ length: SCREENING_SENTENCE_COUNT }, (_, i) => {
              const isDone = p.completed.includes(i);
              const isCurrent = i === p.current;
              return (
                <View
                  key={i}
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    backgroundColor: isDone ? "#10b981" : isCurrent ? "#38bdf8" : "rgba(255, 255, 255, 0.22)",
                  }}
                />
              );
            })}
          </View>
          <Text
            className="text-xs font-medium mt-2"
            style={{ color: "rgba(255, 255, 255, 0.72)" }}
          >
            {t("screeningPractice.progress", { count: p.completed.length, total: SCREENING_SENTENCE_COUNT })}
          </Text>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-[#f8fafc] -mt-3 rounded-t-[32px] overflow-hidden">
          <ScrollView
            className="flex-1 min-h-0"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, gap: 18 }}
            showsVerticalScrollIndicator={false}
          >
            {/* HERO SENTENCE CARD */}
            <View
              className="bg-white rounded-[26px] p-6 border border-[#e8f1f8]"
              style={{
                shadowColor: "#0c2340",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 14,
                elevation: 2,
              }}
            >
              {/* Category / Instruction Tag */}
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-2 h-2 rounded-full bg-[#0284c7]" />
                <Text className="text-xs font-bold uppercase tracking-wider text-[#0284c7]">
                  {t("screeningPractice.instruction")}
                </Text>
              </View>

              {/* The Target Sentence */}
              <Text
                testID="screening-sentence"
                className="text-[26px] leading-[38px] font-extrabold text-[#0c2340] mt-2 mb-1.5"
              >
                {p.sentence.text}
              </Text>

              {/* IPA Transcript directly under sentence */}
              {ipa ? (
                <Text className="text-[16px] leading-6 font-medium text-[#64748b] mb-3">
                  /{ipa}/
                </Text>
              ) : null}

              {/* Native Speaker Audio Sample Button */}
              {p.sentence.audio_url ? (
                <View className="pt-3 border-t border-[#f1f5f9] flex-row items-center">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    onPress={p.onSample}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-full border flex-row items-center gap-2 active:opacity-80"
                    style={{
                      backgroundColor: p.samplePlaying ? "#e0f2fe" : "#f8fafc",
                      borderColor: p.samplePlaying ? "#38bdf8" : "#e2e8f0",
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Volume2 size={16} color="#0369a1" />
                    <Text className="text-xs font-bold text-[#0369a1]">
                      {t(p.samplePlaying ? "screeningPractice.stopAudio" : "screeningPractice.sample")}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* LIVE FEEDBACK & STATUS CARDS */}
            <View accessibilityLiveRegion="polite" className="gap-3">
              {/* Recording State */}
              {phase === "recording" ? (
                <View
                  className="flex-row items-center gap-3.5 rounded-2xl px-4 py-4 border"
                  style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-3 w-3 rounded-full bg-[#dc2626]" />
                    <View className="flex-row items-center gap-0.5">
                      <View className="w-1 h-3 rounded-full bg-[#dc2626]" />
                      <View className="w-1 h-5 rounded-full bg-[#dc2626]" />
                      <View className="w-1 h-2 rounded-full bg-[#dc2626]" />
                      <View className="w-1 h-4 rounded-full bg-[#dc2626]" />
                    </View>
                  </View>
                  <Text className="flex-1 text-[15px] font-bold text-[#991b1b]">
                    {t("screeningPractice.recording")}
                  </Text>
                  <Text className="text-base font-extrabold font-mono text-[#dc2626]">
                    {String(Math.floor(p.seconds / 60)).padStart(2, "0")}:{String(p.seconds % 60).padStart(2, "0")} / 00:25
                  </Text>
                </View>
              ) : null}

              {/* Waiting / Analysis State */}
              {waiting ? (
                <View
                  className="flex-row items-center gap-3 rounded-2xl px-4 py-4 border"
                  style={{ backgroundColor: "#f0f9ff", borderColor: "#bae6fd" }}
                >
                  <ActivityIndicator color="#0284c7" />
                  <Text className="flex-1 text-[14px] font-semibold text-[#0369a1]">
                    {t(`screeningPractice.${phase}`)}
                  </Text>
                </View>
              ) : null}

              {/* Recorded Success Card */}
              {phase === "recorded" ? (
                <View
                  testID="screening-recorded"
                  className="gap-3 rounded-2xl p-4.5 border"
                  style={{ backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }}
                >
                  <View className="flex-row gap-3 items-center">
                    <View className="w-7 h-7 rounded-full bg-[#10b981] items-center justify-center">
                      <Check size={16} color="#ffffff" strokeWidth={3} />
                    </View>
                    <Text className="flex-1 text-base font-extrabold text-[#065f46]">
                      {t("screeningPractice.recorded", { current: p.current + 1 })}
                    </Text>
                  </View>
                  <Text className="text-[13px] leading-5 font-medium text-[#047857]">
                    {t(last ? "screeningPractice.allRecorded" : "screeningPractice.continueHint")}
                  </Text>

                  {/* Audio Review Actions */}
                  <View className="flex-row flex-wrap gap-2 pt-2 border-t border-[#d1fae5]">
                    {p.canReplay ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={p.onReplay}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-full border flex-row items-center gap-1.5"
                        style={{ backgroundColor: "#ffffff", borderColor: "#a7f3d0" }}
                      >
                        <Volume2 size={15} color="#059669" />
                        <Text className="text-xs font-bold text-[#059669]">
                          {t(p.replayPlaying ? "screeningPractice.stopAudio" : "screeningPractice.replay")}
                        </Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      accessibilityRole="button"
                      onPress={p.onRetryRecording}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-full border flex-row items-center gap-1.5"
                      style={{ backgroundColor: "#ffffff", borderColor: "#a7f3d0" }}
                    >
                      <RotateCcw size={14} color="#059669" />
                      <Text className="text-xs font-bold text-[#059669]">
                        {t("screeningPractice.rerecord")}
                      </Text>
                    </Pressable>

                    {p.score !== null ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: p.showScore }}
                        onPress={p.onScore}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-full border flex-row items-center gap-1.5"
                        style={{ backgroundColor: "#ffffff", borderColor: "#a7f3d0" }}
                      >
                        <Text className="text-xs font-bold text-[#047857]">
                          {t(p.showScore ? "screeningPractice.hideScore" : "screeningPractice.showScore")}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {p.showScore && p.score !== null ? (
                    <View className="p-3 rounded-xl bg-white border border-[#a7f3d0]">
                      <Text className="text-sm font-bold text-[#065f46]">
                        {t("screeningPractice.score", { score: Math.round(p.score * 100) })}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Microphone Error Card (with Open Settings button when permission denied) */}
              {p.micError ? (
                <MicErrorCard micError={p.micError} />
              ) : null}

              {/* General Error Alert */}
              {p.error && !p.micError ? (
                <View
                  className="flex-row items-center gap-3 p-4 rounded-2xl border"
                  style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
                >
                  <AlertCircle size={18} color="#dc2626" />
                  <Text
                    testID="screening-error"
                    accessibilityRole="alert"
                    className="text-[14px] leading-5 font-medium text-[#b91c1c] flex-1"
                  >
                    {p.error}
                  </Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* 3. STICKY BOTTOM ACTION BAR */}
          <View
            className="px-5 pt-3 pb-6 gap-2.5 border-t border-[#e2eaf2] bg-white"
            style={{
              shadowColor: "#0c2340",
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {/* Primary Action Button */}
            <TouchableOpacity
              testID="screening-primary"
              accessibilityRole="button"
              accessibilityState={{ disabled: waiting, busy: waiting }}
              disabled={waiting}
              onPress={p.onPrimary}
              activeOpacity={0.85}
              style={{
                backgroundColor:
                  phase === "recording"
                    ? "#dc2626"
                    : phase === "recorded"
                    ? last
                      ? "#059669"
                      : "#2383E2"
                    : "#2383E2",
                opacity: waiting ? 0.7 : 1,
              }}
              className="min-h-[54px] rounded-2xl px-5 py-3.5 flex-row items-center justify-center gap-2.5"
            >
              {waiting ? (
                <ActivityIndicator color="#ffffff" />
              ) : phase === "recording" ? (
                <Square size={20} color="#ffffff" />
              ) : phase === "ready" ? (
                <Mic size={22} color="#ffffff" />
              ) : (
                <Check size={20} color="#ffffff" strokeWidth={2.5} />
              )}
              <Text className="text-base font-extrabold text-white text-center shrink">
                {t(`screeningPractice.${primaryKey}`)}
              </Text>
            </TouchableOpacity>

            {/* Secondary Controls / Previous Button */}
            {p.current > 0 ? (
              <Pressable
                testID="screening-previous"
                accessibilityRole="button"
                disabled={busy}
                accessibilityState={{ disabled: busy }}
                onPress={p.onPrevious}
                style={{ opacity: busy ? 0.45 : 1 }}
                className="min-h-[44px] flex-row gap-1.5 items-center justify-center"
              >
                <ChevronLeft size={18} color="#53677a" />
                <Text className="text-sm font-bold text-[#53677a]">
                  {t("screeningPractice.previous")}
                </Text>
              </Pressable>
            ) : (
              <Text className="text-xs text-center text-[#64748b] py-1.5">
                {t(playing ? "screeningPractice.playingHint" : "screeningPractice.recordHint")}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* 4. EXIT CONFIRMATION DIALOG MODAL */}
      {p.confirmExit ? (
        <View
          className="absolute inset-0 justify-center px-6"
          style={{ backgroundColor: "rgba(10, 38, 68, 0.65)" }}
          accessibilityViewIsModal
        >
          <View
            className="bg-white rounded-3xl p-6 gap-4 border border-[#e2eaf2]"
            style={{
              shadowColor: "#0c2340",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            <View className="items-center gap-2">
              <View className="w-12 h-12 rounded-full bg-[#fef2f2] items-center justify-center">
                <AlertCircle size={26} color="#dc2626" />
              </View>
              <Text accessibilityRole="header" className="text-lg font-extrabold text-[#0c2340] text-center">
                {t("screeningPractice.exitTitle")}
              </Text>
              <Text className="text-[14px] leading-6 text-[#53677a] text-center">
                {t("screeningPractice.exitDescription")}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={p.onStay}
              className="bg-[#0c2340] rounded-2xl min-h-[50px] p-3 items-center justify-center active:opacity-90"
            >
              <Text className="text-base font-extrabold text-white">
                {t("screeningPractice.stay")}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={p.onDiscard}
              className="min-h-[44px] items-center justify-center active:opacity-75"
            >
              <Text className="text-sm font-bold text-[#dc2626]">
                {t("screeningPractice.exit")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
