import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  useProgressSoundsQuery,
  useProgressHistoryQuery,
  progressKeys,
} from "@/hooks/queries/useProgressQueries";
import { billingKeys } from "@/hooks/queries/useBillingQueries";
import { lessonKeys } from "@/hooks/queries/useLessonQueries";
import {
  Award,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  ExternalLink,
  Flame,
  Gift,
  HelpCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trash2,
  Volume2,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { MOBILE_FREE_ACCESS } from "@/core/config";
import { accuracyBandColor } from "@/utils/checkResultScoreColor";
import { showToast } from "@/utils/toast";
import DialectToggle from "@/components/ui/DialectToggle";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import PrimaryButton from "@/components/ui/PrimaryButton";
import MonthlyQuotaCard from "@/components/ui/MonthlyQuotaCard";
import { ProfileProgressSkeleton } from "@/components/ui/Skeleton";
import { useBillingStore } from "@/store/useBillingStore";
import { authApi } from "@/api";
import {
  getNotificationPermissionStatus,
  getStoredNotificationSettings,
  openNotificationSettings,
  requestNotificationPermission,
  saveNotificationSettings,
  type NotificationSettings,
} from "@/services/notifications";
import {
  openManageSubscriptions,
  restoreStorePurchases,
} from "@/services/iap";
import { resolveUserKey, resolveUserTier } from "@/services/usageLimits";

const HISTORY_DAYS = 7;
const TAB_PROGRESS = "progress";
const TAB_ACCOUNT = "account";

// Total IPA phonemes tracked in standard English (RP/UK)
const TOTAL_IPA_PHONEMES = 44;
const MIN_CHECKS_PER_PHONEME = 5;
// 80% coverage threshold: 44 * 0.8 = 35.2 -> 35 phonemes
const PHONEME_THRESHOLD_COUNT = 35;

const PRESET_REMINDER_TIMES = [
  { label: "08:00", hour: 8, minute: 0 },
  { label: "12:00", hour: 12, minute: 0 },
  { label: "19:00", hour: 19, minute: 0 },
  { label: "20:00", hour: 20, minute: 0 },
  { label: "21:30", hour: 21, minute: 30 },
];

const WEEK_DAYS_VI = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WEEK_DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function fillDailyAccuracy(historyItems: any[], dates: string[], key: string): number[] {
  const byDate: Record<string, number> = {};
  for (const item of historyItems) {
    if (item.accuracy && item.accuracy[key] != null) {
      byDate[item.date] = Number(item.accuracy[key]);
    }
  }
  const filled: number[] = [];
  let last = 0;
  for (const d of dates) {
    if (byDate[d] != null) last = byDate[d];
    filled.push(Math.round((last || 0) * 1000) / 10);
  }
  return filled;
}

function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d, 10)}/${parseInt(m, 10)}`;
}

interface ProfileScreenProps {
  navigation: any;
  route?: {
    params?: {
      tab?: "progress" | "account";
      [key: string]: any;
    };
  };
}

export default function ProfileScreen({ navigation, route }: ProfileScreenProps) {
  const { t, i18n } = useTranslation();
  const weekDays = i18n.language?.startsWith("vi") ? WEEK_DAYS_VI : WEEK_DAYS_EN;
  const {
    authToken,
    authEmail,
    userDialect,
    updateUserDialect,
    scoreUnlocked,
    handleLogout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState(
    route?.params?.tab === "account" ? TAB_ACCOUNT : TAB_PROGRESS
  );
  const [prevRouteTab, setPrevRouteTab] = useState(route?.params?.tab);

  if (route?.params?.tab !== prevRouteTab) {
    setPrevRouteTab(route?.params?.tab);
    setActiveTab(route?.params?.tab === "account" ? TAB_ACCOUNT : TAB_PROGRESS);
  }

  const [dialectSaving, setDialectSaving] = useState(false);

  // Billing usage and Home summary from Zustand store
  const usage = useBillingStore((s) => s.usage);
  const homeSummary = useBillingStore((s) => s.homeSummary);
  const [restoringIap, setRestoringIap] = useState(false);

  // Notification settings state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(
    getStoredNotificationSettings
  );
  const [notifPermissionGranted, setNotifPermissionGranted] = useState(true);

  const dates = useMemo(() => dateRange(HISTORY_DAYS), []);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // TanStack Query: Sounds & History progress with 15m staleTime
  const {
    data: items = [],
    isLoading: soundsLoading,
    error: soundsError,
  } = useProgressSoundsQuery(userDialect || "uk", Boolean(authToken));

  const {
    data: history = [],
    isLoading: historyLoading,
    error: historyError,
  } = useProgressHistoryQuery(startDate, endDate, Boolean(authToken));

  const loading = soundsLoading || historyLoading;
  const error = soundsError
    ? String((soundsError as any)?.message || soundsError)
    : historyError
    ? String((historyError as any)?.message || historyError)
    : "";

  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: progressKeys.all }),
        queryClient.invalidateQueries({ queryKey: billingKeys.all }),
        queryClient.invalidateQueries({ queryKey: lessonKeys.all }),
      ]);
    }, [queryClient]),
    {
      tintColor: "#f59e0b",
      enableHaptics: true,
      minDurationMs: 450,
    }
  );

  // Check notification permission on mount
  useEffect(() => {
    (async () => {
      const perm = await getNotificationPermissionStatus();
      setNotifPermissionGranted(perm.granted);
    })();
  }, []);

  // Threshold calculation (Spec Section 13.1):
  // Phonemes with at least 5 checks
  const qualifiedPhonemes = useMemo(() => {
    return items.filter(
      (item) =>
        (item.checks_count ?? item.count ?? (item.accuracy != null ? 5 : 0)) >=
        MIN_CHECKS_PER_PHONEME
    );
  }, [items]);

  // Average score calculation across all tested phonemes
  const avgScore = useMemo(() => {
    if (!items.length) return 0;
    const sum = items.reduce((acc, it) => acc + (Number(it.accuracy) || 0), 0);
    return Math.round((sum / items.length) * 100);
  }, [items]);

  const isThresholdMet = useMemo(() => {
    if (MOBILE_FREE_ACCESS) return true;
    return scoreUnlocked && qualifiedPhonemes.length >= PHONEME_THRESHOLD_COUNT;
  }, [scoreUnlocked, qualifiedPhonemes.length]);

  const labels = dates.map(formatDateLabel);
  const totalData = fillDailyAccuracy(history, dates, "total");
  const chartWidth = Math.min(Dimensions.get("window").width - 64, 480);

  // Streak days
  const streakDays = Number(homeSummary?.streak_days || 0);
  const todayWeekIndex = (new Date().getDay() + 6) % 7; // 0 = Mon, ..., 6 = Sun

  // Handle reminder toggle
  async function handleToggleDailyReminder(val: boolean) {
    if (val) {
      const perm = await getNotificationPermissionStatus();
      if (!perm.granted) {
        const req = await requestNotificationPermission();
        if (!req.granted) {
          Alert.alert(
            t("profileExtra.notifPermissionDialog.title"),
            t("profileExtra.notifPermissionDialog.message"),
            [
              { text: t("profileExtra.notifPermissionDialog.later"), style: "cancel" },
              { text: t("profileExtra.notifPermissionDialog.openSettings"), onPress: openNotificationSettings },
            ]
          );
          setNotifPermissionGranted(false);
          return;
        }
        setNotifPermissionGranted(true);
      }
    }
    const updated = await saveNotificationSettings({ dailyReminderEnabled: val });
    setNotifSettings(updated);
    showToast.success(
      val ? t("profileExtra.reminderToastEnabled") : t("profileExtra.reminderToastDisabled"),
      val
        ? t("profileExtra.reminderToastSchedule", {
          time: `${String(updated.dailyReminderHour).padStart(2, "0")}:${String(updated.dailyReminderMinute).padStart(2, "0")}`,
        })
        : undefined
    );
  }

  // Handle time selection
  async function handleSelectReminderTime(hour: number, minute: number) {
    const updated = await saveNotificationSettings({
      dailyReminderHour: hour,
      dailyReminderMinute: minute,
    });
    setNotifSettings(updated);
    if (notifSettings.dailyReminderEnabled) {
      showToast.info(
        t("profileExtra.reminderUpdatedTitle"),
        t("profileExtra.reminderUpdatedMsg", {
          time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
        })
      );
    }
  }

  // Handle toggle other notifications
  async function handleToggleContentUpdates(val: boolean) {
    const updated = await saveNotificationSettings({ contentUpdatesEnabled: val });
    setNotifSettings(updated);
  }

  async function handleTogglePromotions(val: boolean) {
    const updated = await saveNotificationSettings({ promotionsEnabled: val });
    setNotifSettings(updated);
  }

  // Handle Restore Purchases
  async function handleRestorePurchases() {
    setRestoringIap(true);
    try {
      const res = await restoreStorePurchases({ authToken });
      if (res.restored) {
        showToast.success(t("payment.restoreSuccess"), res.message);
      } else {
        Alert.alert(t("payment.restoreTitle"), res.message);
      }
    } catch (e: any) {
      showToast.error(t("profileExtra.restoreError"), String(e.message || e));
    } finally {
      setRestoringIap(false);
    }
  }

  const isPro = Boolean(usage?.has_active_subscription || usage?.tier === "pro");

  const userTier = useMemo(
    () =>
      resolveUserTier({
        authToken,
        hasActiveSubscription: isPro,
        isInTrial: Boolean(usage?.is_in_trial),
      }),
    [authToken, isPro, usage]
  );
  const userKey = useMemo(() => resolveUserKey({ authToken, authEmail }), [authToken, authEmail]);

  function handleOpenSupport() {
    Alert.alert(
      t("profileExtra.supportDialog.title"),
      t("profileExtra.supportDialog.message"),
      [
        { text: t("profileExtra.supportDialog.close"), style: "cancel" },
        {
          text: t("profileExtra.supportDialog.sendEmail"),
          onPress: () =>
            Linking.openURL("mailto:support@earlysigns.app?subject=EarlySigns Support Request").catch(
              () => { }
            ),
        },
      ]
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      t("profileExtra.deleteDialog.title"),
      t("profileExtra.deleteDialog.message"),
      [
        { text: t("profileExtra.deleteDialog.cancel"), style: "cancel" },
        {
          text: t("profileExtra.deleteDialog.confirm"),
          style: "destructive",
          onPress: async () => {
            try {
              if (authToken) {
                await authApi.deleteAccount().catch(() => { });
              }
            } finally {
              handleLogout();
              showToast.info(
                t("profileExtra.deleteDialog.toastSuccess"),
                t("profileExtra.deleteDialog.toastMessage")
              );
              navigation.navigate("Home");
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#1e2538]">
      <ScrollView
        className="flex-1 bg-appBg"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f59e0b"
          />
        }
      >
        {/* Top elastic overscroll filler */}
        <View
          style={{
            position: "absolute",
            top: -1000,
            left: 0,
            right: 0,
            height: 1000,
            backgroundColor: "#1e2538",
          }}
        />

        {/* 1. SOFT NAVY HERO HEADER */}
        <View className="bg-[#1e2538] pt-4 pb-9 px-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-xl font-black tracking-tight">
              {t("profileExtra.screenTitle")}
            </Text>
            {isPro ? (
              <View className="flex-row items-center gap-1.5 bg-amber-500 px-3 py-1 rounded-full">
                <Crown size={12} color="#ffffff" strokeWidth={2.4} />
                <Text className="text-xs font-black text-white">
                  {t("profileExtra.proBadge")}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate("Payment")}
                className="flex-row items-center gap-1.5 bg-amber-500 active:bg-amber-600 px-3.5 py-1.5 rounded-full"
              >
                <Crown size={13} color="#ffffff" />
                <Text className="text-white text-xs font-bold">
                  {t("profileExtra.upgradePro")}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* User Card */}
          <View className="flex-row items-center gap-3.5">
            <View className="w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center">
              <Text className="text-white text-xl font-black">
                {authEmail ? authEmail[0].toUpperCase() : "E"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-bold" numberOfLines={1}>
                {authEmail || t("profileExtra.guestUser")}
              </Text>
              <Text className="text-slate-300 text-xs mt-0.5">
                {t("profileExtra.rpStandard")}
              </Text>
              {usage?.subscription_expires_at ? (
                <Text className="text-slate-300 text-2xs mt-0.5">
                  {t("profileExtra.planExpiry", {
                    date: new Date(usage.subscription_expires_at).toLocaleDateString(),
                  })}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-20 gap-3.5">
          {/* CAPSULE PILL SEGMENTED CONTROL */}
          <View className="bg-slate-200 p-1.5 rounded-2xl flex-row items-center mb-1">
            <TouchableOpacity
              activeOpacity={0.8}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center ${activeTab === TAB_PROGRESS ? "bg-white" : "bg-transparent"
                }`}
              style={
                activeTab === TAB_PROGRESS
                  ? {
                    elevation: 2,
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                  }
                  : undefined
              }
              onPress={() => setActiveTab(TAB_PROGRESS)}
            >
              <Text
                className={`text-xs font-bold ${activeTab === TAB_PROGRESS ? "text-slate-900" : "text-slate-500"
                  }`}
              >
                {t("profile.tabs.progress")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center ${activeTab === TAB_ACCOUNT ? "bg-white" : "bg-transparent"
                }`}
              style={
                activeTab === TAB_ACCOUNT
                  ? {
                    elevation: 2,
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                  }
                  : undefined
              }
              onPress={() => setActiveTab(TAB_ACCOUNT)}
            >
              <Text
                className={`text-xs font-bold ${activeTab === TAB_ACCOUNT ? "text-slate-900" : "text-slate-500"
                  }`}
              >
                {t("profile.tabs.account")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: PROGRESS */}
          {activeTab === TAB_PROGRESS ? (
            loading ? (
              <ProfileProgressSkeleton />
            ) : (
              <>
                {error ? (
                  <View className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                    <Text className="text-danger text-xs">{error}</Text>
                  </View>
                ) : null}

                {/* DUAL CIRCULAR / STAT BUBBLES */}
                <View className="flex-row items-center gap-3">
                  {/* Stat 1: Average Accuracy */}
                  <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 items-center">
                    <View className="w-10 h-10 rounded-2xl bg-indigo-50 items-center justify-center mb-2">
                      <Target size={20} color="#4f46e5" />
                    </View>
                    <Text className="text-2xl font-black text-slate-900">
                      {avgScore > 0 ? `${avgScore}%` : "--"}
                    </Text>
                    <Text className="text-2xs font-semibold text-slate-400 mt-0.5">
                      {t("profileExtra.avgAccuracy")}
                    </Text>
                  </View>

                  {/* Stat 2: Sounds Mastered */}
                  <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 items-center">
                    <View className="w-10 h-10 rounded-2xl bg-emerald-50 items-center justify-center mb-2">
                      <Award size={20} color="#059669" />
                    </View>
                    <Text className="text-2xl font-black text-slate-900">
                      {qualifiedPhonemes.length}/{TOTAL_IPA_PHONEMES}
                    </Text>
                    <Text className="text-2xs font-semibold text-slate-400 mt-0.5">
                      {t("profileExtra.qualifiedSounds")}
                    </Text>
                  </View>
                </View>

                {/* PRO CTA BANNER (IF NOT PRO) */}
                {!isPro ? (
                  <View className="bg-[#1e2538] rounded-2xl p-4 border border-amber-400 flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <Crown size={14} color="#f59e0b" />
                        <Text className="text-amber-400 font-bold text-xs uppercase tracking-wide">
                          {t("profileExtra.proBannerTitle")}
                        </Text>
                      </View>
                      <Text className="text-slate-200 text-xs font-medium leading-relaxed">
                        {t("profileExtra.proBannerSubtitle")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate("Payment")}
                      className="bg-amber-500 active:bg-amber-600 px-3.5 py-2.5 rounded-xl items-center justify-center"
                    >
                      <Text className="text-white font-bold text-xs">
                        {t("profileExtra.upgradeBtn")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* 7-DAY STREAK TRACKER */}
                <View className="bg-white rounded-2xl p-4 border border-slate-100 gap-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center">
                        <Flame size={18} color="#f59e0b" />
                      </View>
                      <View>
                        <Text className="text-sm font-bold text-slate-900">
                          {t("profileExtra.streakTitle")}
                        </Text>
                        <Text className="text-xs text-slate-400">
                          {t("profileExtra.streakDesc")}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      <Text className="text-xs font-bold text-amber-700">
                        {t("profileExtra.streakDays", { days: streakDays })}
                      </Text>
                    </View>
                  </View>

                  {/* Weekly Day Pills */}
                  <View className="flex-row justify-between items-center pt-2 border-t border-slate-100">
                    {weekDays.map((dayLabel, index) => {
                      const isPast = index < todayWeekIndex;
                      const isToday = index === todayWeekIndex;
                      const isActive =
                        isToday || (isPast && streakDays > todayWeekIndex - index);
                      return (
                        <View key={dayLabel} className="items-center flex-1">
                          <Text
                            className={`text-2xs font-bold mb-1.5 ${isToday ? "text-amber-500 font-extrabold" : "text-slate-400"
                              }`}
                          >
                            {dayLabel}
                          </Text>
                          <View
                            className={`w-8 h-8 rounded-full items-center justify-center ${isToday
                              ? "bg-amber-500 border-2 border-amber-300"
                              : isActive
                                ? "bg-amber-100 border border-amber-300"
                                : "bg-slate-100 border border-slate-200"
                              }`}
                          >
                            {isToday ? (
                              <Flame size={16} color="#ffffff" />
                            ) : isActive ? (
                              <Star size={14} color="#d97706" fill="#f59e0b" />
                            ) : (
                              <View className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* THRESHOLD 80% COVERAGE GATE OR CHART */}
                {!loading && !isThresholdMet ? (
                  <View className="bg-white rounded-2xl p-5 border border-slate-100 gap-3.5">
                    <View className="flex-row items-center gap-3">
                      <View className="w-11 h-11 rounded-2xl bg-indigo-50 items-center justify-center">
                        <Sparkles size={20} color="#4f46e5" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-slate-900">
                          {t("profileExtra.profileBuildingTitle")}
                        </Text>
                        <Text className="text-xs text-slate-400">
                          {t("profileExtra.profileBuildingSubtitle")}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-xs text-slate-600 leading-relaxed">
                      {t("profileExtra.profileBuildingPart1")}{" "}
                      <Text className="text-slate-900 font-bold">{t("profileExtra.profileBuildingMinChecks")}</Text>{" "}
                      {t("profileExtra.profileBuildingForAtLeast")}{" "}
                      <Text className="text-indigo-600 font-bold">
                        {t("profileExtra.profileBuildingThreshold", {
                          count: PHONEME_THRESHOLD_COUNT,
                          total: TOTAL_IPA_PHONEMES,
                        })}
                      </Text>.
                    </Text>

                    {/* Progress bar */}
                    <View className="gap-1.5">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs font-semibold text-slate-500">
                          {t("profileExtra.unlockProgress")}
                        </Text>
                        <Text className="text-xs font-bold text-indigo-600">
                          {qualifiedPhonemes.length} / {PHONEME_THRESHOLD_COUNT} âm (
                          {Math.min(
                            100,
                            Math.round(
                              (qualifiedPhonemes.length / PHONEME_THRESHOLD_COUNT) * 100
                            )
                          )}
                          %)
                        </Text>
                      </View>
                      <View className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-indigo-600 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (qualifiedPhonemes.length / PHONEME_THRESHOLD_COUNT) * 100
                            )}%`,
                          }}
                        />
                      </View>
                    </View>

                    <View className="flex-row items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <Target size={16} color="#4f46e5" />
                      <Text className="text-xs text-slate-600 flex-1">
                        {t("profileExtra.unlockTip")}
                      </Text>
                    </View>

                    <PrimaryButton
                      title={t("profileExtra.practiceNowBtn")}
                      variant="primary"
                      onPress={() => navigation.navigate("Home")}
                    />
                  </View>
                ) : !loading && isThresholdMet ? (
                  <>
                    {/* CHART CARD */}
                    <View className="bg-white rounded-2xl p-4 border border-slate-100 gap-3">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-sm font-bold text-slate-900">
                          {t("profile.progressTitle")}
                        </Text>
                        <View className="flex-row items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 size={13} color="#059669" />
                          <Text className="text-2xs font-bold text-emerald-700">
                            {t("profileExtra.unlocked")}
                          </Text>
                        </View>
                      </View>

                      <View className="items-center py-2">
                        <LineChart
                          data={{
                            labels,
                            datasets: [{ data: totalData.length ? totalData : [0] }],
                          }}
                          width={chartWidth}
                          height={190}
                          yAxisSuffix="%"
                          chartConfig={{
                            backgroundColor: "#ffffff",
                            backgroundGradientFrom: "#ffffff",
                            backgroundGradientTo: "#ffffff",
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                            labelColor: () => "#64748b",
                            style: {
                              borderRadius: 16,
                            },
                            propsForDots: {
                              r: "4",
                              strokeWidth: "2",
                              stroke: "#4f46e5",
                            },
                            propsForBackgroundLines: {
                              strokeDasharray: "4 4",
                              stroke: "#f1f5f9",
                            },
                          }}
                          bezier
                          style={{ borderRadius: 16 }}
                        />
                      </View>
                    </View>

                    {/* INDIVIDUAL PHONEMES GRID */}
                    <View className="bg-white rounded-2xl p-4 border border-slate-100 gap-3">
                      <Text className="text-sm font-bold text-slate-900">
                        {t("profileExtra.phonemeDetails", { count: items.length })}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {items.map((item) => {
                          const acc = Math.round((item.accuracy || 0) * 100);
                          const isQualified =
                            (item.checks_count ?? item.count ?? 5) >= MIN_CHECKS_PER_PHONEME;
                          return (
                            <View
                              key={item.sound}
                              className="border border-slate-200 bg-slate-50 rounded-xl px-3 py-1.5 flex-row items-center gap-1.5"
                            >
                              <Text
                                className="font-bold text-xs"
                                style={{ color: accuracyBandColor(item.accuracy || 0) }}
                              >
                                /{item.sound}/ {acc}%
                              </Text>
                              {isQualified ? (
                                <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              ) : (
                                <View className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </>
                ) : null}
              </>
            )
          ) : (
            /* TAB 2: ACCOUNT SETTINGS */
            <>
              {/* MONTHLY QUOTA CARD */}
              <MonthlyQuotaCard
                userKey={userKey}
                userTier={userTier}
                usageStatus={usage}
                onUpgradePress={() => navigation.navigate("Payment")}
              />

              {/* MASTER CARD 1: STORE IAP & SUBSCRIPTION MANAGEMENT */}
              <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <View className="px-4 pt-3.5 pb-2">
                  <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("profileExtra.membershipGroup")}
                  </Text>
                </View>

                {/* Upgrade Item */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between p-3.5"
                  onPress={() => navigation.navigate("Payment")}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-amber-100 items-center justify-center">
                      <Crown size={20} color="#d97706" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-slate-900">
                        {isPro ? t("profileExtra.proBenefitsTitle") : t("profileExtra.proUpgradeTitle")}
                      </Text>
                      <Text className="text-xs text-slate-400">
                        {isPro ? t("profileExtra.proActiveDesc") : t("profileExtra.proUpgradeDesc")}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>

                <View className="h-[1px] bg-slate-100 mx-4" />

                {/* Restore Purchases Item */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between p-3.5"
                  onPress={handleRestorePurchases}
                  disabled={restoringIap}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-blue-100 items-center justify-center">
                      {restoringIap ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                      ) : (
                        <RefreshCw size={19} color="#2563eb" />
                      )}
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-slate-900">
                        {t("profileExtra.restoreTitle")}
                      </Text>
                      <Text className="text-xs text-slate-400">
                        {t("profileExtra.restoreDesc")}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>

                <View className="h-[1px] bg-slate-100 mx-4" />

                {/* Manage Subscriptions Item */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between p-3.5"
                  onPress={openManageSubscriptions}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-slate-100 items-center justify-center">
                      <ExternalLink size={19} color="#475569" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-slate-900">
                        {t("profileExtra.manageStoreTitle")}
                      </Text>
                      <Text className="text-xs text-slate-400">
                        {t("profileExtra.manageStoreDesc")}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* MASTER CARD 2: DAILY REMINDER & NOTIFICATION SETTINGS */}
              <View className="bg-white rounded-2xl border border-slate-100 p-4 gap-3.5">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-2xl bg-indigo-50 items-center justify-center">
                    <Bell size={20} color="#4f46e5" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900">
                      {t("profileExtra.notifGroup")}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {t("profileExtra.notifGroupDesc")}
                    </Text>
                  </View>
                </View>

                {/* Toggle Daily Reminder */}
                <View className="flex-row items-center justify-between pt-1">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-slate-800">
                      {t("profileExtra.dailyReminder")}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {t("profileExtra.dailyReminderDesc")}
                    </Text>
                  </View>
                  <Switch
                    value={notifSettings.dailyReminderEnabled}
                    onValueChange={handleToggleDailyReminder}
                    trackColor={{ false: "#e2e8f0", true: "#4f46e5" }}
                  />
                </View>

                {notifSettings.dailyReminderEnabled && !notifPermissionGranted ? (
                  <View className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <Text className="text-2xs text-amber-700 leading-relaxed">
                      {t("profileExtra.notifPermissionWarning")}
                    </Text>
                  </View>
                ) : null}

                {/* Time Selector Chips */}
                {notifSettings.dailyReminderEnabled ? (
                  <View className="gap-2 pt-2 border-t border-slate-100">
                    <View className="flex-row items-center gap-1.5">
                      <Clock size={13} color="#4f46e5" />
                      <Text className="text-xs font-semibold text-slate-600">
                        {t("profileExtra.chooseReminderTime")}
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {PRESET_REMINDER_TIMES.map((preset) => {
                        const isSelected =
                          notifSettings.dailyReminderHour === preset.hour &&
                          notifSettings.dailyReminderMinute === preset.minute;
                        return (
                          <TouchableOpacity
                            key={preset.label}
                            className={`px-3 py-1.5 rounded-full border ${isSelected
                              ? "bg-indigo-600 border-indigo-600"
                              : "bg-slate-100 border-slate-200"
                              }`}
                            onPress={() =>
                              handleSelectReminderTime(preset.hour, preset.minute)
                            }
                          >
                            <Text
                              className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-700"
                                }`}
                            >
                              {preset.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {/* Additional toggles */}
                <View className="gap-2.5 pt-2 border-t border-slate-100">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-xs font-medium text-slate-700">
                        {t("profileExtra.contentUpdates")}
                      </Text>
                    </View>
                    <Switch
                      value={notifSettings.contentUpdatesEnabled}
                      onValueChange={handleToggleContentUpdates}
                      trackColor={{ false: "#e2e8f0", true: "#4f46e5" }}
                    />
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-xs font-medium text-slate-700">
                        {t("profileExtra.promotions")}
                      </Text>
                    </View>
                    <Switch
                      value={notifSettings.promotionsEnabled}
                      onValueChange={handleTogglePromotions}
                      trackColor={{ false: "#e2e8f0", true: "#4f46e5" }}
                    />
                  </View>
                </View>

                {/* Device settings link */}
                <TouchableOpacity
                  className="flex-row items-center justify-between pt-2 border-t border-slate-100"
                  onPress={openNotificationSettings}
                >
                  <Text className="text-xs text-indigo-600 font-semibold">
                    {t("profileExtra.openDeviceSettings")}
                  </Text>
                  <ExternalLink size={13} color="#4f46e5" />
                </TouchableOpacity>
              </View>

              {/* MASTER CARD 3: DIALECT & LANGUAGE */}
              <View className="bg-white rounded-2xl border border-slate-100 p-4 gap-3">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-2xl bg-violet-100 items-center justify-center">
                    <Volume2 size={20} color="#7c3aed" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900">
                      {t("profileExtra.voiceLangGroup")}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {t("profileExtra.voiceLangDesc")}
                    </Text>
                  </View>
                </View>

                <View className="pt-2 border-t border-slate-100 gap-3">
                  <DialectToggle
                    value={userDialect}
                    saving={dialectSaving}
                    onChange={async (next) => {
                      setDialectSaving(true);
                      try {
                        await updateUserDialect(next);
                      } finally {
                        setDialectSaving(false);
                      }
                    }}
                  />
                  <LanguageSwitcher />
                </View>
              </View>

              {/* MASTER CARD 4: LEGAL, REFERRAL & SUPPORT */}
              <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <View className="px-4 pt-3.5 pb-2">
                  <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("profileExtra.supportLegalGroup")}
                  </Text>
                </View>

                {/* Referral */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between p-3.5"
                  onPress={() => navigation.navigate("Referral")}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center">
                      <Gift size={18} color="#059669" />
                    </View>
                    <Text className="text-sm font-semibold text-slate-800">
                      {t("profileExtra.referralFriends")}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>

                <View className="h-[1px] bg-slate-100 mx-4" />

                {/* Support */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between p-3.5"
                  onPress={handleOpenSupport}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-9 h-9 rounded-xl bg-sky-100 items-center justify-center">
                      <HelpCircle size={18} color="#0284c7" />
                    </View>
                    <Text className="text-sm font-semibold text-slate-800">
                      {t("profileExtra.contactSupport")}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>

                <View className="h-[1px] bg-slate-100 mx-4" />

                {/* About */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between p-3.5"
                  onPress={() => navigation.navigate("About")}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-9 h-9 rounded-xl bg-purple-100 items-center justify-center">
                      <Sparkles size={18} color="#9333ea" />
                    </View>
                    <Text className="text-sm font-semibold text-slate-800">
                      {t("profileExtra.aboutApp")}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>

                <View className="h-[1px] bg-slate-100 mx-4" />

                {/* Terms & Privacy */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between p-3.5"
                  onPress={() => navigation.navigate("Terms")}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-9 h-9 rounded-xl bg-slate-100 items-center justify-center">
                      <ShieldCheck size={18} color="#475569" />
                    </View>
                    <Text className="text-sm font-semibold text-slate-800">
                      {t("profileExtra.termsPrivacy")}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* AUTH ACTIONS */}
              {authToken ? (
                <View className="gap-2.5 pt-1">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleLogout}
                    className="bg-white border border-rose-200 py-3.5 rounded-2xl items-center flex-row justify-center gap-2 active:bg-rose-50"
                  >
                    <LogOut size={16} color="#e11d48" />
                    <Text className="text-sm font-bold text-rose-600">
                      {t("auth.logout")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleDeleteAccount}
                    className="py-2 items-center flex-row justify-center gap-1.5 opacity-80"
                  >
                    <Trash2 size={13} color="#e11d48" />
                    <Text className="text-2xs text-rose-600 font-medium underline">
                      {t("profileExtra.deleteAccountBtn")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <PrimaryButton
                  title={t("login.title")}
                  variant="primary"
                  onPress={() => navigation.navigate("Login", { next: "Profile" })}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
