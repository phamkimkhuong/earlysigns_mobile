import { AppState, Linking, Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type PurchasesPackage,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
} from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { getItem, setItem, removeItem } from "./storage";
import { seedBillingUsage } from "./sessionData";
import { notifyBillingUsageChanged } from "./billingEvents";
import { AUTH_TOKEN_KEY } from "@/store/useAuthStore";
import {
  REVENUECAT_APPLE_KEY,
  REVENUECAT_GOOGLE_KEY,
} from "@/core/config";
import type { BillingUsage } from "@/types/domain";
import i18n from "@/core/i18n";

export const IAP_SUBSCRIPTION_KEY = "earlysigns_active_iap_subscription";
export const PRO_ENTITLEMENT_ID = "earlysigns_pro";
export const LEGACY_PRO_ENTITLEMENT_ID = "pro";

export function getActiveProEntitlement(customerInfo: CustomerInfo) {
  if (!customerInfo || typeof customerInfo !== "object") return undefined;
  return (
    customerInfo.entitlements?.active?.[PRO_ENTITLEMENT_ID] ||
    customerInfo.entitlements?.active?.[LEGACY_PRO_ENTITLEMENT_ID]
  );
}

export function hasAnyProEntitlementHistory(customerInfo: CustomerInfo) {
  if (!customerInfo || typeof customerInfo !== "object") return false;
  return Boolean(
    customerInfo.entitlements?.all?.[PRO_ENTITLEMENT_ID] ||
    customerInfo.entitlements?.all?.[LEGACY_PRO_ENTITLEMENT_ID]
  );
}

const isNativeMobile = Platform.OS === "android" || Platform.OS === "ios";

let isPurchasesConfigured = false;
let isConfiguringInProgress = false;
let customerInfoListener: CustomerInfoUpdateListener | null = null;

/**
 * Synchronize RevenueCat CustomerInfo with local store and billing state.
 * Handles active entitlement grant/renewal, and handles clean downgrade
 * when entitlement expires, is cancelled, or is refunded.
 */
export function handleCustomerInfoUpdate(customerInfo: CustomerInfo): void {
  if (!customerInfo || typeof customerInfo !== "object") return;

  try {
    const proEntitlement = getActiveProEntitlement(customerInfo);
    const token = getItem(AUTH_TOKEN_KEY) || "";

    if (proEntitlement) {
      // 1. Pro Entitlement is ACTIVE (New purchase, renewal, or restore)
      const expiresAt =
        proEntitlement.expirationDate ||
        new Date(Date.now() + 30 * 86400000).toISOString();

      const subData: StoredSubscriptionData = {
        productId: proEntitlement.productIdentifier,
        purchasedAt: proEntitlement.latestPurchaseDate || new Date().toISOString(),
        expiresAt,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "other",
        orderId: proEntitlement.identifier || `store_${Date.now()}`,
      };
      saveIapSubscription(subData);

      const usage: BillingUsage = {
        has_active_subscription: true,
        is_in_trial: false,
        subscription_expires_at: expiresAt,
        tier: "pro",
        daily_remaining: 9999,
      };

      if (token) {
        seedBillingUsage(token, usage);
      } else {
        notifyBillingUsageChanged(usage);
      }
    } else {
      // 2. Pro Entitlement is NOT active on the Store (expired, cancelled, refunded, or never purchased)
      // Clean up local store subscription receipt cache
      const hadLocalStoreReceipt = Boolean(getItem(IAP_SUBSCRIPTION_KEY));
      if (hadLocalStoreReceipt) {
        removeItem(IAP_SUBSCRIPTION_KEY);
      }

      // MULTI-ENTITLEMENT ARCHITECTURAL SEPARATION:
      // RevenueCat only governs Store In-App Purchases (StoreKit / Google Play).
      // An expired or lapsed Store entitlement MUST NOT unilaterally force global tier = "free",
      // because the user might have active Pro access granted via:
      // - Web payment (PayOS / Stripe / VNPay)
      // - Promo code / Gift code redemption (billingApi.activateCode)
      // - Referral rewards
      // - Admin manual grant
      //
      // Only trigger backend refresh when user is active to prevent unhandled background rejections
      if (
        token &&
        (hadLocalStoreReceipt || hasAnyProEntitlementHistory(customerInfo)) &&
        AppState.currentState === "active"
      ) {
        import("@/api/billingApi")
          .then(({ billingApi }) => billingApi.getUsage())
          .catch(() => {});
      }
    }
  } catch (err) {
    console.warn("[IAP] Error handling customer info update:", err);
  }
}

