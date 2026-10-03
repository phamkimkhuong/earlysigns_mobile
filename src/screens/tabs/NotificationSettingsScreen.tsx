import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppState,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  ExternalLink,
  Flame,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react-native";
import {
  deactivateDeviceOnPermissionRevoke,
  getNotificationPermissionStatus,
  getStoredNotificationSettings,
  openNotificationSettings,
  requestNotificationPermission,
  saveNotificationSettings,
  syncPushTokenWithBackend,
  type NotificationSettings,
} from "@/services/notifications";
import { notificationApi } from "@/api/notificationApi";
import { useAuthStore } from "@/store/useAuthStore";
import { showToast } from "@/utils/toast";
import { customAlert } from "@/utils/customAlert";

const PRESET_REMINDER_TIMES = [
  { label: "08:00", hour: 8, minute: 0 },
  { label: "12:00", hour: 12, minute: 0 },
  { label: "19:00", hour: 19, minute: 0 },
  { label: "20:00", hour: 20, minute: 0 },
  { label: "21:30", hour: 21, minute: 30 },
];

export default function NotificationSettingsScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<NotificationSettings>(getStoredNotificationSettings());
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [customTimeModalVisible, setCustomTimeModalVisible] = useState(false);
  const [tempHour, setTempHour] = useState(settings.dailyReminderHour ?? 20);
  const [tempMinute, setTempMinute] = useState(settings.dailyReminderMinute ?? 0);

  const isCustomTimeSelected = useMemo(() => {
    return !PRESET_REMINDER_TIMES.some(
      (preset) =>
        settings.dailyReminderHour === preset.hour &&
        settings.dailyReminderMinute === preset.minute
    );
  }, [settings.dailyReminderHour, settings.dailyReminderMinute]);

  const formattedCustomTime = useMemo(() => {
    const h = String(settings.dailyReminderHour).padStart(2, "0");
    const m = String(settings.dailyReminderMinute).padStart(2, "0");
    return `${h}:${m}`;
  }, [settings.dailyReminderHour, settings.dailyReminderMinute]);

  // Sync real device permission on mount and when app resumes from background (e.g. from Settings)
  useEffect(() => {
    const syncStatus = async () => {
      const status = await getNotificationPermissionStatus();
      setPermissionGranted(status.granted);

      // If system permission is denied in OS settings, ensure any enabled toggles sync to off
      if (!status.granted) {
        const stored = getStoredNotificationSettings();
        if (
          stored.dailyReminderEnabled ||
          stored.incompleteLessonEnabled ||
          stored.streakReminderEnabled ||
          stored.contentUpdatesEnabled ||
          stored.promotionsEnabled
        ) {
          const synced: NotificationSettings = {
            ...stored,
            dailyReminderEnabled: false,
            incompleteLessonEnabled: false,
            streakReminderEnabled: false,
            contentUpdatesEnabled: false,
            promotionsEnabled: false,
          };
          setSettings(synced);
          await saveNotificationSettings(synced);
        }
        // Thông báo server ngưng gửi push cho thiết bị đã tắt quyền
        await deactivateDeviceOnPermissionRevoke();
      } else if (useAuthStore.getState().isAuthenticated) {
        // Đồng bộ preferences từ server nếu đã đăng nhập và có quyền
        try {
          const res = await notificationApi.getPreferences();
          if (res?.preferences) {
            const current = getStoredNotificationSettings();
            const updated: NotificationSettings = {
              ...current,
              contentUpdatesEnabled: res.preferences.content_updates_enabled,
              promotionsEnabled: res.preferences.promotions_enabled,
            };
            setSettings(updated);
            await saveNotificationSettings(updated);
          }
        } catch {
          // Bỏ qua lỗi mạng khi lấy preferences remote
        }
      }
    };

    syncStatus();

    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncStatus();
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  /**
   * Section 16.2: Quy trình cấp quyền thông báo chuẩn đặc tả
   * 1. Kiểm tra trạng thái quyền hiện tại.
   * 2. Nếu hệ điều hành không cho hỏi lại (canAskAgain = false) -> Hướng dẫn mở Cài đặt thiết bị.
   * 3. Nếu còn được hỏi -> Gọi trực tiếp popup hệ điều hành từ thao tác bật công tắc.
   */
  const ensureNotificationPermission = useCallback(async (): Promise<boolean> => {
    const perm = await getNotificationPermissionStatus();
    if (perm.granted) {
      setPermissionGranted(true);
      return true;
    }

    // Android có thể trả denied ngay khi chưa từng hỏi; chỉ canAskAgain
    // mới phân biệt quyền chưa cấp với quyền không thể yêu cầu lại.
    if (!perm.canAskAgain) {
      customAlert.alert(
        t("notifications.permissionTitle", "Cần cấp quyền thông báo"),
        t(
          "notifications.permissionDeniedMessage",
          "Bạn đang tắt quyền thông báo trong hệ thống. Vui lòng mở Cài đặt thiết bị để cho phép EarlySigns gửi thông báo."
        ),
        [
          { text: t("common.cancel", "Hủy"), style: "cancel" },
          {
            text: t("notifications.openSettings", "Mở Cài đặt"),
            onPress: () => openNotificationSettings(),
          },
        ]
      );
      return false;
    }

    // Thao tác bật công tắc đã thể hiện ý định xin quyền, không thêm modal xác nhận.
    const requested = await requestNotificationPermission();
    setPermissionGranted(requested.granted);
    if (requested.granted && useAuthStore.getState().isAuthenticated) {
      syncPushTokenWithBackend().catch(() => {});
    }
    return requested.granted;
  }, [t]);

  async function handleToggleDailyReminder(val: boolean) {
    if (val) {
      const allowed = await ensureNotificationPermission();
      if (!allowed) return;
    }
    const next: NotificationSettings = { ...settings, dailyReminderEnabled: val };
    setSettings(next);
    await saveNotificationSettings(next);
    showToast.success(
      val
        ? t("notifications.reminderEnabled", "Đã bật nhắc luyện tập")
        : t("notifications.reminderDisabled", "Đã tắt nhắc luyện tập")
    );
  }

  async function handleToggleIncompleteLesson(val: boolean) {
    if (val) {
      const allowed = await ensureNotificationPermission();
      if (!allowed) return;
    }
    const next: NotificationSettings = { ...settings, incompleteLessonEnabled: val };
    setSettings(next);
    await saveNotificationSettings(next);
    showToast.success(
      val
        ? t("notifications.incompleteLessonEnabledToast", "Đã bật nhắc bài học dang dở")
        : t("notifications.incompleteLessonDisabledToast", "Đã tắt nhắc bài học dang dở")
    );
  }

  async function handleToggleStreakReminder(val: boolean) {
    if (val) {
      const allowed = await ensureNotificationPermission();
      if (!allowed) return;
    }
    const next: NotificationSettings = { ...settings, streakReminderEnabled: val };
    setSettings(next);
    await saveNotificationSettings(next);
    showToast.success(
      val
        ? t("notifications.streakReminderEnabledToast", "Đã bật nhắc duy trì streak")
        : t("notifications.streakReminderDisabledToast", "Đã tắt nhắc duy trì streak")
    );
  }

  async function handleSelectTime(hour: number, minute: number) {
    const next: NotificationSettings = {
      ...settings,
      dailyReminderHour: hour,
      dailyReminderMinute: minute,
    };
    setSettings(next);
    await saveNotificationSettings(next);
    showToast.success(t("notifications.timeUpdated", "Đã cập nhật giờ nhắc nhở"));
  }

  async function handleToggleContentUpdates(val: boolean) {
    if (val) {
      const allowed = await ensureNotificationPermission();
      if (!allowed) return;
    }

    // Optimistic UI: cập nhật giao diện trước, rollback nếu server lỗi
    const previous = settings;
    const next: NotificationSettings = { ...settings, contentUpdatesEnabled: val };
    setSettings(next);
    await saveNotificationSettings(next);

    if (useAuthStore.getState().isAuthenticated) {
      try {
        const res = await notificationApi.updatePreferences({ content_updates_enabled: val });
        // Server-authoritative: commit giá trị server trả về
        if (res?.preferences) {
          const committed: NotificationSettings = {
            ...next,
            contentUpdatesEnabled: res.preferences.content_updates_enabled,
            promotionsEnabled: res.preferences.promotions_enabled,
          };
          setSettings(committed);
          await saveNotificationSettings(committed);
        }
        if (val) {
          syncPushTokenWithBackend().catch(() => { });
        }
      } catch {
        // Rollback UI về trạng thái trước khi bật/tắt
        setSettings(previous);
        await saveNotificationSettings(previous);
        showToast.error(
          t("notifications.syncError", "Lỗi đồng bộ. Vui lòng thử lại.")
        );
        return;
      }
    }
    showToast.success(
      val
        ? t("notifications.contentUpdatesEnabled", "Đã bật thông báo nội dung mới")
        : t("notifications.contentUpdatesDisabled", "Đã tắt thông báo nội dung mới")
    );
  }

  async function handleTogglePromotions(val: boolean) {
    if (val) {
      const allowed = await ensureNotificationPermission();
      if (!allowed) return;
    }

    // Optimistic UI: cập nhật giao diện trước, rollback nếu server lỗi
    const previous = settings;
    const next: NotificationSettings = { ...settings, promotionsEnabled: val };
    setSettings(next);
    await saveNotificationSettings(next);

    if (useAuthStore.getState().isAuthenticated) {
      try {
        const res = await notificationApi.updatePreferences({ promotions_enabled: val });
        // Server-authoritative: commit giá trị server trả về
        if (res?.preferences) {
          const committed: NotificationSettings = {
            ...next,
            contentUpdatesEnabled: res.preferences.content_updates_enabled,
            promotionsEnabled: res.preferences.promotions_enabled,
          };
          setSettings(committed);
          await saveNotificationSettings(committed);
        }
        if (val) {
          syncPushTokenWithBackend().catch(() => { });
        }
      } catch {
        // Rollback UI về trạng thái trước khi bật/tắt
        setSettings(previous);
        await saveNotificationSettings(previous);
        showToast.error(
          t("notifications.syncError", "Lỗi đồng bộ. Vui lòng thử lại.")
        );
        return;
      }
    }
    showToast.success(
      val
        ? t("notifications.promotionsEnabled", "Đã bật thông báo khuyến mại")
        : t("notifications.promotionsDisabled", "Đã tắt thông báo khuyến mại")
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#f8fafc]">
      {/* Top Navigation Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Quay lại")}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-base font-extrabold text-[#0f172a]">
          {t("notifications.title", "Cài đặt thông báo")}
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 16.2 & 16.3: Xem trạng thái quyền thông báo & Mở Cài đặt thiết bị */}
        <View
          style={{
            backgroundColor: permissionGranted ? "#f0fdf4" : "#fef2f2",
            borderColor: permissionGranted ? "#bbf7d0" : "#fecaca",
          }}
          className="rounded-2xl p-4 border flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3 flex-1 pr-2">
            {permissionGranted ? (
              <CheckCircle2 size={22} color="#16a34a" />
            ) : (
              <ShieldAlert size={22} color="#dc2626" />
            )}
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-[#0f172a]">
                {permissionGranted
                  ? t("notifications.permissionGranted", "Thông báo hệ thống: Đã bật")
                  : t("notifications.permissionDenied", "Thông báo hệ thống: Đang tắt")}
              </Text>
              <Text className="text-[13px] text-slate-500 mt-0.5 leading-5">
                {permissionGranted
                  ? t("notifications.permissionGrantedDesc", "Bạn sẽ nhận được lời nhắc luyện tập đúng giờ.")
                  : t("notifications.permissionDeniedDesc", "Bật thông báo trong Cài đặt thiết bị để không bỏ lỡ nhắc nhở học tập.")}
              </Text>
            </View>
          </View>

          {!permissionGranted ? (
            <TouchableOpacity
              onPress={() => openNotificationSettings()}
              style={{ backgroundColor: "#0f172a" }}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel={t("notifications.openSettings", "Mở Cài đặt")}
            >
              <Text className="text-xs font-bold text-white">
                {t("notifications.openSettings", "Mở Cài đặt")}
              </Text>
              <ExternalLink size={12} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Section 16.3: Nhóm 1 - Nhắc nhở học tập cá nhân */}
        <View
          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
          className="rounded-2xl p-4 border shadow-sm gap-3.5"
        >
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("notifications.studyRemindersSection", "Nhắc nhở luyện tập")}
          </Text>

          {/* 1. Nhắc luyện tập hằng ngày */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1 pr-3">
              <View style={{ backgroundColor: "#e0f2fe" }} className="w-10 h-10 rounded-xl items-center justify-center">
                <Bell size={20} color="#0284c7" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#0f172a]">
                  {t("notifications.dailyReminder", "Nhắc luyện tập hằng ngày")}
                </Text>
                <Text className="text-[13px] text-slate-500 leading-5 mt-0.5">
                  {t("notifications.dailyReminderDesc", "Nhắc luyện phát âm 5 phút mỗi ngày")}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.dailyReminderEnabled}
              onValueChange={handleToggleDailyReminder}
              trackColor={{ false: "#cbd5e1", true: "#0284c7" }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Progressive Disclosure: Chỉ hiển thị chọn giờ khi bật nhắc nhở */}
          {settings.dailyReminderEnabled ? (
            <View className="pt-2 border-t border-slate-100 gap-2">
              <View className="flex-row items-center gap-1.5">
                <Clock size={14} color="#64748b" />
                <Text className="text-[13px] font-bold text-slate-700">
                  {t("notifications.selectTime", "Chọn khung giờ nhắc:")}
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2">
                {PRESET_REMINDER_TIMES.map((preset) => {
                  const isSelected =
                    !isCustomTimeSelected &&
                    settings.dailyReminderHour === preset.hour &&
                    settings.dailyReminderMinute === preset.minute;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      onPress={() => handleSelectTime(preset.hour, preset.minute)}
                      style={{
                        backgroundColor: isSelected ? "#0284c7" : "#f1f5f9",
                        borderColor: isSelected ? "#0284c7" : "#e2e8f0",
                      }}
                      className="px-3.5 py-1.5 rounded-full border active:opacity-80"
                      accessibilityRole="button"
                      accessibilityLabel={preset.label}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={{ color: isSelected ? "#ffffff" : "#475569" }}
                        className="text-sm font-bold"
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Nút Tùy chỉnh giờ gửi thông báo */}
                <TouchableOpacity
                  onPress={() => {
                    setTempHour(settings.dailyReminderHour);
                    setTempMinute(settings.dailyReminderMinute);
                    setCustomTimeModalVisible(true);
                  }}
                  style={{
                    backgroundColor: isCustomTimeSelected ? "#0284c7" : "#f1f5f9",
                    borderColor: isCustomTimeSelected ? "#0284c7" : "#e2e8f0",
                  }}
                  className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel={t("notifications.customReminderTime", "Tùy chỉnh giờ nhắc")}
                  accessibilityState={{ selected: isCustomTimeSelected }}
                >
                  <SlidersHorizontal
                    size={13}
                    color={isCustomTimeSelected ? "#ffffff" : "#475569"}
                  />
                  <Text
                    style={{ color: isCustomTimeSelected ? "#ffffff" : "#475569" }}
                    className="text-sm font-bold"
                  >
                    {isCustomTimeSelected
                      ? `${t("notifications.custom", "Tùy chỉnh")}: ${formattedCustomTime}`
                      : t("notifications.custom", "Tùy chỉnh...")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View className="h-px bg-slate-100" />

          {/* 2. Nhắc bài học đang dang dở */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1 pr-3">
              <View style={{ backgroundColor: "#eef2ff" }} className="w-10 h-10 rounded-xl items-center justify-center">
                <PlayCircle size={20} color="#4f46e5" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#0f172a]">
                  {t("notifications.incompleteLesson", "Nhắc bài học đang dang dở")}
                </Text>
                <Text className="text-[13px] text-slate-500 leading-5 mt-0.5">
                  {t(
                    "notifications.incompleteLessonDesc",
                    "Nhắc tiếp tục khi bạn rời bài học giữa chừng"
                  )}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.incompleteLessonEnabled}
              onValueChange={handleToggleIncompleteLesson}
              trackColor={{ false: "#cbd5e1", true: "#4f46e5" }}
              thumbColor="#ffffff"
            />
          </View>

          <View className="h-px bg-slate-100" />

          {/* 3. Nhắc duy trì chuỗi Streak */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1 pr-3">
              <View style={{ backgroundColor: "#fff7ed" }} className="w-10 h-10 rounded-xl items-center justify-center">
                <Flame size={20} color="#ea580c" />
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-[#0f172a]">
                  {t("notifications.streakReminder", "Nhắc duy trì chuỗi Streak")}
                </Text>
                <Text className="text-[13px] text-slate-500 leading-5 mt-0.5">
                  {t(
                    "notifications.streakReminderDesc",
                    "Nhắc lúc 21:00 để bảo vệ chuỗi streak liên tục"
                  )}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.streakReminderEnabled}
              onValueChange={handleToggleStreakReminder}
              trackColor={{ false: "#cbd5e1", true: "#ea580c" }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Section 16.3: Nhóm 2 - Thông báo nội dung mới & khuyến mại/marketing */}
        <View
          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
          className="rounded-2xl p-4 border shadow-sm gap-3"
        >
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {t("notifications.updatesAndOffersSection", "Nội dung & Khuyến mại")}
          </Text>

          {/* Hàng: Thông báo nội dung mới */}
          <View className="flex-row items-center justify-between py-0.5">
            <View className="flex-row items-center gap-3 flex-1 pr-3">
              <View style={{ backgroundColor: "#e0f2fe" }} className="w-10 h-10 rounded-xl items-center justify-center">
                <BookOpen size={20} color="#0284c7" />
              </View>
              <Text className="text-[15px] font-bold text-[#0f172a] flex-1">
                {t("notifications.contentUpdates", "Nội dung & bài học mới")}
              </Text>
            </View>
            <Switch
              value={settings.contentUpdatesEnabled}
              onValueChange={handleToggleContentUpdates}
              trackColor={{ false: "#cbd5e1", true: "#0284c7" }}
              thumbColor="#ffffff"
            />
          </View>

          <View className="h-px bg-slate-100 my-0.5" />

          {/* Hàng: Thông báo khuyến mại / marketing */}
          <View className="flex-row items-center justify-between py-0.5">
            <View className="flex-row items-center gap-3 flex-1 pr-3">
              <View style={{ backgroundColor: "#fffbeb" }} className="w-10 h-10 rounded-xl items-center justify-center">
                <Tag size={20} color="#d97706" />
              </View>
              <Text className="text-[15px] font-bold text-[#0f172a] flex-1">
                {t("notifications.promotions", "Ưu đãi & Chương trình đặc biệt")}
              </Text>
            </View>
            <Switch
              value={settings.promotionsEnabled}
              onValueChange={handleTogglePromotions}
              trackColor={{ false: "#cbd5e1", true: "#0284c7" }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Section 16.3: Nhóm 3 - Thông báo hệ thống & giao dịch */}
        <View
          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
          className="rounded-2xl p-4 border shadow-sm gap-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1 pr-3">
              <View style={{ backgroundColor: "#ecfdf5" }} className="w-10 h-10 rounded-xl items-center justify-center">
                <ShieldCheck size={20} color="#059669" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[15px] font-bold text-[#0f172a]">
                    {t("notifications.systemSecurity", "Bảo mật & Giao dịch")}
                  </Text>
                  <View
                    style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}
                    className="px-2 py-0.5 rounded-full border"
                  >
                    <Text className="text-xs font-bold text-emerald-700">
                      {t("notifications.alwaysOn", "Luôn bật")}
                    </Text>
                  </View>
                </View>
                <Text className="text-[13px] text-slate-500 leading-5 mt-1">
                  {t(
                    "notifications.systemSecurityDesc",
                    "Thông báo xác nhận gói dịch vụ, biên lai và an toàn tài khoản"
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 16.3 Lưu ý: Việc tắt marketing không làm tắt thông báo giao dịch/tài khoản */}
        <View className="px-2 pt-1">
          <Text className="text-[13px] text-slate-500 text-center leading-5">
            {t(
              "notifications.systemNoticeFootnote",
              "Lưu ý: Việc tắt thông báo tiếp thị không làm ảnh hưởng đến các thông báo cần thiết về giao dịch hoặc tài khoản của bạn."
            )}
          </Text>
        </View>
      </ScrollView>

      {/* MODAL TÙY CHỈNH GIỜ NHẮC NHỞ */}
      <Modal
        visible={customTimeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomTimeModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setCustomTimeModalVisible(false)}
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)" }}
          className="flex-1 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: "#ffffff" }}
            className="rounded-t-[32px] p-6 pb-9 gap-5"
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View className="flex-row items-center gap-2.5">
                <View
                  style={{ backgroundColor: "#e0f2fe" }}
                  className="w-9 h-9 rounded-xl items-center justify-center"
                >
                  <Clock size={18} color="#0284c7" />
                </View>
                <View>
                  <Text className="text-base font-black text-[#0f172a]">
                    {t("notifications.customTimeModalTitle", "Tùy chỉnh giờ nhắc")}
                  </Text>
                  <Text className="text-xs text-slate-500">
                    {t("notifications.customTimeModalSubtitle", "Chọn giờ gửi thông báo hằng ngày cho bạn")}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("common.close", "Đóng")}
                onPress={() => setCustomTimeModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Stepper Digital Clock Display */}
            <View className="items-center py-2">
              <View className="flex-row items-center justify-center gap-4">
                {/* Hour Column */}
                <View className="items-center gap-2">
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Tăng 1 giờ"
                    onPress={() => setTempHour((prev) => (prev + 1) % 24)}
                    className="w-12 h-10 rounded-xl bg-slate-100 items-center justify-center active:bg-slate-200"
                  >
                    <ChevronUp size={20} color="#0f172a" />
                  </TouchableOpacity>

                  <View
                    style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1" }}
                    className="w-20 h-20 rounded-2xl border items-center justify-center shadow-xs"
                  >
                    <Text className="text-3xl font-black text-[#0c2340]">
                      {String(tempHour).padStart(2, "0")}
                    </Text>
                    <Text className="text-2xs font-bold text-slate-400 uppercase mt-0.5">
                      {t("notifications.hourUnit", "Giờ")}
                    </Text>
                  </View>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Giảm 1 giờ"
                    onPress={() => setTempHour((prev) => (prev - 1 + 24) % 24)}
                    className="w-12 h-10 rounded-xl bg-slate-100 items-center justify-center active:bg-slate-200"
                  >
                    <ChevronDown size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                {/* Separator Colon */}
                <Text className="text-4xl font-black text-slate-400 pb-8">:</Text>

                {/* Minute Column */}
                <View className="items-center gap-2">
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Tăng 5 phút"
                    onPress={() => setTempMinute((prev) => (prev + 5) % 60)}
                    className="w-12 h-10 rounded-xl bg-slate-100 items-center justify-center active:bg-slate-200"
                  >
                    <ChevronUp size={20} color="#0f172a" />
                  </TouchableOpacity>

                  <View
                    style={{ backgroundColor: "#f8fafc", borderColor: "#cbd5e1" }}
                    className="w-20 h-20 rounded-2xl border items-center justify-center shadow-xs"
                  >
                    <Text className="text-3xl font-black text-[#0c2340]">
                      {String(tempMinute).padStart(2, "0")}
                    </Text>
                    <Text className="text-2xs font-bold text-slate-400 uppercase mt-0.5">
                      {t("notifications.minuteUnit", "Phút")}
                    </Text>
                  </View>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Giảm 5 phút"
                    onPress={() => setTempMinute((prev) => (prev - 5 + 60) % 60)}
                    className="w-12 h-10 rounded-xl bg-slate-100 items-center justify-center active:bg-slate-200"
                  >
                    <ChevronDown size={20} color="#0f172a" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Quick Suggestions Chips */}
            <View className="gap-2">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t("notifications.quickSuggestions", "Gợi ý khung giờ vàng:")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { label: "06:30 (Sáng sớm)", h: 6, m: 30 },
                  { label: "07:30 (Ăn sáng)", h: 7, m: 30 },
                  { label: "18:30 (Tan làm)", h: 18, m: 30 },
                  { label: "22:00 (Trước khi ngủ)", h: 22, m: 0 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: tempHour === item.h && tempMinute === item.m }}
                    onPress={() => {
                      setTempHour(item.h);
                      setTempMinute(item.m);
                    }}
                    style={{
                      backgroundColor:
                        tempHour === item.h && tempMinute === item.m ? "#eff6ff" : "#f8fafc",
                      borderColor:
                        tempHour === item.h && tempMinute === item.m ? "#0284c7" : "#e2e8f0",
                    }}
                    className="px-3 py-1.5 rounded-full border active:opacity-80"
                  >
                    <Text
                      style={{
                        color:
                          tempHour === item.h && tempMinute === item.m ? "#0284c7" : "#475569",
                      }}
                      className="text-xs font-semibold"
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Modal Actions */}
            <View className="flex-row items-center gap-3 pt-2">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("common.cancel", "Hủy")}
                onPress={() => setCustomTimeModalVisible(false)}
                className="flex-1 py-3.5 rounded-2xl items-center justify-center bg-slate-100 active:bg-slate-200"
              >
                <Text className="text-sm font-bold text-slate-600">
                  {t("common.cancel", "Hủy")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("notifications.applyTime", "Lưu giờ nhắc")}
                onPress={() => {
                  handleSelectTime(tempHour, tempMinute);
                  setCustomTimeModalVisible(false);
                }}
                style={{ backgroundColor: "#0284c7" }}
                className="flex-1 py-3.5 rounded-2xl items-center justify-center shadow-sm active:opacity-90"
              >
                <Text className="text-sm font-extrabold text-white">
                  {t("notifications.applyTime", "Lưu giờ nhắc")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
