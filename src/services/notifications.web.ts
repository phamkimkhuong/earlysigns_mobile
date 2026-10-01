import { getItem, setItem } from "./storage";

export enum PermissionStatus {
  UNDETERMINED = "undetermined",
  GRANTED = "granted",
  DENIED = "denied",
}

export const NOTIF_STORAGE_DAILY_ENABLED = "earlysigns_notif_daily_enabled";
export const NOTIF_STORAGE_DAILY_HOUR = "earlysigns_notif_daily_hour";
export const NOTIF_STORAGE_DAILY_MINUTE = "earlysigns_notif_daily_minute";
export const NOTIF_STORAGE_INCOMPLETE_ENABLED = "earlysigns_notif_incomplete_enabled";
export const NOTIF_STORAGE_STREAK_ENABLED = "earlysigns_notif_streak_enabled";
export const NOTIF_STORAGE_CONTENT_UPDATES = "earlysigns_notif_content_updates";
export const NOTIF_STORAGE_PROMOTIONS = "earlysigns_notif_promotions";

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
  dailyReminderHour: 20,
  dailyReminderMinute: 0,
  incompleteLessonEnabled: false,
  streakReminderEnabled: false,
  contentUpdatesEnabled: false,
  promotionsEnabled: false,
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

export async function scheduleDailyStudyReminder(_hour: number, _minute: number): Promise<boolean> {
  return true;
}

export async function cancelDailyStudyReminder(): Promise<void> {
  // Web stub
}

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

export async function scheduleIncompleteLessonReminder(_params: {
  youtubeId?: string;
  lessonType?: "video" | "text" | "phonemes";
  title?: string;
  delayHours?: number;
}): Promise<boolean> {
  return true;
}

export async function cancelIncompleteLessonReminder(): Promise<void> {
  // Web stub
}

export async function scheduleStreakReminder(_hour: number = 21, _minute: number = 0): Promise<boolean> {
  return true;
}

export async function cancelStreakReminder(): Promise<void> {
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
  setItem(NOTIF_STORAGE_INCOMPLETE_ENABLED, next.incompleteLessonEnabled ? "true" : "false");
  setItem(NOTIF_STORAGE_STREAK_ENABLED, next.streakReminderEnabled ? "true" : "false");
  setItem(NOTIF_STORAGE_CONTENT_UPDATES, next.contentUpdatesEnabled ? "true" : "false");
  setItem(NOTIF_STORAGE_PROMOTIONS, next.promotionsEnabled ? "true" : "false");

  return next;
}

export function handleNotificationResponse(_response: any): void {
  // Web stub
}

export function setupNotificationResponseListener(): () => void {
  return () => {};
}

export function getEasProjectId(): string | undefined {
  return undefined;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  return null;
}

export function setupPushTokenRefreshListener(
  _onTokenRefresh?: (expoToken: string) => Promise<void> | void
): () => void {
  return () => {};
}

export async function syncPushTokenWithBackend(): Promise<{
  success: boolean;
  token?: string | null;
  preferences?: {
    content_updates_enabled: boolean;
    promotions_enabled: boolean;
  };
}> {
  return { success: false };
}

