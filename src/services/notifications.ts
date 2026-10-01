import { AppState, Linking, Platform } from "react-native";
import Constants from "expo-constants";
import {
  setNotificationHandler,
  setNotificationChannelAsync,
  AndroidImportance,
  getExpoPushTokenAsync,
  addPushTokenListener,
} from "expo-notifications";
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
import { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
import { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
import {
  addNotificationResponseReceivedListener,
  getLastNotificationResponse,
  clearLastNotificationResponse,
} from "expo-notifications/build/NotificationsEmitter";
import {
  NotificationResponse,
  NotificationTriggerInput,
  PermissionStatus,
  SchedulableTriggerInputTypes,
} from "expo-notifications/build/Notifications.types";
import { getItem, setItem } from "./storage";
import { navigationRef, safeNavigate } from "@/navigation/nav";
import { useAuthStore, AUTH_TOKEN_KEY } from "@/store/useAuthStore";
import { showToast } from "@/utils/toast";
import { customAlert } from "@/utils/customAlert";
import { logger } from "@/core/logger";
import i18n from "@/core/i18n";

export { PermissionStatus };

export const NOTIF_STORAGE_DAILY_ENABLED = "earlysigns_notif_daily_enabled";
export const NOTIF_STORAGE_DAILY_HOUR = "earlysigns_notif_daily_hour";
export const NOTIF_STORAGE_DAILY_MINUTE = "earlysigns_notif_daily_minute";
export const NOTIF_STORAGE_INCOMPLETE_ENABLED = "earlysigns_notif_incomplete_enabled";
export const NOTIF_STORAGE_STREAK_ENABLED = "earlysigns_notif_streak_enabled";
export const NOTIF_STORAGE_CONTENT_UPDATES = "earlysigns_notif_content_updates";
export const NOTIF_STORAGE_PROMOTIONS = "earlysigns_notif_promotions";

const DAILY_REMINDER_ID = "earlysigns-daily-study-reminder";
const INCOMPLETE_LESSON_REMINDER_ID = "earlysigns-incomplete-lesson-reminder";
const STREAK_REMINDER_ID = "earlysigns-streak-reminder";

export type NotificationType =
  | "DAILY_PRACTICE"
  | "INCOMPLETE_LESSON"
  | "STREAK_REMINDER"
  | "NEW_CONTENT"
  | "ACCOUNT"
  | "SUBSCRIPTION"
  | "PROMOTION";

export interface NotificationPayloadData {
  type?: NotificationType | string;
  targetRoute?: string;
  targetParams?: Record<string, any>;
  youtubeId?: string;
  lessonType?: "video" | "text" | "phonemes";
  requiresAuth?: boolean;
  expiresAt?: number;
  [key: string]: any;
}

export interface NotificationSettings {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  incompleteLessonEnabled: boolean;
  streakReminderEnabled: boolean;
  contentUpdatesEnabled: boolean;
  promotionsEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminderEnabled: false,
  dailyReminderHour: 20, // 20:00 (8 PM)
  dailyReminderMinute: 0,
  incompleteLessonEnabled: false,
  streakReminderEnabled: false,
  contentUpdatesEnabled: false,
  promotionsEnabled: false,
};

let handlerInitialized = false;

/**
 * Configure default notification presentation behavior for the app
 */
export function initNotifications(): void {
  if (handlerInitialized) return;
  try {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === "android") {
      setNotificationChannelAsync("default", {
        name: i18n.t("notifications.channelStudyName") || "Thông báo học tập",
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4f46e5",
      }).catch(() => {});
    }
    handlerInitialized = true;
  } catch (err) {
    logger.warn("Notifications", "Failed to set notification handler:", err);
  }
}

const isNativeMobile = Platform.OS === "android" || Platform.OS === "ios";

/**
 * Safely obtain EAS Project ID from runtime configuration or environment variables.
 * Never hardcodes project ID in code to ensure portability when transferring projects.
 */
export function getEasProjectId(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId
  );
}

