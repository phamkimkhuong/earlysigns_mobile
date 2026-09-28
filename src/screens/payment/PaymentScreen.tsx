import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { customAlert } from "@/utils/customAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AudioLines,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Crown,
  ExternalLink,
  Gift,
  Mic,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { showToast } from "@/utils/toast";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { billingApi } from "@/api";
import { useBillingStore } from "@/store/useBillingStore";
import { resolveUserTier } from "@/services/usageLimits";
import {
  STORE_PRODUCTS,
  openManageSubscriptions,
  purchaseStoreProduct,
  restoreStorePurchases,
  type StoreProduct,
} from "@/services/iap";
import { getFriendlyErrorMessage } from "@/core/errorManager";
import type { RootStackParamList } from "@/types/navigation";

const PRO_BENEFITS = [
  "Luyện phát âm không giới hạn số câu mỗi ngày",
  "Chấm điểm chi tiết theo 44 âm IPA chuẩn quốc tế",
  "Quét văn bản qua camera / ảnh (OCR) không giới hạn",
  "Lộ trình học tập thích ứng tự động cập nhật theo âm yếu",
];

type Props = NativeStackScreenProps<RootStackParamList, "Payment">;

export default function PaymentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { authToken } = useAuth();
  const usage = useBillingStore((s) => s.usage);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    route?.params?.packageId && STORE_PRODUCTS.some((p) => p.id === route.params?.packageId)
      ? route.params.packageId
      : STORE_PRODUCTS[2]?.id || STORE_PRODUCTS[0]?.id
  );

  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  // Activation Code section state
  const [showActivation, setShowActivation] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) {
      navigation.navigate("Login", { next: "Payment" });
    }
  }, [authToken, navigation]);

  const userTier = useMemo(
    () =>
      resolveUserTier({
        authToken,
        hasActiveSubscription: Boolean(usage?.has_active_subscription),
        isInTrial: Boolean(usage?.is_in_trial),
      }),
    [authToken, usage]
  );
  const isPro = userTier === "pro";
  const isTrial = userTier === "trial";

  const selectedProduct: StoreProduct | undefined = useMemo(
    () => STORE_PRODUCTS.find((p) => p.id === selectedProductId) || STORE_PRODUCTS[0],
    [selectedProductId]
  );

  // Store Purchase action
  async function handleStorePurchase() {
    if (!selectedProductId) return;
    setPurchaseError("");
    setPurchasing(true);

    try {
      const res = await purchaseStoreProduct(selectedProductId, { authToken });

      if (res.success) {
        showToast.success(
          t("payment.successTitle") || "Nâng cấp Pro thành công!",
          t("payment.successMessage", { product: selectedProduct?.name }) || "Bạn đã mở khóa toàn bộ quyền lợi EarlySigns Pro."
        );
        navigation.navigate("PaymentResult", {
          variant: "success",
          status: "confirmed",
        });
      } else {
        setPurchaseError(res.error || t("payment.transactionFailed") || "Giao dịch không thành công.");
      }
    } catch (err: any) {
      setPurchaseError(getFriendlyErrorMessage(err, t("payment.transactionFailed") || "Giao dịch không thành công."));
    } finally {
      setPurchasing(false);
    }
  }


  // Redeem Gift / Activation code
  async function handleActivateCode() {
    const trimmed = activationCode.trim().toUpperCase();
    if (!trimmed) return;
    setPurchaseError("");
    setActivationSuccess(null);
    setActivating(true);

    try {
      await billingApi.activateCode(trimmed);
      setActivationSuccess(t("payment.activateSuccessMsg") || "Mã kích hoạt hợp lệ. Gói Pro đã được áp dụng.");
      setActivationCode("");
      showToast.success(
        t("payment.activateSuccess") || "Kích hoạt thành công!",
        t("payment.activateSuccessMsg") || "Chúc mừng bạn đã nâng cấp EarlySigns Pro."
      );
    } catch (err: any) {
      setPurchaseError(getFriendlyErrorMessage(err, t("activation.error") || "Mã kích hoạt không hợp lệ."));
    } finally {
      setActivating(false);
    }
  }

  const storeCtaText =
    Platform.OS === "ios"
      ? (t("payment.ctaApple") || "Đăng ký qua App Store")
      : Platform.OS === "android"
        ? (t("payment.ctaGoogle") || "Đăng ký qua Google Play")
        : (t("payment.ctaDefault") || "Đăng ký gói Pro");

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#0a2644]">
      {/* 1. TOP NAVIGATION BAR */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-[#0a2644]">
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Main");
            }
          }}
          className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center active:opacity-75"
        >
          <ChevronLeft size={22} color="#ffffff" />
        </TouchableOpacity>

        <Text className="text-base font-extrabold text-white">
          Gói dịch vụ & Hạn mức
        </Text>

        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1 bg-[#f8fafc]"
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. HERO STATUS HEADER (DEEP NAVY) */}
        <View className="bg-[#0a2644] px-5 pt-2 pb-8 gap-3 items-center">
          <View
            style={{ backgroundColor: isPro ? "#f59e0b" : "#0284c7" }}
            className="w-16 h-16 rounded-3xl items-center justify-center shadow-md mb-1"
          >
            <Crown size={32} color="#ffffff" strokeWidth={2.4} />
          </View>

          <View className="items-center gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-black text-white text-center">
                {isPro ? "EarlySigns Pro" : isTrial ? "Dùng thử EarlySigns Pro" : "Nâng cấp EarlySigns Pro"}
              </Text>
            </View>
            <Text className="text-xs text-slate-300 text-center px-4 leading-relaxed">
              {isPro
                ? "Bạn đang tận hưởng trọn vẹn quyền lợi không giới hạn của EarlySigns Pro."
                : "Mở khóa toàn diện tiềm năng phát âm tiếng Anh chuẩn bản xứ không giới hạn lượt luyện."}
            </Text>
          </View>

          {/* Status Badge */}
          <View
            style={{
              backgroundColor: isPro ? "rgba(245, 158, 11, 0.2)" : "rgba(2, 132, 199, 0.2)",
              borderColor: isPro ? "#f59e0b" : "#38bdf8",
            }}
            className="px-3.5 py-1 rounded-full border flex-row items-center gap-1.5 mt-1"
          >
            <Sparkles size={12} color={isPro ? "#f59e0b" : "#38bdf8"} />
            <Text
              style={{ color: isPro ? "#fbbf24" : "#38bdf8" }}
              className="text-2xs font-extrabold uppercase tracking-wider"
            >
              {isPro
                ? "Thành viên Pro Đang Hoạt Động"
                : isTrial
                  ? "Đang trong thời gian Dùng thử"
                  : "Hạn mức Miễn phí (Free Tier)"}
            </Text>
          </View>
        </View>

        {/* 3. CONTENT CANVAS */}
        <View className="px-4 -mt-4 gap-4">
          {/* A. CURRENT QUOTA & PLAN CARD */}
          <View
            style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
            className="rounded-3xl p-5 border shadow-sm gap-3.5"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Trạng thái tài khoản
                </Text>
                <View
                  style={{
                    backgroundColor: isPro ? "#ecfdf5" : "#f1f5f9",
                    borderColor: isPro ? "#a7f3d0" : "#cbd5e1",
                  }}
                  className="px-2.5 py-0.5 rounded-full border"
                >
                  <Text
                    style={{ color: isPro ? "#059669" : "#475569" }}
                    className="text-xs font-bold"
                  >
                    {isPro ? "Không giới hạn" : "Miễn phí"}
                  </Text>
                </View>
              </View>
            </View>

            {isPro ? (
              /* PRO ACTIVE DETAILS */
              <View className="gap-2.5 pt-1">
                <View className="flex-row items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <View className="flex-row items-center gap-2">
                    <Clock size={16} color="#0284c7" />
                    <Text className="text-xs font-medium text-slate-700">Ngày hết hạn / gia hạn:</Text>
                  </View>
                  <Text className="text-xs font-bold text-[#0f172a]">
                    {usage?.subscription_expires_at
                      ? String(usage.subscription_expires_at).slice(0, 10)
                      : "Tự động gia hạn"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={openManageSubscriptions}
                  style={{ backgroundColor: "#0f172a" }}
                  className="flex-row items-center justify-center gap-2 py-3 rounded-2xl active:opacity-85 shadow-sm"
                >
                  <ExternalLink size={14} color="#ffffff" />
                  <Text className="text-xs font-bold text-white">
                    Quản lý thuê bao trên Cửa hàng ứng dụng
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* FREE TIER SHARED AI QUOTA */
              <View className="gap-3 pt-1">
                {/* Metric: Hạn mức AI dùng chung */}
                <View className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Sparkles size={16} color="#0284c7" />
                      <Text className="text-sm font-bold text-slate-800">
                        {t("payment.freeQuotaSharedTitle") || "Hạn mức AI dùng chung hôm nay"}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-[#0f172a]">
                      {usage?.daily_remaining != null ? `${usage.daily_remaining}/20 lượt` : "20 lượt/ngày"}
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <View
                      style={{
                        width: `${Math.min(100, Math.max(8, ((usage?.daily_remaining ?? 20) / 20) * 100))}%`,
                        backgroundColor: (usage?.daily_remaining ?? 20) <= 3 ? "#f59e0b" : "#0284c7",
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                </View>
                <View className="pt-1 flex-row items-center gap-1.5">
                  <Clock size={13} color="#64748b" />
                  <Text className="text-xs font-medium text-slate-500">
                    {t("payment.freeQuotaSharedNote") || "Tự động làm mới 20 lượt vào lúc 00:00 mỗi ngày."}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* B. PRO BENEFITS CARD */}
          <View
            style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
            className="rounded-3xl p-5 border shadow-sm gap-3"
          >
            <View className="flex-row items-center justify-between">
              <Text style={{ color: "#0284c7" }} className="text-xs font-extrabold uppercase tracking-wider">
                Quyền lợi vượt trội của gói Pro
              </Text>
              <View style={{ backgroundColor: "#e0f2fe" }} className="px-2.5 py-0.5 rounded-full">
                <Text style={{ color: "#0284c7" }} className="text-xs font-bold">
                  Không giới hạn
                </Text>
              </View>
            </View>

            <View className="gap-2.5 pt-0.5">
              {PRO_BENEFITS.map((benefit, index) => (
                <View key={index} className="flex-row items-center gap-2.5">
                  <View
                    style={{ backgroundColor: "#ecfdf5" }}
                    className="w-5 h-5 rounded-full items-center justify-center"
                  >
                    <CheckCircle2 size={13} color="#059669" />
                  </View>
                  <Text className="text-xs font-semibold text-slate-800 flex-1">
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* C. SUBSCRIPTION PACKAGES SELECTOR */}
          <View className="gap-3">
            <Text className="text-sm font-bold text-slate-900 px-1">
              Chọn gói đăng ký phù hợp
            </Text>

            {STORE_PRODUCTS.map((prod) => {
              const isSelected = prod.id === selectedProductId;

              return (
                <TouchableOpacity
                  key={prod.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedProductId(prod.id)}
                  style={{
                    backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                    borderColor: isSelected ? "#0284c7" : "#e2e8f0",
                    borderWidth: isSelected ? 2 : 1,
                  }}
                  className="relative p-4 rounded-3xl shadow-sm"
                >
                  {/* Savings / Best Value Badge */}
                  {prod.savingsBadge ? (
                    <View
                      style={{ backgroundColor: "#f59e0b" }}
                      className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full z-10 flex-row items-center gap-1 shadow-sm"
                    >
                      <Crown size={10} color="#ffffff" strokeWidth={2.5} />
                      <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                        {prod.savingsBadge}
                      </Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center justify-between">
                    {/* Left: Radio Indicator + Plan Title */}
                    <View className="flex-row items-center flex-1 pr-2">
                      <View
                        style={{
                          borderColor: isSelected ? "#0284c7" : "#cbd5e1",
                        }}
                        className="w-5 h-5 rounded-full border-2 items-center justify-center mr-3 bg-white"
                      >
                        {isSelected ? (
                          <View
                            style={{ backgroundColor: "#0284c7" }}
                            className="w-2.5 h-2.5 rounded-full"
                          />
                        ) : null}
                      </View>

                      <View className="flex-1">
                        <Text
                          style={{ color: isSelected ? "#0c2340" : "#1e293b" }}
                          className="text-sm font-black"
                        >
                          {prod.name}
                        </Text>
                        <View className="flex-row items-baseline gap-1 mt-0.5">
                          <Text style={{ color: "#0284c7" }} className="text-base font-black">
                            {prod.monthlyEquivalent.split("/")[0]?.trim() || prod.monthlyEquivalent}
                          </Text>
                          <Text className="text-2xs font-medium text-slate-500">
                            /tháng
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Right: Total Price */}
                    <View className="items-end pl-2">
                      <Text className="text-sm font-extrabold text-slate-900">
                        {prod.priceDisplay}
                      </Text>
                      <Text className="text-2xs text-slate-400 line-through mt-0.5">
                        {prod.originalPriceVnd.toLocaleString("vi-VN")} đ
                      </Text>
                      <Text className="text-[10px] text-slate-400 mt-0.5">
                        {prod.months === 12
                          ? "Thanh toán 1 năm"
                          : prod.months === 3
                            ? "Thanh toán 3 tháng"
                            : "Thanh toán từng tháng"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Error Message */}
          {purchaseError ? (
            <View
              style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
              className="p-3.5 border rounded-2xl"
            >
              <Text className="text-xs text-rose-600 leading-relaxed font-medium">
                {purchaseError}
              </Text>
            </View>
          ) : null}

          {/* Purchase CTA Button */}
          <View className="gap-2.5 pt-1">
            <PrimaryButton
              title={purchasing ? "Đang xử lý giao dịch..." : storeCtaText}
              loading={purchasing}
              variant="primary"
              onPress={handleStorePurchase}
            />

            <Text className="text-xs text-slate-500 text-center font-medium">
              Thanh toán an toàn bảo mật qua Store. Hủy bất kỳ lúc nào trong Cài đặt thiết bị.
            </Text>

            {/* Store Compliance Utilities */}
            <View className="flex-row justify-center items-center px-1 pt-1">
              <TouchableOpacity
                onPress={openManageSubscriptions}
                className="flex-row items-center gap-1.5 py-1"
              >
                <ExternalLink size={13} color="#64748b" />
                <Text className="text-xs text-slate-500 font-medium">
                  Quản lý gói cước trên Cửa hàng ứng dụng
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* D. ACTIVATION CODE / GIFT CODE ACCORDION */}
          <View
            style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
            className="rounded-3xl border overflow-hidden shadow-sm"
          >
            <TouchableOpacity
              className="p-4 flex-row items-center justify-between"
              onPress={() => setShowActivation(!showActivation)}
            >
              <View className="flex-row items-center gap-2.5">
                <View
                  style={{ backgroundColor: "#fef3c7" }}
                  className="w-8 h-8 rounded-xl items-center justify-center"
                >
                  <Gift size={16} color="#d97706" />
                </View>
                <Text className="text-xs font-semibold text-slate-800">
                  Bạn có mã quà tặng hoặc mã kích hoạt?
                </Text>
              </View>
              {showActivation ? (
                <ChevronUp size={16} color="#94a3b8" />
              ) : (
                <ChevronDown size={16} color="#94a3b8" />
              )}
            </TouchableOpacity>

            {showActivation ? (
              <View className="p-4 pt-0 gap-3 border-t border-slate-100">
                <TextInput
                  style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
                  className="border rounded-2xl p-3 text-slate-900 text-xs uppercase font-bold"
                  value={activationCode}
                  onChangeText={setActivationCode}
                  placeholder="Nhập mã kích hoạt của bạn (VD: PRO2026)"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                />
                <PrimaryButton
                  title={activating ? "Đang áp dụng mã..." : "Áp dụng mã kích hoạt"}
                  loading={activating}
                  variant="ghost"
                  onPress={handleActivateCode}
                />
                {activationSuccess ? (
                  <Text className="text-xs text-emerald-600 font-medium">{activationSuccess}</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* E. LEGAL & STORE COMPLIANCE (Apple Guideline 3.1.2) */}
          <View className="gap-2 pt-2 px-1">
            <View className="flex-row items-center gap-1.5">
              <ShieldCheck size={14} color="#94a3b8" />
              <Text className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                Điều khoản đăng ký tự động gia hạn
              </Text>
            </View>
            <Text className="text-2xs text-slate-400 leading-relaxed">
              Gói đăng ký sẽ tự động gia hạn theo chu kỳ đã chọn trừ khi bạn hủy ít nhất 24 giờ trước khi chu kỳ hiện tại kết thúc. Bạn có thể quản lý hoặc hủy đăng ký bất kỳ lúc nào trong phần Cài đặt tài khoản App Store / Google Play.
            </Text>

            <View className="flex-row justify-center gap-4 pt-1">
              <TouchableOpacity onPress={() => navigation.navigate("Terms")}>
                <Text style={{ color: "#0284c7" }} className="text-2xs underline font-medium">
                  Điều khoản sử dụng
                </Text>
              </TouchableOpacity>
              <Text className="text-2xs text-slate-300">·</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Privacy")}>
                <Text style={{ color: "#0284c7" }} className="text-2xs underline font-medium">
                  Chính sách bảo mật
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
