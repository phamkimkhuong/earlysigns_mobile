import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  CheckCircle2,
  Clock,
  Crown,
  XCircle,
  ArrowRight,
  RefreshCw,
  Home,
  User,
  ShieldCheck,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { formatExpiryDate } from "@/utils/errors";
import { billingApi } from "@/api/billingApi";
import { getVerifiedActiveProEntitlement } from "@/services/iap";
import { navigateToTab } from "@/navigation/nav";
import { AppText } from "@/components/ui/AppText";
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
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | number | null>(null);
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
    // Priority 1: Check verified active Store IAP subscription (RevenueCat CustomerInfo)
    const verifiedPro = await getVerifiedActiveProEntitlement();
    if (verifiedPro && verifiedPro.active) {
      setSubscriptionExpiresAt(verifiedPro.expiresAt || null);
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
        <View className="bg-[#1e2538] pt-6 pb-10 px-5 items-center">
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

          <AppText className="text-2xl font-black text-white text-center tracking-tight">
            {isCancelled
              ? t("paymentResult.cancelledTitle") || "Giao dịch đã hủy"
              : isSuccess
                ? t("paymentResult.successTitle") || "Thanh toán thành công!"
                : isPending
                  ? t("paymentResult.pendingTitle") || "Đang xử lý giao dịch"
                  : t("paymentResult.verifyingTitle") || "Đang kiểm tra thanh toán..."}
          </AppText>

          <AppText className="text-[13px] text-slate-300 text-center mt-1.5 px-4 leading-relaxed font-medium">
            {isSuccess
              ? (t("paymentResult.successDesc") || "Tài khoản của bạn đã được nâng cấp lên gói EarlySigns Pro. Tất cả đặc quyền và hạn mức không giới hạn đã sẵn sàng!")
              : isPending
                ? (t("paymentResult.pendingDesc") || "Hệ thống đang đồng bộ kết quả với cổng thanh toán. Quá trình này có thể mất vài phút.")
                : isCancelled
                  ? (t("paymentResult.cancelledDesc") || "Bạn đã hủy quá trình thanh toán. Không có khoản tiền nào bị trừ khỏi tài khoản của bạn.")
                  : (t("paymentResult.verifyingDesc") || "Vui lòng giữ kết nối mạng trong giây lát khi hệ thống xác thực đơn hàng...")}
          </AppText>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-16 gap-4">
          {/* Order Details Receipt Card */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5 shadow-xs">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-row items-center gap-2">
                <Crown size={16} color="#4f46e5" />
                <AppText className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("paymentResult.packageInfo", "Thông tin gói dịch vụ")}
                </AppText>
              </View>
              <View
                style={{
                  backgroundColor: isSuccess ? "#ecfdf5" : isCancelled ? "#fff1f2" : "#fef3c7",
                }}
                className="px-2.5 py-1 rounded-full border border-slate-200 shrink-0"
              >
                <AppText
                  numberOfLines={1}
                  style={{
                    color: isSuccess ? "#059669" : isCancelled ? "#e11d48" : "#d97706",
                  }}
                  className="text-xs font-black uppercase"
                >
                  {isSuccess
                    ? (t("paymentResult.statusActivated", "ĐÃ KÍCH HOẠT"))
                    : isCancelled
                      ? (t("paymentResult.statusCancelled", "ĐÃ HỦY"))
                      : (t("paymentResult.statusPending", "CHỜ XỬ LÝ"))}
                </AppText>
              </View>
            </View>

            <View className="gap-2.5">
              <View className="flex-row justify-between items-center">
                <AppText className="text-xs text-slate-500">
                  {t("paymentResult.subscriptionPackage", "Gói đăng ký")}
                </AppText>
                <AppText className="text-xs font-extrabold text-slate-900">
                  {t("paymentResult.planName", "EarlySigns Pro")}
                </AppText>
              </View>

              {orderCode ? (
                <View className="flex-row justify-between items-center">
                  <AppText className="text-xs text-slate-500">
                    {t("paymentResult.orderCode", "Mã đơn hàng")}
                  </AppText>
                  <AppText className="text-xs font-mono font-bold text-indigo-600">#{orderCode}</AppText>
                </View>
              ) : null}

              {subscriptionExpiresAt ? (
                <View className="flex-row justify-between items-center">
                  <AppText className="text-xs text-slate-500">
                    {t("paymentResult.expiryDate", "Thời hạn sử dụng")}
                  </AppText>
                  <AppText className="text-xs font-extrabold text-emerald-600">
                    {formatExpiryDate(subscriptionExpiresAt, i18n.language)}
                  </AppText>
                </View>
              ) : null}

              <View className="flex-row justify-between items-center">
                <AppText className="text-xs text-slate-500">
                  {t("paymentResult.aiQuota", "Hạn mức AI")}
                </AppText>
                <AppText className="text-xs font-extrabold text-slate-900">
                  {t("paymentResult.unlimited", "Không giới hạn")}
                </AppText>
              </View>
            </View>

            {isSuccess && (
              <View className="mt-2 bg-emerald-50 rounded-2xl p-3 border border-emerald-100 flex-row items-center gap-2">
                <ShieldCheck size={18} color="#059669" />
                <AppText className="flex-1 text-xs text-emerald-800 leading-snug font-medium">
                  {t("paymentResult.featuresUnlocked", "Toàn bộ 44 âm IPA, bài tập sàng lọc chuyên sâu và chẩn đoán dạng sóng âm học đã được mở khóa!")}
                </AppText>
              </View>
            )}

            {errorMessage ? (
              <View className="mt-1 bg-rose-50 rounded-2xl p-3 border border-rose-200">
                <AppText className="text-xs text-rose-700 leading-snug">{errorMessage}</AppText>
              </View>
            ) : null}
          </View>

          {/* Action CTAs */}
          <View className="gap-3 mt-1">
            {isSuccess ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("paymentResult.startPracticeNow", "Bắt đầu luyện tập ngay")}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("Phonemes")}
                  className="w-full py-4 px-5 rounded-2xl bg-indigo-600 flex-row items-center justify-center gap-2 shadow-xs"
                >
                  <AppText className="text-sm font-bold text-white">
                    {t("paymentResult.startPracticeNow", "Bắt đầu luyện tập ngay")}
                  </AppText>
                  <ArrowRight size={18} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("paymentResult.goToProfile") || "Xem Trang cá nhân & Hạn mức"}
                  activeOpacity={0.8}
                  onPress={() => navigateToTab(navigation, "Profile")}
                  className="w-full py-3.5 px-5 rounded-2xl bg-white border border-slate-200 flex-row items-center justify-center gap-2"
                >
                  <User size={16} color="#334155" />
                  <AppText className="text-sm font-bold text-slate-700">
                    {t("paymentResult.goToProfile") || "Xem Trang cá nhân & Hạn mức"}
                  </AppText>
                </TouchableOpacity>
              </>
            ) : isVerifying ? (
              <View className="items-center py-4">
                <AppText className="text-xs text-slate-500">
                  {t("paymentResult.syncingData", "Đang đồng bộ dữ liệu giao dịch...")}
                </AppText>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("paymentResult.retryPayment", "Thử lại thanh toán")}
                  activeOpacity={0.8}
                  onPress={() => navigation.replace("Payment")}
                  className="w-full py-4 px-5 rounded-2xl bg-indigo-600 flex-row items-center justify-center gap-2 shadow-xs"
                >
                  <RefreshCw size={16} color="#ffffff" />
                  <AppText className="text-sm font-bold text-white">
                    {t("paymentResult.retryPayment", "Thử lại thanh toán")}
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("paymentResult.backToHome", "Về trang chủ")}
                  activeOpacity={0.8}
                  onPress={() => navigateToTab(navigation, "Home")}
                  className="w-full py-3.5 px-5 rounded-2xl bg-white border border-slate-200 flex-row items-center justify-center gap-2"
                >
                  <Home size={16} color="#334155" />
                  <AppText className="text-sm font-bold text-slate-700">
                    {t("paymentResult.backToHome", "Về trang chủ")}
                  </AppText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