/**
 * Register for remote push notifications and obtain device token for backend
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!isNativeMobile) return null;
  initNotifications();
  try {
    const perm = await requestNotificationPermission();
    if (!perm.granted) return null;

    const projectId = getEasProjectId();
    if (!projectId) {
      logger.warn("Notifications", "EAS projectId is not configured in app.json or environment.");
      return null;
    }

    const tokenResult = await getExpoPushTokenAsync({ projectId });
    return tokenResult?.data || null;
  } catch (err) {
    logger.warn("Notifications", "Error getting push token:", err);
    return null;
  }
}

/**
 * Setup listener for push token rotation / refresh
 * Converts native DevicePushToken (FCM/APNs) to ExpoPushToken before notifying callback
 */
export function setupPushTokenRefreshListener(
  onTokenRefresh?: (expoToken: string) => Promise<void> | void
): () => void {
  if (!isNativeMobile) return () => {};
  try {
    const subscription = addPushTokenListener(async (devicePushToken) => {
      try {
        const projectId = getEasProjectId();
        if (!projectId) {
          logger.warn("Notifications", "EAS projectId is missing during token refresh.");
          return;
        }

        const tokenResult = await getExpoPushTokenAsync({
          projectId,
          devicePushToken,
        });
        const expoToken = tokenResult?.data;
        if (!expoToken) return;

        if (onTokenRefresh) {
          await onTokenRefresh(expoToken);
        }

        // Tự động gửi token mới lên backend nếu người dùng đang đăng nhập
        const authToken = getItem(AUTH_TOKEN_KEY);
        if (authToken) {
          const { notificationApi } = await import("@/api/notificationApi");
          await notificationApi.registerDevice({
            expo_push_token: expoToken,
          });
          logger.info("Notifications", "Refreshed Expo push token successfully synced to backend.");
        }
      } catch (err) {
        logger.warn("Notifications", "Failed to refresh Expo push token:", err);
      }
    });

    return () => {
      subscription.remove();
    };
  } catch (err) {
    logger.warn("Notifications", "Failed to setup push token refresh listener:", err);
    return () => {};
  }
}

/**
 * Đồng bộ hóa Expo Push Token và thông tin thiết bị với Backend EarlySigns.
 *
 * Tiêu chí kích hoạt:
 * 1. Chỉ chạy trên thiết bị Native (iOS/Android).
 * 2. Người dùng đã đăng nhập (có auth token).
 * 3. Quyền thông báo đã được cấp (Permission Granted).
 * 4. Nếu Server trả về `preferences`, tự động cập nhật local storage để đảm bảo tính đồng bộ 2 chiều.
 */
export async function syncPushTokenWithBackend(): Promise<{
  success: boolean;
  token?: string | null;
  preferences?: {
    content_updates_enabled: boolean;
    promotions_enabled: boolean;
  };
}> {
  if (!isNativeMobile) {
    return { success: false };
  }

  const authToken = getItem(AUTH_TOKEN_KEY);
  if (!authToken) {
    logger.debug("Notifications", "Bỏ qua đồng bộ push token: Người dùng chưa đăng nhập.");
    return { success: false };
  }

  const perm = await getNotificationPermissionStatus();
  if (!perm.granted) {
    logger.debug("Notifications", "Bỏ qua đồng bộ push token: Chưa được cấp quyền thông báo.");
    return { success: false };
  }

  const token = await registerForPushNotificationsAsync();
  if (!token) {
    logger.warn("Notifications", "Không lấy được Expo push token để gửi lên backend.");
    return { success: false };
  }

  try {
    const { notificationApi } = await import("@/api/notificationApi");
    const res = await notificationApi.registerDevice({
      expo_push_token: token,
    });

    if (res?.preferences) {
      await saveNotificationSettings({
        contentUpdatesEnabled: res.preferences.content_updates_enabled,
        promotionsEnabled: res.preferences.promotions_enabled,
      });
    }

    logger.info(
      "Notifications",
      `Đã đồng bộ push token thành công với backend cho thiết bị: ${res?.device_id}`
    );

    return {
      success: true,
      token,
      preferences: res?.preferences,
    };
  } catch (err) {
    logger.warn("Notifications", "Lỗi khi đồng bộ push token với backend:", err);
    return { success: false, token };
  }
}

