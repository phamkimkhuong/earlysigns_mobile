import { httpClient } from "./client";
import { API_ENDPOINTS } from "@/core/config";
import { useBillingStore } from "@/store/useBillingStore";
import { getStoredIapSubscription } from "@/services/iap";
import type { BillingUsage } from "@/types/domain";

export const billingApi = {
  /**
   * Fetch current billing usage and sync directly into Zustand store.
   * Seamlessly reconciles with active RevenueCat StoreKit / Google Play subscription
   * to eliminate race condition when BE webhook has not yet arrived.
   */
  async getUsage(): Promise<BillingUsage | null> {
    const data = await httpClient.get<{ usage: BillingUsage }>(API_ENDPOINTS.BILLING.USAGE);
    let usage = data?.usage || null;

    const storedIap = getStoredIapSubscription();
    if (storedIap && (!usage || !usage.has_active_subscription)) {
      usage = {
        ...(usage || {
          tier: "pro",
          daily_remaining: 9999,
          daily_quota: 9999,
          today_practice_count: 0,
          is_in_trial: false,
          referral_count: 0,
          trial_days_remaining: 0,
        }),
        has_active_subscription: true,
        is_in_trial: false,
        subscription_expires_at: storedIap.expiresAt,
        tier: "pro",
        daily_remaining: 9999,
      };
    }

    useBillingStore.getState().setUsage(usage);
    return usage;
  },

  /**
   * Fetch packages list
   */
  async getPackages(): Promise<any[]> {
    const data = await httpClient.get<{ packages: any[] }>(API_ENDPOINTS.BILLING.PACKAGES);
    return Array.isArray(data?.packages) ? data.packages : [];
  },

  /**
   * Activate gift code / redeem promo code
   */
  async activateCode(code: string): Promise<{ success: boolean; message?: string; usage?: BillingUsage }> {
    const data = await httpClient.post(API_ENDPOINTS.BILLING.ACTIVATE_CODE, {
      code: code.trim().toUpperCase(),
    });
    if (data?.usage) {
      useBillingStore.getState().setUsage(data.usage);
    } else {
      // Re-fetch usage to ensure UI updates
      await billingApi.getUsage().catch(() => {});
    }
    return data;
  },

  /**
   * @deprecated RevenueCat tự động xác thực biên lai trực tiếp với Apple StoreKit & Google Play Billing,
   * sau đó đồng bộ quyền lợi qua RevenueCat Webhook về Backend. Client không cần gọi hàm này nữa.
   */
  async verifyIap(productId: string, platform: string, transactionId: string): Promise<any> {
    const data = await httpClient.post(API_ENDPOINTS.BILLING.IAP_VERIFY, {
      product_id: productId,
      platform,
      transaction_id: transactionId,
    });
    if (data?.usage) {
      useBillingStore.getState().setUsage(data.usage);
    }
    return data;
  },

  /**
   * @deprecated Khôi phục In-App Purchases hiện do RevenueCat (Purchases.restorePurchases) đảm nhiệm
   * trực tiếp với Store. Client không cần gửi request lên endpoint này nữa.
   */
  async restoreIap(platform: string): Promise<any> {
    const data = await httpClient.post(API_ENDPOINTS.BILLING.IAP_RESTORE, { platform });
    if (data?.has_active_subscription) {
      const usage: BillingUsage = {
        has_active_subscription: true,
        is_in_trial: false,
        subscription_expires_at: data.subscription_expires_at,
        tier: "pro",
        daily_remaining: 9999,
      };
      useBillingStore.getState().setUsage(usage);
    }
    return data;
  },

  /**
   * Verify web checkout payment order
   */
  async verifyCheckout(orderCode: string): Promise<{ confirmed: boolean; subscription_expires_at?: string }> {
    const data = await httpClient.get<{ confirmed: boolean; subscription_expires_at?: string }>(
      API_ENDPOINTS.BILLING.CHECKOUT_VERIFY(orderCode)
    );
    if (data?.confirmed || data?.subscription_expires_at) {
      await billingApi.getUsage().catch(() => {});
    }
    return data;
  },

  /**
   * Fetch current user referral status & usage
   */
  async getReferralStatus(): Promise<any> {
    const data = await httpClient.get(API_ENDPOINTS.BILLING.REFERRAL_STATUS);
    if (data?.usage) {
      useBillingStore.getState().setUsage(data.usage);
    }
    return data;
  },

  /**
   * Generate referral code for user
   */
  async generateReferralCode(): Promise<any> {
    const data = await httpClient.post(API_ENDPOINTS.BILLING.REFERRAL_GENERATE, {});
    if (data?.usage) {
      useBillingStore.getState().setUsage(data.usage);
    }
    return data;
  },

  /**
   * Redeem referral code from friend (grants 7 days Pro)
   */
  async redeemReferralCode(code: string): Promise<any> {
    const data = await httpClient.post(API_ENDPOINTS.BILLING.REFERRAL_REDEEM, {
      code: code.trim().toUpperCase(),
    });
    if (data?.usage) {
      useBillingStore.getState().setUsage(data.usage);
    } else {
      await billingApi.getUsage().catch(() => {});
    }
    return data;
  },

  /**
   * Fetch user billing payment history
   */
  async getBillingHistory(): Promise<any[]> {
    const data = await httpClient.get<{ items: any[] }>(API_ENDPOINTS.BILLING.HISTORY);
    return Array.isArray(data?.items) ? data.items : [];
  },

  /**
   * Fetch saved checkout billing profile
   */
  async getBillingProfile(): Promise<any> {
    return httpClient.get(API_ENDPOINTS.BILLING.PROFILE);
  },

  /**
   * Create PayOS checkout payment order
   */
  async createCheckout(payload: {
    package_id: string;
    billing_info: Record<string, any>;
    save_profile?: boolean;
    agree_terms: boolean;
  }): Promise<{ ok: boolean; order_code: number; checkout_url: string }> {
    return httpClient.post(API_ENDPOINTS.BILLING.CHECKOUT, payload);
  },
};

export default billingApi;
