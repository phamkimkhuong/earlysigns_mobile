import React from "react";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react-native";
import type { ToastConfig, ToastConfigParams } from "react-native-toast-message";

interface CustomToastCardProps {
  type: "success" | "error" | "info";
  text1?: string;
  text2?: string;
  hide: () => void;
  onPress?: () => void;
}

const TOAST_THEMES = {
  error: {
    bgColor: "#ffffff",
    borderColor: "#fecaca",
    accentColor: "#dc2626",
    iconBg: "#fee2e2",
    iconColor: "#dc2626",
    titleColor: "#991b1b",
    IconComponent: AlertCircle,
  },
  success: {
    bgColor: "#ffffff",
    borderColor: "#bbf7d0",
    accentColor: "#16a34a",
    iconBg: "#dcfce7",
    iconColor: "#16a34a",
    titleColor: "#166534",
    IconComponent: CheckCircle2,
  },
  info: {
    bgColor: "#ffffff",
    borderColor: "#bae6fd",
    accentColor: "#2383e2",
    iconBg: "#e0f2fe",
    iconColor: "#2383e2",
    titleColor: "#075985",
    IconComponent: Info,
  },
} as const;

export function CustomToastCard({
  type,
  text1,
  text2,
  hide,
  onPress,
}: CustomToastCardProps) {
  const theme = TOAST_THEMES[type];
  const { IconComponent } = theme;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      hide();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={handlePress}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        width: "92%",
        maxWidth: 420,
        backgroundColor: theme.bgColor,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: theme.borderColor,
        borderLeftWidth: 5,
        borderLeftColor: theme.accentColor,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "flex-start",
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
      }}
    >
      {/* Icon Badge */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: theme.iconBg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          marginTop: 1,
        }}
      >
        <IconComponent size={20} color={theme.iconColor} strokeWidth={2.4} />
      </View>

      {/* Content: Title & Multi-line Body */}
      <View style={{ flex: 1, marginRight: 8 }}>
        {Boolean(text1) && (
          <Text
            style={{
              fontSize: 15,
              lineHeight: 20,
              fontWeight: "700",
              color: theme.titleColor,
              letterSpacing: -0.2,
              marginBottom: text2 ? 3 : 0,
            }}
          >
            {text1}
          </Text>
        )}
        {Boolean(text2) && (
          <Text
            style={{
              fontSize: 13.5,
              lineHeight: 20,
              fontWeight: "500",
              color: "#334155",
            }}
          >
            {text2}
          </Text>
        )}
      </View>

      {/* Close Action */}
      <TouchableOpacity
        onPress={hide}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        style={{
          padding: 4,
          marginTop: -2,
        }}
      >
        <X size={16} color="#94a3b8" strokeWidth={2.2} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export const toastConfig: ToastConfig = {
  success: ({ text1, text2, hide, onPress }: ToastConfigParams<any>) => (
    <CustomToastCard
      type="success"
      text1={text1}
      text2={text2}
      hide={hide}
      onPress={onPress}
    />
  ),
  error: ({ text1, text2, hide, onPress }: ToastConfigParams<any>) => (
    <CustomToastCard
      type="error"
      text1={text1}
      text2={text2}
      hide={hide}
      onPress={onPress}
    />
  ),
  info: ({ text1, text2, hide, onPress }: ToastConfigParams<any>) => (
    <CustomToastCard
      type="info"
      text1={text1}
      text2={text2}
      hide={hide}
      onPress={onPress}
    />
  ),
};

export default toastConfig;
