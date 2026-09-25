import React, { useEffect, useState } from "react";
import {
  Animated,
  Text,
  View,
} from "react-native";
import { CheckCircle2, Circle, Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";

export interface StagedAiProgressProps {
  /**
   * Whether the AI checking / analysis process is active.
   */
  active: boolean;
  /**
   * Display mode:
   * - "card": Detailed breakdown with header, progress bar, and 3-stage checklist (ideal for modals).
   * - "compact": Streamlined horizontal bar with current step and slim progress bar (ideal for inline screens).
   */
  variant?: "card" | "compact";
  /**
   * Optional custom title override.
   */
  title?: string;
}

export default function StagedAiProgress({
  active,
  variant = "card",
  title,
}: StagedAiProgressProps) {
  const { t } = useTranslation();

  // React 19 safe Animated Values
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [percent, setPercent] = useState(0);

  const stages = [
    { id: "step1", label: t("sentence.aiProgress.step1") },
    { id: "step2", label: t("sentence.aiProgress.step2") },
    { id: "step3", label: t("sentence.aiProgress.step3") },
  ];

  // Subscribe to progressAnim to display live percentage number
  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      setPercent(Math.round(value));
    });
    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  // Breathing pulse animation for AI Sparkle icon
  useEffect(() => {
    if (!active) {
      pulseAnim.setValue(1);
      return;
    }
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => {
      pulseLoop.stop();
    };
  }, [active, pulseAnim]);

  // Staged progress progression:
  // Step 1: 0% -> 35% (~600ms)
  // Step 2: 35% -> 80% (~1200ms)
  // Step 3: 80% -> 96% (~1500ms creeping)
  useEffect(() => {
    if (!active) {
      progressAnim.setValue(0);
      setPercent(0);
      return;
    }

    // Sequence through the 3 stages
    const animation = Animated.sequence([
      // Stage 1: Speech recognition & upload (0 -> 35%)
      Animated.timing(progressAnim, {
        toValue: 35,
        duration: 650,
        useNativeDriver: false,
      }),
      // Stage 2: AI Phonetic Analysis (35% -> 80%)
      Animated.timing(progressAnim, {
        toValue: 80,
        duration: 1350,
        useNativeDriver: false,
      }),
      // Stage 3: Scoring & feedback (80% -> 96%)
      Animated.timing(progressAnim, {
        toValue: 96,
        duration: 1800,
        useNativeDriver: false,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [active, progressAnim]);

  if (!active) return null;

  // Derive which stage is currently active based on percentage
  const currentStageIndex = percent < 35 ? 0 : percent < 80 ? 1 : 2;

  const widthInterpolation = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  // COMPACT VARIANT: Sleek inline pill
  if (variant === "compact") {
    return (
      <View className="bg-indigo-50/90 border border-indigo-200/90 rounded-2xl p-3.5 gap-2.5 my-1">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 flex-1 pr-2">
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View className="w-6 h-6 rounded-lg bg-indigo-600 items-center justify-center">
                <Sparkles size={13} color="#ffffff" />
              </View>
            </Animated.View>
            <Text className="text-xs font-bold text-indigo-900" numberOfLines={1}>
              {stages[currentStageIndex]?.label || t("sentence.aiProgress.title")}...
            </Text>
          </View>
          <View className="bg-indigo-600 px-2 py-0.5 rounded-full">
            <Text className="text-2xs font-black text-white">{percent}%</Text>
          </View>
        </View>

        {/* Slim Progress Bar */}
        <View className="h-1.5 bg-indigo-200/60 rounded-full overflow-hidden">
          <Animated.View
            className="h-full bg-indigo-600 rounded-full"
            style={{ width: widthInterpolation }}
          />
        </View>
      </View>
    );
  }

  // CARD VARIANT: Full AI Analysis Dashboard Card
  return (
    <View className="bg-indigo-50/80 border border-indigo-200/90 rounded-3xl p-4 gap-3.5 my-1 shadow-sm">
      {/* Top Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View className="w-9 h-9 rounded-2xl bg-indigo-600 items-center justify-center shadow-sm">
              <Sparkles size={18} color="#ffffff" />
            </View>
          </Animated.View>
          <View>
            <Text className="text-sm font-black text-slate-900 tracking-tight">
              {title || t("sentence.aiProgress.title")}
            </Text>
            <Text className="text-2xs font-medium text-slate-500">
              {stages[currentStageIndex]?.label}...
            </Text>
          </View>
        </View>

        {/* Live Percentage Badge */}
        <View className="bg-indigo-600 px-2.5 py-1 rounded-full shadow-sm">
          <Text className="text-xs font-black text-white">{percent}%</Text>
        </View>
      </View>

      {/* Progress Track */}
      <View className="h-2 bg-indigo-200/60 rounded-full overflow-hidden">
        <Animated.View
          className="h-full bg-indigo-600 rounded-full"
          style={{ width: widthInterpolation }}
        />
      </View>

      {/* 3-Stage Checklist */}
      <View className="bg-white/80 rounded-2xl p-3 gap-2.5 border border-indigo-100">
        {stages.map((stage, idx) => {
          const isDone = currentStageIndex > idx;
          const isCurrent = currentStageIndex === idx;

          return (
            <View key={stage.id} className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1 pr-2">
                {isDone ? (
                  <CheckCircle2 size={16} color="#059669" />
                ) : isCurrent ? (
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <View className="w-4 h-4 rounded-full bg-indigo-600 items-center justify-center">
                      <View className="w-1.5 h-1.5 rounded-full bg-white" />
                    </View>
                  </Animated.View>
                ) : (
                  <Circle size={16} color="#cbd5e1" />
                )}

                <Text
                  className={`text-xs ${
                    isCurrent
                      ? "font-bold text-indigo-900"
                      : isDone
                      ? "font-semibold text-slate-700"
                      : "font-medium text-slate-400"
                  }`}
                  numberOfLines={1}
                >
                  {stage.label}
                </Text>
              </View>

              {/* Status pill on right */}
              {isDone ? (
                <Text className="text-2xs font-bold text-emerald-600">✓</Text>
              ) : isCurrent ? (
                <Text className="text-2xs font-bold text-indigo-600 animate-pulse">...</Text>
              ) : (
                <Text className="text-2xs font-medium text-slate-300">--</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
