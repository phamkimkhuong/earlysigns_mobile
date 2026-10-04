import React, { useEffect, useState } from "react";
import {
  Animated,
  DimensionValue,
  StyleProp,
  Text,
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
    <View className="flex-1 px-5 pt-3 gap-4" style={{ backgroundColor: "#F7F6F2" }}>
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
    <View className="flex-1 bg-appBg">
      {/* 1. Header Placeholder */}
      <View className="bg-appBg px-4 py-3 border-b border-slate-200">
        <View className="flex-row items-center justify-between mb-2.5">
          {onClose ? (
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              className="w-10 h-10 items-center justify-center rounded-full bg-white border border-slate-200"
            >
              <ChevronLeft size={22} color="#0c2340" strokeWidth={2.5} />
            </TouchableOpacity>
          ) : (
            <SkeletonItem
              width={40}
              height={40}
              borderRadius={20}
              style={{ backgroundColor: "#e2e8f0" }}
            />
          )}
          <SkeletonItem
            width={140}
            height={20}
            borderRadius={6}
            style={{ backgroundColor: "#e2e8f0" }}
          />
          <SkeletonItem
            width={52}
            height={26}
            borderRadius={13}
            style={{ backgroundColor: "#e2e8f0" }}
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
                backgroundColor: i === 0 ? "#0284c7" : "#e2e8f0",
              }}
            />
          ))}
        </View>
      </View>

      {/* 2. Light Canvas Sheet */}
      <View className="flex-1 bg-appBg px-5 pt-6 gap-5">
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

/**
 * Skeleton placeholder for Phoneme Intro Guide Screen.
 * Matches exact layout of PhonemeIntroGuide with navy header, Hero Card, tabs, and step cards.
 */
export function PhonemeGuideSkeleton({
  phoneme,
  dialect = "uk",
  onBack,
}: {
  phoneme?: string;
  dialect?: string;
  onBack?: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "#F7F6F2" }}>
      {/* 1. Header matching PhonemeIntroGuide */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#F7F6F2",
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
        }}
      >
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={onBack}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "rgba(15,23,42,0.08)",
            }}
          >
            <ChevronLeft size={22} color="#0c2340" />
          </TouchableOpacity>
        ) : (
          <SkeletonItem
            width={38}
            height={38}
            borderRadius={19}
            style={{ backgroundColor: "#e2e8f0" }}
          />
        )}

        <View style={{ alignItems: "center", gap: 4 }}>
          {phoneme ? (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>
              Hướng dẫn âm /{phoneme}/
            </Text>
          ) : (
            <SkeletonItem
              width={140}
              height={18}
              borderRadius={6}
              style={{ backgroundColor: "#e2e8f0" }}
            />
          )}
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 1.5,
              borderRadius: 12,
              backgroundColor: "#e0f2fe",
              borderWidth: 1,
              borderColor: "#bae6fd",
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#0284c7" }}>
              {dialect.toUpperCase()} {dialect.toLowerCase() === "uk" ? "🇬🇧" : "🇺🇸"}
            </Text>
          </View>
        </View>

        <View style={{ width: 38, height: 38 }} />
      </View>

      {/* 2. Main Sheet matching PhonemeIntroGuide */}
      <View
        style={{
          flex: 1,
          backgroundColor: "#F7F6F2",
          paddingHorizontal: 16,
          paddingTop: 18,
          gap: 16,
        }}
      >
        {/* A. Hero Phonetic Card Skeleton */}
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 24,
            padding: 18,
            borderWidth: 1.5,
            borderColor: "#e2eaf2",
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <SkeletonItem width={58} height={58} borderRadius={18} />
              <View style={{ gap: 6 }}>
                <SkeletonItem width={110} height={18} borderRadius={8} />
                <SkeletonItem width={140} height={14} borderRadius={6} />
              </View>
            </View>
            <SkeletonItem width={88} height={38} borderRadius={16} />
          </View>
        </View>

        {/* B. Sequential Content Skeletons (No Tabs) */}
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 18,
            padding: 16,
            borderWidth: 1.5,
            borderColor: "#e2eaf2",
            gap: 10,
          }}
        >
          <SkeletonItem width="80%" height={16} borderRadius={6} />
          <SkeletonItem width="100%" height={14} borderRadius={6} />
          <SkeletonItem width="60%" height={14} borderRadius={6} />
        </View>

        <View style={{ gap: 10 }}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 18,
                padding: 15,
                borderWidth: 1.5,
                borderColor: "#e2eaf2",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <SkeletonItem width={26} height={26} borderRadius={13} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonItem width="90%" height={14} borderRadius={6} />
                <SkeletonItem width="65%" height={14} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default SkeletonItem;
