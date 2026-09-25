import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowRight,
  BookOpen,
  Camera,
  ChevronRight,
  Compass,
  Crown,
  Flame,
  Sparkles,
  Video,
  Zap,
} from "lucide-react-native";
import PrimaryButton from "@/components/ui/PrimaryButton";
import IPAChecking from "@/components/practice/IPAChecking";
import MonthlyQuotaCard from "@/components/ui/MonthlyQuotaCard";
import { PhonemesChipsSkeleton, QuotaCardSkeleton } from "@/components/ui/Skeleton";
import { useHomeViewModel } from "@/hooks/useHomeViewModel";

export default function HomeScreen({ navigation }: { navigation: any }) {
  const {
    t,
    dialect,
    authToken,
    authEmail,
    refreshing,
    onRefresh,
    usageStatus,
    userTier,
    userKey,
    streakDays,
    clarityPct,
    journey,
    weakestPhonemes,
    lessonSession,
    lessonSessionKey,
    lessonLoading,
    lessonError,
    startPersonalizedLesson,
    closeLessonSession,
    navigateWithGate,
  } = useHomeViewModel(navigation);

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
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-2xl bg-indigo-600 items-center justify-center">
                <Sparkles size={20} color="#ffffff" />
              </View>
              <View>
                <Text className="text-2xs font-bold text-slate-300 uppercase tracking-widest">
                  EarlySigns
                </Text>
                <Text className="text-xl font-black text-white tracking-tight" numberOfLines={1}>
                  {authToken
                    ? authEmail
                      ? `${authEmail.split("@")[0]}`
                      : t("auth.signedInAs")
                    : t("onboarding.welcomeTitle")}
                </Text>
              </View>
            </View>

            {/* Accent badge */}
            <View className="bg-slate-800 border border-slate-700 rounded-full px-3 py-1 flex-row items-center gap-1">
              <Text className="text-xs font-black text-indigo-300">
                {t("homeExtra.accentBadge")}
              </Text>
            </View>
          </View>

          {authToken ? (
            <View className="flex-row items-center gap-2.5 pt-3 border-t border-slate-700">
              {/* Streak */}
              <View className="flex-row items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                <Flame size={15} color="#f59e0b" />
                <Text className="text-xs font-bold text-white">
                  {t("home.streak.active", { count: streakDays })}
                </Text>
              </View>

              {/* Clarity */}
              {clarityPct != null ? (
                <View className="flex-row items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                  <Zap size={14} color="#818cf8" />
                  <Text className="text-xs font-bold text-white">
                    {clarityPct}% {t("homeExtra.clarityLabel")}
                  </Text>
                </View>
              ) : null}

              {/* Plan badge */}
              <View className="ml-auto">
                {usageStatus?.has_active_subscription ? (
                  <View className="bg-amber-500 px-2.5 py-1 rounded-full flex-row items-center gap-1">
                    <Crown size={12} color="#ffffff" />
                    <Text className="text-2xs font-black text-white uppercase tracking-wider">
                      PRO
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => navigation.navigate("Payment")}
                    className="bg-amber-500 active:bg-amber-600 px-3 py-1 rounded-full flex-row items-center gap-1"
                  >
                    <Crown size={12} color="#ffffff" />
                    <Text className="text-2xs font-bold text-white">
                      {t("homeExtra.upgradeBadge")}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : (
            <View className="mt-2 pt-2.5 border-t border-slate-700 flex-row items-center justify-between">
              <Text className="text-xs text-slate-300 flex-1 pr-2">
                {t("login.loginToContinue")}
              </Text>
              <Pressable
                onPress={() => navigation.navigate("Login", { next: "Home" })}
                className="bg-indigo-600 px-3.5 py-1.5 rounded-xl active:opacity-80"
              >
                <Text className="text-xs font-bold text-white">
                  {t("login.title")}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-20 gap-4">
          {/* Monthly Quota Summary Card */}
          {authToken ? (
            usageStatus ? (
              <MonthlyQuotaCard
                userKey={userKey}
                userTier={userTier}
                usageStatus={usageStatus}
                onUpgradePress={() => navigation.navigate("Payment")}
              />
            ) : (
              <QuotaCardSkeleton />
            )
          ) : null}

          {/* SECTION 1: Luyện với video (Video Practice) */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-2xl bg-emerald-50 items-center justify-center">
                  <Video size={22} color="#059669" />
                </View>
                <View>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-base font-extrabold text-slate-900">
                      1. {t("videos.catalog.title")}
                    </Text>
                    <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-emerald-700">YouTube</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-slate-500">
                    {t("homeExtra.videoSubtitle")}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => navigateWithGate("Videos")}
                className="flex-row items-center gap-1"
              >
                <Text className="text-xs font-bold text-indigo-600">
                  {t("videos.catalog.viewAll")}
                </Text>
                <ChevronRight size={14} color="#4f46e5" />
              </Pressable>
            </View>

            <Text className="text-xs text-slate-500 leading-relaxed">
              {t("onboarding.slide1Desc")}
            </Text>

            <Pressable
              onPress={() => navigateWithGate("Videos")}
              className="flex-row items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-100 active:bg-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center">
                  <Video size={17} color="#059669" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-900">
                    {t("homeExtra.exploreVideos")}
                  </Text>
                  <Text className="text-[11px] text-slate-400">
                    {t("homeExtra.videoLevels")}
                  </Text>
                </View>
              </View>
              <ArrowRight size={16} color="#4f46e5" />
            </Pressable>
          </View>

          {/* SECTION 2: Luyện với văn bản tự do (Free Text & OCR) */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-2xl bg-sky-50 items-center justify-center">
                  <BookOpen size={22} color="#0284c7" />
                </View>
                <View>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-base font-extrabold text-slate-900">
                      2. {t("textPractice.title")}
                    </Text>
                    <View className="bg-sky-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-sky-700">OCR AI</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-slate-500">
                    {t("homeExtra.freeTextSubtitle")}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => navigateWithGate("Text")}
                className="flex-row items-center gap-1"
              >
                <Text className="text-xs font-bold text-indigo-600">
                  {t("common.open")}
                </Text>
                <ChevronRight size={14} color="#4f46e5" />
              </Pressable>
            </View>

            <Text className="text-xs text-slate-500 leading-relaxed">
              {t("onboarding.slide2Desc")}
            </Text>

            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => navigateWithGate("Text")}
                className="flex-1 flex-row items-center justify-center gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 active:bg-slate-100"
              >
                <BookOpen size={16} color="#0284c7" />
                <Text className="text-xs font-bold text-slate-800">
                  {t("input.label")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => navigateWithGate("Text")}
                className="flex-1 flex-row items-center justify-center gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 active:bg-slate-100"
              >
                <Camera size={16} color="#0284c7" />
                <Text className="text-xs font-bold text-slate-800">
                  {t("textPractice.ocr.title")}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* SECTION 3: Luyện ngữ âm & Lộ trình (Phonemes & Journey) */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-3.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-2xl bg-purple-50 items-center justify-center">
                  <Compass size={22} color="#7c3aed" />
                </View>
                <View>
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-base font-extrabold text-slate-900">
                      3. {t("homeExtra.phonemesTitle")}
                    </Text>
                    <View className="bg-purple-100 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-bold text-purple-700">44 IPA</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-slate-500">
                    {t("homeExtra.phonemesSubtitle")}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => navigateWithGate("Journey")}
                className="flex-row items-center gap-1"
              >
                <Text className="text-xs font-bold text-indigo-600">
                  {t("home.journey.viewAll")}
                </Text>
                <ChevronRight size={14} color="#4f46e5" />
              </Pressable>
            </View>

            {/* Weakest Phonemes List */}
            <View className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-slate-800">
                  {t("home.weakestPhonemes")}
                </Text>
                <Pressable onPress={() => navigateWithGate("Phonemes")}>
                  <Text className="text-[11px] font-bold text-indigo-600">
                    {t("homeExtra.phonemesExplore")} →
                  </Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {weakestPhonemes && weakestPhonemes.length > 0 ? (
                  weakestPhonemes.slice(0, 6).map((item: any, idx: number) => (
                    <Pressable
                      key={`${item.sound}-${idx}`}
                      onPress={() => navigateWithGate("Phonemes")}
                      className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex-row items-center gap-1 shadow-2xs"
                    >
                      <Text className="text-xs font-extrabold text-indigo-600">
                        /{item.sound}/
                      </Text>
                      {item.accuracy != null ? (
                        <Text className="text-[10px] text-slate-400 font-medium">
                          {Math.round(Number(item.accuracy) * 100)}%
                        </Text>
                      ) : null}
                    </Pressable>
                  ))
                ) : (
                  <PhonemesChipsSkeleton count={5} />
                )}
              </View>
            </View>

            {/* Journey Status */}
            {journey ? (
              <View className="flex-row items-center justify-between bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-100">
                <View className="flex-row items-center gap-2">
                  <Compass size={16} color="#7c3aed" />
                  <Text className="text-xs text-slate-700 font-medium">
                    {t("home.journey.moduleOf", {
                      current: journey.current_module,
                      total: journey.milestones?.reduce((acc: number, ms: any) => acc + (ms.modules?.length || 0), 0) || 12,
                    })}
                  </Text>
                </View>
                <Pressable onPress={() => navigateWithGate("Journey")}>
                  <Text className="text-xs font-bold text-indigo-600">
                    {t("home.journey.title")} →
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* Error notice if any */}
            {lessonError ? (
              <Text className="text-rose-500 text-xs">{lessonError}</Text>
            ) : null}

            {/* Start Personalized Lesson CTA */}
            <PrimaryButton
              title={t("home.journey.startLesson")}
              loading={lessonLoading}
              onPress={startPersonalizedLesson}
            />
          </View>
        </View>
      </ScrollView>

      {/* Direct In-Home Practice Modal */}
      <IPAChecking
        open={Boolean(lessonSession)}
        onClose={closeLessonSession}
        sentences={lessonSession?.sentences || []}
        dialect={dialect}
        sessionKey={lessonSessionKey}
        autoRecordKey={lessonSessionKey}
        lessonTitle={lessonSession?.title}
        userTier={userTier}
        userKey={userKey}
        usageStatus={usageStatus}
        loadNextLesson={startPersonalizedLesson}
      />
    </SafeAreaView>
  );
}
