import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";

/**
 * Top elastic overscroll filler to prevent white flash when rubber-band scrolling on iOS.
 */
export function OverscrollFiller({ color = "#f7f6f3" }: { color?: string }) {
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
 * Standardized Clean Header for practice and section screens.
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
    <View className={`bg-appBg px-4 py-3 border-b border-slate-200 ${className}`}>
      {/* Navigation Row */}
      <View className="flex-row items-center justify-between">
        {showBack ? (
          <TouchableOpacity
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            activeOpacity={0.7}
            onPress={onBack}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center active:opacity-70"
          >
            <ChevronLeft size={22} color="#37352f" strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <View className="w-10 h-10" />
        )}

        <View className="flex-1 px-3 items-center">
          {subtitle ? (
            <Text
              className="text-xs font-bold text-slate-500 uppercase tracking-wider"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
          <Text
            className="text-[15px] font-bold text-[#37352f] text-center"
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