/**
 * Kiểm tra quyền thông báo hiện tại và nếu quyền đã bị thu hồi (revoked)
 * trong cài đặt hệ điều hành, tự động gọi server để hủy kích hoạt thiết bị.
 *
 * Flow: User vào Settings → tắt Notifications → app resume → hàm này phát hiện
 * → gọi DELETE /api/notifications/devices/:device_id để ngưng gửi push.
 *
 * Đảm bảo server không gửi push vô ích vào thiết bị đã tắt quyền.
 */
export async function deactivateDeviceOnPermissionRevoke(): Promise<void> {
  if (!isNativeMobile) return;

  const authToken = getItem(AUTH_TOKEN_KEY);
  if (!authToken) return;

  const perm = await getNotificationPermissionStatus();
  if (perm.granted) return;

  try {
    const { notificationApi } = await import("@/api/notificationApi");
    const { getOrCreateDeviceId } = await import("@/utils/deviceId");
    const deviceId = getOrCreateDeviceId();
    await notificationApi.unregisterDevice(deviceId);
    logger.info(
      "Notifications",
      `Đã hủy kích hoạt thiết bị ${deviceId} do quyền thông báo bị thu hồi.`
    );
  } catch (err) {
    logger.warn("Notifications", "Lỗi khi hủy kích hoạt thiết bị sau thu hồi quyền:", err);
  }
}

/**
 * Get current system notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  status: PermissionStatus;
}> {
  try {
    const perm = await getPermissionsAsync();
    return {
      granted: perm.granted || perm.status === PermissionStatus.GRANTED,
      canAskAgain: perm.canAskAgain,
      status: perm.status,
    };
  } catch {
    return {
      granted: false,
      canAskAgain: true,
      status: PermissionStatus.UNDETERMINED,
    };
  }
}

/**
 * Request notification permissions from system
 */
export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  status: PermissionStatus;
}> {
  try {
    const perm = await requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return {
      granted: perm.granted || perm.status === PermissionStatus.GRANTED,
      status: perm.status,
    };
  } catch (err) {
    logger.warn("Notifications", "Failed to request notification permission:", err);
    return {
      granted: false,
      status: PermissionStatus.DENIED,
    };
  }
}

/**
 * Open device system settings for this app
 */
export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    /* ignore */
  }
}

/**
 * Read notification preferences from local storage
 */
export function getStoredNotificationSettings(): NotificationSettings {
  const dailyEnabledStr = getItem(NOTIF_STORAGE_DAILY_ENABLED);
  const hourStr = getItem(NOTIF_STORAGE_DAILY_HOUR);
  const minStr = getItem(NOTIF_STORAGE_DAILY_MINUTE);
  const incompleteStr = getItem(NOTIF_STORAGE_INCOMPLETE_ENABLED);
  const streakStr = getItem(NOTIF_STORAGE_STREAK_ENABLED);
  const contentUpdatesStr = getItem(NOTIF_STORAGE_CONTENT_UPDATES);
  const promosStr = getItem(NOTIF_STORAGE_PROMOTIONS);

  return {
    dailyReminderEnabled: dailyEnabledStr === "true",
    dailyReminderHour: hourStr != null ? parseInt(hourStr, 10) : DEFAULT_SETTINGS.dailyReminderHour,
    dailyReminderMinute: minStr != null ? parseInt(minStr, 10) : DEFAULT_SETTINGS.dailyReminderMinute,
    incompleteLessonEnabled: incompleteStr != null ? incompleteStr === "true" : DEFAULT_SETTINGS.incompleteLessonEnabled,
    streakReminderEnabled: streakStr != null ? streakStr === "true" : DEFAULT_SETTINGS.streakReminderEnabled,
    contentUpdatesEnabled: contentUpdatesStr != null ? contentUpdatesStr === "true" : DEFAULT_SETTINGS.contentUpdatesEnabled,
    promotionsEnabled: promosStr != null ? promosStr === "true" : DEFAULT_SETTINGS.promotionsEnabled,
  };
}

/**
 * Schedule recurring daily study reminder
 */
