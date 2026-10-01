import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Home,
  User,
  ShieldCheck,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { formatExpiryDate } from "@/utils/errors";
import { billingApi } from "@/api/billingApi";
import { getStoredIapSubscription } from "@/services/iap";
import { navigateToTab } from "@/navigation/nav";
import type { RootStackParamList } from "@/types/navigation";

const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_RETRY_DELAY_MS = 1500;

type Props = NativeStackScreenProps<RootStackParamList, "PaymentResult">;

export default function PaymentResultScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { authToken } = useAuth();

  const variant = route?.params?.variant || "success";
  const orderCode = String(route?.params?.orderCode || "").trim();

  const [status, setStatus] = useState<"idle" | "verifying" | "confirmed" | "pending" | "cancelled">(
    variant === "cancel" ? "cancelled" : "verifying"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const runVerify = useCallback(async () => {
    if (!authToken) {
      setStatus("pending");
      return;
    }

    setStatus("verifying");
    setErrorMessage("");

    // If orderCode exists, poll the verify checkout API
    if (orderCode) {
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
      return;
    }

    // If no orderCode (e.g., Native IAP or direct return)
    // Priority 1: Check active Store IAP subscription (instant confirmation, zero webhook latency)
    const storedIap = getStoredIapSubscription();
    if (storedIap) {
      setSubscriptionExpiresAt(storedIap.expiresAt);
      setStatus("confirmed");
      return;
    }

    // Priority 2: Check current billing usage from Backend
    try {
      const usage = await billingApi.getUsage();
      if (usage?.has_active_subscription) {
        setSubscriptionExpiresAt(usage.subscription_expires_at || null);
        setStatus("confirmed");
      } else {
        setStatus(variant === "cancel" ? "cancelled" : "confirmed");
      }
    } catch {
      setStatus(variant === "cancel" ? "cancelled" : "confirmed");
    }
  }, [authToken, orderCode, variant]);

  useEffect(() => {
    cancelledRef.current = false;
    if (variant === "cancel") {
      setStatus("cancelled");
    } else {
      runVerify();
    }
    return () => {
      cancelledRef.current = true;
    };
  }, [variant, runVerify]);

  const isSuccess = status === "confirmed";
  const isVerifying = status === "verifying";
  const isPending = status === "pending";
  const isCancelled = status === "cancelled";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#1e2538]">
      <ScrollView
        className="flex-1 bg-appBg"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top elastic overscroll filler */}
        <View
          style={{
            position: "absolute",
            top: -1000,
            left: 0,
            right: 0,
            height: 1000,
            backgroundColor: "#1e2538",
          }}
        />

        {/* 1. LUXURY NAVY HERO HEADER */}
        <View className="bg-[#1e2538] pt-6 pb-10 px-5 items-center text-center">
          <View className="mb-4">
            {isSuccess ? (
              <View className="w-16 h-16 rounded-3xl bg-emerald-500 items-center justify-center shadow-lg">
                <CheckCircle2 size={36} color="#ffffff" />
              </View>
            ) : isVerifying ? (
              <View className="w-16 h-16 rounded-3xl bg-indigo-600 items-center justify-center shadow-lg">
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            ) : isPending ? (
              <View className="w-16 h-16 rounded-3xl bg-amber-500 items-center justify-center shadow-lg">
                <Clock size={36} color="#ffffff" />
              </View>
            ) : (
              <View className="w-16 h-16 rounded-3xl bg-rose-500 items-center justify-center shadow-lg">
                <XCircle size={36} color="#ffffff" />
              </View>
            )}
          </View>

          <Text className="text-2xl font-black text-white text-center tracking-tight">
            {isCancelled
              ? t("paymentResult.cancelledTitle") || "Giao dịch đã hủy"
              : isSuccess
                ? t("paymentResult.successTitle") || "Thanh toán thành công!"
                : isPending
                  ? t("paymentResult.pendingTitle") || "Đang xử lý giao dịch"
                  : t("paymentResult.verifyingTitle") || "Đang kiểm tra thanh toán..."}
          </Text>

          <Text className="text-xs text-slate-300 text-center mt-1.5 px-4 leading-relaxed font-medium">
            {isSuccess
              ? "Tài khoản của bạn đã được nâng cấp lên gói EarlySigns Pro. Tất cả đặc quyền và hạn mức không giới hạn đã sẵn sàng!"
              : isPending
                ? "Hệ thống đang đồng bộ kết quả với cổng thanh toán. Quá trình này có thể mất vài phút."
                : isCancelled
                  ? "Bạn đã hủy quá trình thanh toán. Không có khoản tiền nào bị trừ khỏi tài khoản của bạn."
                  : "Vui lòng giữ kết nối mạng trong giây lát khi hệ thống xác thực đơn hàng..."}
          </Text>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-16 gap-4">
          {/* Order Details Receipt Card */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5 shadow-sm">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-row items-center gap-2">
                <Sparkles size={16} color="#4f46e5" />
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Thông tin gói dịch vụ
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: isSuccess ? "#ecfdf5" : isCancelled ? "#fff1f2" : "#fef3c7",
                }}
                className="px-2.5 py-1 rounded-full border border-slate-200"
              >
                <Text
                  style={{
                    color: isSuccess ? "#059669" : isCancelled ? "#e11d48" : "#d97706",
                  }}
                  className="text-[11px] font-black"
                >
                  {isSuccess ? "ĐÃ KÍCH HOẠT" : isCancelled ? "ĐÃ HỦY" : "CHỜ XỬ LÝ"}
                </Text>
              </View>
            </View>

            <View className="gap-2.5">
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-slate-500">Gói đăng ký</Text>
                <Text className="text-xs font-extrabold text-slate-900">EarlySigns Pro</Text>
              </View>

              {orderCode ? (
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-500">Mã đơn hàng</Text>
                  <Text className="text-xs font-mono font-bold text-indigo-600">#{orderCode}</Text>
                </View>
              ) : null}

              {subscriptionExpiresAt ? (
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-500">Thời hạn sử dụng</Text>
                  <Text className="text-xs font-extrabold text-emerald-600">
                    {formatExpiryDate(subscriptionExpiresAt, i18n.language)}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-slate-500">Hạn mức AI</Text>
                <Text className="text-xs font-extrabold text-slate-900">Không giới hạn</Text>
              </View>
            </View>

            {isSuccess && (
              <View className="mt-2 bg-emerald-50 rounded-2xl p-3 border border-emerald-100 flex-row items-center gap-2">
                <ShieldCheck size={18} color="#059669" />
                <Text className="flex-1 text-[11px] text-emerald-800 leading-snug font-medium">
                  Toàn bộ 44 âm IPA, bài tập sàng lọc chuyên sâu và chẩn đoán dạng sóng âm học đã được mở khóa!
                </Text>
              </View>
            )}

            {errorMessage ? (
              <View className="mt-1 bg-rose-50 rounded-2xl p-3 border border-rose-200">
                <Text className="text-xs text-rose-700 leading-snug">{errorMessage}</Text>
              </View>
            ) : null}
          </View>

          {/* Action CTAs */}
          <View className="gap-3 mt-1">
            {isSuccess ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("Phonemes")}
                  className="w-full py-4 px-5 rounded-2xl bg-indigo-600 flex-row items-center justify-center gap-2 shadow-sm"
                >
                  <Text className="text-sm font-bold text-white">
                    Bắt đầu luyện tập ngay
                  </Text>
                  <ArrowRight size={18} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigateToTab(navigation, "Profile")}
                  className="w-full py-3.5 px-5 rounded-2xl bg-white border border-slate-200 flex-row items-center justify-center gap-2"
                >
                  <User size={16} color="#334155" />
                  <Text className="text-xs font-bold text-slate-700">
                    {t("paymentResult.goToProfile") || "Xem Trang cá nhân & Hạn mức"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : isVerifying ? (
              <View className="items-center py-4">
                <Text className="text-xs text-slate-500">
                  Đang đồng bộ dữ liệu giao dịch...
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.replace("Payment")}
                  className="w-full py-4 px-5 rounded-2xl bg-indigo-600 flex-row items-center justify-center gap-2 shadow-sm"
                >
                  <RefreshCw size={16} color="#ffffff" />
                  <Text className="text-sm font-bold text-white">
                    Thử lại thanh toán
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigateToTab(navigation, "Home")}
                  className="w-full py-3.5 px-5 rounded-2xl bg-white border border-slate-200 flex-row items-center justify-center gap-2"
                >
                  <Home size={16} color="#334155" />
                  <Text className="text-xs font-bold text-slate-700">
                    Về trang chủ
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
