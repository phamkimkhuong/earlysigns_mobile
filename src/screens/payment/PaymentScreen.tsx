import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
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
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { showToast } from "@/utils/toast";
import { customAlert } from "@/utils/customAlert";
import { formatExpiryDate } from "@/utils/errors";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { AppText } from "@/components/ui/AppText";
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
  const { t, i18n } = useTranslation();
  const { authToken } = useAuth();
  const usage = useBillingStore((s) => s.usage);

  const proBenefits = useMemo(
    () => [
      t("payment.benefits.b1") || "Luyện phát âm AI không giới hạn",
      t("payment.benefits.b2") || "Chẩn đoán chi tiết 44 âm IPA chuẩn quốc tế",
      t("payment.benefits.b3") || "Quét văn bản qua ảnh & camera không giới hạn",
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
    <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
      {/* 1. TOP NAVIGATION BAR */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-appBg border-b border-slate-200">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Quay lại")}
          activeOpacity={0.7}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Main");
            }
          }}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center active:opacity-70"
        >
          <ChevronLeft size={22} color="#0c2340" strokeWidth={2.5} />
        </TouchableOpacity>

        <AppText className="text-base font-extrabold text-[#0c2340]">
          {t("payment.screenTitle") || "Gói dịch vụ & Hạn mức"}
        </AppText>

        <View className="w-10 h-10" />
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1 bg-appBg"
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          paddingBottom: keyboardHeight > 0 ? keyboardHeight + 40 : 48,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* 2. UNIFIED HERO & PRO BENEFITS CARD */}
        <View
          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
          className="rounded-3xl p-5 border shadow-xs items-center gap-3.5"
        >
          <View
            style={{ backgroundColor: isPro ? "#fef3c7" : "#e0f2fe" }}
            className="w-14 h-14 rounded-2xl items-center justify-center"
          >
            <Crown size={28} color={isPro ? "#d97706" : "#0284c7"} strokeWidth={2.4} />
          </View>

          <View className="items-center gap-1">
            <AppText className="text-xl font-black text-[#0c2340] text-center">
              {isPro
                ? (t("payment.heroTitlePro") || "EarlySigns Pro")
                : (t("payment.heroTitleUpgrade") || "Nâng cấp EarlySigns Pro")}
            </AppText>
            <AppText className="text-[13.5px] text-slate-500 text-center px-2 leading-relaxed font-medium">
              {isPro
                ? (t("payment.heroSubtitlePro") || "Bạn đang tận hưởng trọn vẹn quyền lợi không giới hạn của EarlySigns Pro.")
                : (t("payment.heroSubtitleFree") || "Mở khóa toàn bộ tính năng và lượt luyện phát âm không giới hạn.")}
            </AppText>
          </View>

          {/* Active Pro Status Badge (Only shown when active Pro) */}
          {isPro ? (
            <View
              style={{
                backgroundColor: "#fef3c7",
                borderColor: "#fde68a",
              }}
              className="px-3.5 py-1 rounded-full border flex-row items-center gap-1.5 shrink-0"
            >
              <Crown size={12} color="#d97706" strokeWidth={2.4} />
              <AppText
                numberOfLines={1}
                style={{ color: "#d97706" }}
                className="text-xs font-extrabold uppercase tracking-wider"
              >
                {t("payment.statusPro") || "Thành viên Pro Đang Hoạt Động"}
              </AppText>
            </View>
          ) : null}

          {/* Pro Benefits 3-Point Checklist (Consolidated seamlessly inside same card) */}
          <View className="w-full pt-3.5 border-t border-slate-100 gap-2.5">
            {proBenefits.map((benefit, index) => (
              <View key={index} className="flex-row items-center gap-2.5">
                <View
                  style={{ backgroundColor: "#ecfdf5" }}
                  className="w-5 h-5 rounded-full items-center justify-center shrink-0"
                >
                  <CheckCircle2 size={13} color="#059669" />
                </View>
                <AppText className="text-[14px] font-semibold text-slate-800 flex-1 leading-5">
                  {benefit}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        {/* 3. CONTENT SECTIONS */}
        <View className="gap-4">
          {/* A. PRO ACTIVE SUBSCRIPTION CARD (Only shown when user is already Pro) */}
          {isPro ? (
            <View
              style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
              className="rounded-2xl p-4 border shadow-xs gap-3"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Crown size={18} color="#d97706" />
                  <AppText className="text-[15px] font-bold text-slate-900">
                    {t("payment.accountStatusTitle") || "Trạng thái gói cước"}
                  </AppText>
                </View>
                <View
                  style={{ backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }}
                  className="px-2.5 py-0.5 rounded-full border shrink-0"
                >
                  <AppText numberOfLines={1} style={{ color: "#059669" }} className="text-xs font-bold">
                    {t("payment.unlimited") || "Đang hoạt động"}
                  </AppText>
                </View>
              </View>

              <View className="flex-row items-center justify-between p-3 bg-slate-50 rounded-xl">
                <View className="flex-row items-center gap-2">
                  <Clock size={15} color="#0284c7" />
                  <AppText className="text-[13.5px] font-medium text-slate-600">
                    {t("payment.expiryDateLabel") || "Hạn dùng / Gia hạn:"}
                  </AppText>
                </View>
                <AppText className="text-[13.5px] font-bold text-[#0f172a]">
                  {formatExpiryDate(usage?.subscription_expires_at, i18n.language) || (t("payment.autoRenew") || "Tự động gia hạn")}
                </AppText>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("payment.manageSubscriptions") || "Quản lý gói cước trên Cửa hàng ứng dụng"}
                onPress={openManageSubscriptions}
                style={{ backgroundColor: "#0f172a" }}
                className="flex-row items-center justify-center gap-2 py-3 rounded-xl active:opacity-85 shadow-xs"
              >
                <ExternalLink size={14} color="#ffffff" />
                <AppText className="text-sm font-bold text-white">
                  {t("payment.manageSubscriptions") || "Quản lý gói cước trên Cửa hàng ứng dụng"}
                </AppText>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* C. SUBSCRIPTION PACKAGES SELECTOR */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between px-1">
              <AppText className="text-[15px] font-extrabold text-slate-900">
                {t("payment.selectPackageTitle") || "Chọn gói đăng ký phù hợp"}
              </AppText>
              {isLoadingStore && products.length > 0 ? (
                <View className="flex-row items-center gap-1.5">
                  <ActivityIndicator size="small" color="#0284c7" />
                  <AppText className="text-[13px] text-slate-400">
                    {t("payment.updatingPrices") || "Đang cập nhật..."}
                  </AppText>
                </View>
              ) : null}
            </View>

            {isLoadingStore && products.length === 0 ? (
              <View
                style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                className="py-8 items-center justify-center rounded-2xl border shadow-xs"
              >
                <ActivityIndicator size="small" color="#0284c7" />
                <AppText className="text-[14px] font-medium text-slate-500 mt-2">
                  {t("payment.loadingPackages") || "Đang tải danh sách gói từ Cửa hàng..."}
                </AppText>
              </View>
            ) : products.length === 0 ? (
              <View
                style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                className="py-8 items-center justify-center rounded-2xl border shadow-xs p-4"
              >
                <AppText className="text-[14px] font-medium text-slate-500 text-center">
                  {t("payment.noPackagesAvailable") || "Không tìm thấy gói cước nào khả dụng lúc này."}
                </AppText>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("payment.reload") || "Tải lại"}
                  onPress={loadStorePackages}
                  className="mt-3 px-5 py-2.5 bg-slate-100 rounded-xl active:bg-slate-200"
                >
                  <AppText className="text-sm font-bold text-slate-700">
                    {t("payment.reload") || "Tải lại"}
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : (
              products.map((prod) => {
                const isSelected = prod.id === selectedProductId;

                return (
                  <TouchableOpacity
                    key={prod.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${prod.name || "Gói Pro"}, ${prod.priceDisplay}`}
                    accessibilityState={{ selected: isSelected }}
                    activeOpacity={0.85}
                    onPress={() => setSelectedProductId(prod.id)}
                    style={{
                      backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                      borderColor: isSelected ? "#0284c7" : "#e2e8f0",
                      borderWidth: isSelected ? 2 : 1,
                    }}
                    className="relative p-4 rounded-2xl shadow-xs"
                  >
                    {/* Savings / Best Value Badge (Only for 12-month / most popular package) */}
                    {prod.months === 12 || prod.popular ? (
                      <View
                        style={{ backgroundColor: "#f59e0b" }}
                        className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full z-10 flex-row items-center gap-1 shadow-xs shrink-0"
                      >
                        <Crown size={11} color="#ffffff" strokeWidth={2.5} />
                        <AppText
                          numberOfLines={1}
                          className="text-xs font-black text-white uppercase tracking-wider"
                        >
                          {prod.savingsBadge || t("payment.badgeBestValue") || "Tiết kiệm nhất"}
                        </AppText>
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
                          <AppText
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
                          </AppText>
                          {prod.months > 1 ? (
                            <AppText style={{ color: "#0284c7" }} className="text-[13px] font-bold mt-0.5">
                              {prod.monthlyEquivalent.split("/")[0]?.trim()} {t("payment.perMonth") || "/tháng"}
                            </AppText>
                          ) : (
                            <AppText className="text-[13px] font-medium text-slate-500 mt-0.5">
                              {t("payment.standardMonthly") || "Thanh toán từng tháng"}
                            </AppText>
                          )}
                        </View>
                      </View>

                      {/* Right: Total Price */}
                      <View className="items-end pl-2">
                        <AppText
                          style={{ color: isSelected ? "#0284c7" : "#0f172a" }}
                          className="text-base font-black"
                        >
                          {prod.priceDisplay}
                        </AppText>
                        {prod.originalPriceDisplay ? (
                          <AppText className="text-[13px] text-slate-400 line-through mt-0.5">
                            {prod.originalPriceDisplay}
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Benchmark Footnote */}
          {products.some((p) => Boolean(p.savingsBadge)) ? (
            <AppText className="text-xs text-slate-400 text-center -mt-1 mb-1 px-2 font-medium">
              {t("payment.savingsComparisonNote") || "* Mức tiết kiệm tính trên chi phí so với việc gia hạn gói 1 tháng"}
            </AppText>
          ) : null}

          {/* Error Message */}
          {purchaseError ? (
            <View
              style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
              className="p-3.5 border rounded-2xl"
            >
              <AppText className="text-sm text-rose-600 leading-relaxed font-medium">
                {purchaseError}
              </AppText>
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

            <AppText className="text-[13px] text-slate-500 text-center font-medium leading-relaxed px-2">
              {t("payment.storeAssuranceNote") || "Hủy gia hạn bất cứ lúc nào trong Cài đặt thiết bị."}
            </AppText>

            {/* Store Compliance Utilities (Apple Guideline 3.1.2: Restore & Manage) */}
            <View className="flex-row justify-center items-center gap-4 px-1 pt-1 flex-wrap">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("payment.restorePurchases") || "Khôi phục giao dịch"}
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
                <AppText style={{ color: "#0284c7" }} className="text-[13.5px] font-bold">
                  {restoring
                    ? (t("payment.restoring") || "Đang khôi phục...")
                    : (t("payment.restorePurchases") || "Khôi phục giao dịch")}
                </AppText>
              </TouchableOpacity>

              <AppText className="text-slate-300 font-bold">·</AppText>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("payment.manageSubscriptions") || "Quản lý gói cước"}
                onPress={presentRevenueCatCustomerCenter}
                className="flex-row items-center gap-1.5 py-1 px-1"
                activeOpacity={0.7}
              >
                <ExternalLink size={14} color="#64748b" />
                <AppText className="text-[13.5px] text-slate-600 font-semibold">
                  {t("payment.manageSubscriptions") || "Quản lý gói cước"}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* D. ACTIVATION / GIFT CODE SUBTLE ACCORDION (Android/Web only to comply with Apple Guideline 3.1.1) */}
          {Platform.OS !== "ios" && (
            <View
              onLayout={(e) => {
                activationCardYRef.current = e.nativeEvent.layout.y;
              }}
              className="pt-2 items-center"
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("payment.giftCodeTitle") || "Bạn có mã quà tặng hoặc mã kích hoạt?"}
                accessibilityState={{ expanded: showActivation }}
                className="flex-row items-center gap-1.5 py-2 px-3 active:opacity-75"
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
                <Gift size={14} color="#64748b" />
                <AppText className="text-[13.5px] font-semibold text-slate-600">
                  {t("payment.giftCodeTitle") || "Bạn có mã quà tặng hoặc mã kích hoạt?"}
                </AppText>
                {showActivation ? (
                  <ChevronUp size={14} color="#64748b" />
                ) : (
                  <ChevronDown size={14} color="#64748b" />
                )}
              </TouchableOpacity>

              {showActivation ? (
                <View
                  style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                  className="w-full mt-2 p-3.5 rounded-2xl border shadow-xs gap-2.5"
                >
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      accessibilityLabel={t("payment.giftCodePlaceholder") || "Nhập mã kích hoạt"}
                      style={{ backgroundColor: "#F7F6F2", borderColor: "#cbd5e1" }}
                      className="flex-1 h-11 px-3.5 border rounded-xl text-slate-900 text-[14px] uppercase font-bold"
                      value={activationCode}
                      onFocus={handleInputFocus}
                      onChangeText={(val) => {
                        setActivationCode(val);
                        if (activationError) setActivationError("");
                      }}
                      placeholder={t("payment.giftCodePlaceholder") || "Nhập mã kích hoạt"}
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t("payment.applyCode", "Áp dụng")}
                      activeOpacity={0.85}
                      disabled={activating || !activationCode.trim()}
                      onPress={handleActivateCode}
                      style={{
                        backgroundColor: !activationCode.trim() ? "#e2e8f0" : "#0284c7",
                      }}
                      className="h-11 px-4 rounded-xl items-center justify-center flex-row gap-1"
                    >
                      {activating ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <AppText
                          style={{ color: !activationCode.trim() ? "#94a3b8" : "#ffffff" }}
                          className="text-sm font-extrabold"
                        >
                          {t("payment.apply") || "Áp dụng"}
                        </AppText>
                      )}
                    </TouchableOpacity>
                  </View>

                  {activationError ? (
                    <View
                      style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
                      className="p-2.5 border rounded-lg"
                    >
                      <AppText className="text-[13px] text-rose-600 leading-relaxed font-medium">
                        {activationError}
                      </AppText>
                    </View>
                  ) : null}
                  {activationSuccess ? (
                    <View
                      style={{ backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }}
                      className="p-2.5 border rounded-lg"
                    >
                      <AppText className="text-[13px] text-emerald-700 leading-relaxed font-medium">
                        {activationSuccess}
                      </AppText>
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
              <AppText className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t("payment.autoRenewDisclaimerTitle") || "Điều khoản đăng ký tự động gia hạn"}
              </AppText>
            </View>
            <AppText className="text-[13px] text-slate-400 leading-relaxed">
              {t("payment.autoRenewDisclaimerText") || "Gói tự động gia hạn trừ khi bạn hủy ít nhất 24 giờ trước khi chu kỳ kết thúc. Quản lý hoặc hủy bất kỳ lúc nào trong Cài đặt thiết bị."}
            </AppText>

            <View className="flex-row justify-center gap-4 pt-1">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("payment.eula") || "Điều khoản sử dụng"}
                onPress={() => navigation.navigate("Terms")}
              >
                <AppText style={{ color: "#0284c7" }} className="text-[13.5px] underline font-semibold">
                  {t("payment.eula") || "Điều khoản sử dụng"}
                </AppText>
              </TouchableOpacity>
              <AppText className="text-[13.5px] text-slate-300">·</AppText>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("payment.privacyPolicy") || "Chính sách bảo mật"}
                onPress={() => navigation.navigate("Privacy")}
              >
                <AppText style={{ color: "#0284c7" }} className="text-[13.5px] underline font-semibold">
                  {t("payment.privacyPolicy") || "Chính sách bảo mật"}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
