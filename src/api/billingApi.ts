import { httpClient } from "./client";
import { API_ENDPOINTS } from "@/core/config";
import { useBillingStore } from "@/store/useBillingStore";
import type { BillingUsage } from "@/types/domain";

export const billingApi = {
  /**
   * Fetch current billing usage and sync directly into Zustand store
   */
  async getUsage(): Promise<BillingUsage | null> {
    const data = await httpClient.get<{ usage: BillingUsage }>(API_ENDPOINTS.BILLING.USAGE);
    const usage = data?.usage || null;
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
   * Verify native StoreKit / Google Play In-App Purchase
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
   * Restore In-App Purchases from native store
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
};

export default billingApi;
