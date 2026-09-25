import React from "react";
import { ScrollView, Text } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { navigateToTab } from "@/navigation/nav";
import type { RootStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Referral">;

export default function ReferralScreen({ navigation }: Props) {
  const { t } = useTranslation();

  function goProfile(tabAction: "create" | "redeem") {
    navigateToTab(navigation, "Profile", { tab: "account", referral: tabAction } as any);
  }

  return (
    <ScrollView className="flex-1 bg-appBg" contentContainerClassName="p-4 gap-2.5 pb-10">
      <Text className="text-2xl font-extrabold text-appText">{t("referral.pageTitle")}</Text>
      <Text className="text-appTextSecondary leading-[22px]">{t("referral.intro")}</Text>
      <Text className="text-base font-bold text-appText mt-2">{t("referral.stepCreateTitle")}</Text>
      <Text className="text-appTextSecondary leading-[22px]">{t("referral.stepCreateBody")}</Text>
      <Text className="text-base font-bold text-appText mt-2">{t("referral.stepRedeemTitle")}</Text>
      <Text className="text-appTextSecondary leading-[22px]">{t("referral.stepRedeemBody")}</Text>
      <Text className="text-base font-bold text-appText mt-2">{t("referral.rulesTitle")}</Text>
      <Text className="text-appTextSecondary leading-[22px]">• {t("referral.ruleReward")}</Text>
      <Text className="text-appTextSecondary leading-[22px]">• {t("referral.ruleWindow")}</Text>
      <Text className="text-appTextSecondary leading-[22px]">• {t("referral.ruleOnce")}</Text>
      <Text className="text-appTextSecondary leading-[22px]">• {t("referral.ruleTrial")}</Text>
      <PrimaryButton
        title={t("referral.ctaCreate")}
        onPress={() => goProfile("create")}
      />
      <PrimaryButton
        title={t("referral.ctaRedeem")}
        variant="ghost"
        onPress={() => goProfile("redeem")}
      />
    </ScrollView>
  );
}