/**
 * Register CustomerInfo update listener to automatically detect subscription
 * lifecycle changes (renewals, cancellations, refunds, expirations).
 */
export function setupCustomerInfoListener(): () => void {
  if (!isNativeMobile) {
    return () => {};
  }

  // Idempotently clean up any stale listener reference first to prevent memory leak
  if (customerInfoListener) {
    try {
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    } catch {}
    customerInfoListener = null;
  }

  customerInfoListener = (customerInfo: CustomerInfo) => {
    try {
      handleCustomerInfoUpdate(customerInfo);
    } catch (err) {
      console.warn("[IAP] Error handling customer info update:", err);
    }
  };

  try {
    Purchases.addCustomerInfoUpdateListener(customerInfoListener);
  } catch (listenerErr) {
    console.warn("[IAP] Failed to register customerInfoListener:", listenerErr);
  }

  return () => {
    if (customerInfoListener) {
      try {
        Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
      } catch {}
      customerInfoListener = null;
    }
  };
}

/**
 * Initialize RevenueCat SDK for native StoreKit & Google Play Billing.
 * Thread-safe and Fast-Refresh safe via native Purchases.isConfigured() check.
 */
export async function initRevenueCat(userId?: string): Promise<boolean> {
  if (!isNativeMobile) return false;
  const apiKey =
    Platform.OS === "ios" ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
  if (!apiKey) {
    return false;
  }

  try {
    // 1. Check native SDK status first to avoid redundant native configure calls
    const isAlreadyConfigured =
      isPurchasesConfigured || (await Purchases.isConfigured().catch(() => false));

    if (!isAlreadyConfigured) {
      if (isConfiguringInProgress) {
        return true;
      }
      isConfiguringInProgress = true;
      try {
        if (__DEV__) {
          try {
            await Purchases.setLogLevel(LOG_LEVEL.WARN);
          } catch {
            /* ignore log level error */
          }
        }
        Purchases.configure({ apiKey, appUserID: userId || undefined });
        isPurchasesConfigured = true;
      } finally {
        isConfiguringInProgress = false;
      }

      // Register lifecycle listener safely
      setupCustomerInfoListener();

      // Proactively reconcile initial customer info on cold start
      try {
        const initialInfo = await Purchases.getCustomerInfo();
        handleCustomerInfoUpdate(initialInfo);
      } catch (custErr) {
        console.warn("[IAP] Initial customer info fetch error:", custErr);
      }
    } else {
      isPurchasesConfigured = true;
      // Ensure listener is safely registered after hot reload
      setupCustomerInfoListener();

      if (userId) {
        try {
          const currentAppUserId = await Purchases.getAppUserID().catch(() => "");
          if (currentAppUserId !== userId) {
            const logInResult = await Purchases.logIn(userId);
            if (logInResult?.customerInfo) {
              handleCustomerInfoUpdate(logInResult.customerInfo);
            }
          }
        } catch (logInErr) {
          console.warn("[IAP] RevenueCat logIn error:", logInErr);
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    console.warn("RevenueCat init failed:", err);
    return false;
  }
}

/**
 * Log out user from RevenueCat on app logout
 */
export async function logOutRevenueCat(): Promise<void> {
  if (!isNativeMobile || !isPurchasesConfigured) return;
  try {
    const isAnon = await Purchases.isAnonymous();
    if (!isAnon) {
      const logoutInfo = await Purchases.logOut();
      if (logoutInfo) {
        handleCustomerInfoUpdate(logoutInfo);
      }
    }
  } catch (err) {
    console.warn("RevenueCat logout error:", err);
  }
}

export function isRevenueCatAvailable(): boolean {
  if (!isNativeMobile) return false;
  const apiKey =
    Platform.OS === "ios" ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
  return Boolean(apiKey && isPurchasesConfigured);
}

export interface StoreProduct {
  id: string;
  months: number;
  name: string;
  priceVnd: number;
  originalPriceVnd: number;
  priceDisplay: string;
  originalPriceDisplay?: string;
  currencyCode?: string;
  periodLabel: string;
  monthlyEquivalent: string;
  popular?: boolean;
  savingsBadge?: string;
}

/**
 * Normalizes dynamic package object from GET /api/billing/packages into StoreProduct
 */
export function normalizeStoreProduct(apiPkg: any): StoreProduct {
  const months = Number(apiPkg.months) || 1;
  const priceVnd = Number(apiPkg.price_vnd ?? apiPkg.priceVnd ?? 0);
  const originalPriceVnd = Number(apiPkg.original_price_vnd ?? apiPkg.originalPriceVnd ?? priceVnd);
  const monthlyEquivalentNumber = Math.round(priceVnd / months);

  const discountPercent =
    originalPriceVnd > priceVnd
      ? Math.round((1 - priceVnd / originalPriceVnd) * 100)
      : 0;

  const defaultName =
    months === 12
      ? "EarlySigns Pro 12 Tháng (1 Năm)"
      : `EarlySigns Pro ${months} Tháng`;

  const rawName = String(apiPkg.name || "").trim();
  const name =
    rawName &&
    rawName.toLowerCase() !== `${months} month` &&
    rawName.toLowerCase() !== `${months} months`
      ? rawName.startsWith("EarlySigns")
        ? rawName
        : `EarlySigns Pro - ${rawName}`
      : defaultName;

  return {
    id: String(apiPkg.id),
    months,
    name,
    priceVnd,
    originalPriceVnd,
    priceDisplay: `${priceVnd.toLocaleString("vi-VN")} đ`,
    originalPriceDisplay:
      originalPriceVnd > priceVnd
        ? `${originalPriceVnd.toLocaleString("vi-VN")} đ`
        : undefined,
    currencyCode: "VND",
    periodLabel: months === 12 ? "12 tháng" : `${months} tháng`,
    monthlyEquivalent: `${monthlyEquivalentNumber.toLocaleString("vi-VN")} đ/tháng`,
    popular: months === 12,
    savingsBadge: discountPercent > 0 ? `Tiết kiệm ${discountPercent}%` : undefined,
  };
}

/**
 * Helper to determine subscription duration in months from package ID / type
 */
export function getPackageMonths(pkg: PurchasesPackage): number {
  const pId = pkg.product.identifier;
  const pType = (pkg.packageType || "").toLowerCase();

  if (
    pId === "yearly" ||
    pType.includes("annual") ||
    pId.includes("12") ||
    pId.includes("1y")
  ) {
    return 12;
  }
  if (
    pId === "Three_months" ||
    pId.toLowerCase() === "three_months" ||
    pType.includes("three_month") ||
    pId.includes("3m")
  ) {
    return 3;
  }
  if (pId.includes("6m") || pType.includes("six_month")) {
    return 6;
  }
  return 1;
}

/**
 * Normalizes a RevenueCat PurchasesPackage into a StoreProduct for UI rendering.
 *
 * Benchmark & Strikethrough Pricing:
 * App Store & Google Play subscriptions do not have a native "strikethrough" price field.
 * In accordance with standard App Store practices (e.g. Duolingo, Calm), the benchmark
 * comparison price is dynamically computed against the 1-month base plan (monthlyPrice * months).
 * Alternatively, custom overrides can be provided via RevenueCat Offering Metadata.
 */
export function normalizePurchasesPackage(
  pkg: PurchasesPackage,
  monthlyBasePrice?: number,
  offeringMetadata?: Record<string, unknown>
): StoreProduct {
  const months = getPackageMonths(pkg);
  const currencyCode = pkg.product.currencyCode || "USD";
  const rawPrice = Number(pkg.product.price || 0);
  const priceDisplay =
    pkg.product.priceString ||
    (currencyCode === "VND"
      ? `${rawPrice.toLocaleString("vi-VN")} đ`
      : `${rawPrice.toFixed(2)} ${currencyCode}`);
  const monthlyEquivalentNumber = Math.round(rawPrice / months);
  const monthlyEquivalent =
    currencyCode === "VND"
      ? `${monthlyEquivalentNumber.toLocaleString("vi-VN")} đ/tháng`
      : `${(rawPrice / months).toFixed(2)} ${currencyCode}/tháng`;

  const defaultName =
    months === 12
      ? "EarlySigns Pro 12 Tháng (1 Năm)"
      : `EarlySigns Pro ${months} Tháng`;

  const rawName = String(pkg.product.title || pkg.product.description || "").trim();
  const name =
    rawName &&
    rawName.toLowerCase() !== `${months} month` &&
    rawName.toLowerCase() !== `${months} months`
      ? rawName.startsWith("EarlySigns")
        ? rawName
        : `EarlySigns Pro - ${rawName}`
      : defaultName;

  let originalPriceDisplay: string | undefined;
  let originalPriceVnd = rawPrice;
  let savingsBadge: string | undefined;

  // 1. Check for custom overrides from RevenueCat Offering Metadata
  const metaOriginalDisplay =
    typeof offeringMetadata?.[`${pkg.identifier}_original_price`] === "string"
      ? (offeringMetadata[`${pkg.identifier}_original_price`] as string)
      : typeof offeringMetadata?.[`${pkg.product.identifier}_original_price`] === "string"
        ? (offeringMetadata[`${pkg.product.identifier}_original_price`] as string)
        : undefined;

  const metaSavingsBadge =
    typeof offeringMetadata?.[`${pkg.identifier}_savings_badge`] === "string"
      ? (offeringMetadata[`${pkg.identifier}_savings_badge`] as string)
      : typeof offeringMetadata?.[`${pkg.product.identifier}_savings_badge`] === "string"
        ? (offeringMetadata[`${pkg.product.identifier}_savings_badge`] as string)
        : undefined;

  if (metaOriginalDisplay) {
    originalPriceDisplay = metaOriginalDisplay;
    savingsBadge = metaSavingsBadge;
  } else if (monthlyBasePrice && monthlyBasePrice > 0 && months > 1) {
    // 2. Industry standard benchmark: Calculate against 1-month base plan (monthlyPrice * months)
    const benchmarkTotal = monthlyBasePrice * months;
    if (benchmarkTotal > rawPrice) {
      originalPriceVnd = benchmarkTotal;
      const discountPercent = Math.round(((benchmarkTotal - rawPrice) / benchmarkTotal) * 100);
      if (discountPercent > 0) {
        savingsBadge = metaSavingsBadge || `Tiết kiệm ${discountPercent}%`;
        originalPriceDisplay =
          currencyCode === "VND"
            ? `${Math.round(benchmarkTotal).toLocaleString("vi-VN")} đ`
            : `${benchmarkTotal.toFixed(2)} ${currencyCode}`;
      }
    }
  }

  return {
    id: pkg.product.identifier,
    months,
    name,
    priceVnd: rawPrice,
    originalPriceVnd,
    priceDisplay,
    originalPriceDisplay,
    currencyCode,
    periodLabel: months === 12 ? "12 tháng" : `${months} tháng`,
    monthlyEquivalent,
    popular: months === 12,
    savingsBadge,
  };
}

/**
 * Fetch available StoreProducts directly from RevenueCat Offerings.
 * This guarantees prices, currencies, and taxes match Apple/Google Store sheets 100%.
 */
export async function getStoreOfferingsProducts(): Promise<StoreProduct[]> {
  if (!isRevenueCatAvailable()) {
    if (isNativeMobile) {
      await initRevenueCat();
    }
    if (!isRevenueCatAvailable()) {
      return [];
    }
  }
  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;
    const availablePackages = currentOffering?.availablePackages || [];

    if (availablePackages.length === 0) {
      return [];
    }

    const monthlyPkg = availablePackages.find(
      (pkg) => getPackageMonths(pkg) === 1
    );
    const monthlyBasePrice = Number(monthlyPkg?.product.price || 0);
    const offeringMetadata = (currentOffering?.metadata as Record<string, unknown>) || {};

    const products = availablePackages.map((pkg) =>
      normalizePurchasesPackage(pkg, monthlyBasePrice, offeringMetadata)
    );
    return products.sort((a, b) => a.months - b.months);
  } catch (err) {
    console.warn("[IAP] Error fetching offerings from RevenueCat:", err);
    return [];
  }
}

export interface StoredSubscriptionData {
  productId: string;
  purchasedAt: string;
  expiresAt: string;
  platform: "ios" | "android" | "other";
  orderId: string;
}

export function getStoredIapSubscription(): StoredSubscriptionData | null {
  const raw = getItem(IAP_SUBSCRIPTION_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data && new Date(data.expiresAt).getTime() > Date.now()) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveIapSubscription(data: StoredSubscriptionData): void {
  setItem(IAP_SUBSCRIPTION_KEY, JSON.stringify(data));
}

/**
 * Safely checks if RevenueCat / StoreKit has a cryptographically verified active Pro entitlement.
 * This MUST be used instead of AsyncStorage when reconciling webhook latency,
 * ensuring local storage cannot be spoofed on rooted/debugged devices to gain unauthorized Pro access.
 */
export async function getVerifiedActiveProEntitlement(): Promise<{
  active: boolean;
  expiresAt?: string;
  productId?: string;
} | null> {
  if (!isRevenueCatAvailable()) {
    return null;
  }
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const pro = getActiveProEntitlement(customerInfo);
    if (pro) {
      return {
        active: true,
        expiresAt: pro.expirationDate || undefined,
        productId: pro.productIdentifier,
      };
    }
    return null;
  } catch (err) {
    console.warn("[IAP] Error checking verified active entitlement:", err);
    return null;
  }
}

/**
 * Open native Store subscription management page
 */
export async function openManageSubscriptions(): Promise<void> {
  const url =
    Platform.OS === "ios"
      ? "https://apps.apple.com/account/subscriptions"
      : "https://play.google.com/store/account/subscriptions";
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Perform Store In-App Purchase
 */
export async function purchaseStoreProduct(
  productId: string,
  options?: {
    authToken?: string;
    authFetch?: (path: string, opts?: any) => Promise<Response>;
    product?: StoreProduct;
  }
): Promise<{ success: boolean; error?: string; expiresAt?: string }> {
  const product =
    options?.product ||
    normalizeStoreProduct({
      id: productId,
      months: productId.includes("12") ? 12 : productId.includes("3") ? 3 : 1,
    });

  if (!product) {
    return {
      success: false,
      error:
        i18n.t("payment.packageNotFound") ||
        "Gói dịch vụ không tồn tại trên hệ thống.",
    };
  }

  // 1. Ensure RevenueCat SDK is initialized (handles both Test Store & Live Store seamlessly)
  if (!isRevenueCatAvailable()) {
    if (isNativeMobile) {
      await initRevenueCat();
    }
    if (!isRevenueCatAvailable()) {
      return {
        success: false,
        error:
          i18n.t("payment.storeUnavailable") ||
          "Cổng thanh toán Store (Apple App Store / Google Play) chưa sẵn sàng hoặc chưa được cấu hình trên thiết bị này. Vui lòng thử lại sau.",
      };
    }
  }

  try {
    // 2. Query Store Offerings from native store:
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;
    const availablePackages = currentOffering?.availablePackages || [];

    const targetPackage = availablePackages.find(
      (pkg) =>
        pkg.product.identifier === productId ||
        pkg.identifier === productId ||
        pkg.product.identifier.toLowerCase() === productId.toLowerCase() ||
        (product.months === 12 &&
          (pkg.product.identifier === "yearly" ||
            pkg.packageType?.toLowerCase().includes("annual"))) ||
        (product.months === 3 &&
          (pkg.product.identifier === "Three_months" ||
            pkg.product.identifier === "three_months" ||
            pkg.packageType?.toLowerCase().includes("three_month"))) ||
        (product.months === 1 &&
          (pkg.product.identifier === "monthly" ||
            pkg.packageType?.toLowerCase().includes("monthly")))
    );

    if (!targetPackage) {
      return {
        success: false,
        error:
          i18n.t("payment.packageNotConfiguredInStore") ||
          `Gói cước "${product.name}" chưa được cấu hình trên Cửa hàng ứng dụng (App Store / Google Play).`,
      };
    }

    // 3. Invoke Native StoreKit 2 / Google Play purchase sheet:
    let customerInfo: CustomerInfo;
    try {
      const result = await Purchases.purchasePackage(targetPackage);
      customerInfo = result.customerInfo;
      handleCustomerInfoUpdate(customerInfo);
    } catch (rcError: any) {
      if (
        rcError?.userCancelled ||
        rcError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      ) {
        return {
          success: false,
          error: i18n.t("payment.cancelled") || "Đã hủy giao dịch thanh toán.",
        };
      }
      if (rcError?.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
        return {
          success: false,
          error:
            i18n.t("payment.alreadyPurchased") ||
            "Gói cước này đã được mua trước đó. Vui lòng bấm 'Khôi phục giao dịch'.",
        };
      }
      if (rcError?.code === PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR) {
        return {
          success: false,
          error:
            i18n.t("payment.notAllowed") ||
            "Thiết bị của bạn không được phép thực hiện giao dịch mua trong ứng dụng.",
        };
      }
      if (rcError?.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
        return {
          success: false,
          error:
            i18n.t("payment.paymentPending") ||
            "Giao dịch đang chờ xác nhận từ Cửa hàng ứng dụng hoặc người giám hộ.",
        };
      }
      return {
        success: false,
        error:
          rcError?.message ||
          i18n.t("payment.storeInterrupted") ||
          "Giao dịch Store bị gián đoạn. Vui lòng thử lại sau.",
      };
    }

    // 4. Verify Exact Pro Entitlement from Store:
    const proEntitlement = getActiveProEntitlement(customerInfo);
    if (!proEntitlement) {
      return {
        success: false,
        error:
          i18n.t("payment.proNotActive") ||
          "Quyền lợi EarlySigns Pro chưa được kích hoạt trên Cửa hàng ứng dụng. Vui lòng bấm 'Khôi phục giao dịch' sau vài phút.",
      };
    }

    const expiresAt =
      proEntitlement.expirationDate ||
      new Date(Date.now() + product.months * 30 * 86400000).toISOString();

    if (options?.authToken) {
      seedBillingUsage(options.authToken, {
        has_active_subscription: true,
        is_in_trial: false,
        subscription_expires_at: expiresAt,
        tier: "pro",
        daily_remaining: 9999,
      });
    }

    return { success: true, expiresAt };
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.message ||
        i18n.t("payment.storeInterrupted") ||
        "Giao dịch Store bị gián đoạn. Vui lòng thử lại sau.",
    };
  }
}

/**
 * Restore Store Purchases (Mandatory for App Store review)
 *
 * RevenueCat acts as the Single Source of Truth: it contacts Apple StoreKit /
 * Google Play Billing directly to restore previous transactions.
 * If active entitlements exist, Pro status is restored.
 * If no active entitlements exist, any outdated local Pro state is cleared.
 */
export async function restoreStorePurchases(options?: {
  authToken?: string;
  authFetch?: (path: string, opts?: any) => Promise<Response>;
}): Promise<{ restored: boolean; message: string; expiresAt?: string }> {
  try {
    if (!isRevenueCatAvailable()) {
      if (isNativeMobile) {
        await initRevenueCat();
      }
    }

    if (!isRevenueCatAvailable()) {
      return {
        restored: false,
        message:
          i18n.t("payment.storeUnavailable") ||
          "Cổng thanh toán Store (Apple App Store / Google Play) chưa sẵn sàng hoặc chưa được cấu hình trên thiết bị này.",
      };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      handleCustomerInfoUpdate(customerInfo);
      const proEntitlement = getActiveProEntitlement(customerInfo);
      if (proEntitlement) {
        const expiry =
          proEntitlement.expirationDate ||
          new Date(Date.now() + 30 * 86400000).toISOString();
        const usage: BillingUsage = {
          has_active_subscription: true,
          is_in_trial: false,
          subscription_expires_at: expiry,
          tier: "pro",
          daily_remaining: 9999,
        };
        if (options?.authToken) {
          seedBillingUsage(options.authToken, usage);
        }
        return {
          restored: true,
          message:
            i18n.t("payment.restoreSuccessStore") ||
            "Đã khôi phục thành công gói EarlySigns Pro qua cửa hàng ứng dụng.",
          expiresAt: expiry,
        };
      }

      // Entitlement is NOT active on this Store account (expired, refunded, or never bought)
      return {
        restored: false,
        message:
          i18n.t("payment.restoreNotFound") ||
          "Không tìm thấy gói đăng ký nào đang hoạt động liên kết với tài khoản Apple ID / Google Play này.",
      };
    } catch (rcErr: any) {
      console.warn("[IAP] RevenueCat restore error:", rcErr);
      return {
        restored: false,
        message:
          rcErr?.message ||
          i18n.t("payment.storeConnectionFailed") ||
          "Không thể kết nối đến máy chủ cửa hàng để khôi phục giao dịch.",
      };
    }
  } catch (err: any) {
    return {
      restored: false,
      message:
        err?.message ||
        i18n.t("payment.storeConnectionFailed") ||
        "Không thể kết nối đến máy chủ cửa hàng để khôi phục giao dịch.",
    };
  }
}

/**
 * Present RevenueCat native Paywall (RevenueCatUI)
 * Automatically presents the configured Offering Paywall and handles purchase.
 */
export async function presentRevenueCatPaywall(options?: {
  offering?: any;
  requiredEntitlementIdentifier?: string;
}): Promise<PAYWALL_RESULT> {
  if (!isRevenueCatAvailable()) {
    return PAYWALL_RESULT.NOT_PRESENTED;
  }
  try {
    const requiredEntitlement =
      options?.requiredEntitlementIdentifier || PRO_ENTITLEMENT_ID;
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: requiredEntitlement,
      offering: options?.offering,
    });
    if (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED
    ) {
      const customerInfo = await Purchases.getCustomerInfo();
      handleCustomerInfoUpdate(customerInfo);
    }
    return result;
  } catch (err) {
    console.warn("[IAP] Error presenting RevenueCat Paywall:", err);
    return PAYWALL_RESULT.ERROR;
  }
}

/**
 * Present RevenueCat Customer Center (Self-service subscription management, cancellation, feedback)
 */
export async function presentRevenueCatCustomerCenter(): Promise<void> {
  if (!isRevenueCatAvailable()) {
    await openManageSubscriptions();
    return;
  }
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (err) {
    console.warn("[IAP] Error presenting Customer Center, falling back to Store:", err);
    await openManageSubscriptions();
  }
}
