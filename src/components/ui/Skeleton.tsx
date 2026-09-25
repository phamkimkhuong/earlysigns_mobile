import React, { useEffect, useState } from "react";
import {
  Animated,
  DimensionValue,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";

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
export function PhonemesChipsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem
          key={i}
          width={62}
          height={32}
          borderRadius={12}
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
      <View className="bg-accentMuted/30 rounded-xl p-3 gap-1.5">
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

export default SkeletonItem;
