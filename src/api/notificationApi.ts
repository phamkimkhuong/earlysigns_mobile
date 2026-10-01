import { Platform } from "react-native";
import Constants from "expo-constants";
import { httpClient } from "./client";
import { API_ENDPOINTS } from "@/core/config";
import { getOrCreateDeviceId } from "@/utils/deviceId";
import { logger } from "@/core/logger";
import i18n from "@/core/i18n";

export interface RegisterDevicePayload {
  expo_push_token: string;
  device_id?: string;
  platform?: "ios" | "android";
  app_version?: string;
  locale?: string;
  timezone?: string;
}

export interface RegisterDeviceResponse {
  ok: boolean;
  device_id: string;
  preferences?: {
    content_updates_enabled: boolean;
    promotions_enabled: boolean;
  };
}

export interface NotificationPreferencesPayload {
  device_id?: string;
  content_updates_enabled?: boolean;
  promotions_enabled?: boolean;
}

export interface NotificationPreferencesResponse {
  ok: boolean;
  preferences: {
    content_updates_enabled: boolean;
    promotions_enabled: boolean;
  };
}

export const notificationApi = {
  /**
   * Đăng ký hoặc cập nhật thiết bị nhận Expo push token trên server.
   * Token được gửi kèm metadata thiết bị; server trích xuất an toàn user_id từ JWT.
   */
  async registerDevice(
    payload: RegisterDevicePayload
  ): Promise<RegisterDeviceResponse> {
    const deviceId = payload.device_id || getOrCreateDeviceId();
    const platform: "ios" | "android" =
      payload.platform || (Platform.OS === "ios" ? "ios" : "android");
    const appVersion =
      payload.app_version || Constants.expoConfig?.version || "1.0.0";
    const locale = payload.locale || i18n.language || "vi";
    const timezone =
      payload.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "Asia/Ho_Chi_Minh";

    const requestBody = {
      expo_push_token: payload.expo_push_token,
      device_id: deviceId,
      platform,
      app_version: appVersion,
      locale,
      timezone,
    };

    logger.info(
      "NotificationApi",
      `Registering push device ${deviceId} (token: ${payload.expo_push_token.slice(0, 20)}...)`
    );

    return httpClient.post<RegisterDeviceResponse>(
      API_ENDPOINTS.NOTIFICATIONS.DEVICES,
      requestBody
    );
  },

  /**
   * Cập nhật tùy chọn nhận thông báo remote (tiếp thị, nội dung mới).
   */
  async updatePreferences(
    payload: NotificationPreferencesPayload
  ): Promise<NotificationPreferencesResponse> {
    const deviceId = payload.device_id || getOrCreateDeviceId();
    return httpClient.put<NotificationPreferencesResponse>(
      API_ENDPOINTS.NOTIFICATIONS.PREFERENCES,
      {
        device_id: deviceId,
        ...(typeof payload.content_updates_enabled === "boolean"
          ? { content_updates_enabled: payload.content_updates_enabled }
          : {}),
        ...(typeof payload.promotions_enabled === "boolean"
          ? { promotions_enabled: payload.promotions_enabled }
          : {}),
      }
    );
  },

  /**
   * Lấy tùy chọn thông báo hiện tại của tài khoản từ server.
   */
  async getPreferences(
    deviceId?: string
  ): Promise<NotificationPreferencesResponse> {
    const id = deviceId || getOrCreateDeviceId();
    return httpClient.get<NotificationPreferencesResponse>(
      API_ENDPOINTS.NOTIFICATIONS.PREFERENCES,
      { device_id: id }
    );
  },

  /**
   * Hủy kích hoạt thiết bị khi người dùng đăng xuất (chỉ hủy thiết bị hiện tại).
   */
  async unregisterDevice(
    deviceId?: string
  ): Promise<{ ok: boolean; message?: string }> {
    const id = deviceId || getOrCreateDeviceId();
    logger.info("NotificationApi", `Unregistering push device ${id}`);
    return httpClient.delete<{ ok: boolean; message?: string }>(
      API_ENDPOINTS.NOTIFICATIONS.UNREGISTER_DEVICE(id)
    );
  },
};

export default notificationApi;
