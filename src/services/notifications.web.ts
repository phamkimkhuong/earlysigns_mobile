import { getItem, setItem } from "./storage";

export const NOTIF_STORAGE_DAILY_ENABLED = "earlysigns_notif_daily_enabled";
export const NOTIF_STORAGE_DAILY_HOUR = "earlysigns_notif_daily_hour";
export const NOTIF_STORAGE_DAILY_MINUTE = "earlysigns_notif_daily_minute";
export const NOTIF_STORAGE_CONTENT_UPDATES = "earlysigns_notif_content_updates";
export const NOTIF_STORAGE_PROMOTIONS = "earlysigns_notif_promotions";

export interface NotificationSettings {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  contentUpdatesEnabled: boolean;
  promotionsEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dailyReminderEnabled: false,
  dailyReminderHour: 20,
  dailyReminderMinute: 0,
  contentUpdatesEnabled: true,
  promotionsEnabled: true,
};

export function initNotifications(): void {
  // Web stub
}

export async function getNotificationPermissionStatus(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  status: any;
}> {
  if (typeof window !== "undefined" && "Notification" in window) {
    const granted = Notification.permission === "granted";
    return {
      granted,
      canAskAgain: Notification.permission === "default",
      status: Notification.permission,
    };
  }
  return {
    granted: true,
    canAskAgain: false,
    status: "granted",
  };
}

export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  status: any;
}> {
  if (typeof window !== "undefined" && "Notification" in window) {
    try {
      const res = await Notification.requestPermission();
      return {
        granted: res === "granted",
        status: res,
      };
    } catch {
      return { granted: false, status: "denied" };
    }
  }
  return { granted: true, status: "granted" };
}

export async function openNotificationSettings(): Promise<void> {
  // Web does not have native device settings
}

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

export async function scheduleDailyStudyReminder(_hour: number, _minute: number): Promise<boolean> {
  return true;
}

export async function cancelDailyStudyReminder(): Promise<void> {
  // Web stub
}

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

  return next;
}
