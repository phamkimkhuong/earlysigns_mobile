import React from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { colors } from "@/core/theme";

interface AppleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
}

export default function AppleSignInButton({ onPress, loading }: AppleSignInButtonProps) {
  if (Platform.OS !== "ios") {
    return null;
  }

  return (
    <View className="w-full h-12 rounded-md overflow-hidden relative justify-center">
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={6}
        style={{ width: "100%", height: 48 }}
        onPress={onPress}
      />
      {loading ? (
        <View
          className="absolute inset-0 bg-black/60 items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          <ActivityIndicator color={colors.text} size="small" />
        </View>
      ) : null}
    </View>
  );
}
