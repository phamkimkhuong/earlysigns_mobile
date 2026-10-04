import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { customAlert } from "@/utils/customAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpCircle,
  AudioLines,
  Bell,
  Check,
  ChevronRight,
  Crown,
  ExternalLink,
  Flame,
  FileText,
  Gift,
  Globe,
  HelpCircle,
  Info,
  LogOut,
  Mail,
  Mic,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  User,
  X,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import {
  useProgressSoundsQuery,
  useProgressHistoryQuery,
  progressKeys,
} from "@/hooks/queries/useProgressQueries";
import { billingKeys } from "@/hooks/queries/useBillingQueries";
import { lessonKeys } from "@/hooks/queries/useLessonQueries";
import { useBillingStore } from "@/store/useBillingStore";
import { accuracyBandColor } from "@/utils/checkResultScoreColor";
import { authApi } from "@/api";
import { showToast } from "@/utils/toast";
import { formatExpiryDate } from "@/utils/errors";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { ProfileProgressSkeleton } from "@/components/ui/Skeleton";
import { GuestProfileView, AppText } from "@/components";
import { getIpaSoundMeta } from "@/utils/ipaData";
import { resolveUserTier } from "@/services/usageLimits";
import { getItem } from "@/services/storage";
import { setStoredLanguage } from "@/core/i18n";
import { colors } from "@/core/theme";
import { restoreStorePurchases, openManageSubscriptions } from "@/services/iap";
import { useAppUpdateStore } from "@/store/useAppUpdateStore";
import { getCurrentAppVersion } from "@/services/appUpdate";

const TAB_PROGRESS = "progress";
const TAB_ACCOUNT = "account";
const HISTORY_DAYS = 7;
const TOTAL_IPA_PHONEMES = 44;
const MIN_CHECKS_PER_PHONEME = 5;
// 80% coverage requirement: Math.ceil(44 * 0.8) = 36 phonemes
const PHONEME_THRESHOLD_COUNT = Math.ceil(TOTAL_IPA_PHONEMES * 0.8);

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

function formatDateLabel(dStr: string): string {
  const p = dStr.split("-");
  return p.length >= 3 ? `${p[2]}/${p[1]}` : dStr;
}

function fillDailyAccuracy(
  history: any[],
  dates: string[],
  key: "total" | "vowels" | "consonants" = "total"
): number[] {
  const map = new Map<string, number>();
  for (const h of history) {
    if (h && typeof h.date === "string") {
      const raw = h?.accuracy?.[key] ?? h?.[key];
      const v = Number(raw);
      if (Number.isFinite(v)) {
        const pct = v <= 1 ? Math.round(v * 100) : Math.round(v);
        map.set(h.date.slice(0, 10), pct);
      }
    }
  }

  // Khởi tạo điểm nền tảng bằng mốc điểm ghi nhận đầu tiên để tránh sụt 0% giả tạo
  let firstVal = 0;
  for (const d of dates) {
    if (map.has(d)) {
      firstVal = map.get(d)!;
      break;
    }
  }

  let last = firstVal;
  return dates.map((d) => {
    if (map.has(d)) {
      last = map.get(d)!;
      return last;
    }
    return last;
  });
}


