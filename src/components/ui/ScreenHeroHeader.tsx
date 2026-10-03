import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { colors } from "@/core/theme";

/**
 * Top elastic overscroll filler to prevent white flash when rubber-band scrolling on iOS.
 */
export function OverscrollFiller({ color = colors.practiceHeader }: { color?: string }) {
  return (
    <View
      style={{
        position: "absolute",
        top: -1000,
        left: 0,
        right: 0,
        height: 1000,
        backgroundColor: color,
      }}
    />
  );
}

export interface ScreenHeroHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  backAccessibilityLabel?: string;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized Luxury Hero Header for practice and section screens.
 * Uses centralized theme tokens (`colors.practiceHeader` & `bg-practiceHeader`).
 */
export function ScreenHeroHeader({
  title,
  subtitle,
  onBack,
  showBack = true,
  backAccessibilityLabel = "Quay lại",
  rightAction,
  children,
  className = "",
}: ScreenHeroHeaderProps) {
  return (
    <View className={`bg-practiceHeader pt-2 pb-6 px-5 ${className}`}>
      {/* Navigation Row */}
      <View className="flex-row items-center justify-between mb-3">
        {showBack ? (
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            activeOpacity={0.8}
            onPress={onBack}
            className="w-10 h-10 rounded-2xl items-center justify-center border"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.16)",
              borderColor: "rgba(255, 255, 255, 0.25)",
            }}
          >
            <ChevronLeft size={22} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <View className="w-10 h-10" />
        )}

        <View className="flex-1 px-3 items-center">
          {subtitle ? (
            <Text
              className="text-xs font-bold text-sky-200 uppercase tracking-wider"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
          <Text
            className="text-base font-extrabold text-white text-center"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {rightAction ? (
          rightAction
        ) : (
          <View className="w-10 h-10" />
        )}
      </View>

      {/* Optional Sub-content (Search bar, capsules, progress bars) */}
      {children}
    </View>
  );
}

export default ScreenHeroHeader;
