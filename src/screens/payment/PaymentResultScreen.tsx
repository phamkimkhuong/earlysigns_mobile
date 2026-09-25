import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "@/services/Auth";
import { formatExpiryDate } from "@/utils/errors";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { billingApi } from "@/api";
import { navigateToTab } from "@/navigation/nav";
import type { RootStackParamList } from "@/types/navigation";

const MAX_VERIFY_ATTEMPTS = 4;
const VERIFY_RETRY_DELAY_MS = 1500;

type Props = NativeStackScreenProps<RootStackParamList, "PaymentResult">;

export default function PaymentResultScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { authToken } = useAuth();
  const variant = route?.params?.variant || "success";
  const orderCode = String(route?.params?.orderCode || "").trim();
  const [status, setStatus] = useState(variant === "cancel" ? "cancelled" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const runVerify = useCallback(async () => {
    if (!authToken || !orderCode) return;
    setStatus("verifying");
    for (let attempt = 0; attempt < MAX_VERIFY_ATTEMPTS; attempt += 1) {
      if (cancelledRef.current) return;
      try {
        const data = await billingApi.verifyCheckout(orderCode);
        if (data.confirmed || data.subscription_expires_at) {
          setSubscriptionExpiresAt(data.subscription_expires_at || null);
          setStatus("confirmed");
          return;
        }
      } catch (e: any) {
        setErrorMessage(String(e.message || e));
      }
      await new Promise((r) => setTimeout(r, VERIFY_RETRY_DELAY_MS));
    }
    setStatus("pending");
  }, [authToken, orderCode]);

  useEffect(() => {
    cancelledRef.current = false;
    if (variant !== "cancel") runVerify();
    return () => {
      cancelledRef.current = true;
    };
  }, [variant, runVerify]);

  return (
    <View className="flex-1 bg-appBg p-5 gap-3 justify-center">
      <Text className="text-2xl font-extrabold text-appText text-center">
        {status === "cancelled"
          ? t("paymentResult.cancelledTitle")
          : status === "confirmed"
            ? t("paymentResult.successTitle")
            : status === "pending"
              ? t("paymentResult.pendingTitle")
              : t("paymentResult.verifyingTitle")}
      </Text>
      {subscriptionExpiresAt ? (
        <Text className="text-appTextSecondary text-center">{formatExpiryDate(subscriptionExpiresAt, i18n.language)}</Text>
      ) : null}
      {errorMessage ? <Text className="text-danger text-center">{errorMessage}</Text> : null}
      <PrimaryButton title={t("nav.videos")} onPress={() => navigateToTab(navigation, "Videos")} />
      <PrimaryButton
        title={t("paymentResult.goToProfile")}
        variant="ghost"
        onPress={() => navigateToTab(navigation, "Profile")}
      />
    </View>
  );
}
