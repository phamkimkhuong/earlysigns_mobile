import React, { useEffect } from "react";
import { Linking, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { AppText } from "@/components/ui/AppText";
import type { RootStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PaymentWebView">;

export default function PaymentWebViewScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const url = route?.params?.url;
  const orderCode = String(route?.params?.orderCode || "").trim();

  useEffect(() => {
    if (url) Linking.openURL(url).catch(() => {});
  }, [url]);

  return (
    <View className="flex-1 bg-appBg p-5 gap-3 justify-center">
      <AppText className="text-[22px] font-extrabold text-appText text-center">{t("package.buyWithPayOS")}</AppText>
      <AppText className="text-appTextSecondary text-center leading-[22px]">
        PayOS checkout opens in the browser on web. After paying, return here to verify the order.
      </AppText>
      {orderCode ? <AppText className="text-accent font-bold text-center tracking-widest">{orderCode}</AppText> : null}
      <PrimaryButton
        title={t("paymentResult.verifyingTitle")}
        onPress={() =>
          navigation.replace("PaymentResult", { variant: "success", orderCode } as any)
        }
      />
      <PrimaryButton
        title={t("paymentResult.cancelledTitle")}
        variant="ghost"
        onPress={() => navigation.replace("PaymentResult", { variant: "cancel", orderCode } as any)}
      />
    </View>
  );
}
