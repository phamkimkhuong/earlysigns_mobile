import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { hapticFeedback } from "@/utils/haptics";
import FacebookIcon from "./FacebookIcon";

export interface FacebookSignInButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
}

export default function FacebookSignInButton({
  onPress,
  title,
  loading = false,
  disabled = false,
}: FacebookSignInButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;
    hapticFeedback.light();
    onPress();
  };

  return (
    <Pressable
      className={`flex-row items-center justify-center bg-appElevated border border-appBorderStrong rounded-md py-3 px-4 min-h-[48px] ${
        disabled || loading ? "opacity-50" : "active:opacity-80"
      }`}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#1877f2" />
      ) : (
        <View className="flex-row items-center gap-3">
          <FacebookIcon size={20} />
          <Text className="text-[15px] font-semibold text-appText">{title}</Text>
        </View>
      )}
    </Pressable>
  );
}
