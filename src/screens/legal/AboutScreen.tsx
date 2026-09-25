import React from "react";
import { Image, Linking, ScrollView, Text } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import PrimaryButton from "@/components/ui/PrimaryButton";
import type { RootStackParamList } from "@/types/navigation";

const PHONE = "0383064632";
const EMAIL = "support@earlysigns.net";
const ZALO_URL = "https://zalo.me/0383064632";

type Props = NativeStackScreenProps<RootStackParamList, "About">;

export default function AboutScreen({ navigation }: Props) {
  const { t } = useTranslation();
  return (
    <ScrollView className="flex-1 bg-appBg" contentContainerClassName="p-4 gap-2.5 pb-10 items-stretch">
      <Image source={require("@assets/logo.png")} className="w-[72px] h-[72px] rounded-2xl self-center" />
      <Text className="text-2xl font-extrabold text-appText text-center">{t("app.title")}</Text>
      <Text className="text-appTextSecondary leading-[22px] text-center">{t("app.subtitle")}</Text>
      <LanguageSwitcher />
      <PrimaryButton title={t("footer.termsOfUse")} variant="ghost" onPress={() => navigation.navigate("Terms")} />
      <PrimaryButton title={t("footer.privacyPolicy")} variant="ghost" onPress={() => navigation.navigate("Privacy")} />
      <PrimaryButton title={t("referral.pageTitle")} variant="ghost" onPress={() => navigation.navigate("Referral")} />
      <PrimaryButton title={EMAIL} variant="ghost" onPress={() => Linking.openURL(`mailto:${EMAIL}`)} />
      <PrimaryButton title={PHONE} variant="ghost" onPress={() => Linking.openURL(`tel:${PHONE}`)} />
      <PrimaryButton title="Zalo" variant="ghost" onPress={() => Linking.openURL(ZALO_URL)} />
      <Text className="text-appTextSecondary leading-[22px] text-center">{t("footer.companyLegalName")}</Text>
      <Text className="text-appTextSecondary leading-[22px] text-center">{t("footer.headquartersAddress")}</Text>
    </ScrollView>
  );
}
