import React from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  Text,
  ViewStyle,
} from "react-native";

export interface PrimaryButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  style,
  className = "",
}: PrimaryButtonProps) {
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";

  const variantClass = isGhost
    ? "bg-transparent border border-appBorderStrong"
    : isDanger
    ? "bg-danger"
    : "bg-[#0c2340]";

  const stateClass = disabled || loading ? "opacity-50" : "active:opacity-85";

  const textClass = isGhost
    ? "text-appText font-semibold text-[15px]"
    : "text-white font-semibold text-[15px]";

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: !!(disabled || loading),
        busy: !!loading,
      }}
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-md py-3 px-4 items-center justify-center min-h-[44px] ${variantClass} ${stateClass} ${className}`}
      style={style}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? "#2383e2" : "#ffffff"} />
      ) : (
        <Text className={textClass}>{title}</Text>
      )}
    </Pressable>
  );
}

export interface ChipButtonProps {
  title: string;
  active?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  className?: string;
}

export function ChipButton({
  title,
  active,
  onPress,
  disabled,
  className = "",
}: ChipButtonProps) {
  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        selected: !!active,
        disabled: !!disabled,
      }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: active ? "#e0f2fe" : "#ffffff",
        borderColor: active ? "#0284c7" : "#cbd5e1",
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      })}
      className={`rounded-full border px-3 py-1.5 ${className}`}
    >
      <Text
        style={{ color: active ? "#0284c7" : "#475569" }}
        className="font-semibold text-[13px]"
      >
        {title}
      </Text>
    </Pressable>
  );
}
