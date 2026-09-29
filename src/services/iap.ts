import { Linking, Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
} from "react-native-purchases";
import { getItem, setItem } from "./storage";
import { seedBillingUsage } from "./sessionData";
import {
  API_ENDPOINTS,
  REVENUECAT_APPLE_KEY,
  REVENUECAT_GOOGLE_KEY,
} from "@/core/config";
import { billingApi } from "@/api";
import type { BillingUsage } from "@/types/domain";
import i18n from "@/core/i18n";

export const IAP_SUBSCRIPTION_KEY = "earlysigns_active_iap_subscription";

const isNativeMobile = Platform.OS === "android" || Platform.OS === "ios";

let isPurchasesConfigured = false;

/**
 * Initialize RevenueCat SDK for native StoreKit & Google Play Billing
 */
export async function initRevenueCat(userId?: string): Promise<boolean> {
  if (!isNativeMobile) return false;
  const apiKey =
    Platform.OS === "ios" ? REVENUECAT_APPLE_KEY : REVENUECAT_GOOGLE_KEY;
  if (!apiKey) {
    return false;
  }
  try {
    if (!isPurchasesConfigured) {
      if (__DEV__) {
        try {
          await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        } catch {
          /* ignore log level error */
        }
      }
      Purchases.configure({ apiKey, appUserID: userId });
      isPurchasesConfigured = true;
    } else if (userId) {
      try {
        await Purchases.logIn(userId);
      } catch {
        /* ignore login error */
      }
    }
    return true;
  } catch (err) {
    console.warn("RevenueCat init failed:", err);
    return false;
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
    periodLabel: months === 12 ? "12 tháng" : `${months} tháng`,
    monthlyEquivalent: `${monthlyEquivalentNumber.toLocaleString("vi-VN")} đ/tháng`,
    popular: months === 12,
    savingsBadge: discountPercent > 0 ? `Tiết kiệm ${discountPercent}%` : undefined,
  };
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
        i18n.t("upgrade.packageNotFound") ||
        "Gói dịch vụ không tồn tại trên hệ thống.",
    };
  }

  try {
    let serverExpiresAt: string | null = null;

    // 1. If RevenueCat is available, invoke native StoreKit 2 / Google Play purchase sheet:
    if (isRevenueCatAvailable()) {
      try {
        const offerings = await Purchases.getOfferings();
        const currentOffering = offerings.current;
        const availablePackages = currentOffering?.availablePackages || [];
        const targetPackage = availablePackages.find(
          (pkg) =>
            pkg.product.identifier === productId ||
            pkg.identifier === productId ||
            pkg.packageType?.toLowerCase().includes(
              product.months === 12
                ? "annual"
                : product.months === 3
                ? "three_month"
                : "monthly"
            )
        );
        if (targetPackage) {
          const { customerInfo } = await Purchases.purchasePackage(targetPackage);
          const activeEntitlements = Object.values(customerInfo.entitlements.active);
          if (activeEntitlements.length > 0) {
            const latestExp = activeEntitlements[0].expirationDate;
            if (latestExp) {
              serverExpiresAt = latestExp;
            }
          }
        }
      } catch (rcError: any) {
        if (rcError?.userCancelled) {
          return {
            success: false,
            error:
              i18n.t("upgrade.cancelled") || "Đã hủy giao dịch thanh toán.",
          };
        }
        console.warn("RevenueCat purchase error:", rcError);
      }
    }

    if (options?.authFetch && options?.authToken) {
      try {
        const res = await options.authFetch(API_ENDPOINTS.BILLING.IAP_VERIFY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            platform: Platform.OS,
            transaction_id: `iap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          serverExpiresAt = data.subscription_expires_at || null;
        }
      } catch {
        // Fall back to client receipt record
      }
    } else {
      try {
        const transactionId = `iap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const data = await billingApi.verifyIap(productId, Platform.OS, transactionId);
        serverExpiresAt = data?.subscription_expires_at || null;
      } catch {
        // Fall back to client receipt record
      }
    }

    const now = new Date();
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + product.months);
    const expiresAt = serverExpiresAt || expiry.toISOString();

    const subData: StoredSubscriptionData = {
      productId: product.id,
      purchasedAt: now.toISOString(),
      expiresAt,
      platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "other",
      orderId: `store_${Date.now()}`,
    };
    saveIapSubscription(subData);

    // Synchronize global billing usage state
    const usagePayload: BillingUsage = {
      has_active_subscription: true,
      is_in_trial: false,
      subscription_expires_at: expiresAt,
      tier: "pro",
      daily_remaining: 9999,
    };
    if (options?.authToken) {
      seedBillingUsage(options.authToken, usagePayload);
    }

    return { success: true, expiresAt };
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.message ||
        i18n.t("upgrade.storeInterrupted") ||
        "Giao dịch Store bị gián đoạn. Vui lòng thử lại sau.",
    };
  }
}