export async function scheduleDailyStudyReminder(hour: number, minute: number): Promise<boolean> {
  initNotifications();
  try {
    await cancelDailyStudyReminder();

    const trigger: NotificationTriggerInput =
      Platform.OS === "ios"
        ? {
            type: SchedulableTriggerInputTypes.CALENDAR,
            hour,
            minute,
            repeats: true,
          }
        : {
            type: SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          };

    await scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: i18n.t("notifications.dailyNotifTitle") || "EarlySigns - Đến giờ luyện giọng UK rồi! 🎙️",
        body:
          i18n.t("notifications.dailyNotifBody") ||
          "Dành 5 phút luyện tập hôm nay để duy trì chuỗi ngày streak và hoàn thiện bản đồ ngữ âm IPA của bạn nhé.",
        data: {
          type: "DAILY_PRACTICE",
          targetRoute: "Main",
        },
        sound: true,
      },
      trigger,
    });
    return true;
  } catch (err) {
    logger.warn("Notifications", "Failed to schedule daily reminder:", err);
    return false;
  }
}

/**
 * Cancel the scheduled daily study reminder
 */
export async function cancelDailyStudyReminder(): Promise<void> {
  try {
    await cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {
    /* ignore */
  }
}

/**
 * Calculate the optimal target date for an incomplete lesson reminder,
 * enforcing a night curfew (22:00 - 08:00) so learners aren't disturbed while sleeping.
 * If target falls in curfew, it is postponed to 09:00 AM next morning.
 */
export function calculateIncompleteLessonTriggerDate(
  delayHours: number = 3,
  now: Date = new Date()
): Date {
  const targetDate = new Date(now.getTime() + delayHours * 3600 * 1000);
  const hour = targetDate.getHours();

  if (hour >= 22 || hour < 8) {
    if (hour >= 22) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    targetDate.setHours(9, 0, 0, 0);
  }
  return targetDate;
}

/**
 * Schedule a reminder for an incomplete lesson (Section 16.1)
 * Enforces night curfew: reminders landing between 22:00 and 08:00 are shifted to 09:00 AM.
 */
export async function scheduleIncompleteLessonReminder(params: {
  youtubeId?: string;
  lessonType?: "video" | "text" | "phonemes";
  title?: string;
  delayHours?: number;
  initialIndex?: number;
}): Promise<boolean> {
  initNotifications();
  try {
    const settings = getStoredNotificationSettings();
    if (!settings.incompleteLessonEnabled) {
      return false;
    }

    const perm = await getNotificationPermissionStatus();
    if (!perm.granted) {
      return false;
    }

    await cancelIncompleteLessonReminder();
    const targetDate = calculateIncompleteLessonTriggerDate(params.delayHours || 3);
    const delaySeconds = Math.max(60, Math.round((targetDate.getTime() - Date.now()) / 1000));

    const trigger: NotificationTriggerInput = {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
      repeats: false,
    };

    const notifTitle =
      i18n.t("notifications.incompleteLessonNotifTitle") || "Tiếp tục bài học đang dang dở 🎯";
    const notifBody = params.title
      ? i18n.t("notifications.incompleteLessonNotifBodyWithTitle", { title: params.title }) ||
        `Bạn đang luyện dở "${params.title}". Quay lại hoàn thành bài học nhé!`
      : i18n.t("notifications.incompleteLessonNotifBodyDefault") ||
        "Bạn có bài học phát âm đang dang dở. Dành 3 phút hoàn thành ngay nhé!";

    await scheduleNotificationAsync({
      identifier: INCOMPLETE_LESSON_REMINDER_ID,
      content: {
        title: notifTitle,
        body: notifBody,
        data: {
          type: "INCOMPLETE_LESSON",
          youtubeId: params.youtubeId,
          lessonType: params.lessonType || "video",
          targetRoute: params.youtubeId ? "VideoPractice" : "Main",
          targetParams: params.youtubeId
            ? {
                youtubeId: params.youtubeId,
                ...(typeof params.initialIndex === "number" ? { initialIndex: params.initialIndex } : {}),
              }
            : undefined,
          requiresAuth: true,
        },
        sound: true,
      },
      trigger,
    });
    return true;
  } catch (err) {
    logger.warn("Notifications", "Failed to schedule incomplete lesson reminder:", err);
    return false;
  }
}

/**
 * Cancel pending reminder for an incomplete lesson
 */
export async function cancelIncompleteLessonReminder(): Promise<void> {
  try {
    await cancelScheduledNotificationAsync(INCOMPLETE_LESSON_REMINDER_ID);
  } catch {
    /* ignore */
  }
}

/**
 * Schedule daily evening reminder to keep learning streak alive (Section 16.1)
 */
export async function scheduleStreakReminder(hour: number = 21, minute: number = 0): Promise<boolean> {
  initNotifications();
  try {
    const settings = getStoredNotificationSettings();
    if (!settings.streakReminderEnabled) {
      return false;
    }
    const perm = await getNotificationPermissionStatus();
    if (!perm.granted) {
      return false;
    }
    await cancelStreakReminder();

    const trigger: NotificationTriggerInput =
      Platform.OS === "ios"
        ? {
            type: SchedulableTriggerInputTypes.CALENDAR,
            hour,
            minute,
            repeats: true,
          }
        : {
            type: SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          };

    await scheduleNotificationAsync({
      identifier: STREAK_REMINDER_ID,
      content: {
        title: i18n.t("notifications.streakNotifTitle") || "Đừng để đứt chuỗi streak! 🔥",
        body:
          i18n.t("notifications.streakNotifBody") ||
          "Chỉ còn vài tiếng nữa là hết ngày. Luyện 1 bài ngắn để giữ vững chuỗi ngày liên tiếp của bạn nhé!",
        data: {
          type: "STREAK_REMINDER",
          targetRoute: "Main",
        },
        sound: true,
      },
      trigger,
    });
    return true;
  } catch (err) {
    logger.warn("Notifications", "Failed to schedule streak reminder:", err);
    return false;
  }
}

/**
 * Cancel pending streak keeper reminder
 */
export async function cancelStreakReminder(): Promise<void> {
  try {
    await cancelScheduledNotificationAsync(STREAK_REMINDER_ID);
  } catch {
    /* ignore */
  }
}

/**
 * Save notification preferences and synchronize scheduled notifications
 */
export async function saveNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const current = getStoredNotificationSettings();
  const next: NotificationSettings = {
    ...current,
    ...settings,
  };

  setItem(NOTIF_STORAGE_DAILY_ENABLED, next.dailyReminderEnabled ? "true" : "false");
  setItem(NOTIF_STORAGE_DAILY_HOUR, String(next.dailyReminderHour));
  setItem(NOTIF_STORAGE_DAILY_MINUTE, String(next.dailyReminderMinute));
  setItem(NOTIF_STORAGE_INCOMPLETE_ENABLED, next.incompleteLessonEnabled ? "true" : "false");
  setItem(NOTIF_STORAGE_STREAK_ENABLED, next.streakReminderEnabled ? "true" : "false");
  setItem(NOTIF_STORAGE_CONTENT_UPDATES, next.contentUpdatesEnabled ? "true" : "false");
  setItem(NOTIF_STORAGE_PROMOTIONS, next.promotionsEnabled ? "true" : "false");

  if (next.dailyReminderEnabled) {
    await scheduleDailyStudyReminder(next.dailyReminderHour, next.dailyReminderMinute);
  } else {
    await cancelDailyStudyReminder();
  }

  if (next.streakReminderEnabled) {
    await scheduleStreakReminder();
  } else {
    await cancelStreakReminder();
  }

  if (!next.incompleteLessonEnabled) {
    await cancelIncompleteLessonReminder();
  }

  return next;
}

