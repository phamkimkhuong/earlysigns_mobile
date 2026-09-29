import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Check, ChevronLeft, Mic, Square, Volume2, X } from "lucide-react-native";
import type { TFunction } from "i18next";
import type { LessonSentence } from "@/types/domain";
import { SCREENING_SENTENCE_COUNT } from "@/utils/screeningSession";

export type ScreeningPhase = "ready" | "starting" | "recording" | "checking" | "recorded" | "saving";
export interface ScreeningPracticeViewProps {
  t: TFunction;
  sentence: LessonSentence;
  current: number;
  completed: number[];
  phase: ScreeningPhase;
  seconds: number;
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
  const translation = typeof p.sentence.translation === "string" ? p.sentence.translation : "";
  const ipa = typeof p.sentence.ipa === "string" ? p.sentence.ipa :
    Array.isArray(p.sentence.words) ? p.sentence.words.map((word: any) => word.ipa || "").filter(Boolean).join(" ") : "";
  return (
    <View className="flex-1 min-h-0 bg-[#f5f8fb]">
      <View className="flex-1 min-h-0" accessibilityElementsHidden={p.confirmExit} importantForAccessibility={p.confirmExit ? "no-hide-descendants" : "auto"}>
        <View className="px-5 pt-2 pb-4 gap-4 bg-white">
          <View className="flex-row items-center gap-3">
            <Pressable testID="screening-close" accessibilityRole="button" accessibilityLabel={t("screeningPractice.close")} onPress={p.onClose}
              disabled={phase === "saving"} className="w-11 h-11 items-center justify-center rounded-full bg-[#f1f5f9]">
              <X size={22} color="#0c2340" />
            </Pressable>
            <Text accessibilityRole="header" className="flex-1 text-base font-bold text-[#0c2340]">{t("screeningPractice.title")}</Text>
            <Text className="text-sm font-bold text-[#53677a] shrink-0">{p.current + 1}/{SCREENING_SENTENCE_COUNT}</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityLabel={t("screeningPractice.progress", { count: p.completed.length, total: SCREENING_SENTENCE_COUNT })}
            accessibilityValue={{ min: 0, max: SCREENING_SENTENCE_COUNT, now: p.completed.length }} className="flex-row gap-2">
            {Array.from({ length: SCREENING_SENTENCE_COUNT }, (_, i) => (
              <View key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: p.completed.includes(i) ? "#16836a" : i === p.current ? "#0369a1" : "#e2eaf2" }} />
            ))}
          </View>
          <Text className="text-[13px] text-[#53677a]">{t("screeningPractice.progress", { count: p.completed.length, total: SCREENING_SENTENCE_COUNT })}</Text>
        </View>

        <ScrollView className="flex-1 min-h-0" contentContainerClassName="px-6 py-7 gap-6" showsVerticalScrollIndicator={false}>
          <View className="gap-4">
            <Text className="text-[15px] leading-6 text-[#53677a]">{t("screeningPractice.instruction")}</Text>
            <Text testID="screening-sentence" className="text-[28px] leading-[40px] font-bold text-[#0c2340]">{p.sentence.text}</Text>
          </View>
          {(translation || ipa || p.sentence.audio_url) ? (
            <View className="gap-3">
              <View className="flex-row flex-wrap gap-x-6 gap-y-1">
                {(translation || ipa) ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: p.showSupport }} onPress={p.onSupport} className="min-h-[44px] justify-center">
                  <Text className="text-sm font-bold text-[#0369a1]">{t(p.showSupport ? "screeningPractice.hideSupport" : "screeningPractice.support")}</Text>
                </Pressable> : null}
                {p.sentence.audio_url ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={p.onSample} className="min-h-[44px] flex-row items-center gap-2">
                  <Volume2 size={18} color="#0369a1" /><Text className="text-sm font-bold text-[#0369a1]">{t(p.samplePlaying ? "screeningPractice.stopAudio" : "screeningPractice.sample")}</Text>
                </Pressable> : null}
              </View>
              {p.showSupport ? <View className="gap-3 border-l-2 border-[#cbdde9] pl-4">
                {translation ? <Text className="text-[15px] leading-6 text-[#53677a]">{translation}</Text> : null}
                {ipa ? <Text className="text-[15px] leading-6 text-[#53677a]">{ipa}</Text> : null}
              </View> : null}
            </View>
          ) : null}

          <View accessibilityLiveRegion="polite" className="gap-3">
            {phase === "recording" ? <View className="flex-row items-center gap-3 rounded-2xl bg-[#fceeee] px-4 py-4">
              <View className="h-2.5 w-2.5 rounded-full bg-[#b42318]" />
              <Text className="flex-1 text-[15px] font-semibold text-[#923229]">{t("screeningPractice.recording")}</Text>
              <Text className="text-base font-bold text-[#923229]">{Math.floor(p.seconds / 60)}:{String(p.seconds % 60).padStart(2, "0")}</Text>
            </View> : null}
            {waiting ? <View className="flex-row items-center gap-3 py-4"><ActivityIndicator color="#0369a1" /><Text className="flex-1 text-[15px] text-[#53677a]">{t(`screeningPractice.${phase}`)}</Text></View> : null}
            {phase === "recorded" ? <View testID="screening-recorded" className="gap-2 rounded-2xl bg-[#e8f5ef] p-4">
              <View className="flex-row gap-2 items-center"><Check size={20} color="#147d64" /><Text className="flex-1 text-base font-bold text-[#147d64]">{t("screeningPractice.recorded", { current: p.current + 1 })}</Text></View>
              <Text className="text-sm leading-5 text-[#315c50]">{t(last ? "screeningPractice.allRecorded" : "screeningPractice.continueHint")}</Text>
            </View> : null}
            {p.error ? <Text testID="screening-error" accessibilityRole="alert" className="text-[15px] leading-6 text-[#b42318]">{p.error}</Text> : null}
          </View>
          {phase === "recorded" ? <View className="gap-2">
            <View className="flex-row flex-wrap gap-x-6 gap-y-1">
              {p.canReplay ? <Pressable accessibilityRole="button" onPress={p.onReplay} className="min-h-[44px] justify-center"><Text className="text-sm font-bold text-[#0369a1]">{t(p.replayPlaying ? "screeningPractice.stopAudio" : "screeningPractice.replay")}</Text></Pressable> : null}
              <Pressable accessibilityRole="button" onPress={p.onRetryRecording} className="min-h-[44px] justify-center"><Text className="text-sm font-bold text-[#0369a1]">{t("screeningPractice.rerecord")}</Text></Pressable>
              {p.score !== null ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: p.showScore }} onPress={p.onScore} className="min-h-[44px] justify-center"><Text className="text-sm font-bold text-[#53677a]">{t(p.showScore ? "screeningPractice.hideScore" : "screeningPractice.showScore")}</Text></Pressable> : null}
            </View>
            {p.showScore && p.score !== null ? <Text className="text-[15px] text-[#53677a]">{t("screeningPractice.score", { score: Math.round(p.score * 100) })}</Text> : null}
          </View> : null}
        </ScrollView>

        <View className="px-5 pt-3 pb-4 gap-2 border-t border-[#e2eaf2] bg-white">
          <Pressable testID="screening-primary" accessibilityRole="button" accessibilityState={{ disabled: waiting, busy: waiting }} disabled={waiting} onPress={p.onPrimary}
            style={{ backgroundColor: phase === "recording" ? "#b42318" : "#0369a1", opacity: waiting ? 0.7 : 1 }}
            className="min-h-[54px] rounded-2xl px-4 py-3.5 flex-row items-center justify-center gap-3">
            {waiting ? <ActivityIndicator color="#ffffff" /> : phase === "recording" ? <Square size={20} color="#ffffff" /> : phase === "ready" ? <Mic size={22} color="#ffffff" /> : null}
            <Text className="text-base font-extrabold text-white text-center shrink">{t(`screeningPractice.${primaryKey}`)}</Text>
          </Pressable>
          {p.current > 0 ? <Pressable testID="screening-previous" accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }} onPress={p.onPrevious}
            style={{ opacity: busy ? 0.45 : 1 }} className="min-h-[44px] flex-row gap-1 items-center justify-center">
            <ChevronLeft size={18} color="#53677a" /><Text className="text-sm font-bold text-[#53677a]">{t("screeningPractice.previous")}</Text>
          </Pressable> : <Text className="text-[13px] text-center text-[#53677a] py-2">{t(playing ? "screeningPractice.playingHint" : "screeningPractice.recordHint")}</Text>}
        </View>
      </View>
      {p.confirmExit ? <View className="absolute inset-0 justify-center px-6" style={{ backgroundColor: "rgba(12, 35, 64, 0.55)" }} accessibilityViewIsModal>
        <View className="bg-white rounded-3xl p-6 gap-4">
          <Text accessibilityRole="header" className="text-lg font-bold text-[#0c2340]">{t("screeningPractice.exitTitle")}</Text>
          <Text className="text-[15px] leading-6 text-[#53677a]">{t("screeningPractice.exitDescription")}</Text>
          <Pressable accessibilityRole="button" onPress={p.onStay} className="bg-[#0369a1] rounded-2xl min-h-[48px] p-3 items-center justify-center"><Text className="text-base font-extrabold text-white">{t("screeningPractice.stay")}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={p.onDiscard} className="min-h-[44px] items-center justify-center"><Text className="text-sm font-bold text-[#b42318]">{t("screeningPractice.exit")}</Text></Pressable>
        </View>
      </View> : null}
    </View>
  );
}
