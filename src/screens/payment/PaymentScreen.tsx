import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Crown,
  ExternalLink,
  Gift,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { showToast } from "@/utils/toast";
import { customAlert } from "@/utils/customAlert";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { billingApi } from "@/api";
import { useBillingStore } from "@/store/useBillingStore";
import { resolveUserTier } from "@/services/usageLimits";
import {
  openManageSubscriptions,
  purchaseStoreProduct,
  restoreStorePurchases,
  getStoreOfferingsProducts,
  presentRevenueCatCustomerCenter,
  type StoreProduct,
} from "@/services/iap";
import { getFriendlyErrorMessage } from "@/core/errorManager";
import type { RootStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Payment">;

export default function PaymentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { authToken } = useAuth();
  const usage = useBillingStore((s) => s.usage);

  const proBenefits = useMemo(
    () => [
      t("payment.benefits.b1") || "Luyện phát âm không giới hạn số câu mỗi ngày",
      t("payment.benefits.b2") || "Chấm điểm chi tiết theo 44 âm IPA chuẩn quốc tế",
      t("payment.benefits.b3") || "Quét văn bản qua camera / ảnh (OCR) không giới hạn",
      t("payment.benefits.b4") || "Lộ trình học tập thích ứng tự động cập nhật theo âm yếu",
    ],
    [t]
  );

  // Exclusively fetch dynamic packages directly from RevenueCat Offerings (100% accurate localized Store prices)
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);

  const loadStorePackages = useCallback(async () => {
    setIsLoadingStore(true);
    try {
      const prods = await getStoreOfferingsProducts();
      setProducts(prods);
    } catch {
      /* ignore */
    } finally {
      setIsLoadingStore(false);
    }
  }, []);

  useEffect(() => {
    loadStorePackages();
  }, [loadStorePackages]);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    route?.params?.packageId || ""
  );

  // Sync selectedProductId with loaded dynamic packages
  useEffect(() => {
    if (!products || products.length === 0) return;

    if (selectedProductId && products.some((p) => p.id === selectedProductId)) {
      return;
    }

    if (route?.params?.packageId && products.some((p) => p.id === route.params?.packageId)) {
      setSelectedProductId(route.params.packageId);
      return;
    }

    const defaultProduct =
      products.find((p) => p.popular || p.months === 12) ||
      products[products.length - 1] ||
      products[0];

    if (defaultProduct) {
      setSelectedProductId(defaultProduct.id);
    }
  }, [products, route?.params?.packageId, selectedProductId]);

  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [restoring, setRestoring] = useState(false);

  // Activation Code section state
  const [showActivation, setShowActivation] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState("");
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  // Targeted Scroll State (Senior UX Practice: auto-scroll to input above keyboard)
  const scrollViewRef = useRef<ScrollView>(null);
  const activationCardYRef = useRef<number>(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height || 0;
      setKeyboardHeight(h);

      if (activationCardYRef.current > 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, activationCardYRef.current - 16),
            animated: true,
          });
        }, Platform.OS === "android" ? 100 : 30);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleInputFocus = useCallback(() => {
    if (activationCardYRef.current > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, activationCardYRef.current - 16),
          animated: true,
        });
      }, Platform.OS === "android" ? 120 : 50);
    }
  }, []);

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

  const selectedProduct: StoreProduct | undefined = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  // Store Purchase action
  async function handleStorePurchase() {
    if (!selectedProductId) return;
    setPurchaseError("");
    setPurchasing(true);

    try {
      const res = await purchaseStoreProduct(selectedProductId, {
        authToken,
        product: selectedProduct,
      });

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

  // Restore Purchases
  async function handleRestorePurchases() {
    if (restoring) return;
    setPurchaseError("");
    setRestoring(true);

    try {
      const res = await restoreStorePurchases({ authToken });
      if (res.restored) {
        customAlert.alert(
          t("payment.restoreSuccessTitle") || "Khôi phục thành công!",
          res.message ||
            t("payment.restoreSuccessMsg") ||
            "Giao dịch đã được khôi phục. Quyền lợi EarlySigns Pro đã được áp dụng."
        );
        navigation.navigate("PaymentResult", {
          variant: "success",
          status: "confirmed",
        });
      } else {
        customAlert.alert(
          t("payment.restoreNoneTitle") || "Không tìm thấy giao dịch",
          res.message ||
            t("payment.restoreNoneMsg") ||
            "Không tìm thấy gói đăng ký nào còn hiệu lực trên tài khoản cửa hàng của bạn."
        );
      }
    } catch (err: any) {
      customAlert.alert(
        t("payment.restoreErrorTitle") || "Lỗi khôi phục",
        getFriendlyErrorMessage(
          err,
          t("payment.restoreErrorMsg") ||
            "Không thể khôi phục giao dịch lúc này. Vui lòng thử lại sau."
        )
      );
    } finally {
      setRestoring(false);
    }
  }


  // Redeem Gift / Activation code
  async function handleActivateCode() {
    const trimmed = activationCode.trim().toUpperCase();
    if (!trimmed) return;
    setActivationError("");
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
      setActivationError(getFriendlyErrorMessage(err, t("payment.activateError") || "Mã kích hoạt không hợp lệ. Vui lòng kiểm tra lại."));
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
          style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
          className="w-10 h-10 rounded-2xl items-center justify-center active:opacity-75"
        >
          <ChevronLeft size={22} color="#ffffff" />
        </TouchableOpacity>

        <Text className="text-base font-extrabold text-white">
          {t("payment.screenTitle") || "Gói dịch vụ & Hạn mức"}
        </Text>

        <View className="w-10 h-10" />
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-[#f8fafc]"
        contentContainerStyle={{
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : 48,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
                {isPro
                  ? (t("payment.heroTitlePro") || "EarlySigns Pro")
                  : (t("payment.heroTitleUpgrade") || "Nâng cấp EarlySigns Pro")}
              </Text>
            </View>
            <Text className="text-[14px] text-slate-300 text-center px-4 leading-relaxed font-medium">
              {isPro
                ? (t("payment.heroSubtitlePro") || "Bạn đang tận hưởng trọn vẹn quyền lợi không giới hạn của EarlySigns Pro.")
                : (t("payment.heroSubtitleFree") || "Mở khóa toàn diện tiềm năng phát âm tiếng Anh chuẩn bản xứ không giới hạn lượt luyện.")}
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
            {isPro ? (
              <Crown size={12} color="#fbbf24" strokeWidth={2.4} />
            ) : null}
            <Text
              style={{ color: isPro ? "#fbbf24" : "#38bdf8" }}
              className="text-xs font-extrabold uppercase tracking-wider"
            >
              {isPro
                ? (t("payment.statusPro") || "Thành viên Pro Đang Hoạt Động")
                : (t("payment.statusFree") || "Hạn mức Miễn phí (Free Tier)")}
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
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("payment.accountStatusTitle") || "Trạng thái tài khoản"}
              </Text>
              <View
                style={{
                  backgroundColor: isPro ? "#ecfdf5" : "#f1f5f9",
                  borderColor: isPro ? "#a7f3d0" : "#cbd5e1",
                }}
                className="px-3 py-1 rounded-full border shrink-0"
              >
                <Text
                  numberOfLines={1}
                  style={{ color: isPro ? "#059669" : "#475569" }}
                  className="text-xs font-bold"
                >
                  {isPro ? (t("payment.unlimited") || "Không giới hạn") : (t("payment.free") || "Miễn phí")}
                </Text>
              </View>
            </View>

            {isPro ? (
              /* PRO ACTIVE DETAILS */
              <View className="gap-2.5 pt-1">
                <View className="flex-row items-center justify-between p-3.5 bg-slate-50 rounded-2xl">
                  <View className="flex-row items-center gap-2">
                    <Clock size={16} color="#0284c7" />
                    <Text className="text-[14px] font-semibold text-slate-700">
                      {t("payment.expiryDateLabel") || "Ngày hết hạn / gia hạn:"}
                    </Text>
                  </View>
                  <Text className="text-[14px] font-bold text-[#0f172a]">
                    {usage?.subscription_expires_at
                      ? String(usage.subscription_expires_at).slice(0, 10)
                      : (t("payment.autoRenew") || "Tự động gia hạn")}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={openManageSubscriptions}
                  style={{ backgroundColor: "#0f172a" }}
                  className="flex-row items-center justify-center gap-2 py-3.5 rounded-2xl active:opacity-85 shadow-sm"
                >
                  <ExternalLink size={14} color="#ffffff" />
                  <Text className="text-sm font-bold text-white">
                    {t("payment.manageSubscriptions") || "Quản lý gói cước trên Cửa hàng ứng dụng"}
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
                      <Zap size={16} color="#0284c7" />
                      <Text className="text-[15px] font-extrabold text-slate-800">
                        {t("payment.freeQuotaSharedTitle") || "Hạn mức AI dùng chung hôm nay"}
                      </Text>
                    </View>
                    <Text className="text-[15px] font-extrabold text-[#0f172a]">
                      {usage?.daily_remaining != null
                        ? `${usage.daily_remaining}/20 ${t("payment.uses") || "lượt"}`
                        : `20 ${t("payment.usesPerDay") || "lượt/ngày"}`}
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
                  <Text className="text-[13px] font-medium text-slate-500">
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
                {t("payment.benefitsTitle") || "Quyền lợi vượt trội của gói Pro"}
              </Text>
              <View style={{ backgroundColor: "#e0f2fe" }} className="px-2.5 py-0.5 rounded-full">
                <Text style={{ color: "#0284c7" }} className="text-xs font-bold">
                  {t("payment.unlimited") || "Không giới hạn"}
                </Text>
              </View>
            </View>

            <View className="gap-2.5 pt-0.5">
              {proBenefits.map((benefit, index) => (
                <View key={index} className="flex-row items-center gap-2.5">
                  <View
                    style={{ backgroundColor: "#ecfdf5" }}
                    className="w-5 h-5 rounded-full items-center justify-center"
                  >
                    <CheckCircle2 size={13} color="#059669" />
                  </View>
                  <Text className="text-[14px] font-semibold text-slate-800 flex-1 leading-5">
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* C. SUBSCRIPTION PACKAGES SELECTOR */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-[15px] font-extrabold text-slate-900">
                {t("payment.selectPackageTitle") || "Chọn gói đăng ký phù hợp"}
              </Text>
              {isLoadingStore && products.length > 0 ? (
                <View className="flex-row items-center gap-1.5">
                  <ActivityIndicator size="small" color="#0284c7" />
                  <Text className="text-[13px] text-slate-400">
                    {t("payment.updatingPrices") || "Đang cập nhật..."}
                  </Text>
                </View>
              ) : null}
            </View>

            {isLoadingStore && products.length === 0 ? (
              <View
                style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                className="py-8 items-center justify-center rounded-3xl border shadow-sm"
              >
                <ActivityIndicator size="small" color="#0284c7" />
                <Text className="text-[14px] font-medium text-slate-500 mt-2">
                  {t("payment.loadingPackages") || "Đang tải danh sách gói từ Cửa hàng..."}
                </Text>
              </View>
            ) : products.length === 0 ? (
              <View
                style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                className="py-8 items-center justify-center rounded-3xl border shadow-sm p-4"
              >
                <Text className="text-[14px] font-medium text-slate-500 text-center">
                  {t("payment.noPackagesAvailable") || "Không tìm thấy gói cước nào khả dụng lúc này."}
                </Text>
                <TouchableOpacity
                  onPress={loadStorePackages}
                  className="mt-3 px-5 py-2.5 bg-slate-100 rounded-xl active:bg-slate-200"
                >
                  <Text className="text-sm font-bold text-slate-700">
                    {t("payment.reload") || "Tải lại"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              products.map((prod) => {
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
                    {/* Savings / Best Value Badge (Only for 12-month / most popular package) */}
                    {prod.months === 12 || prod.popular ? (
                      <View
                        style={{ backgroundColor: "#f59e0b" }}
                        className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full z-10 flex-row items-center gap-1 shadow-sm"
                      >
                        <Crown size={11} color="#ffffff" strokeWidth={2.5} />
                        <Text className="text-xs font-black text-white uppercase tracking-wider">
                          {prod.savingsBadge || t("payment.badgeBestValue") || "Tiết kiệm nhất"}
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
                            className="text-[15px] font-extrabold"
                          >
                            {prod.months === 12
                              ? (t("payment.planYearlyName") || prod.name)
                              : prod.months === 1
                                ? (t("payment.planMonthlyName") || prod.name)
                                : prod.months === 3
                                  ? (t("payment.plan3MonthsName") || prod.name)
                                  : prod.name}
                          </Text>
                          {prod.months > 1 ? (
                            <Text style={{ color: "#0284c7" }} className="text-[13px] font-bold mt-0.5">
                              {prod.monthlyEquivalent.split("/")[0]?.trim()} {t("payment.perMonth") || "/tháng"}
                            </Text>
                          ) : (
                            <Text className="text-[13px] font-medium text-slate-500 mt-0.5">
                              {t("payment.standardMonthly") || "Thanh toán từng tháng"}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Right: Total Price */}
                      <View className="items-end pl-2">
                        <Text
                          style={{ color: isSelected ? "#0284c7" : "#0f172a" }}
                          className="text-base font-black"
                        >
                          {prod.priceDisplay}
                        </Text>
                        {prod.originalPriceDisplay ? (
                          <Text className="text-[13px] text-slate-400 line-through mt-0.5">
                            {prod.originalPriceDisplay}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Transparent Google Play / Apple Guidelines Benchmark Footnote */}
          {products.some((p) => Boolean(p.savingsBadge)) ? (
            <Text className="text-xs text-slate-400 text-center -mt-1 mb-1 px-2 font-medium">
              {t("payment.savingsComparisonNote") || "* Mức tiết kiệm tính trên chi phí so với việc gia hạn gói 1 tháng"}
            </Text>
          ) : null}

          {/* Error Message */}
          {purchaseError ? (
            <View
              style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
              className="p-3.5 border rounded-2xl"
            >
              <Text className="text-sm text-rose-600 leading-relaxed font-medium">
                {purchaseError}
              </Text>
            </View>
          ) : null}

          {/* Purchase CTA Button */}
          <View className="gap-2.5 pt-1">
            <PrimaryButton
              title={purchasing ? (t("payment.processing") || "Đang xử lý giao dịch...") : storeCtaText}
              loading={purchasing}
              variant="primary"
              onPress={handleStorePurchase}
            />

            <Text className="text-[13px] text-slate-500 text-center font-medium leading-relaxed px-2">
              {t("payment.storeAssuranceNote") || "Thanh toán an toàn bảo mật qua Store. Hủy bất kỳ lúc nào trong Cài đặt thiết bị."}
            </Text>

            {/* Store Compliance Utilities (Apple Guideline 3.1.2: Restore & Manage) */}
            <View className="flex-row justify-center items-center gap-4 px-1 pt-1.5 flex-wrap">
              <TouchableOpacity
                onPress={handleRestorePurchases}
                disabled={restoring || purchasing}
                className="flex-row items-center gap-1.5 py-1 px-1"
                activeOpacity={0.7}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color="#0284c7" />
                ) : (
                  <RefreshCw size={14} color="#0284c7" />
                )}
                <Text style={{ color: "#0284c7" }} className="text-[13.5px] font-bold">
                  {restoring
                    ? (t("payment.restoring") || "Đang khôi phục...")
                    : (t("payment.restorePurchases") || "Khôi phục giao dịch")}
                </Text>
              </TouchableOpacity>

              <Text className="text-slate-300 font-bold">·</Text>

              <TouchableOpacity
                onPress={presentRevenueCatCustomerCenter}
                className="flex-row items-center gap-1.5 py-1 px-1"
                activeOpacity={0.7}
              >
                <ExternalLink size={14} color="#64748b" />
                <Text className="text-[13.5px] text-slate-600 font-semibold">
                  {t("payment.manageSubscriptions") || "Quản lý gói cước"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* D. ACTIVATION CODE / GIFT CODE ACCORDION (Android/Web only to comply with Apple Guideline 3.1.1) */}
          {Platform.OS !== "ios" && (
            <View
              onLayout={(e) => {
                activationCardYRef.current = e.nativeEvent.layout.y;
              }}
              style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
              className="rounded-3xl border overflow-hidden shadow-sm"
            >
              <TouchableOpacity
                className="p-4 flex-row items-center justify-between"
                onPress={() => {
                  const nextState = !showActivation;
                  setShowActivation(nextState);
                  if (activationError) setActivationError("");
                  if (nextState) {
                    setTimeout(() => {
                      if (activationCardYRef.current > 0) {
                        scrollViewRef.current?.scrollTo({
                          y: Math.max(0, activationCardYRef.current - 16),
                          animated: true,
                        });
                      }
                    }, 100);
                  }
                }}
              >
                <View className="flex-row items-center gap-2.5">
                  <View
                    style={{ backgroundColor: "#fef3c7" }}
                    className="w-8 h-8 rounded-xl items-center justify-center"
                  >
                    <Gift size={16} color="#d97706" />
                  </View>
                  <Text className="text-[15px] font-bold text-slate-900">
                    {t("payment.giftCodeTitle") || "Bạn có mã quà tặng hoặc mã kích hoạt?"}
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
                  {/* 1 ROW: INPUT + BUTTON ÁP DỤNG */}
                  <View className="flex-row items-center gap-2 mt-1">
                    <TextInput
                      style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1" }}
                      className="flex-1 h-12 px-3.5 border rounded-2xl text-slate-900 text-[15px] uppercase font-bold"
                      value={activationCode}
                      onFocus={handleInputFocus}
                      onChangeText={(val) => {
                        setActivationCode(val);
                        if (activationError) setActivationError("");
                      }}
                      placeholder={t("payment.giftCodePlaceholder") || "Nhập mã kích hoạt (VD: PRO2026)"}
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={activating || !activationCode.trim()}
                      onPress={handleActivateCode}
                      style={{
                        backgroundColor: !activationCode.trim() ? "#e2e8f0" : "#0284c7",
                      }}
                      className="h-12 px-5 rounded-2xl items-center justify-center flex-row gap-1.5 shadow-xs"
                    >
                      {activating ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text
                          style={{ color: !activationCode.trim() ? "#94a3b8" : "#ffffff" }}
                          className="text-sm font-extrabold"
                        >
                          {t("payment.apply") || "Áp dụng"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {activationError ? (
                    <View
                      style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
                      className="p-3 border rounded-xl"
                    >
                      <Text className="text-[13.5px] text-rose-600 leading-relaxed font-medium">
                        {activationError}
                      </Text>
                    </View>
                  ) : null}
                  {activationSuccess ? (
                    <View
                      style={{ backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }}
                      className="p-3 border rounded-xl"
                    >
                      <Text className="text-[13.5px] text-emerald-700 leading-relaxed font-medium">
                        {activationSuccess}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}

          {/* E. LEGAL & STORE COMPLIANCE (Apple Guideline 3.1.2) */}
          <View className="gap-2 pt-2 px-1">
            <View className="flex-row items-center gap-1.5">
              <ShieldCheck size={14} color="#94a3b8" />
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t("payment.autoRenewDisclaimerTitle") || "Điều khoản đăng ký tự động gia hạn"}
              </Text>
            </View>
            <Text className="text-[13px] text-slate-400 leading-relaxed">
              {t("payment.autoRenewDisclaimerText") || "Gói đăng ký sẽ tự động gia hạn theo chu kỳ đã chọn trừ khi bạn hủy ít nhất 24 giờ trước khi chu kỳ hiện tại kết thúc. Bạn có thể quản lý hoặc hủy đăng ký bất kỳ lúc nào trong phần Cài đặt tài khoản App Store / Google Play."}
            </Text>

            <View className="flex-row justify-center gap-4 pt-1">
              <TouchableOpacity onPress={() => navigation.navigate("Terms")}>
                <Text style={{ color: "#0284c7" }} className="text-[13.5px] underline font-semibold">
                  {t("payment.eula") || "Điều khoản sử dụng"}
                </Text>
              </TouchableOpacity>
              <Text className="text-[13.5px] text-slate-300">·</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Privacy")}>
                <Text style={{ color: "#0284c7" }} className="text-[13.5px] underline font-semibold">
                  {t("payment.privacyPolicy") || "Chính sách bảo mật"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
