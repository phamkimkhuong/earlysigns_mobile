import React from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { Dialect } from "@/types";

export interface DialectToggleProps {
  value?: Dialect | string;
  onChange?: (dialect: Dialect) => void;
  disabled?: boolean;
  saving?: boolean;
}

export default function DialectToggle({
  saving,
}: DialectToggleProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-2 flex-wrap">
      <Text className="text-appTextSecondary text-[13px] font-semibold">
        {t("profile.accentTitle")}
      </Text>
      <View className="bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 flex-row items-center gap-1.5">
        <View className="w-2 h-2 rounded-full bg-indigo-600" />
        <Text className="text-xs font-bold text-indigo-600">
          {t("profile.accentUk")}
        </Text>
      </View>
      {saving ? (
        <Text className="text-appTextMuted text-[12px]">
          {t("profile.accentSaving")}
        </Text>
      ) : null}
    </View>
  );
}
