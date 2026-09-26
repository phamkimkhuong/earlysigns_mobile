import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import {
  ArrowRight,
  AudioLines,
  Camera,
  ChevronRight,
  FileText,
  Flame,
} from "lucide-react-native";
import { useHomeViewModel } from "@/hooks/useHomeViewModel";
import { BrandWaveform } from "@/components/ui/BrandWaveform";

/**
 * EarlySigns Official Brand Logo + Title
 */
function EarlySignsBrandLogo() {
  return (
    <View className="flex-row items-center gap-2">
      <Image
        source={require("@assets/logo.png")}
        style={{ width: 28, height: 28 }}
        className="w-7 h-7 rounded-lg"
        resizeMode="contain"
      />
      <Text className="text-[20px] font-black text-[#0c2340] tracking-tight">EarlySigns</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }: { navigation: any }) {
  const {
    t,
    authToken,
    userName,
    userTier,
    refreshing,
    onRefresh,
    streakDays,
    clarityPct,
    journeyProgressPct,
    weakestPhonemes,
    videoProgress,
    navigateWithGate,
  } = useHomeViewModel(navigation);

  const { width, fontScale } = useWindowDimensions();
  const stackActions = width < 360 || fontScale > 1.25;

  // Active sound chips: 3 distinct sounds from user's weak phonemes or standard core defaults
  const DEFAULT_CORE_PHONEMES = ["θ", "ð", "ɪ"];
  const rawPhonemes = (weakestPhonemes || [])
    .map((item) => {
      const raw = typeof item === "string" ? item : (item?.sound || "");
      return String(raw).replace(/^\/+|\/+$/g, "").trim();
    })
    .filter((s) => s.length > 0 && s !== "/");
  const displayPhonemes = [0, 1, 2].map((i) => rawPhonemes[i] || DEFAULT_CORE_PHONEMES[i]);

  // Journey progress percentage: from API for authenticated users, strictly 0 for guests
  const displayJourneyPct = authToken
    ? (journeyProgressPct != null ? journeyProgressPct : (clarityPct != null ? clarityPct : 0))
    : 0;

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-[#f8fafc]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0284c7"
            colors={["#0284c7"]}
          />
        }
      >
        <View className="w-full max-w-[600px] self-center px-5 pt-3.5 pb-8 gap-5">
          {/* 1. TOP BAR: BRAND LOGO & USER ACCOUNT / LOGIN BUTTON */}
          <View className="flex-row items-center justify-between">
            <EarlySignsBrandLogo />
            {authToken ? (
              <Pressable
                testID="home-account"
                onPress={() => navigation.navigate("Profile", { tab: "account" })}
                className="py-1 active:opacity-75"
              >
                <Text
                  numberOfLines={1}
                  className="text-base font-bold text-[#0c2340] max-w-[170px]"
                >
                  {t("homeDesign.greeting", { name: userName || "bạn" })}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("homeDesign.login", "Đăng nhập")}
                testID="home-account"
                onPress={() => navigation.navigate("Login", { next: "Home" })}
                className="bg-[#0c2340] px-4 py-2 rounded-full active:opacity-85 shadow-xs"
              >
                <Text className="text-white text-xs font-bold">
                  {t("homeDesign.login", "Đăng nhập")}
                </Text>
              </Pressable>
            )}
          </View>

          {/* 2. EDITORIAL HEADLINE & STATUS ACCORDING TO SPEC §7 */}
          <View
            accessibilityRole="header"
            accessibilityLabel={`${t("homeDesign.headline")} ${t("homeDesign.headlineLead", "muốn")} ${t("homeDesign.headlineAccent", "luyện gì?")}`}
            className="gap-1 mt-1"
          >
            <Text className="text-[32px] font-black text-[#0c2340] tracking-tight leading-[38px]">
              {t("homeDesign.headline")}
            </Text>
            <View className="h-10 justify-center -mt-0.5">
              <Svg height={42} width="100%">
                <Defs>
                  <LinearGradient id="headlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#0c2340" />
                    <Stop offset="30%" stopColor="#0369a1" />
                    <Stop offset="68%" stopColor="#0284c7" />
                    <Stop offset="100%" stopColor="#0ea5e9" />
                  </LinearGradient>
                </Defs>
                <SvgText
                  x="0"
                  y="30"
                  fontSize="31"
                  fontWeight="900"
                  fill="url(#headlineGrad)"
                >
                  {`${t("homeDesign.headlineLead", "muốn")} ${t("homeDesign.headlineAccent", "luyện gì?")}`}
                </SvgText>
              </Svg>
            </View>
            <Text className="text-[14px] font-medium text-[#64748b] leading-relaxed mt-0.5">
              {t("homeDesign.subtitle")}
            </Text>

            {/* Signed-in Account Status & Progress Badges */}
            {authToken ? (
              <View className="flex-row flex-wrap items-center gap-2 mt-1.5">
                {streakDays != null && streakDays > 0 ? (
                  <View className="flex-row items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/70">
                    <Flame size={13} color="#b45309" />
                    <Text className="text-2xs font-bold text-amber-800">
                      {t("homeDesign.streak", { count: streakDays })}
                    </Text>
                  </View>
                ) : null}

                {/* Account Status Badge */}
                <View
                  className={`px-2.5 py-1 rounded-full border ${userTier === "pro"
                    ? "bg-indigo-50 border-indigo-200"
                    : userTier === "trial"
                      ? "bg-amber-50 border-amber-200"
                      : "bg-slate-100 border-slate-200"
                    }`}
                >
                  <Text
                    className={`text-2xs font-bold ${userTier === "pro"
                      ? "text-indigo-700"
                      : userTier === "trial"
                        ? "text-amber-700"
                        : "text-slate-600"
                      }`}
                  >
                    {userTier === "pro"
                      ? t("homeDesign.proPlan")
                      : userTier === "trial"
                        ? t("homeDesign.trialPlan")
                        : t("homeDesign.freePlan")}
                  </Text>
                </View>

                {/* Clarity Score Badge */}
                {clarityPct != null ? (
                  <Text
                    testID="home-clarity"
                    className="text-2xs font-bold text-teal-800 bg-teal-50 border border-teal-200/70 px-2.5 py-1 rounded-full"
                  >
                    {t("homeDesign.clarity", { percent: clarityPct })}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* 3. SECTION 1: HERO VIDEO CARD (DEEP OCEAN NAVY GRADIENT) */}
          <Pressable
            testID="home-video"
            accessibilityRole="button"
            accessibilityLabel={t("homeDesign.videoAccessibility")}
            onPress={() => navigateWithGate("Videos")}
            className="rounded-[28px] overflow-hidden bg-[#0a2644] p-5 shadow-lg relative min-h-[230px] justify-between active:opacity-90"
          >
            {/* Background Gradient */}
            <View
              pointerEvents="none"
              className="absolute inset-0"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Svg width="100%" height="100%">
                <Defs>
                  <LinearGradient id="home-hero-grad" x1="0%" y1="0%" x2="100%" y2="85%">
                    <Stop offset="0%" stopColor="#092440" />
                    <Stop offset="45%" stopColor="#124670" />
                    <Stop offset="100%" stopColor="#1a5f91" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#home-hero-grad)" />
              </Svg>
            </View>


            {/* Right Visual Image: Woman Transparent Cutout from woman_hero.png */}
            <View
              pointerEvents="none"
              className="absolute right-0 bottom-0 top-0 w-[52%] z-10 overflow-hidden rounded-r-[28px] justify-end items-end"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Image
                source={require("@assets/home/woman_hero.png")}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </View>

            {/* Two-Layer Speech Waveform Over Woman's Sweater */}
            <View
              style={{ pointerEvents: "none" }}
              className="absolute bottom-4 right-3.5 z-20"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {/* Layer 1: Ambient Glow Wave */}
              <View className="absolute -top-0.5 -left-1">
                <BrandWaveform width={218} height={40} variant="hero" glow opacity={0.16} />
              </View>
              {/* Layer 2: Main Speech Wave */}
              <BrandWaveform width={212} height={35} variant="hero" opacity={0.96} />
            </View>

            {/* Left Card Content with Real Progress from API */}
            <View className="w-[56%] z-30 justify-between">
              <View>
                <Text className="text-[10px] font-bold text-sky-200 tracking-[1.6px] uppercase">
                  {videoProgress?.topic || t("homeDesign.videoCategory")}
                </Text>
                <Text className="text-[23px] font-black text-white mt-1 leading-7">
                  {t("homeDesign.videoTitle")}
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-xs text-sky-100/90 mt-1"
                >
                  {videoProgress?.title || t("homeDesign.videoSubtitle")}
                </Text>
              </View>

              <View className="mt-4">
                {videoProgress ? (
                  <>
                    <Text className="text-xs font-medium text-sky-200">
                      Câu <Text className="font-bold text-white">{videoProgress.played}/{videoProgress.total}</Text>
                    </Text>
                    <View className="w-[130px] h-[5px] bg-sky-950/60 rounded-full overflow-hidden mt-1.5">
                      <View
                        className="h-full bg-[#2dd4bf] rounded-full"
                        style={{ width: `${Math.max(8, videoProgress.pct)}%` }}
                      />
                    </View>
                  </>
                ) : (
                  <Text className="text-xs font-medium text-sky-200">
                    {t("homeDesign.videoCatalogSummary")}
                  </Text>
                )}
              </View>

              <View className="bg-white rounded-full py-2.5 px-4 self-start flex-row items-center gap-1.5 mt-4 shadow-sm">
                <Text className="text-xs font-bold text-[#0c2340]">
                  {videoProgress ? t("homeDesign.videoAction") : t("homeDesign.videoActionExplore")}
                </Text>
                <ArrowRight size={14} color="#0c2340" />
              </View>
            </View>
          </Pressable>

          {/* 4. SECTION 2: LUYỆN VỚI VĂN BẢN TỰ DO (ĐẶC TẢ §7) */}
          <View testID="home-text-section" className="gap-2.5">
            <Text accessibilityRole="header" className="text-[19px] font-extrabold text-[#0c2340] tracking-tight">
              {t("homeDesign.textTitle")}
            </Text>
            <View className={stackActions ? "flex-col gap-2.5" : "flex-row gap-2.5"}>
              {/* Card 1: Nhập văn bản */}
              <Pressable
                testID="home-text-input"
                accessibilityRole="button"
                accessibilityLabel={`${t("homeDesign.inputTitle")}. ${t("homeDesign.inputDescription")}`}
                onPress={() => navigateWithGate("Text", { entry: "input" })}
                className="flex-1 bg-[#edf5fc] border border-[#e1effa] rounded-[22px] px-3 py-3 flex-row items-center justify-between active:opacity-75"
              >
                <View className="flex-row items-center gap-2 flex-1 min-w-0 pr-0.5">
                  <View className="w-9 h-9 rounded-xl bg-white items-center justify-center shadow-xs border border-sky-100">
                    <FileText size={17} color="#0284c7" />
                  </View>
                  <View className="flex-1 min-w-0 justify-center">
                    <Text numberOfLines={1} className="text-[13px] font-bold text-[#0c2340]">
                      {t("homeDesign.inputTitle")}
                    </Text>
                    <Text numberOfLines={1} className="text-[11px] text-[#64748b] mt-0.5">
                      {t("homeDesign.inputDescription")}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={14} color="#94a3b8" />
              </Pressable>

              {/* Card 2: Quét từ ảnh */}
              <Pressable
                testID="home-text-ocr"
                accessibilityRole="button"
                accessibilityLabel={`${t("homeDesign.scanTitle")}. ${t("homeDesign.scanDescription")}`}
                onPress={() => navigateWithGate("Text", { entry: "ocr" })}
                className="flex-1 bg-[#ecfaf6] border border-[#daf3ed] rounded-[22px] px-3 py-3 flex-row items-center justify-between active:opacity-75"
              >
                <View className="flex-row items-center gap-2 flex-1 min-w-0 pr-0.5">
                  <View className="w-9 h-9 rounded-xl bg-white items-center justify-center shadow-xs border border-teal-100">
                    <Camera size={17} color="#0d9488" />
                  </View>
                  <View className="flex-1 min-w-0 justify-center">
                    <Text numberOfLines={1} className="text-[13px] font-bold text-[#0c2340]">
                      {t("homeDesign.scanTitle")}
                    </Text>
                    <Text numberOfLines={1} className="text-[11px] text-[#64748b] mt-0.5">
                      {t("homeDesign.scanDescription")}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={14} color="#94a3b8" />
              </Pressable>
            </View>
          </View>

          {/* 5. SECTION 3: LUYỆN NGỮ ÂM (ĐẶC TẢ §7) */}
          <View testID="home-phonemes-section" className="gap-2.5">
            <Text accessibilityRole="header" className="text-[19px] font-extrabold text-[#0c2340] tracking-tight">
              {t("homeDesign.phonemesTitle")}
            </Text>
            <View className="bg-white border border-[#e8f1f8] rounded-[26px] p-5 shadow-sm relative overflow-hidden min-h-[155px] justify-center">
              {/* Right Graphic: Large Circular Aura Backdrop + Pronunciation Mouth + Emitting Waveform */}
              <View
                style={{ pointerEvents: "none" }}
                className="absolute right-0 top-0 bottom-0 w-[48%] overflow-hidden rounded-r-[26px]"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {/* Large Soft Sky Blue Circular Aura Backdrop */}
                <View
                  style={{ width: 175, height: 175 }}
                  className="rounded-full bg-[#e6f4fe] absolute right-[-25px] top-[-10px]"
                />

                {/* Pronunciation Mouth Asset */}
                <Image
                  source={require("@assets/home/pronunciation_mounth.png")}
                  style={{ width: 122, height: 155, position: "absolute", right: -4, top: 0 }}
                  resizeMode="contain"
                />

                {/* Speech Waveform Emitting from Mouth (Centered with mouth opening) */}
                <View className="absolute right-[62px] top-[63px] z-10">
                  <BrandWaveform width={70} height={44} variant="pronunciation" opacity={0.96} />
                </View>
              </View>

              {/* Left Content */}
              <View className="w-[58%] gap-2.5">
                {/* 3 Core Phoneme Chips */}
                <Pressable
                  testID="home-phonemes"
                  accessibilityRole="button"
                  accessibilityLabel={t("homeDesign.phonemesAccessibility")}
                  onPress={() => navigateWithGate("Phonemes")}
                  className="flex-row items-center gap-1.5 active:opacity-75"
                >
                  {displayPhonemes.map((sound, index) => (
                    <View
                      key={`${sound}-${index}`}
                      className="bg-[#e0effe] min-w-[38px] h-[26px] px-2.5 rounded-full border border-sky-200/70 items-center justify-center"
                    >
                      <Text
                        numberOfLines={1}
                        className="text-xs font-bold text-[#0284c7] text-center"
                        style={{ includeFontPadding: false }}
                      >
                        {`/${sound}/`}
                      </Text>
                    </View>
                  ))}
                </Pressable>

                {/* Phoneme Headline & Subtitle */}
                <Pressable
                  testID="home-start-lesson"
                  accessibilityRole="button"
                  accessibilityLabel={`${t("homeDesign.phonemeHeadline")}. ${t("homeDesign.startLessonAction")}`}
                  onPress={() => navigateWithGate("Phonemes", { startLesson: true })}
                  className="active:opacity-80"
                >
                  <Text className="text-[17px] font-black text-[#0c2340] leading-6">
                    {t("homeDesign.phonemeHeadline")}
                  </Text>
                  <Text className="text-xs text-[#64748b] leading-4 mt-0.5">
                    {t("homeDesign.phonemeDescription")}
                  </Text>
                </Pressable>

                {/* Journey Progress Bar with Ocean-to-Mint Gradient */}
                <Pressable
                  testID="home-journey"
                  accessibilityRole="button"
                  accessibilityLabel={t("homeDesign.journeyTitle")}
                  onPress={() => navigateWithGate("Journey")}
                  className="flex-row items-center gap-2.5 pt-1 active:opacity-75"
                >
                  <View className="flex-1 h-[7px] bg-[#edf2f7] rounded-full overflow-hidden">
                    {displayJourneyPct > 0 ? (
                      <View
                        className="h-full rounded-full overflow-hidden"
                        style={{ width: `${Math.min(100, Math.max(6, displayJourneyPct))}%` }}
                      >
                        <Svg width="100%" height="100%">
                          <Defs>
                            <LinearGradient id="journeyBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <Stop offset="0%" stopColor="#0369a1" />
                              <Stop offset="100%" stopColor="#2dd4bf" />
                            </LinearGradient>
                          </Defs>
                          <Rect width="100%" height="100%" fill="url(#journeyBarGrad)" />
                        </Svg>
                      </View>
                    ) : null}
                  </View>
                  <Text className="text-xs font-bold text-[#475569]">
                    {displayJourneyPct}%
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
          {/* 7. FOOTNOTE */}
          <View className="flex-row items-center justify-center gap-1.5 -mt-1">
            <AudioLines size={14} color="#64748b" />
            <Text className="text-xs text-slate-500 text-center">{t("homeDesign.ukVoice")}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


