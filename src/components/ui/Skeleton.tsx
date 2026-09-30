import React, { useEffect, useState } from "react";
import {
  Animated,
  DimensionValue,
  StyleProp,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { ChevronLeft } from "lucide-react-native";

export interface SkeletonItemProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * Base animated Skeleton item with fluid 60fps native pulse shimmer.
 */
export function SkeletonItem({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
  className = "",
}: SkeletonItemProps) {
  const [pulseAnim] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#cbd5e1", // Tailwind slate-300
          opacity: pulseAnim,
        },
        style,
      ]}
      className={className}
    />
  );
}

/**
 * Skeleton placeholder for Video Card (16:9 ratio, thumbnail, badge, title).
 */
export function VideoCardSkeleton({
  horizontal = true,
}: {
  horizontal?: boolean;
}) {
  return (
    <View
      className={`bg-appElevated rounded-2xl p-3 border border-appBorder gap-2.5 ${
        horizontal ? "w-[240px] mr-3" : "w-full mb-3"
      }`}
    >
      {/* Thumbnail */}
      <View className="w-full h-32 rounded-xl overflow-hidden relative">
        <SkeletonItem width="100%" height="100%" borderRadius={12} />
        <View className="absolute bottom-2 right-2">
          <SkeletonItem width={42} height={18} borderRadius={6} />
        </View>
      </View>

      {/* Meta & Title */}
      <View className="gap-1.5 pt-0.5">
        <View className="flex-row items-center justify-between">
          <SkeletonItem width={64} height={14} borderRadius={4} />
          <SkeletonItem width={40} height={14} borderRadius={4} />
        </View>
        <SkeletonItem width="92%" height={16} borderRadius={4} />
        <SkeletonItem width="65%" height={14} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Video Screen Sections (Section title + horizontal cards).
 */
export function VideoCatalogSkeleton() {
  return (
    <View className="gap-6 pt-2">
      {[1, 2].map((section) => (
        <View key={section} className="gap-3">
          {/* Section Header */}
          <View className="flex-row items-center justify-between px-1">
            <SkeletonItem width={140} height={20} borderRadius={6} />
            <SkeletonItem width={60} height={16} borderRadius={6} />
          </View>

          {/* Cards Row */}
          <View className="flex-row">
            <VideoCardSkeleton horizontal />
            <VideoCardSkeleton horizontal />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton placeholder for Weakest Phonemes chips on Home Screen.
 */
export function PhonemesChipsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="flex-row flex-wrap gap-3 pt-1">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem
          key={i}
          width={92}
          height={80}
          borderRadius={18}
        />
      ))}
    </View>
  );
}

/**
 * Skeleton placeholder for Winding Learning Path in Journey & Home.
 */
export function JourneyPathSkeleton() {
  return (
    <View className="gap-4 py-3">
      {/* Milestone banner */}
      <View
        className="rounded-xl p-3 gap-1.5"
        style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
      >
        <SkeletonItem width={80} height={12} borderRadius={4} />
        <SkeletonItem width={160} height={18} borderRadius={6} />
      </View>

      {/* Nodes */}
      <View className="w-full items-start pl-4 gap-1">
        <SkeletonItem width={56} height={56} borderRadius={28} />
        <SkeletonItem width={70} height={12} borderRadius={4} />
      </View>

      <View className="w-full items-end pr-4 gap-1">
        <SkeletonItem width={56} height={56} borderRadius={28} />
        <SkeletonItem width={70} height={12} borderRadius={4} />
      </View>

      <View className="w-full items-start pl-4 gap-1">
        <SkeletonItem width={56} height={56} borderRadius={28} />
        <SkeletonItem width={70} height={12} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Monthly Quota Card.
 */
export function QuotaCardSkeleton() {
  return (
    <View className="bg-appElevated rounded-3xl p-5 border border-appBorder gap-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="gap-1.5">
          <SkeletonItem width={120} height={20} borderRadius={6} />
          <SkeletonItem width={80} height={14} borderRadius={4} />
        </View>
        <SkeletonItem width={80} height={32} borderRadius={16} />
      </View>

      <View className="grid grid-cols-2 gap-2.5">
        <SkeletonItem width="100%" height={56} borderRadius={16} />
        <SkeletonItem width="100%" height={56} borderRadius={16} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Profile Progress Tab (Stats, Chart, Weak Sounds).
 */
export function ProfileProgressSkeleton() {
  return (
    <View className="gap-4 py-1">
      {/* Dual stat bubbles */}
      <View className="flex-row items-center gap-3">
        <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 items-center gap-2">
          <SkeletonItem width={40} height={40} borderRadius={16} />
          <SkeletonItem width={50} height={24} borderRadius={6} />
          <SkeletonItem width={70} height={12} borderRadius={4} />
        </View>
        <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 items-center gap-2">
          <SkeletonItem width={40} height={40} borderRadius={16} />
          <SkeletonItem width={50} height={24} borderRadius={6} />
          <SkeletonItem width={70} height={12} borderRadius={4} />
        </View>
      </View>

      {/* Chart Card */}
      <View className="bg-white border border-slate-100 rounded-3xl p-5 gap-3">
        <View className="flex-row items-center justify-between">
          <SkeletonItem width={140} height={18} borderRadius={6} />
          <SkeletonItem width={60} height={14} borderRadius={4} />
        </View>
        <SkeletonItem width="100%" height={160} borderRadius={16} />
      </View>

      {/* Weakest Sounds Card */}
      <View className="bg-white border border-slate-100 rounded-3xl p-5 gap-3">
        <SkeletonItem width={160} height={18} borderRadius={6} />
        <View className="flex-row flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonItem key={i} width={64} height={36} borderRadius={12} />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Video Practice Screen (YouTube player, transcript, controls).
 */
export function VideoPracticeSkeleton() {
  return (
    <View className="gap-3 py-1">
      <SkeletonItem width={160} height={14} borderRadius={4} />
      <SkeletonItem width="85%" height={24} borderRadius={6} />
      <SkeletonItem width={120} height={36} borderRadius={18} />

      {/* YouTube Player Placeholder */}
      <SkeletonItem width="100%" height={220} borderRadius={16} />

      {/* Transcript Box */}
      <View className="bg-appElevated rounded-2xl p-4 border border-appBorder gap-2">
        <SkeletonItem width="95%" height={18} borderRadius={4} />
        <SkeletonItem width="75%" height={14} borderRadius={4} />
      </View>

      {/* Control buttons */}
      <View className="flex-row gap-2 pt-2">
        <SkeletonItem width="48%" height={48} borderRadius={16} />
        <SkeletonItem width="48%" height={48} borderRadius={16} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Saved Passages Library in Text Practice.
 */
export function PassageListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          className="bg-white border border-slate-200 rounded-2xl p-4 gap-2"
        >
          <SkeletonItem width="60%" height={16} borderRadius={4} />
          <SkeletonItem width="90%" height={14} borderRadius={4} />
          <SkeletonItem width="40%" height={12} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton placeholder for Pronunciation & Journey Practice Screens
 * Matches exact layout of PracticePromptCard and bottom SpeechRecordingDock.
 */
export function PracticeScreenSkeleton() {
  return (
    <View className="flex-1 px-5 pt-3 gap-4" style={{ backgroundColor: "#f8fafc" }}>
      {/* 1. Progress Dots Placeholder */}
      <View className="flex-row justify-center items-center gap-1.5 py-2">
        <SkeletonItem width={20} height={8} borderRadius={4} />
        <SkeletonItem width={8} height={8} borderRadius={4} />
        <SkeletonItem width={8} height={8} borderRadius={4} />
        <SkeletonItem width={8} height={8} borderRadius={4} />
        <SkeletonItem width={8} height={8} borderRadius={4} />
      </View>

      {/* 2. Practice Prompt Card Placeholder */}
      <View
        className="bg-white rounded-3xl p-6 border border-slate-200 items-center gap-4"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
          elevation: 1,
        }}
      >
        {/* Main Target Sentence / Word */}
        <SkeletonItem width="75%" height={32} borderRadius={8} />

        {/* Subtitle / IPA row with audio pill */}
        <View className="flex-row items-center gap-3 mt-1">
          <SkeletonItem width={120} height={20} borderRadius={6} />
          <SkeletonItem width={34} height={34} borderRadius={17} />
        </View>

        {/* Translation placeholder */}
        <SkeletonItem width="55%" height={16} borderRadius={6} />
      </View>

      {/* 3. Speech Recording Dock Placeholder (fixed at bottom) */}
      <View
        className="absolute bottom-6 left-5 right-5 flex-row justify-between items-center px-6 py-4 rounded-3xl border border-slate-200"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 4,
          backgroundColor: "#ffffff",
        }}
      >
        {/* Prev Button placeholder */}
        <SkeletonItem width={46} height={46} borderRadius={23} />
        {/* Center Hero Mic placeholder */}
        <SkeletonItem width={72} height={72} borderRadius={36} />
        {/* Next Button placeholder */}
        <SkeletonItem width={46} height={46} borderRadius={23} />
      </View>
    </View>
  );
}

/**
 * Skeleton placeholder for Screening Practice Screen
 * Matches exact layout of ScreeningPracticeView with navy header, capsules, and hero card.
 */
export function ScreeningPracticeSkeleton({ onClose }: { onClose?: () => void } = {}) {
  return (
    <View className="flex-1 bg-[#0a2644]">
      {/* 1. Luxury Navy Header Placeholder */}
      <View className="bg-[#0a2644] pt-2 pb-5 px-5">
        <View className="flex-row items-center justify-between mb-3.5">
          {onClose ? (
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              className="w-10 h-10 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderColor: "rgba(255, 255, 255, 0.16)",
              }}
            >
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <SkeletonItem
              width={40}
              height={40}
              borderRadius={16}
              style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
            />
          )}
          <SkeletonItem
            width={140}
            height={20}
            borderRadius={6}
            style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
          />
          <SkeletonItem
            width={52}
            height={26}
            borderRadius={13}
            style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
          />
        </View>

        {/* Progress Capsules row */}
        <View className="flex-row gap-1.5 mt-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonItem
              key={i}
              height={6}
              borderRadius={3}
              style={{
                flex: 1,
                backgroundColor: i === 0 ? "rgba(56, 189, 248, 0.6)" : "rgba(255, 255, 255, 0.15)",
              }}
            />
          ))}
        </View>
      </View>

      {/* 2. Light Canvas Sheet */}
      <View className="flex-1 bg-[#f8fafc] -mt-3 rounded-t-[32px] px-5 pt-6 gap-5">
        {/* Hero Sentence Card */}
        <View
          className="bg-white rounded-[26px] p-6 border border-[#e8f1f8] gap-3"
          style={{
            shadowColor: "#0c2340",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 14,
            elevation: 2,
          }}
        >
          {/* Tag */}
          <SkeletonItem width={90} height={14} borderRadius={4} />
          {/* Target Sentence */}
          <SkeletonItem width="80%" height={28} borderRadius={6} />
          <SkeletonItem width="50%" height={28} borderRadius={6} />
          {/* IPA */}
          <SkeletonItem width="40%" height={18} borderRadius={4} />
          {/* Sample audio button */}
          <View className="pt-3 border-t border-[#f1f5f9]">
            <SkeletonItem width={110} height={36} borderRadius={18} />
          </View>
        </View>

        {/* Bottom controls placeholder */}
        <View className="mt-auto pb-8 gap-3">
          <SkeletonItem width="100%" height={54} borderRadius={16} />
          <View className="items-center py-1">
            <SkeletonItem width={160} height={14} borderRadius={4} />
          </View>
        </View>
      </View>
    </View>
  );
}

export default SkeletonItem;