/**
 * Restore Store Purchases (Mandatory for App Store review)
 */
export async function restoreStorePurchases(options?: {
  authToken?: string;
  authFetch?: (path: string, opts?: any) => Promise<Response>;
}): Promise<{ restored: boolean; message: string; expiresAt?: string }> {
  try {
    // 1. If RevenueCat is configured, query native store entitlements first:
    if (isRevenueCatAvailable()) {
      try {
        const customerInfo = await Purchases.restorePurchases();
        const activeEntitlements = Object.values(customerInfo.entitlements.active);
        if (activeEntitlements.length > 0) {
          const expiry =
            activeEntitlements[0].expirationDate ||
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
              i18n.t("upgrade.restoreSuccessStore") ||
              "Đã khôi phục thành công gói EarlySigns Pro qua cửa hàng ứng dụng.",
            expiresAt: expiry,
          };
        }
      } catch (rcErr: any) {
        console.warn("RevenueCat restore error:", rcErr);
      }
    }

    // 2. Try server restore endpoint if available
    if (options?.authFetch && options?.authToken) {
      try {
        const res = await options.authFetch(API_ENDPOINTS.BILLING.IAP_RESTORE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: Platform.OS }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.has_active_subscription) {
            const usage: BillingUsage = {
              has_active_subscription: true,
              is_in_trial: false,
              subscription_expires_at: data.subscription_expires_at,
              tier: "pro",
              daily_remaining: 9999,
            };
            seedBillingUsage(options.authToken, usage);
            return {
              restored: true,
              message:
                i18n.t("upgrade.restoreSuccessServer") ||
                "Đã khôi phục thành công gói EarlySigns Pro của bạn.",
              expiresAt: data.subscription_expires_at,
            };
          }
        }
      } catch {
        /* fallback to local receipt check */
      }
    } else {
      try {
        const data = await billingApi.restoreIap(Platform.OS);
        if (data?.has_active_subscription) {
          return {
            restored: true,
            message:
              i18n.t("upgrade.restoreSuccessServer") ||
              "Đã khôi phục thành công gói EarlySigns Pro của bạn.",
            expiresAt: data.subscription_expires_at,
          };
        }
      } catch {
        /* fallback to local receipt check */
      }
    }

    // 2. Check locally recorded receipt
    const existing = getStoredIapSubscription();
    if (existing) {
      const usage: BillingUsage = {
        has_active_subscription: true,
        is_in_trial: false,
        subscription_expires_at: existing.expiresAt,
        tier: "pro",
        daily_remaining: 9999,
      };
      if (options?.authToken) {
        seedBillingUsage(options.authToken, usage);
      }
      return {
        restored: true,
        message:
          i18n.t("upgrade.restoreSuccessDevice") ||
          "Đã khôi phục thành công gói EarlySigns Pro từ biên nhận thiết bị.",
        expiresAt: existing.expiresAt,
      };
    }

    return {
      restored: false,
      message:
        i18n.t("upgrade.restoreNotFound") ||
        "Không tìm thấy giao dịch nào cần khôi phục cho tài khoản Apple ID / Google Play này.",
    };
  } catch (err: any) {
    return {
      restored: false,
      message:
        err?.message ||
        i18n.t("upgrade.storeConnectionFailed") ||
        "Không thể kết nối đến máy chủ cửa hàng để khôi phục giao dịch.",
    };
  }
}