/**
 * Handle notification tap / interaction with strict section 16.4 specifications:
 * - Expired notification safe check
 * - Route payload resolution
 * - Authentication requirements
 * - Foreground safety check if currently in an active lesson
 */
export function handleNotificationResponse(response: NotificationResponse | null | undefined): void {
  if (!response) return;
  const data = (response.notification?.request?.content?.data || {}) as NotificationPayloadData;

  // 1. Expiration check (Section 16.4)
  if (data.expiresAt && Number(data.expiresAt) < Date.now()) {
    showToast.info(
      i18n.t("notifications.expiredTitle") || "Thông báo hết hạn",
      i18n.t("notifications.expiredMessage") || "Nội dung hoặc chương trình ưu đãi này đã kết thúc."
    );
    safeNavigate("Main");
    return;
  }

  // 2. Resolve target route & params
  let targetRoute = data.targetRoute || "";
  let targetParams = data.targetParams || {};

  if (!targetRoute) {
    if (data.type === "INCOMPLETE_LESSON" || data.youtubeId) {
      if (data.youtubeId) {
        targetRoute = "VideoPractice";
        targetParams = { youtubeId: data.youtubeId };
      } else if (data.lessonType === "phonemes") {
        targetRoute = "Phonemes";
      } else if (data.lessonType === "text") {
        targetRoute = "Text";
      } else {
        targetRoute = "Main";
      }
    } else if (data.type === "PROMOTION") {
      targetRoute = "Payment";
    } else if (data.type === "NEW_CONTENT") {
      targetRoute = "Videos";
    } else if (data.type === "DAILY_PRACTICE" || data.type === "STREAK_REMINDER") {
      targetRoute = "Main";
    } else if (data.screen) {
      targetRoute = data.screen === "Home" ? "Main" : data.screen;
    } else {
      targetRoute = "Main";
    }
  }

  // 3. Auth check (Section 16.4)
  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  if (data.requiresAuth && !isAuthenticated) {
    safeNavigate("Login", {
      next: targetRoute,
      nextParams: targetParams,
    } as any);
    return;
  }

  // 4. Foreground confirmation check across all screens when app is open (Section 16.4 Phương án B)
  const executeNavigation = () => {
    safeNavigate(targetRoute as any, targetParams as any);
  };

  const isAppActive = AppState.currentState === "active";

  if (isAppActive && navigationRef.isReady()) {
    const currentRoute = navigationRef.getCurrentRoute()?.name;

    // Không chuyển màn hình nếu chưa có thao tác xác nhận phù hợp khi ứng dụng đang mở
    if (currentRoute !== targetRoute) {
      const isPracticing =
        currentRoute === "VideoPractice" ||
        currentRoute === "Text" ||
        currentRoute === "Phonemes";

      const promptTitle = isPracticing
        ? i18n.t("notifications.activeSessionWarningTitle") || "Đang trong bài luyện tập"
        : i18n.t("notifications.openNotificationPromptTitle") || "Thông báo";

      const promptMessage = isPracticing
        ? i18n.t("notifications.activeSessionWarningMessage") ||
          "Bạn đang trong bài học. Rời đi lúc này có thể làm mất kết quả chưa lưu. Bạn có muốn mở thông báo không?"
        : i18n.t("notifications.foregroundPromptMessage") ||
          "Bạn có muốn chuyển sang nội dung thông báo không?";

      const cancelText = isPracticing
        ? i18n.t("notifications.stayInLesson") || "Ở lại học tiếp"
        : i18n.t("notifications.stayHere") || i18n.t("common.cancel") || "Ở lại";

      const confirmText = isPracticing
        ? i18n.t("notifications.leaveLesson") || "Mở thông báo"
        : i18n.t("notifications.openNow") || "Mở ngay";

      customAlert.alert(
        promptTitle,
        promptMessage,
        [
          {
            text: cancelText,
            style: "cancel",
          },
          {
            text: confirmText,
            onPress: executeNavigation,
          },
        ]
      );
      return;
    }
  }

  executeNavigation();
}

/**
 * Register global notification tap listener and handle cold-start notifications
 */
export function setupNotificationResponseListener(): () => void {
  initNotifications();

  // Cold-start notification check
  try {
    const lastResponse = getLastNotificationResponse();
    if (lastResponse) {
      setTimeout(() => {
        handleNotificationResponse(lastResponse);
        // Xóa notification response đã xử lý để tránh re-processing khi app re-mount
        try {
          clearLastNotificationResponse();
        } catch {
          /* best-effort: một số platform có thể chưa hỗ trợ */
        }
      }, 600);
    }
  } catch (err) {
    logger.warn("Notifications", "Failed to check last notification response:", err);
  }

  // Foreground / background notification tap listener
  try {
    const subscription = addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });
    return () => {
      subscription.remove();
    };
  } catch (err) {
    logger.warn("Notifications", "Failed to register notification response listener:", err);
    return () => {};
  }
}
