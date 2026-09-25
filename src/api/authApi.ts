import { httpClient } from "./client";
import { API_ENDPOINTS } from "@/core/config";
import { useAuthStore } from "@/store/useAuthStore";
import { useBillingStore } from "@/store/useBillingStore";

export const authApi = {
  /**
   * Fetch current user profile & screening status
   */
  async getMe(): Promise<any> {
    const data = await httpClient.get(API_ENDPOINTS.AUTH.ME);
    if (data?.screening_status) {
      useAuthStore.getState().setScreeningStatus(data.screening_status);
    }
    return data;
  },

  /**
   * Request OTP code to be sent to user's email
   */
  async requestOtp(email: string, language: string = "vi"): Promise<any> {
    return httpClient.post(
      API_ENDPOINTS.AUTH.REQUEST_OTP,
      { email, language },
      { skipAuth: true }
    );
  },

  /**
   * Verify OTP and complete login
   */
  async verifyOtp(email: string, otp: string, deviceId?: string): Promise<any> {
    const data = await httpClient.post(
      API_ENDPOINTS.AUTH.VERIFY_OTP,
      { email, otp, device_id: deviceId || useAuthStore.getState().deviceId },
      { skipAuth: true }
    );
    if (data?.token) {
      useAuthStore.getState().setAuth({
        token: data.token,
        email: data.email || email,
        userId: data.user_id || "",
      });
    }
    return data;
  },

  /**
   * Sign in with Google
   */
  async loginGoogle(params: {
    token?: string;
    idToken?: string;
    accessToken?: string;
    deviceId?: string;
  }): Promise<any> {
    const data = await httpClient.post(
      API_ENDPOINTS.AUTH.GOOGLE,
      {
        token: params.token || params.idToken || params.accessToken,
        id_token: params.idToken,
        access_token: params.accessToken,
        device_id: params.deviceId || useAuthStore.getState().deviceId,
      },
      { skipAuth: true }
    );
    if (data?.token || data?.access_token) {
      useAuthStore.getState().setAuth({
        token: data.token || data.access_token,
        email: data.email,
        userId: data.user_id,
      });
    }
    return data;
  },

  /**
   * Sign in with Apple
   */
  async loginApple(payload: any): Promise<any> {
    const data = await httpClient.post(
      API_ENDPOINTS.AUTH.APPLE,
      {
        ...payload,
        device_id: payload.device_id || useAuthStore.getState().deviceId,
      },
      { skipAuth: true }
    );
    if (data?.token || data?.access_token) {
      useAuthStore.getState().setAuth({
        token: data.token || data.access_token,
        email: data.email || payload.email,
        userId: data.user_id || payload.user,
      });
    }
    return data;
  },

  /**
   * Update user preferences (dialect, language, etc.)
   */
  async updatePreferences(preferences: Record<string, any>): Promise<any> {
    return httpClient.post(API_ENDPOINTS.AUTH.PREFERENCES, preferences);
  },

  /**
   * Delete account permanently
   */
  async deleteAccount(): Promise<any> {
    const res = await httpClient.post(API_ENDPOINTS.AUTH.DELETE_ACCOUNT, {});
    useAuthStore.getState().logout();
    useBillingStore.getState().reset();
    return res;
  },

  /**
   * Log out on server and clear local state
   */
  async logout(): Promise<void> {
    try {
      await httpClient.post(API_ENDPOINTS.AUTH.LOGOUT, {}).catch(() => {});
    } finally {
      useAuthStore.getState().logout();
      useBillingStore.getState().reset();
    }
  },
};

export default authApi;
