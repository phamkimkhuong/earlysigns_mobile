import React, { useCallback, useRef } from "react";
import { WebView } from "react-native-webview";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "PaymentWebView">;

function parsePayosNav(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname || "";
    const params = parsed.searchParams;
    const orderCode = (params.get("orderCode") || params.get("order_code") || "").trim();
    const status = (params.get("status") || "").toUpperCase();
    const cancelled =
      String(params.get("cancel") || "").toLowerCase() === "true" || status === "CANCELLED";
    if (path.includes("/payment/success") || path.includes("/payment/cancel")) {
      return {
        variant: cancelled || path.includes("/cancel") ? "cancel" : "success",
        orderCode,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function PaymentWebViewScreen({ navigation, route }: Props) {
  const url = route?.params?.url;
  const fallbackOrderCode = String(route?.params?.orderCode || "").trim();
  const handledRef = useRef(false);

  const onNav = useCallback(
    (navState: { url: string }) => {
      const hit = parsePayosNav(navState.url);
      if (!hit || handledRef.current) return;
      handledRef.current = true;
      navigation.replace("PaymentResult", {
        ...hit,
        orderCode: hit.orderCode || fallbackOrderCode,
      });
    },
    [navigation, fallbackOrderCode]
  );

  return (
    <WebView
      source={{ uri: url }}
      onNavigationStateChange={onNav}
      startInLoadingState
      className="flex-1"
    />
  );
}
