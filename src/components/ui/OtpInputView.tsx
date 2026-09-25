import React, { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { hapticFeedback } from "@/utils/haptics";

export interface OtpInputViewProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export default function OtpInputView({
  value,
  onChange,
  length = 6,
  disabled = false,
  hasError = false,
  autoFocus = true,
}: OtpInputViewProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleContainerPress = () => {
    if (disabled) return;
    inputRef.current?.focus();
  };

  const handleTextChange = (text: string) => {
    const cleanText = text.replace(/\D/g, "").slice(0, length);
    if (cleanText !== value) {
      hapticFeedback.selection();
      onChange(cleanText);
    }
  };

  const digits = Array.from({ length }, (_, index) => {
    const char = value[index] || "";
    const isCurrent = isFocused && index === value.length;
    const isLastFilled = isFocused && value.length === length && index === length - 1;
    const isActive = isCurrent || isLastFilled;

    return (
      <View
        key={index}
        className={`flex-1 max-w-[48px] h-[54px] rounded-xl items-center justify-center border-2 ${
          hasError
            ? "border-danger bg-dangerMuted"
            : isActive
            ? "border-accent bg-accentMuted/20"
            : char
            ? "border-appBorderStrong bg-appElevated"
            : "border-appBorder bg-appMuted"
        }`}
      >
        <Text
          className={`text-2xl font-bold ${
            hasError ? "text-danger" : char ? "text-appText" : "text-appTextMuted"
          }`}
        >
          {char}
        </Text>
        {isActive && !char && (
          <View className="absolute bottom-3 w-4 h-[2px] bg-accent rounded-full" />
        )}
      </View>
    );
  });

  return (
    <Pressable
      onPress={handleContainerPress}
      className="w-full py-2 items-center justify-center"
    >
      <View className="flex-row items-center justify-between w-full max-w-[340px] gap-2">
        {digits}
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        maxLength={length}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        editable={!disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={styles.hiddenInput}
        caretHidden
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0.01,
  },
});