export default function ProfileScreen({ route, navigation }: { route: any; navigation: any }) {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const {
    authToken,
    authEmail,
    scoreUnlocked,
    screeningCompleted,
    handleLogout,
    updateUserLanguage,
  } = useAuth();

  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const currentLang = String(i18n.resolvedLanguage || i18n.language || "vi").startsWith("vi") ? "vi" : "en";

  const handleSelectLanguage = useCallback(
    async (lng: "vi" | "en") => {
      if (lng !== currentLang) {
        setStoredLanguage(lng);
        await i18n.changeLanguage(lng);
        try {
          await updateUserLanguage(lng);
        } catch {
          /* keep local */
        }
      }
      setLanguageModalVisible(false);
    },
    [currentLang, i18n, updateUserLanguage]
  );

  const handleRestorePurchases = useCallback(async () => {
    setIsRestoring(true);
    try {
      const res = await restoreStorePurchases({ authToken });
      if (res.restored) {
        showToast.success(
          t("profile.restoreSuccessTitle") || "Khôi phục thành công",
          res.message || t("profile.restoreSuccessMessage") || "Đã khôi phục thành công gói EarlySigns Pro của bạn."
        );
        queryClient.invalidateQueries({ queryKey: billingKeys.all });
      } else {
        customAlert.alert(
          t("profile.restorePurchasesTitle") || "Khôi phục giao dịch",
          res.message || t("profile.restoreNotFoundMessage") || "Không tìm thấy giao dịch nào cần khôi phục cho tài khoản này."
        );
      }
    } catch (err: any) {
      showToast.error(
        t("common.error") || "Lỗi",
        err?.message || t("profile.restoreErrorMessage") || "Không thể khôi phục giao dịch lúc này. Vui lòng thử lại sau."
      );
    } finally {
      setIsRestoring(false);
    }
  }, [authToken, queryClient, t]);

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const handleCheckUpdate = useCallback(async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await useAppUpdateStore.getState().checkUpdate({ ignoreDismissed: true });
      if (!res || !res.shouldUpdate) {
        showToast.success(
          t("appUpdate.latestTitle", "Ứng dụng đã là bản mới nhất"),
          t("appUpdate.latestMessage", {
            version: `v${getCurrentAppVersion()}`,
            defaultValue: `Bạn đang sử dụng phiên bản v${getCurrentAppVersion()}`,
          })
        );
      }
    } catch {
      // ignore
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [t]);

  const displayEmail = useMemo(() => {
    return authEmail || t("profile.noEmailLinked") || "Chưa liên kết email";
  }, [authEmail, t]);

  const headerDisplayName = useMemo(() => {
    if (!authToken) return t("profile.guestUser") || "Khách EarlySigns";
    if (!authEmail) return t("profile.studentName") || "Học viên EarlySigns";
    if (authEmail.includes("@")) {
      return authEmail.split("@")[0];
    }
    return authEmail;
  }, [authToken, authEmail, t]);

  const routeTab = route?.params?.tab === "account" ? TAB_ACCOUNT : TAB_PROGRESS;
  const [tabOverride, setTabOverride] = useState<"progress" | "account" | null>(null);
  const [prevRouteTab, setPrevRouteTab] = useState(routeTab);

  if (prevRouteTab !== routeTab) {
    setPrevRouteTab(routeTab);
    setTabOverride(null);
  }

  const activeTab = tabOverride ?? routeTab;
  const setActiveTab = (tab: "progress" | "account") => setTabOverride(tab);

  const usage = useBillingStore((s) => s.usage);
  const homeSummary = useBillingStore((s) => s.homeSummary);

  const dates = useMemo(() => dateRange(HISTORY_DAYS), []);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // TanStack Query for Progress Sounds & History
  const {
    data: items = [],
    isLoading: soundsLoading,
  } = useProgressSoundsQuery("uk", Boolean(authToken));

  const {
    data: history = [],
    isLoading: historyLoading,
  } = useProgressHistoryQuery(startDate, endDate, Boolean(authToken));

  const loading = soundsLoading || historyLoading;

  const { refreshing, onRefresh } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: progressKeys.all }),
        queryClient.invalidateQueries({ queryKey: billingKeys.all }),
        queryClient.invalidateQueries({ queryKey: lessonKeys.all }),
      ]);
    }, [queryClient]),
    {
      tintColor: "#0284c7",
      enableHaptics: true,
      minDurationMs: 450,
    }
  );

  // User Tier (Free, Trial, Pro)
  const userTier = useMemo(
    () =>
      resolveUserTier({
        authToken,
        hasActiveSubscription: Boolean(usage?.has_active_subscription),
        isInTrial: Boolean(usage?.is_in_trial),
      }),
    [authToken, usage]
  );
  const isPro = userTier === "pro";

  // Strict Threshold Calculation (Spec Section 13.1):
  // 1. Each qualified phoneme must have at least 5 checks (never inferring 5 checks from accuracy presence).
  // 2. Must cover at least 36 distinct phonemes (Math.ceil(44 * 0.8) = 36).
  const qualifiedPhonemes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item: any) => {
      if (!item || typeof item.sound !== "string") return;
      const cleanSound = item.sound.trim().replace(/^\/+|\/+$/g, "");
      const checks = Number(item.checks_count ?? item.count);
      if (cleanSound && Number.isFinite(checks) && checks >= MIN_CHECKS_PER_PHONEME) {
        set.add(cleanSound.toLowerCase());
      }
    });
    return set;
  }, [items]);

  // isThresholdMet: Unlocked when user completes screening test OR achieves 36 qualified phonemes (>= 5 checks)
  const isThresholdMet = Boolean(
    authToken && (scoreUnlocked || qualifiedPhonemes.size >= PHONEME_THRESHOLD_COUNT)
  );

  // Average score across qualified phonemes or home summary total accuracy
  const avgScore = useMemo(() => {
    if (homeSummary?.total_accuracy != null) {
      const parsed = Number(homeSummary.total_accuracy);
      if (Number.isFinite(parsed) && parsed >= 0) return Math.round(parsed * 100);
    }
    if (!items.length) return 0;
    const sum = items.reduce((acc: number, it: any) => acc + (Number(it.accuracy) || 0), 0);
    return Math.round((sum / items.length) * 100);
  }, [homeSummary?.total_accuracy, items]);

  // Weakest sounds for actionable section
  const topWeakSounds = useMemo(() => {
    return items
      .filter((it: any) => it?.sound && it.accuracy != null)
      .sort((a: any, b: any) => Number(a.accuracy) - Number(b.accuracy))
      .slice(0, 3);
  }, [items]);

  // Streak days & weekday indicators (real data from API homeSummary)
  const rawStreak = Number(homeSummary?.streak_days ?? homeSummary?.daily_streak);
  const streakDays = Number.isFinite(rawStreak) && rawStreak >= 0 ? Math.floor(rawStreak) : 0;
  const todayWeekIndex = (new Date().getDay() + 6) % 7; // 0 = Mon, ..., 6 = Sun

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const todayPracticed = useMemo(() => {
    if (Boolean(homeSummary?.today_practiced)) return true;
    if (Array.isArray(history)) {
      const todayEntry = history.find(
        (h) => typeof h?.date === "string" && h.date.slice(0, 10) === todayStr
      );
      if (todayEntry) {
        const todayCount = Number(todayEntry.count ?? 0);
        const todayTotal = Number(todayEntry.accuracy?.total ?? todayEntry.total ?? 0);
        if (todayCount > 0 || todayTotal > 0) return true;
      }
    }
    return false;
  }, [homeSummary?.today_practiced, history, todayStr]);

  // Screening test progress state (matches 5-sentence screening flow)
  const totalScreeningCount = 5;
  const completedScreeningCount = useMemo(() => {
    if (screeningCompleted || scoreUnlocked) return totalScreeningCount;
    const stored = getItem("earlysigns_screening_progress");
    if (stored != null) {
      const num = Number(stored);
      if (Number.isFinite(num) && num >= 0) return Math.min(num, totalScreeningCount);
    }
    return 0;
  }, [screeningCompleted, scoreUnlocked, totalScreeningCount]);
  const screeningProgressPct = Math.round((completedScreeningCount / totalScreeningCount) * 100);

  // Responsive screening card illustration size (prominent 3D hero asset)
  const screeningImageSize = useMemo(() => {
    const availableWidth = width - 72; // screen padding (16*2) + card padding (20*2)
    return Math.min(156, Math.max(130, Math.round(availableWidth * 0.46)));
  }, [width]);

  // Responsive chart width
  const chartWidth = Math.max(280, Math.min(width - 48, 520));
  const labels = dates.map(formatDateLabel);
  const totalData = fillDailyAccuracy(history, dates, "total");

  // Safe navigation handler
  const handleNavigate = useCallback(
    (screen: string, params?: any) => {
      try {
        if (navigation?.navigate) {
          navigation.navigate(screen, params);
          return;
        }
        const parent = navigation?.getParent?.();
        if (parent?.navigate) {
          parent.navigate(screen, params);
        }
      } catch (err) {
        console.warn("handleNavigate error:", err);
      }
    },
    [navigation]
  );

  // Account actions
  async function confirmLogout() {
    customAlert.alert(
      t("auth.logout") || "Đăng xuất",
      t("profile.confirmLogout") || "Bạn có chắc chắn muốn đăng xuất tài khoản?",
      [
        { text: t("common.cancel", "Hủy"), style: "cancel" },
        {
          text: t("auth.logout") || "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await handleLogout();
              queryClient.clear();
              showToast.success(t("profile.loggedOut") || "Đã đăng xuất thành công");
              handleNavigate("Login", { next: "Main" });
            } catch (err) {
              console.warn("Logout error:", err);
              showToast.error(
                t("common.error") || "Lỗi",
                t("profile.logoutError") || "Không thể hoàn tất đăng xuất. Vui lòng thử lại."
              );
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  }

  async function confirmDeleteAccount() {
    customAlert.alert(
      t("profile.deleteAccount") || "Xóa tài khoản",
      t("profile.confirmDelete") ||
      "Hành động này sẽ xóa vĩnh viễn dữ liệu tiến độ và gói cước của bạn. Không thể hoàn tác.",
      [
        { text: t("common.cancel", "Hủy"), style: "cancel" },
        {
          text: t("common.delete", "Xóa vĩnh viễn"),
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await authApi.deleteAccount();
              await handleLogout();
              queryClient.clear();
              showToast.info(t("profile.accountDeletedSuccess") || "Tài khoản của bạn đã được xóa thành công.");
              handleNavigate("Login", { next: "Main" });
            } catch {
              showToast.error(
                t("common.error") || "Lỗi",
                t("profile.accountDeleteError") || "Không thể xóa tài khoản. Vui lòng thử lại sau."
              );
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  }

  if (isLoggingOut) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-appBg items-center justify-center p-6">
        <View
          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
          className="rounded-3xl p-7 items-center justify-center gap-4 border shadow-xl min-w-[220px]"
        >
          <ActivityIndicator size="large" color="#4f46e5" />
          <AppText className="text-[15px] font-bold text-[#0f172a]">
            {t("auth.loggingOut") || "Đang đăng xuất..."}
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (!authToken) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
        <GuestProfileView navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48, gap: 16 }}
        refreshControl={
          authToken ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0284c7"
            />
          ) : undefined
        }
      >
        {/* 1. PROFILE HEADER: USER IDENTITY SURFACE */}
        <View
          style={{
            backgroundColor: colors.practiceHeader,
            borderColor: "#154d77",
            shadowColor: colors.practiceHeader,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 4,
          }}
          className="rounded-3xl p-5 border gap-3"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3.5 flex-1 pr-2">
              {/* User Avatar Circle */}
              <View
                style={{ backgroundColor: "rgba(255, 255, 255, 0.16)", borderColor: "rgba(255, 255, 255, 0.25)" }}
                className="w-14 h-14 rounded-2xl items-center justify-center border"
              >
                <AppText className="text-xl font-black text-white">
                  {headerDisplayName ? headerDisplayName.charAt(0).toUpperCase() : "E"}
                </AppText>
              </View>

              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-2">
                  <AppText numberOfLines={1} className="text-base font-black text-white">
                    {headerDisplayName}
                  </AppText>

                  {/* Plan Badge */}
                  {authToken ? (
                    <View
                      style={{
                        backgroundColor: isPro ? "#f59e0b" : "rgba(255, 255, 255, 0.2)",
                      }}
                      className="px-2.5 py-0.5 rounded-full"
                    >
                      <AppText
                        style={{ color: isPro ? "#0f172a" : "#ffffff" }}
                        className="text-xs font-black uppercase tracking-wider"
                      >
                        {isPro ? "PRO" : "FREE"}
                      </AppText>
                    </View>
                  ) : null}
                </View>

                <AppText numberOfLines={1} className="text-[13px] text-sky-100">
                  {authToken
                    ? (isPro ? t("profile.proMember") || "Thành viên EarlySigns Pro" : t("profile.freeAccount") || "Tài khoản học miễn phí")
                    : t("profile.notLoggedIn") || "Chưa đăng nhập tài khoản"}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* 2. SEGMENTED TABS: [ 📊 Tiến độ ]  [ ⚙️ Tài khoản ] */}
        <View
          style={{ backgroundColor: "#e2e8f0" }}
          className="flex-row rounded-2xl p-1 gap-1"
        >
          <TouchableOpacity
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel={t("profile.tabs.progress", "Tiến độ học tập")}
            accessibilityState={{ selected: activeTab === TAB_PROGRESS }}
            onPress={() => setActiveTab(TAB_PROGRESS)}
            style={{
              flex: 1,
              backgroundColor: activeTab === TAB_PROGRESS ? "#ffffff" : "transparent",
            }}
            className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl"
          >
            <Target size={16} color={activeTab === TAB_PROGRESS ? "#0c2340" : "#64748b"} />
            <AppText
              style={{ color: activeTab === TAB_PROGRESS ? "#0c2340" : "#64748b" }}
              className="text-sm font-bold"
            >
              {t("profile.tabs.progress") || "Tiến độ"}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel={t("profile.tabs.account", "Cài đặt tài khoản")}
            accessibilityState={{ selected: activeTab === TAB_ACCOUNT }}
            onPress={() => setActiveTab(TAB_ACCOUNT)}
            style={{
              flex: 1,
              backgroundColor: activeTab === TAB_ACCOUNT ? "#ffffff" : "transparent",
            }}
            className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl"
          >
            <User size={16} color={activeTab === TAB_ACCOUNT ? "#0c2340" : "#64748b"} />
            <AppText
              style={{ color: activeTab === TAB_ACCOUNT ? "#0c2340" : "#64748b" }}
              className="text-sm font-bold"
            >
              {t("profile.tabs.account") || "Tài khoản"}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ========================================================================= */}
        {/* 3. TAB 1: TIẾN ĐỘ HỌC TẬP (PROGRESS TAB)                                  */}
        {/* ========================================================================= */}
        {activeTab === TAB_PROGRESS ? (
          loading ? (
            <ProfileProgressSkeleton />
          ) : !authToken ? (
            /* ------------------------------------------------------------- */
            /* STATE A: GUEST USER (Chưa đăng nhập)                          */
            /* ------------------------------------------------------------- */
            <View
              style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
              className="rounded-3xl p-6 border items-center text-center gap-4 my-2"
            >
              <View
                style={{ backgroundColor: "#e0f2fe" }}
                className="w-16 h-16 rounded-2xl items-center justify-center"
              >
                <Sparkles size={28} color="#0284c7" />
              </View>

              <View className="items-center gap-1.5 px-4">
                <AppText className="text-lg font-black text-[#0f172a] text-center">
                  {t("profile.saveJourneyTitle") || "Lưu giữ hành trình phát âm của bạn"}
                </AppText>
                <AppText className="text-[13px] text-slate-500 text-center leading-relaxed">
                  {t("profile.saveJourneyDesc") ||
                    "Đăng nhập để hệ thống AI lưu điểm số phát âm, chuỗi streak và mở khóa bài học cá nhân hóa cho riêng bạn."}
                </AppText>
              </View>

              <View className="w-full pt-2">
                <PrimaryButton
                  title={t("profile.loginOrRegisterBtn") || "Đăng nhập hoặc Tạo tài khoản"}
                  onPress={() => handleNavigate("Login", { next: "Profile" })}
                />
              </View>
            </View>
          ) : !isThresholdMet ? (
            /* ------------------------------------------------------------- */
            /* STATE B: PRE-THRESHOLD (Đang xây dựng hồ sơ: < 36 âm)         */
            /* ------------------------------------------------------------- */
            <View className="gap-3">
              {/* 1. HỒ SƠ PHÁT ÂM (CARD SÀNG LỌC CHUẨN DESIGN) */}
              <View
                style={{
                  backgroundColor: "#ffffff",
                  borderWidth: 0.5,
                  borderColor: "#f1f5f9",
                  shadowColor: "#0c2340",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                }}
                className="rounded-3xl p-5 gap-3"
              >
                {/* Header line: Audio waveform icon + Title + Help icon */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <AudioLines size={18} color="#0066ff" />
                    <AppText className="text-sm font-extrabold text-[#0f172a]">
                      {t("profile.screeningTitle") || "Hồ sơ phát âm"}
                    </AppText>
                  </View>
                </View>

                {/* Split Row: Left text + Right 3D illustration asset */}
                <View style={{ marginVertical: -4 }} className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2 gap-1">
                    <AppText className="text-[19px] font-black text-[#0f172a] leading-tight">
                      {completedScreeningCount > 0
                        ? t("profile.screeningHeaderContinue") || "Tiếp tục bài kiểm tra\nsàng lọc"
                        : t("profile.screeningHeaderStart") || "Bắt đầu bài kiểm tra\nsàng lọc"}
                    </AppText>
                    <AppText className="text-[13px] text-slate-500 leading-relaxed font-medium">
                      {completedScreeningCount > 0
                        ? t("profile.screeningDescContinue") ||
                        "Hoàn thành các câu còn lại để EarlySigns đánh giá phát âm và mở hồ sơ phát âm của bạn."
                        : t("profile.screeningDescStart") ||
                        "Hoàn thành bài kiểm tra để EarlySigns đánh giá phát âm và mở hồ sơ của bạn."}
                    </AppText>
                  </View>

                  <View
                    style={{ width: screeningImageSize, height: screeningImageSize, marginVertical: -8 }}
                    className="items-center justify-center -mr-3"
                  >
                    <Image
                      source={require("@assets/profile_icon.png")}
                      style={{ width: screeningImageSize, height: screeningImageSize }}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                {/* Progress Numbers */}
                <View className="flex-row items-baseline">
                  <AppText style={{ color: "#0066ff" }} className="text-2xl font-black">
                    {completedScreeningCount}
                  </AppText>
                  <AppText className="text-base font-bold text-slate-400"> / {totalScreeningCount}</AppText>
                  <AppText className="text-xs font-semibold text-slate-500 ml-1.5">
                    {t("profile.sentencesCompleted") || "câu đã hoàn thành"}
                  </AppText>
                </View>

                {/* Progress Bar + % */}
                <View className="flex-row items-center gap-3">
                  <View className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <View
                      style={{
                        width: `${screeningProgressPct}%`,
                        backgroundColor: "#0066ff",
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                  <AppText className="text-xs font-bold text-slate-600">
                    {screeningProgressPct}%
                  </AppText>
                </View>

                {/* Primary Button */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    completedScreeningCount > 0
                      ? (t("profile.screeningContinue") || "Tiếp tục kiểm tra sàng lọc")
                      : (t("profile.screeningStart") || "Bắt đầu kiểm tra sàng lọc")
                  }
                  activeOpacity={0.85}
                  onPress={() => handleNavigate("Screening")}
                  style={{
                    backgroundColor: "#0066ff",
                    shadowColor: "#0066ff",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                  className="w-full py-3.5 rounded-2xl items-center justify-center mt-1"
                >
                  <AppText className="text-[15px] font-extrabold text-white">
                    {completedScreeningCount > 0
                      ? t("profile.screeningContinueBtn") || "Tiếp tục kiểm tra"
                      : t("profile.screeningStartBtn") || "Bắt đầu kiểm tra"}
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* 2. CHUỖI LUYỆN TẬP (STREAK CARD THÔNG TIN) */}
              <View
                style={{
                  backgroundColor: "#ffffff",
                  borderWidth: 0.5,
                  borderColor: "#f1f5f9",
                  shadowColor: "#0c2340",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 1.5,
                }}
                className="rounded-3xl p-5 gap-4"
              >
                {/* Header Row */}
                <View className="flex-row items-center gap-3">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 20,
                      backgroundColor: "#fff7ed",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      source={require("@assets/fire.png")}
                      style={{ width: 26, height: 26 }}
                      resizeMode="contain"
                    />
                  </View>
                  <View className="flex-row items-baseline gap-2">
                    <AppText className="text-base font-black text-[#0f172a]">
                      {t("profile.streakTitle") || "Chuỗi luyện tập"}
                    </AppText>
                    <View className="flex-row items-baseline gap-1">
                      <AppText style={{ color: "#0066ff" }} className="text-xl font-black">
                        {streakDays}
                      </AppText>
                      <AppText className="text-sm font-bold text-slate-600">
                        {t("profile.streakDaysUnit") || "ngày"}
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* 7 Days Row */}
                <View className="flex-row items-center justify-between pt-1">
                  {(i18n.language.startsWith("vi") ? WEEK_DAYS_VI : WEEK_DAYS_EN).map((day, idx) => {
                    const isToday = idx === todayWeekIndex;
                    const isCompleted = isToday
                      ? todayPracticed
                      : idx < todayWeekIndex && streakDays >= (todayWeekIndex - idx);

                    return (
                      <View key={day} className="items-center gap-1.5">
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: isCompleted
                              ? "#fff7ed"
                              : isToday
                                ? "#eff6ff"
                                : "#F7F6F2",
                            borderColor: isCompleted
                              ? "#fed7aa"
                              : isToday
                                ? "#93c5fd"
                                : "#e2e8f0",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isCompleted ? (
                            <Image
                              source={require("@assets/fire.png")}
                              style={{ width: 20, height: 20 }}
                              resizeMode="contain"
                            />
                          ) : isToday ? (
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#0066ff" }} />
                          ) : null}
                        </View>
                        <AppText
                          style={{ color: isToday ? "#0066ff" : "#64748b" }}
                          className="text-xs font-bold"
                        >
                          {day}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : (
            /* ------------------------------------------------------------- */
            /* STATE C & D: UNLOCKED DASHBOARD (Đủ >= 36 âm & 5 checks)       */
            /* ------------------------------------------------------------- */
            <View className="gap-4">
              {/* 1. Hero Pronunciation Overview Card */}
              <View
                style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                className="rounded-3xl p-5 border gap-3.5"
              >
                <View className="flex-row items-center justify-between">
                  <View className="gap-0.5">
                    <AppText className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {t("profile.overallProfile") || "Hồ sơ phát âm tổng thể"}
                    </AppText>
                    <AppText className="text-base font-extrabold text-[#0f172a]">
                      {t("profile.accuracyScore") || "Độ chuẩn xác phát âm"}
                    </AppText>
                  </View>

                  <View
                    style={{ backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }}
                    className="px-3 py-1 rounded-full border"
                  >
                    <AppText className="text-xs font-bold text-emerald-700">
                      {avgScore >= 80 ? t("profile.clarityClear") || "Phát âm rõ ràng" : t("profile.clarityGood") || "Khá tốt"}
                    </AppText>
                  </View>
                </View>

                {/* Score Number Display */}
                <View className="flex-row items-center justify-between py-1">
                  <View className="flex-row items-baseline">
                    <AppText
                      style={{ color: accuracyBandColor(avgScore / 100) }}
                      className="text-4xl font-black"
                    >
                      {avgScore}
                    </AppText>
                    <AppText className="text-lg font-bold text-slate-400">/100</AppText>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <Flame size={14} color="#d97706" />
                    <AppText className="text-[13px] font-medium text-slate-600">
                      {t("profile.streakCount", { days: streakDays }) || `Chuỗi ${streakDays} ngày`}
                    </AppText>
                  </View>
                </View>
              </View>

              {/* 2. Responsive Progress Trend Chart (7 days) */}
              <View
                style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                className="rounded-3xl p-5 border gap-3"
              >
                <View className="flex-row items-center justify-between">
                  <AppText className="text-sm font-extrabold text-[#0f172a]">
                    {t("profile.progressChart7Days") || "Biểu đồ tiến độ 7 ngày"}
                  </AppText>
                  <AppText className="text-xs font-bold text-slate-500">
                    {t("profile.overallScore") || "Điểm tổng quát"}
                  </AppText>
                </View>

                <View className="items-center -ml-4">
                  <LineChart
                    data={{
                      labels,
                      datasets: [{ data: totalData.length ? totalData : [0, 0, 0, 0, 0, 0, 0] }],
                    }}
                    width={chartWidth}
                    height={190}
                    yAxisSuffix="%"
                    yAxisInterval={1}
                    fromZero={true}
                    segments={4}
                    chartConfig={{
                      backgroundColor: "#ffffff",
                      backgroundGradientFrom: "#ffffff",
                      backgroundGradientTo: "#ffffff",
                      decimalPlaces: 0,
                      color: () => "#0284c7",
                      labelColor: () => "#94a3b8",
                      propsForDots: { r: "4", strokeWidth: "2", stroke: "#0284c7" },
                      propsForBackgroundLines: { strokeDasharray: "4", stroke: "#f1f5f9" },
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                  />
                </View>
              </View>

              {/* 3. Actionable Priority Weak Sounds */}
              <View
                style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                className="rounded-3xl p-5 border gap-3.5"
              >
                <View className="gap-1">
                  <View className="flex-row items-center justify-between">
                    <AppText className="text-[15px] font-extrabold text-[#0f172a] flex-1 mr-2" numberOfLines={1}>
                      {t("profile.weakSoundsTitle") || "Âm ưu tiên cải thiện"}
                    </AppText>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t("profile.viewAllSounds") || "Xem tất cả âm"}
                      activeOpacity={0.75}
                      onPress={() => handleNavigate("PhonemeCatalog")}
                      className="flex-row items-center gap-0.5 shrink-0"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <AppText style={{ color: "#0c2340" }} className="text-sm font-bold">
                        {t("profile.viewAllSounds") || "Xem tất cả âm"}
                      </AppText>
                      <ChevronRight size={14} color="#0c2340" />
                    </TouchableOpacity>
                  </View>
                  <AppText className="text-[13px] text-slate-500">
                    {t("profile.weakSoundsDesc") || "Các âm có độ chính xác thấp nhất cần luyện tập thêm"}
                  </AppText>
                </View>

                {topWeakSounds.length === 0 ? (
                  <View className="p-4 items-center">
                    <AppText className="text-xs text-slate-500">{t("profile.noWeakSounds") || "Chưa có âm nào bị đánh giá thấp."}</AppText>
                  </View>
                ) : (
                  <View className="gap-2">
                    {topWeakSounds.map((it: any) => {
                      const sound = String(it.sound || "").replace(/^\/+|\/+$/g, "");
                      const acc = Math.round(Number(it.accuracy || 0) * 100);
                      const meta = getIpaSoundMeta(sound);
                      const cleanSound = sound || meta.sound || "—";

                      return (
                        <TouchableOpacity
                          key={cleanSound}
                          accessibilityRole="button"
                          accessibilityLabel={`Luyện tập âm ${cleanSound}, độ chính xác ${acc}%`}
                          activeOpacity={0.85}
                          onPress={() => handleNavigate("PhonemePractice", { phoneme: cleanSound })}
                          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                          className="rounded-2xl p-3.5 border flex-row items-center justify-between shadow-xs"
                        >
                          <View className="flex-row items-center gap-3 flex-1 min-w-0 mr-3">
                            <View
                              className="shrink-0"
                              style={{
                                minWidth: 56,
                                height: 46,
                                paddingHorizontal: 8,
                                borderRadius: 16,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                backgroundColor: acc >= 70 ? "#ecfdf5" : acc >= 50 ? "#fffbeb" : "#fee2e2",
                                borderColor: acc >= 70 ? "#a7f3d0" : acc >= 50 ? "#fde68a" : "#fecaca",
                              }}
                            >
                              <AppText
                                numberOfLines={1}
                                textBreakStrategy="simple"
                                style={{
                                  fontSize: 16,
                                  fontWeight: "800",
                                  color: acc >= 70 ? "#059669" : acc >= 50 ? "#d97706" : "#dc2626",
                                  includeFontPadding: false,
                                  textAlign: "center",
                                }}
                              >
                                {`/${cleanSound}/`}
                              </AppText>
                            </View>
                            <View className="flex-1 min-w-0 gap-1.5">
                              <View className="flex-row items-center justify-between">
                                <AppText numberOfLines={1} className="text-xs text-slate-500 font-medium flex-1 mr-2">
                                  Ví dụ: <AppText className="text-slate-700 font-semibold">{meta.example}</AppText>
                                </AppText>
                                <AppText
                                  className="text-xs font-black shrink-0"
                                  style={{ color: acc >= 70 ? "#059669" : acc >= 50 ? "#d97706" : "#dc2626" }}
                                >
                                  {acc}%
                                </AppText>
                              </View>
                              {/* Thanh tiến trình hàng ngang */}
                              <View className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <View
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.max(5, Math.min(100, acc))}%`,
                                    backgroundColor: acc >= 70 ? "#10b981" : acc >= 50 ? "#f59e0b" : "#ef4444",
                                  }}
                                />
                              </View>
                            </View>
                          </View>

                          <View
                            style={{ backgroundColor: "#0c2340" }}
                            className="px-3 py-2 rounded-xl flex-row items-center gap-1 shrink-0"
                          >
                            <Mic size={12} color="#ffffff" />
                            <AppText className="text-xs font-extrabold text-white">
                              {t("profile.practiceBtn") || "Luyện"}
                            </AppText>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )
        ) : (
          /* ========================================================================= */
          /* 4. TAB 2: CÀI ĐẶT TÀI KHOẢN (ACCOUNT SETTINGS - GROUPED ROWS)              */
          /* ========================================================================= */
          <View className="gap-4">
            {/* GROUP 1: THÔNG TIN TÀI KHOẢN */}
            <View>
              <AppText className="text-base font-extrabold text-[#0f172a] mb-2 px-1">
                {t("profile.accountGroup") || "Tài khoản"}
              </AppText>
              <View
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#f1f5f9",
                  borderWidth: 1,
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 1,
                }}
                className="rounded-2xl overflow-hidden"
              >
                {/* Row 1: Email */}
                <View className="flex-row items-center justify-between p-3.5 border-b border-slate-100">
                  <View className="flex-row items-center gap-3">
                    <View
                      style={{ backgroundColor: "#eff6ff" }}
                      className="w-9 h-9 rounded-xl items-center justify-center"
                    >
                      <Mail size={18} color="#0066ff" />
                    </View>
                    <AppText className="text-[15px] font-semibold text-[#0f172a]">
                      {t("profile.email") || "Email"}
                    </AppText>
                  </View>
                  <AppText className="text-[14px] font-medium text-slate-500">
                    {displayEmail}
                  </AppText>
                </View>

                {/* Row 2: Ngôn ngữ */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`${t("language.label") || "Ngôn ngữ"}: ${currentLang === "vi" ? (t("language.vi") || "Tiếng Việt") : (t("language.en") || "English")}`}
                  activeOpacity={0.7}
                  onPress={() => setLanguageModalVisible(true)}
                  className="flex-row items-center justify-between p-3.5 border-b border-slate-100"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      style={{ backgroundColor: "#eff6ff" }}
                      className="w-9 h-9 rounded-xl items-center justify-center"
                    >
                      <Globe size={18} color="#0066ff" />
                    </View>
                    <AppText className="text-[15px] font-semibold text-[#0f172a]">
                      {t("language.label") || "Ngôn ngữ"}
                    </AppText>
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    <AppText className="text-[14px] font-medium text-slate-500">
                      {currentLang === "vi" ? (t("language.vi") || "Tiếng Việt") : (t("language.en") || "English")}
                    </AppText>
                    <ChevronRight size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>

              </View>
            </View>

            {/* GROUP 2: GÓI CƯỚC & HẠN MỨC */}
            <View style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }} className="rounded-2xl border overflow-hidden">
              <View className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <AppText className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("profile.planGroup") || "Gói dịch vụ & Hạn mức"}
                </AppText>
              </View>

              {isPro ? (
                /* PRO TIER ROWS */
                <View>
                  {/* Row 1: Plan Status with Renewal/Expiry Date & Active Badge */}
                  <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100">
                    <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                      <Crown size={18} color="#f59e0b" />
                      <View className="flex-1">
                        <AppText className="text-[15px] font-bold text-[#0f172a]">
                          {t("profile.proPlan") || "EarlySigns Pro"}
                        </AppText>
                        <AppText className="text-[13px] text-slate-500 mt-0.5">
                          {t("profile.planExpiryDate") || "Hạn dùng"}: {formatExpiryDate(usage?.subscription_expires_at, currentLang) || t("profile.autoRenew") || "Tự động gia hạn"}
                        </AppText>
                      </View>
                    </View>
                    <View
                      style={{
                        backgroundColor: "#ecfdf5",
                        borderColor: "#a7f3d0",
                      }}
                      className="px-2.5 py-0.5 rounded-full border"
                    >
                      <AppText style={{ color: "#059669" }} className="text-xs font-bold">
                        {t("profile.activeBadge") || "Đang hoạt động"}
                      </AppText>
                    </View>
                  </View>

                  {/* Row 2: Manage Subscription on Store */}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t("profile.manageStoreTitle") || "Quản lý gói cước"}
                    activeOpacity={0.75}
                    onPress={openManageSubscriptions}
                    className="px-4 py-3.5 flex-row items-center justify-between border-b border-slate-100 active:bg-slate-50"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                      <ExternalLink size={18} color="#0284c7" />
                      <View className="flex-1">
                        <AppText className="text-[15px] font-bold text-[#0f172a]">
                          {t("profile.manageStoreTitle") || "Quản lý gói cước"}
                        </AppText>
                        <AppText className="text-[13px] text-slate-500 mt-0.5">
                          {t("profile.manageStoreDesc") || "Hủy hoặc đổi gói trên Apple ID / Google Play"}
                        </AppText>
                      </View>
                    </View>
                    <ChevronRight size={14} color="#94a3b8" />
                  </TouchableOpacity>

                  {/* Row 3: Restore Purchases */}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t("profile.restorePurchasesTitle") || "Khôi phục giao dịch"}
                    activeOpacity={0.75}
                    onPress={handleRestorePurchases}
                    disabled={isRestoring}
                    className="px-4 py-3.5 flex-row items-center justify-between active:bg-slate-50"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                      <RefreshCw size={18} color="#6366f1" />
                      <View className="flex-1">
                        <AppText className="text-[15px] font-bold text-[#0f172a]">
                          {t("profile.restorePurchasesTitle") || "Khôi phục giao dịch"}
                        </AppText>
                        <AppText className="text-[13px] text-slate-500 mt-0.5">
                          {t("profile.restorePurchasesDesc") || "Đồng bộ lại quyền Pro từ Apple ID / Google Play"}
                        </AppText>
                      </View>
                    </View>
                    {isRestoring ? (
                      <ActivityIndicator size="small" color="#0c2340" />
                    ) : (
                      <ChevronRight size={14} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                /* FREE TIER ROWS */
                <View>
                  {/* Row 1: Plan Status with AI Quota -> Upgrade Pro */}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`${t("profile.freePlan") || "Gói miễn phí"}, ${t("profile.upgradePro") || "Nâng cấp Pro"}`}
                    activeOpacity={0.75}
                    onPress={() => handleNavigate("Payment")}
                    className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                      <ShieldCheck size={18} color="#0284c7" />
                      <View className="flex-1">
                        <AppText className="text-[15px] font-bold text-[#0f172a]">
                          {t("profile.freePlan") || "Gói miễn phí"}
                        </AppText>
                        <AppText className="text-[13px] text-slate-500 mt-0.5">
                          {t("profile.dailyAiQuota") || "Lượt dùng AI hôm nay"}: {usage?.daily_remaining != null
                            ? t("profile.dailyAiQuotaRatio", { remaining: usage.daily_remaining }) || `${usage.daily_remaining}/20 lượt`
                            : t("profile.dailyAiQuotaDefault") || "20 lượt/ngày"}
                        </AppText>
                      </View>
                    </View>
                    <View
                      className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: "#f59e0b",
                        shadowColor: "#f59e0b",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Crown size={12} color="#ffffff" fill="#ffffff" />
                      <AppText
                        numberOfLines={1}
                        className="text-xs font-black text-white uppercase tracking-wider"
                        style={{ includeFontPadding: false }}
                      >
                        {t("profile.upgradePro") || "Nâng cấp Pro"}
                      </AppText>
                      <ChevronRight size={13} color="#ffffff" strokeWidth={2.5} />
                    </View>
                  </TouchableOpacity>

                  {/* Row 2: Restore Purchases */}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={t("profile.restorePurchasesTitle") || "Khôi phục giao dịch"}
                    activeOpacity={0.75}
                    onPress={handleRestorePurchases}
                    disabled={isRestoring}
                    className="px-4 py-3.5 flex-row items-center justify-between active:bg-slate-50"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                      <RefreshCw size={18} color="#6366f1" />
                      <View className="flex-1">
                        <AppText className="text-[15px] font-bold text-[#0f172a]">
                          {t("profile.restorePurchasesTitle") || "Khôi phục giao dịch"}
                        </AppText>
                        <AppText className="text-[13px] text-slate-500 mt-0.5">
                          {t("profile.restorePurchasesDesc") || "Lấy lại quyền Pro đã mua trên Apple ID / Google Play"}
                        </AppText>
                      </View>
                    </View>
                    {isRestoring ? (
                      <ActivityIndicator size="small" color="#0c2340" />
                    ) : (
                      <ChevronRight size={14} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* GROUP 3: THÔNG BÁO & LỜI NHẮC */}
            <View style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }} className="rounded-2xl border overflow-hidden">
              <View className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <AppText className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("profile.notifGroup") || "Thông báo"}
                </AppText>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("profile.notifSettingsTitle") || "Cài đặt thông báo & giờ nhắc học"}
                activeOpacity={0.75}
                onPress={() => handleNavigate("NotificationSettings")}
                className="flex-row items-center justify-between px-4 py-3.5"
              >
                <View className="flex-row items-center gap-2.5">
                  <Bell size={18} color="#f97316" />
                  <AppText className="text-[15px] font-bold text-[#0f172a]">
                    {t("profile.notifSettingsTitle") || "Cài đặt thông báo & giờ nhắc học"}
                  </AppText>
                </View>
                <ChevronRight size={14} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* GROUP 4: HỖ TRỢ & PHÁP LÝ (Tách riêng Terms và Privacy) */}
            <View style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }} className="rounded-2xl border overflow-hidden">
              <View className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <AppText className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t("profile.supportLegalGroup") || "Hỗ trợ & Pháp lý"}
                </AppText>
              </View>

              {/* Referral */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("profile.referralTitle") || "Chương trình giới thiệu"}
                activeOpacity={0.75}
                onPress={() => handleNavigate("Referral")}
                className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100"
              >
                <View className="flex-row items-center gap-2.5">
                  <Gift size={18} color="#4f46e5" />
                  <AppText className="text-[15px] font-medium text-slate-700">{t("profile.referralTitle") || "Chương trình giới thiệu"}</AppText>
                </View>
                <ChevronRight size={14} color="#94a3b8" />
              </TouchableOpacity>

              {/* Contact Support */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("profile.contactSupport") || "Liên hệ hỗ trợ"}
                activeOpacity={0.75}
                onPress={() => Linking.openURL("mailto:support@earlysigns.app?subject=Support%20Request")}
                className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100"
              >
                <View className="flex-row items-center gap-2.5">
                  <HelpCircle size={18} color="#0284c7" />
                  <AppText className="text-[15px] font-medium text-slate-700">{t("profile.contactSupport") || "Liên hệ hỗ trợ"}</AppText>
                </View>
                <ExternalLink size={14} color="#94a3b8" />
              </TouchableOpacity>

              {/* About */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("profile.aboutApp") || "Về EarlySigns"}
                activeOpacity={0.75}
                onPress={() => handleNavigate("About")}
                className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100"
              >
                <View className="flex-row items-center gap-2.5">
                  <Info size={18} color="#0284c7" />
                  <AppText className="text-[15px] font-medium text-slate-700">{t("profile.aboutApp") || "Về EarlySigns"}</AppText>
                </View>
                <ChevronRight size={14} color="#94a3b8" />
              </TouchableOpacity>

              {/* Terms Screen */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("profile.termsOfUse") || "Điều khoản sử dụng"}
                activeOpacity={0.75}
                onPress={() => handleNavigate("Terms")}
                className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100"
              >
                <View className="flex-row items-center gap-2.5">
                  <FileText size={18} color="#6366f1" />
                  <AppText className="text-[15px] font-medium text-slate-700">{t("profile.termsOfUse") || "Điều khoản sử dụng"}</AppText>
                </View>
                <ChevronRight size={14} color="#94a3b8" />
              </TouchableOpacity>

              {/* Privacy Screen (Tách biệt độc lập) */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("profile.privacyPolicy") || "Chính sách bảo mật"}
                activeOpacity={0.75}
                onPress={() => handleNavigate("Privacy")}
                className="flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100"
              >
                <View className="flex-row items-center gap-2.5">
                  <ShieldCheck size={18} color="#10b981" />
                  <AppText className="text-[15px] font-medium text-slate-700">{t("profile.privacyPolicy") || "Chính sách bảo mật"}</AppText>
                </View>
                <ChevronRight size={14} color="#94a3b8" />
              </TouchableOpacity>

              {/* Check App Version / Update */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("profile.checkUpdate", "Kiểm tra cập nhật")}
                activeOpacity={0.75}
                onPress={handleCheckUpdate}
                disabled={isCheckingUpdate}
                className="flex-row items-center justify-between px-4 py-3.5"
              >
                <View className="flex-row items-center gap-2.5">
                  <ArrowUpCircle size={18} color="#3b82f6" />
                  <AppText className="text-[15px] font-medium text-slate-700">
                    {t("profile.checkUpdate", "Kiểm tra cập nhật")}
                  </AppText>
                </View>
                <View className="flex-row items-center gap-2">
                  <View
                    style={{ backgroundColor: "#f1f5f9" }}
                    className="px-2.5 py-0.5 rounded-full"
                  >
                    <AppText className="text-xs font-semibold text-slate-500">
                      v{getCurrentAppVersion()}
                    </AppText>
                  </View>
                  <ChevronRight size={14} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            </View>

            {/* GROUP 5: ĐĂNG XUẤT (CARD ĐỘC LẬP) */}
            {authToken ? (
              <View
                style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                className="rounded-2xl border overflow-hidden shadow-xs"
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("auth.logout") || "Đăng xuất"}
                  activeOpacity={0.75}
                  onPress={confirmLogout}
                  disabled={isLoggingOut}
                  className="flex-row items-center justify-between px-4 py-3.5 active:bg-rose-50"
                >
                  <View className="flex-row items-center gap-2.5">
                    <LogOut size={18} color="#e11d48" />
                    <AppText className="text-[15px] font-bold text-rose-600">
                      {t("auth.logout") || "Đăng xuất"}
                    </AppText>
                  </View>
                  <ChevronRight size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* GROUP 6: XÓA TÀI KHOẢN (TÁCH BIỆT DƯỚI ĐÁY ĐỂ TRÁNH BẤM NHẦM) */}
            {authToken ? (
              <View className="items-center justify-center pt-2 pb-6">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("profile.deleteAccount") || "Xóa tài khoản và dữ liệu"}
                  activeOpacity={0.7}
                  onPress={confirmDeleteAccount}
                  disabled={isLoggingOut}
                  hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
                  className="flex-row items-center gap-1.5 py-2 px-3 rounded-xl active:bg-slate-100"
                >
                  <Trash2 size={15} color="#94a3b8" />
                  <AppText className="text-[13px] font-medium text-slate-400">
                    {t("profile.deleteAccount") || "Xóa tài khoản và dữ liệu"}
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* MODAL: CHỌN NGÔN NGỮ */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setLanguageModalVisible(false)}
          style={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
          className="flex-1 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: "#ffffff" }}
            className="rounded-t-3xl p-5 pb-8 gap-4"
          >
            <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
              <AppText className="text-base font-extrabold text-[#0f172a]">
                {t("profile.chooseLanguage") || "Chọn ngôn ngữ hiển thị"}
              </AppText>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("common.close", "Đóng")}
                onPress={() => setLanguageModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Tiếng Việt */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("language.vi") || "Tiếng Việt"}
              accessibilityState={{ selected: currentLang === "vi" }}
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage("vi")}
              style={{
                backgroundColor: currentLang === "vi" ? "#eff6ff" : "#F7F6F2",
                borderColor: currentLang === "vi" ? "#0066ff" : "#e2e8f0",
              }}
              className="flex-row items-center justify-between p-4 rounded-2xl border"
            >
              <View className="flex-row items-center gap-3">
                <AppText className="text-xl">🇻🇳</AppText>
                <AppText
                  style={{ color: currentLang === "vi" ? "#0066ff" : "#0f172a" }}
                  className="text-sm font-bold"
                >
                  {t("language.vi") || "Tiếng Việt"}
                </AppText>
              </View>
              {currentLang === "vi" ? <Check size={18} color="#0066ff" strokeWidth={2.5} /> : null}
            </TouchableOpacity>

            {/* Option 2: English */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("language.en") || "English"}
              accessibilityState={{ selected: currentLang === "en" }}
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage("en")}
              style={{
                backgroundColor: currentLang === "en" ? "#eff6ff" : "#F7F6F2",
                borderColor: currentLang === "en" ? "#0066ff" : "#e2e8f0",
              }}
              className="flex-row items-center justify-between p-4 rounded-2xl border"
            >
              <View className="flex-row items-center gap-3">
                <AppText className="text-xl">🇬🇧</AppText>
                <AppText
                  style={{ color: currentLang === "en" ? "#0066ff" : "#0f172a" }}
                  className="text-sm font-bold"
                >
                  {t("language.en") || "English"}
                </AppText>
              </View>
              {currentLang === "en" ? <Check size={18} color="#0066ff" strokeWidth={2.5} /> : null}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
