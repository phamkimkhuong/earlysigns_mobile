import React from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { ChipButton } from "./PrimaryButton";
import { setStoredLanguage } from "@/core/i18n";
import { useAuth } from "@/services/Auth";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { updateUserLanguage } = useAuth();
  const current = String(i18n.resolvedLanguage || i18n.language || "vi").startsWith("vi")
    ? "vi"
    : "en";

  async function handleChange(lng: "vi" | "en") {
    if (lng !== i18n.language) {
      setStoredLanguage(lng);
      await i18n.changeLanguage(lng);
    }
    try {
      await updateUserLanguage(lng);
    } catch {
      /* keep local language */
    }
  }

  return (
    <View className="flex-row items-center gap-2 flex-wrap">
      <Text className="text-appTextSecondary text-[13px]">{t("language.label")}:</Text>
      <ChipButton
        title={t("language.en")}
        active={current === "en"}
        onPress={() => handleChange("en")}
      />
      <ChipButton
        title={t("language.vi")}
        active={current === "vi"}
        onPress={() => handleChange("vi")}
      />
    </View>
  );
}
