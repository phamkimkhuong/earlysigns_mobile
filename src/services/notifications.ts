import { Linking, Platform } from "react-native";
import { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
import { scheduleNotificationAsync } from "expo-notifications/build/scheduleNotificationAsync";
import { cancelScheduledNotificationAsync } from "expo-notifications/build/cancelScheduledNotificationAsync";
import {
  NotificationTriggerInput,
  PermissionStatus,
  SchedulableTriggerInputTypes,
} from "expo-notifications/build/Notifications.types";
import { getItem, setItem } from "./storage";

export const NOTIF_STORAGE_DAILY_ENABLED = "earlysigns_notif_daily_enabled";
export const NOTIF_STORAGE_DAILY_HOUR = "earlysigns_notif_daily_hour";
export const NOTIF_STORAGE_DAILY_MINUTE = "earlysigns_notif_daily_minute";
export const NOTIF_STORAGE_CONTENT_UPDATES = "earlysigns_notif_content_updates";
export const NOTIF_STORAGE_PROMOTIONS = "earlysigns_notif_promotions";

const DAILY_REMINDER_ID = "earlysigns-daily-study-reminder";

export interface NotificationSettings {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  contentUpdatesEnabled: boolean;
  promotionsEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminderEnabled: false,
  dailyReminderHour: 20, // 20:00 (8 PM)
  dailyReminderMinute: 0,
  contentUpdatesEnabled: true,
  promotionsEnabled: true,
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
    handlerInitialized = true;
  } catch (err) {
    console.warn("Failed to set notification handler:", err);
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
    console.warn("Failed to request notification permission:", err);
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
  const contentUpdatesStr = getItem(NOTIF_STORAGE_CONTENT_UPDATES);
  const promosStr = getItem(NOTIF_STORAGE_PROMOTIONS);

  return {
    dailyReminderEnabled: dailyEnabledStr === "true",
    dailyReminderHour: hourStr != null ? parseInt(hourStr, 10) : DEFAULT_SETTINGS.dailyReminderHour,
    dailyReminderMinute: minStr != null ? parseInt(minStr, 10) : DEFAULT_SETTINGS.dailyReminderMinute,
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
    // Cancel existing reminder first
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
        title: "EarlySigns - Đến giờ luyện giọng UK rồi! 🎙️",
        body: "Dành 5 phút luyện tập hôm nay để duy trì chuỗi ngày streak và hoàn thiện bản đồ ngữ âm IPA của bạn nhé.",
        data: { screen: "Home" },
        sound: true,
      },
      trigger,
    });
    return true;
  } catch (err) {
    console.warn("Failed to schedule daily reminder:", err);
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
  setItem(NOTIF_STORAGE_CONTENT_UPDATES, next.contentUpdatesEnabled ? "true" : "false");
  setItem(NOTIF_STORAGE_PROMOTIONS, next.promotionsEnabled ? "true" : "false");

  if (next.dailyReminderEnabled) {
    await scheduleDailyStudyReminder(next.dailyReminderHour, next.dailyReminderMinute);
  } else {
    await cancelDailyStudyReminder();
  }

  return next;
}
