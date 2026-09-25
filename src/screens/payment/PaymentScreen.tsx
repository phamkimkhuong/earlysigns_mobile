import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  Crown,
  ExternalLink,
  Gift,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { showToast } from "@/utils/toast";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { billingApi } from "@/api";
import {
  STORE_PRODUCTS,
  openManageSubscriptions,
  purchaseStoreProduct,
  restoreStorePurchases,
  type StoreProduct,
} from "@/services/iap";
import type { RootStackParamList } from "@/types/navigation";

const ACTIVATION_ERROR_KEYS: Record<string, string> = {
  "Invalid activation code format.": "activation.errors.invalidFormat",
  "Activation code not found.": "activation.errors.notFound",
  "This activation code has expired.": "activation.errors.expired",
  "This activation code has reached its maximum number of uses.": "activation.errors.maxUses",
  "You have already used this activation code.": "activation.errors.alreadyUsed",
  "User not found.": "activation.errors.userNotFound",
};

const PRO_BENEFITS = [
  "payment.benefits.b1",
  "payment.benefits.b2",
  "payment.benefits.b3",
  "payment.benefits.b4",
];

type Props = NativeStackScreenProps<RootStackParamList, "Payment">;

export default function PaymentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { authToken } = useAuth();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    route?.params?.packageId && STORE_PRODUCTS.some((p) => p.id === route.params?.packageId)
      ? route.params.packageId
      : STORE_PRODUCTS[2]?.id || STORE_PRODUCTS[0]?.id
  );

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
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
          t("payment.successTitle"),
          t("payment.successMessage", { product: selectedProduct?.name })
        );
        // Navigate to payment result or back to Profile
        navigation.navigate("PaymentResult", {
          variant: "success",
          status: "confirmed",
        });
      } else {
        setPurchaseError(res.error || t("payment.transactionFailed") || "Transaction failed");
      }
    } catch (err: any) {
      setPurchaseError(String(err?.message || err));
    } finally {
      setPurchasing(false);
    }
  }

  // Restore Purchases
  async function handleRestore() {
    setPurchaseError("");
    setRestoring(true);
    try {
      const res = await restoreStorePurchases({ authToken });
      if (res.restored) {
        showToast.success(t("payment.restoreSuccess"), res.message);
        navigation.navigate("PaymentResult", {
          variant: "success",
          status: "confirmed",
        });
      } else {
        Alert.alert(t("payment.restoreTitle"), res.message);
      }
    } catch (err: any) {
      setPurchaseError(String(err?.message || err));
    } finally {
      setRestoring(false);
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
      setActivationSuccess(t("payment.activateSuccessMsg"));
      setActivationCode("");
      showToast.success(t("payment.activateSuccess"), t("payment.activateSuccessMsg"));
    } catch (err: any) {
      const message = String(err?.message || err).trim();
      const key = ACTIVATION_ERROR_KEYS[message];
      setPurchaseError(key ? t(key) : message || t("activation.error"));
    } finally {
      setActivating(false);
    }
  }

  const storeCtaText =
    Platform.OS === "ios"
      ? t("payment.ctaApple")
      : Platform.OS === "android"
      ? t("payment.ctaGoogle")
      : t("payment.ctaDefault");

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
        <View className="bg-[#1e2538] pt-3 pb-8 px-5">
          {/* Top Nav Bar */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("Main");
                }
              }}
              className="w-10 h-10 rounded-2xl bg-slate-800 items-center justify-center border border-slate-700"
            >
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>

            <View className="flex-row items-center gap-1.5 bg-amber-500 px-3 py-1 rounded-full">
              <Crown size={12} color="#ffffff" strokeWidth={2.4} />
              <Text className="text-xs font-black text-white uppercase tracking-wider">
                {t("payment.badgeUnlock")}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleRestore}
              disabled={restoring}
              className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 flex-row items-center gap-1.5"
            >
              {restoring ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <RefreshCw size={12} color="#ffffff" />
              )}
              <Text className="text-xs text-white font-bold">{t("payment.restore")}</Text>
            </TouchableOpacity>
          </View>

          {/* Crown & Hero Title */}
          <View className="items-center gap-2.5">
            <View className="w-16 h-16 rounded-3xl bg-amber-500 items-center justify-center border-2 border-amber-300">
              <Crown size={34} color="#ffffff" strokeWidth={2.2} />
            </View>
            <Text className="text-2xl font-black text-white tracking-tight">{t("payment.heroTitle")}</Text>
            <Text className="text-xs text-slate-300 text-center px-4 leading-relaxed">
              {t("payment.heroSubtitle")}
            </Text>

            {/* Quick Value Badges */}
            <View className="flex-row flex-wrap justify-center gap-2 pt-1">
              <View className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full flex-row items-center gap-1">
                <Sparkles size={12} color="#a5b4fc" />
                <Text className="text-2xs font-extrabold text-indigo-200">{t("payment.badgeUnlimited")}</Text>
              </View>
              <View className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full flex-row items-center gap-1">
                <Text className="text-2xs font-extrabold text-indigo-200">{t("payment.badgeNative")}</Text>
              </View>
              <View className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-full flex-row items-center gap-1">
                <Text className="text-2xs font-extrabold text-indigo-200">{t("payment.badgePhonemes")}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-20 gap-4">
          {/* Pro Features Benefits Card (Concise 4 key highlights) */}
          <View className="bg-white rounded-3xl p-4.5 border border-slate-200 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xs font-extrabold uppercase tracking-wider text-indigo-600">
                {t("payment.benefitsTitle")}
              </Text>
              <View className="bg-indigo-50 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-indigo-600">{t("payment.vipAccess")}</Text>
              </View>
            </View>

            <View className="gap-2.5 pt-0.5">
              {PRO_BENEFITS.map((benefitKey) => (
                <View key={benefitKey} className="flex-row items-center gap-2.5">
                  <View className="w-5 h-5 rounded-full bg-emerald-50 items-center justify-center">
                    <CheckCircle2 size={14} color="#059669" />
                  </View>
                  <Text className="text-xs font-semibold text-slate-800 flex-1">
                    {t(benefitKey)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Subscription Packages Selector */}
          <View className="gap-3.5">
            <Text className="text-sm font-bold text-slate-900 px-1">{t("payment.selectPackage")}</Text>
            {STORE_PRODUCTS.map((prod) => {
              const isSelected = prod.id === selectedProductId;

              return (
                <TouchableOpacity
                  key={prod.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedProductId(prod.id)}
                  className={`relative p-4 rounded-3xl border-2 transition-all ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-600"
                      : "bg-white border-slate-200"
                  }`}
                >
                  {/* Floating Best Value / Savings Pill (Anchored to top-right edge, NEVER overlaps content) */}
                  {prod.savingsBadge ? (
                    <View className="absolute -top-3 right-4 bg-amber-500 px-2.5 py-0.5 rounded-full z-10 flex-row items-center gap-1">
                      <Crown size={10} color="#ffffff" strokeWidth={2.5} />
                      <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                        {prod.savingsBadge}
                      </Text>
                    </View>
                  ) : null}

                  <View className="flex-row items-center justify-between">
                    {/* Left: Radio Dot + Name + Monthly Rate */}
                    <View className="flex-row items-center flex-1 pr-2">
                      <View
                        className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
                          isSelected
                            ? "border-indigo-600 bg-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected ? (
                          <View className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        ) : null}
                      </View>

                      <View className="flex-1">
                        <Text
                          className={`text-sm ${
                            isSelected ? "font-black text-indigo-950" : "font-bold text-slate-800"
                          }`}
                        >
                          {prod.name}
                        </Text>
                        <View className="flex-row items-baseline gap-1 mt-0.5">
                          <Text className="text-base font-black text-indigo-600">
                            {prod.monthlyEquivalent.split("/")[0]?.trim() || prod.monthlyEquivalent}
                          </Text>
                          <Text className="text-2xs font-medium text-slate-500">{t("payment.perMonth")}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Right: Total Price & Original Price with Strikethrough */}
                    <View className="items-end pl-2">
                      <Text className="text-sm font-extrabold text-slate-800">
                        {prod.priceDisplay}
                      </Text>
                      <Text className="text-2xs text-slate-400 line-through mt-0.5">
                        {prod.originalPriceVnd.toLocaleString("vi-VN")} đ
                      </Text>
                      <Text className="text-[10px] text-slate-400 mt-0.5">
                        {prod.months === 12
                          ? t("payment.billedYearly")
                          : prod.months === 3
                          ? t("payment.billedQuarterly")
                          : t("payment.billedMonthly")}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Error Message */}
          {purchaseError ? (
            <View className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
              <Text className="text-xs text-rose-600 leading-relaxed font-medium">
                {purchaseError}
              </Text>
            </View>
          ) : null}

          {/* Purchase CTA Button */}
          <View className="gap-2 pt-1">
            <PrimaryButton
              title={purchasing ? t("payment.processing") : storeCtaText}
              loading={purchasing}
              variant="primary"
              onPress={handleStorePurchase}
            />

            {/* Assurance Guarantee */}
            <Text className="text-2xs text-slate-400 text-center font-medium">
              {t("payment.assuranceGuarantee")}
            </Text>

            {/* Store compliance utilities */}
            <View className="flex-row justify-between items-center px-1 pt-1">
              <TouchableOpacity
                onPress={handleRestore}
                disabled={restoring}
                className="flex-row items-center gap-1.5 py-1"
              >
                {restoring ? (
                  <ActivityIndicator size="small" color="#4f46e5" />
                ) : (
                  <RefreshCw size={13} color="#4f46e5" />
                )}
                <Text className="text-xs text-indigo-600 font-semibold">{t("payment.restorePurchases")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openManageSubscriptions}
                className="flex-row items-center gap-1.5 py-1"
              >
                <ExternalLink size={13} color="#64748b" />
                <Text className="text-xs text-slate-500 font-medium">{t("payment.manageSubscriptions")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Activation Code Accordion (Gift / Institutional Codes) */}
          <View className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <TouchableOpacity
              className="p-4 flex-row items-center justify-between"
              onPress={() => setShowActivation(!showActivation)}
            >
              <View className="flex-row items-center gap-2.5">
                <View className="w-8 h-8 rounded-xl bg-indigo-50 items-center justify-center">
                  <Gift size={16} color="#4f46e5" />
                </View>
                <Text className="text-xs font-semibold text-slate-800">
                  {t("payment.giftCodeTitle")}
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
                  className="border border-slate-200 rounded-2xl p-3 text-slate-900 bg-slate-50 text-xs uppercase font-bold"
                  value={activationCode}
                  onChangeText={setActivationCode}
                  placeholder={t("payment.giftCodePlaceholder")}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="characters"
                />
                <PrimaryButton
                  title={activating ? t("payment.applyingCode") : t("payment.applyCode")}
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

          {/* Legal & Store Compliance Disclaimers (Apple Review Guideline 3.1.2) */}
          <View className="gap-2 pt-2 px-1">
            <View className="flex-row items-center gap-1.5">
              <ShieldCheck size={14} color="#94a3b8" />
              <Text className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                {t("payment.autoRenewDisclaimerTitle")}
              </Text>
            </View>
            <Text className="text-2xs text-slate-400 leading-relaxed">
              {t("payment.autoRenewDisclaimerText")}
            </Text>

            <View className="flex-row justify-center gap-4 pt-1">
              <TouchableOpacity onPress={() => navigation.navigate("Terms")}>
                <Text className="text-2xs text-indigo-600 underline font-medium">
                  {t("payment.eula")}
                </Text>
              </TouchableOpacity>
              <Text className="text-2xs text-slate-300">·</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Privacy")}>
                <Text className="text-2xs text-indigo-600 underline font-medium">
                  {t("payment.privacyPolicy")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
