import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Clapperboard,
  Compass,
  Flame,
  ScanText,
  Sparkles,
  TextCursorInput,
} from "lucide-react-native";
import { useHomeViewModel } from "@/hooks/useHomeViewModel";

function TextAction({
  icon,
  title,
  description,
  onPress,
  testID,
  iconBgClass,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  testID: string;
  iconBgClass: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      testID={testID}
      onPress={onPress}
      className="flex-1 bg-white rounded-3xl p-4 gap-1.5 border border-slate-100 shadow-sm active:opacity-75"
    >
      <View className={`w-11 h-11 rounded-2xl ${iconBgClass} items-center justify-center mb-2`}>
        {icon}
      </View>
      <Text className="text-base font-bold text-slate-900 tracking-tight">{title}</Text>
      <Text className="text-xs text-slate-500 leading-relaxed">{description}</Text>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }: { navigation: any }) {
  const {
    t,
    authToken,
    authEmail,
    refreshing,
    onRefresh,
    userTier,
    usageStatus,
    streakDays,
    clarityPct,
    quota,
    journey,
    weakestPhonemes,
    summaryLoading,
    summaryError,
    navigateWithGate,
  } = useHomeViewModel(navigation);
  const { width, fontScale } = useWindowDimensions();
  const stackActions = width < 360 || fontScale > 1.25;
  const name = authEmail?.split("@")[0];
  const plan =
    userTier === "pro"
      ? "homeDesign.proPlan"
      : userTier === "trial"
      ? "homeDesign.trialPlan"
      : "auth.freePlan";
  const totalModules = journey?.milestones?.reduce(
    (total: number, milestone: any) => total + (milestone.modules?.length || 0),
    0
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4f46e5"
            colors={["#4f46e5"]}
          />
        }
      >
        <View className="w-full max-w-[600px] self-center px-5 pt-4 pb-8 gap-6">
          {/* 1. TOP BAR */}
          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-xl bg-indigo-50 items-center justify-center">
                <Sparkles size={19} color="#4f46e5" strokeWidth={2.2} />
              </View>
              <Text className="text-xl font-extrabold text-slate-900 tracking-tight">EarlySigns</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              testID="home-account"
              onPress={() =>
                authToken
                  ? navigation.navigate("Profile", { tab: "account" })
                  : navigation.navigate("Login", { next: "Home" })
              }
              className="min-h-[40px] px-4 py-2 justify-center bg-white border border-slate-200 rounded-full shadow-sm active:opacity-75"
            >
              <Text className="text-xs font-semibold text-indigo-600">
                {t(authToken ? "homeDesign.account" : "login.title")}
              </Text>
            </Pressable>
          </View>

          {/* 2. INTRODUCTION */}
          <View className="gap-2">
            {authToken ? (
              <Text className="text-sm font-medium text-slate-500">
                {name ? t("homeDesign.greeting", { name }) : t("homeDesign.welcomeBack")}
              </Text>
            ) : null}
            <Text accessibilityRole="header" className="text-3xl font-extrabold text-slate-900 tracking-tight leading-9">
              {t("homeDesign.headline")}
              <Text className="text-indigo-600">{"\n"}{t("homeDesign.headlineAccent")}</Text>
            </Text>
            <Text className="text-sm text-slate-500 leading-relaxed">{t("homeDesign.subtitle")}</Text>
            {authToken ? (
              <View className="flex-row flex-wrap items-center gap-2 mt-1">
                {usageStatus ? (
                  <Text className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    {t(plan)}
                  </Text>
                ) : null}
                {streakDays != null ? (
                  <View className="flex-row items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                    <Flame size={14} color="#b45309" />
                    <Text className="text-xs font-bold text-amber-800">
                      {t("homeDesign.streak", { count: streakDays })}
                    </Text>
                  </View>
                ) : null}
                {clarityPct != null ? (
                  <Text testID="home-clarity" className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {t("homeDesign.clarity", { percent: clarityPct })}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* 3. HERO VIDEO CARD (EDITORIAL NAVY) */}
          <Pressable
            testID="home-video"
            accessibilityRole="button"
            accessibilityLabel={t("homeDesign.videoAccessibility")}
            onPress={() => navigateWithGate("Videos")}
            className="p-6 rounded-3xl bg-[#2e2b60] overflow-hidden gap-3.5 shadow-lg active:opacity-85"
          >
            <View
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="home-video-gradient" x1="0%" y1="0%" x2="100%" y2="85%">
                    <Stop offset="0%" stopColor="#1a1c30" />
                    <Stop offset="55%" stopColor="#2e2b60" />
                    <Stop offset="100%" stopColor="#4f42b5" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#home-video-gradient)" />
              </Svg>
            </View>
            <View className="flex-row items-center gap-2">
              <Clapperboard size={16} color="#d4cdff" />
              <Text className="text-xs font-semibold text-[#d4cdff] tracking-wide flex-1">
                {t("homeDesign.videoTitle")}
              </Text>
            </View>
            <Text className="text-2xl font-extrabold text-white tracking-tight leading-8">
              {t("homeDesign.videoHeadline")}
            </Text>
            <View
              className="gap-2.5 py-2"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <View className="flex-row items-center justify-between gap-2">
                <View className="px-4 py-2.5 rounded-2xl bg-[#ede9fe] rounded-bl-sm -rotate-3">
                  <Text allowFontScaling={false} className="text-sm font-bold text-[#2c2747]">
                    How’s your day?
                  </Text>
                </View>
                <View className="flex-1 flex-row justify-end items-center gap-1">
                  {[8, 20, 29, 16, 24, 11].map((height, index) => (
                    <View key={index} className="w-[3px] rounded-full bg-[#c4bbf5]" style={{ height }} />
                  ))}
                </View>
              </View>
              <View className="px-4 py-2.5 rounded-2xl bg-[#ddd6fe] rounded-br-sm self-end rotate-2 mr-0.5">
                <Text allowFontScaling={false} className="text-sm font-bold text-[#2c2747]">
                  Pretty good!
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap items-center justify-between gap-3 mt-1">
              <View className="flex-row items-center flex-shrink gap-2 bg-white rounded-xl px-4 py-2.5 min-h-[44px]">
                <Text className="text-sm font-bold text-[#2c2747]">{t("homeDesign.videoAction")}</Text>
                <ArrowUpRight size={16} color="#2c2747" />
              </View>
              <Text className="text-xs font-medium text-[#c4bbf5]">YouTube</Text>
            </View>
          </Pressable>

          {/* 4. TEXT SECTION (2 CLEAR SQUARES / TILES) */}
          <View testID="home-text-section" className="gap-3">
            <Text accessibilityRole="header" className="text-lg font-extrabold text-slate-900 tracking-tight">
              {t("homeDesign.textTitle")}
            </Text>
            <View className={stackActions ? "flex-col gap-3" : "flex-row gap-3"}>
              <TextAction
                testID="home-text-input"
                icon={<TextCursorInput size={23} color="#4f46e5" />}
                iconBgClass="bg-indigo-50"
                title={t("homeDesign.inputTitle")}
                description={t("homeDesign.inputDescription")}
                onPress={() => navigateWithGate("Text", { entry: "input" })}
              />
              <TextAction
                testID="home-text-ocr"
                icon={<ScanText size={23} color="#0284c7" />}
                iconBgClass="bg-sky-50"
                title={t("homeDesign.scanTitle")}
                description={t("homeDesign.scanDescription")}
                onPress={() => navigateWithGate("Text", { entry: "ocr" })}
              />
            </View>
          </View>

          {/* 5. PHONEMES & LEARNING JOURNEY SECTION */}
          <View testID="home-phonemes-section" className="gap-3">
            <Text accessibilityRole="header" className="text-lg font-extrabold text-slate-900 tracking-tight">
              {t("homeDesign.phonemesTitle")}
            </Text>
            <View className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <Pressable
                testID="home-phonemes"
                accessibilityRole="button"
                accessibilityLabel={t("homeDesign.phonemesAccessibility")}
                onPress={() => navigateWithGate("Phonemes")}
                className="flex-row items-center gap-3.5 p-4.5 min-h-[96px] active:opacity-75"
              >
                <View
                  className="w-14 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 items-center justify-center -rotate-3"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <Text allowFontScaling={false} className="text-2xl font-bold text-indigo-700 tracking-tighter">
                    /θ/
                  </Text>
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-base font-bold text-slate-900">{t("homeDesign.phonemeHeadline")}</Text>
                  <Text className="text-xs text-slate-500 leading-relaxed">
                    {t("homeDesign.phonemeDescription")}
                  </Text>
                </View>
                <ArrowRight size={18} color="#4f46e5" />
              </Pressable>

              <View className="px-4.5 pb-4.5 pt-1 border-t border-slate-100 gap-3.5">
                {/* Learning journey flat link */}
                <Pressable
                  testID="home-journey"
                  accessibilityRole="button"
                  onPress={() => navigateWithGate("Journey")}
                  className="flex-row items-center gap-3 py-2 active:opacity-75"
                >
                  <View className="w-8 h-8 rounded-xl bg-indigo-50 items-center justify-center">
                    <Compass size={17} color="#4f46e5" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-900">{t("homeDesign.journeyTitle")}</Text>
                    {journey?.current_module != null && totalModules > 0 ? (
                      <Text className="text-2xs text-slate-500">
                        {t("home.journey.moduleOf", {
                          current: journey.current_module,
                          total: totalModules,
                        })}
                      </Text>
                    ) : null}
                  </View>
                  <ArrowRight size={15} color="#94a3b8" />
                </Pressable>

                {/* Weak sounds section */}
                {authToken ? (
                  <View className="gap-2">
                    <Text className="text-xs font-bold text-slate-900">{t("homeDesign.weakSounds")}</Text>
                    {summaryLoading ? (
                      <ActivityIndicator
                        className="self-start py-2"
                        size="small"
                        color="#4f46e5"
                        accessibilityLabel={t("homeDesign.loadingProfile")}
                      />
                    ) : summaryError ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={onRefresh}
                        className="gap-1 min-h-[36px]"
                      >
                        <Text className="text-xs text-slate-500">{t("homeDesign.summaryError")}</Text>
                        <Text className="text-xs font-semibold text-indigo-600">{t("homeDesign.retry")}</Text>
                      </Pressable>
                    ) : weakestPhonemes.length ? (
                      <View className="flex-row flex-wrap gap-2">
                        {weakestPhonemes.slice(0, 5).map((item, index) => (
                          <Pressable
                            accessibilityRole="button"
                            key={`${item.sound}-${index}`}
                            onPress={() => navigateWithGate("Phonemes")}
                            accessibilityLabel={t("homeDesign.openWeakSound", {
                              sound: item.sound,
                            })}
                            className="min-w-[40px] px-3 py-2 items-center justify-center bg-slate-50 border border-slate-200 rounded-xl active:opacity-75"
                          >
                            <Text className="text-xs font-bold text-indigo-700">
                              /{item.sound.replace(/^\/+|\/+$/g, "")}/
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-xs text-slate-500">
                        {t("homeDesign.buildingProfile")}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text className="text-xs text-slate-500">{t("homeDesign.guestPhonemes")}</Text>
                )}

                {/* Primary Start Lesson CTA */}
                <Pressable
                  testID="home-start-lesson"
                  accessibilityRole="button"
                  onPress={() => navigateWithGate("Phonemes", { startLesson: true })}
                  className="min-h-[48px] rounded-2xl bg-indigo-600 px-4.5 py-3 flex-row items-center justify-between gap-2.5 shadow-md active:opacity-85"
                >
                  <Text className="text-sm font-bold text-white flex-1">
                    {t("home.journey.startLesson")}
                  </Text>
                  <ArrowRight size={18} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          </View>

          {/* 6. MONTHLY QUOTA */}
          {quota ? (
            <View testID="home-monthly-quota" className="pt-4 border-t border-slate-100 gap-2.5">
              <Text className="text-xs font-bold text-slate-900">{t("homeDesign.monthlyRemaining")}</Text>
              <View className={stackActions ? "flex-col gap-2.5" : "flex-row gap-3"}>
                {(["pronunciation", "ocr", "audio"] as const).map((type) => (
                  <View key={type} className="flex-1 gap-1">
                    <Text
                      className={`text-lg font-bold ${
                        quota[type].isExhausted ? "text-red-600" : "text-slate-900"
                      }`}
                    >
                      {quota[type].remaining}
                      <Text className="text-xs font-normal text-slate-400"> / {quota[type].limit}</Text>
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {t(`homeDesign.quota.${type}`)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* 7. FOOTNOTE */}
          <View className="flex-row items-center justify-center gap-1.5 -mt-2">
            <AudioLines size={14} color="#64748b" />
            <Text className="text-xs text-slate-500 text-center">{t("homeDesign.ukVoice")}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

