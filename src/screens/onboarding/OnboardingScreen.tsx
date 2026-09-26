import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { hapticFeedback } from "@/utils/haptics";
import type { RootStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const INTRO_ASSETS = {
  slide1: require("@assets/introduce/intro-one.png"),
  slide2: require("@assets/introduce/intro-two.png"),
  slide3Vi: require("@assets/introduce/intro-three.png"),
  slide3En: require("@assets/introduce/intro-three-eng.png"),
};

interface IntroSlide {
  id: number;
  image: ImageSourcePropType;
  icon: typeof Video;
  tagKey: string;
  leadKey: string;
  accentKey: string;
  descKey: string;
  tagBg: string;
  tagColor: string;
}

export default function OnboardingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { t, i18n } = useTranslation();
  const { completeOnboarding, updateUserLanguage } = useAuth();

  // Step state: "language" (Wireframe A02) -> "intro" (Wireframe A03)
  const [step, setStep] = useState<"language" | "intro">("intro");
  const [selectedLanguage, setSelectedLanguage] = useState<"vi" | "en">(
    i18n.language?.startsWith("en") ? "en" : "vi"
  );
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const isEn = selectedLanguage === "en";

  // Density & Viewport classification
  const isCompact = screenHeight < 750;
  const isNarrow = screenWidth < 375;

  const horizontalPadding = isNarrow ? 20 : 24;

  // Header safe clearance (back chevron and skip button)
  const headerTop = insets.top > 0 ? insets.top + 4 : 10;
  const headerHeight = headerTop + 38;

  // Controlled Hero scaling (~1.18x - 1.20x width):
  // Gives an expansive edge-to-edge feel without cutting off artwork subjects
  const imgWidth = Math.round(screenWidth * (isCompact ? 1.10 : isNarrow ? 1.20 : 1.18));
  const imgHeight = Math.round(imgWidth / (1448 / 1086));

  // Shift image down so it breathes naturally below the header
  const imgTop = headerHeight + (isCompact ? 2 : 8);

  // Safe horizontal anchor:
  // - Keeps scorecard (Slide 3) at a comfortable 16px margin from left edge on narrow phones
  // - Naturally centers or balances on wider screens
  const centeredLeft = Math.round((screenWidth - imgWidth) / 2);
  const safeCardLeft = Math.round(16 - imgWidth * (141 / 1448));
  const imgLeft = Math.max(centeredLeft, safeCardLeft);

  // Hero canvas container height:
  const heroHeight = Math.round(imgTop + imgHeight - (isCompact ? 8 : 16));

  const topAuraHeight = Math.max(heroHeight, 200);

  // Giant Display Typography
  const titleSize = isCompact ? 28 : isNarrow ? 32 : 36;
  const titleLineHeight = isCompact ? 34 : isNarrow ? 38 : 42;
  const descSize = isCompact ? 14 : 15;
  const descLineHeight = isCompact ? 20 : 23;

  const introSlides: IntroSlide[] = useMemo(
    () => [
      {
        id: 0,
        image: INTRO_ASSETS.slide1,
        icon: Video,
        tagKey: "onboarding.slide1Tag",
        leadKey: "onboarding.slide1Lead",
        accentKey: "onboarding.slide1Accent",
        descKey: "onboarding.slide1Desc",
        tagBg: "#e6f9f0",
        tagColor: "#059669",
      },
      {
        id: 1,
        image: INTRO_ASSETS.slide2,
        icon: FileText,
        tagKey: "onboarding.slide2Tag",
        leadKey: "onboarding.slide2Lead",
        accentKey: "onboarding.slide2Accent",
        descKey: "onboarding.slide2Desc",
        tagBg: "#eff6ff",
        tagColor: "#0284c7",
      },
      {
        id: 2,
        image: isEn ? INTRO_ASSETS.slide3En : INTRO_ASSETS.slide3Vi,
        icon: BarChart3,
        tagKey: "onboarding.slide3Tag",
        leadKey: "onboarding.slide3Lead",
        accentKey: "onboarding.slide3Accent",
        descKey: "onboarding.slide3Desc",
        tagBg: "#f5f3ff",
        tagColor: "#4f46e5",
      },
    ],
    [isEn]
  );

  const handleSelectLanguage = async (lang: "vi" | "en") => {
    setSelectedLanguage(lang);
    hapticFeedback.selection();
    try {
      await updateUserLanguage(lang);
    } catch {
      // keep local selection if offline
    }
  };

  const handleContinueFromLanguage = async () => {
    hapticFeedback.light();
    try {
      await updateUserLanguage(selectedLanguage);
    } catch {
      // continue flow
    }
    setActiveSlide(0);
    setStep("intro");
  };

  const handleFinish = () => {
    hapticFeedback.success();
    completeOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
  };

  const handleNextSlide = () => {
    if (activeSlide < introSlides.length - 1) {
      const nextIndex = activeSlide + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveSlide(nextIndex);
      hapticFeedback.selection();
    } else {
      handleFinish();
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index !== activeSlide && index >= 0 && index < introSlides.length) {
      setActiveSlide(index);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {step === "language" ? (
        /* ========================================================
         * A02 - CHỌN NGÔN NGỮ (Language Selection Screen)
         * ======================================================== */
        <SafeAreaView className="flex-1 justify-between px-6 py-6 bg-white">
          {/* Header Brand & Titles */}
          <View className="items-center mt-6">
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: "#f8fafc",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                marginBottom: 16,
              }}
            >
              <Image
                source={require("@assets/logo.png")}
                className="w-11 h-11 rounded-xl"
                resizeMode="contain"
              />
            </View>

            <Text className="text-2xl font-black text-slate-900 text-center tracking-tight mb-2">
              {t("onboarding.languageSelectionTitle") || "Chọn ngôn ngữ"}
            </Text>

            <Text className="text-sm text-slate-500 text-center px-4 leading-relaxed">
              {t("onboarding.languageSelectionSubtitle") ||
                "Bạn có thể thay đổi sau trong phần Cài đặt"}
            </Text>
          </View>

          {/* Language Options Cards */}
          <View className="gap-3.5 my-8">
            {/* Option 1: Tiếng Việt */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage("vi")}
              style={{
                padding: 16,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: selectedLanguage === "vi" ? "#0084ff" : "#e2e8f0",
                backgroundColor: selectedLanguage === "vi" ? "#eff6ff" : "#f8fafc",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View className="flex-row items-center gap-3.5 flex-1">
                <View className="w-12 h-12 rounded-xl bg-white border border-slate-200 items-center justify-center">
                  <Text className="text-2xl">🇻🇳</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900">Tiếng Việt</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Giao diện tiếng Việt
                  </Text>
                </View>
              </View>

              {selectedLanguage === "vi" ? (
                <View className="w-7 h-7 rounded-full bg-blue-600 items-center justify-center">
                  <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.5} />
                </View>
              ) : (
                <ChevronRight size={18} color="#94a3b8" />
              )}
            </TouchableOpacity>

            {/* Option 2: English */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage("en")}
              style={{
                padding: 16,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: selectedLanguage === "en" ? "#0084ff" : "#e2e8f0",
                backgroundColor: selectedLanguage === "en" ? "#eff6ff" : "#f8fafc",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View className="flex-row items-center gap-3.5 flex-1">
                <View className="w-12 h-12 rounded-xl bg-white border border-slate-200 items-center justify-center">
                  <Text className="text-2xl">🇬🇧</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900">English</Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    UK English Interface
                  </Text>
                </View>
              </View>

              {selectedLanguage === "en" ? (
                <View className="w-7 h-7 rounded-full bg-blue-600 items-center justify-center">
                  <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.5} />
                </View>
              ) : (
                <ChevronRight size={18} color="#94a3b8" />
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom Continue CTA */}
          <View className="mb-4">
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleContinueFromLanguage}
              style={{
                width: "100%",
                height: 56,
                borderRadius: 16,
                overflow: "hidden",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="btnGradLang" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="#0091ff" />
                      <Stop offset="100%" stopColor="#0066ff" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#btnGradLang)" />
                </Svg>
              </View>
              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-white font-bold text-base">
                  {t("onboarding.continue") || "Tiếp tục"}
                </Text>
                <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      ) : (
        /* ========================================================
         * A03 - GIỚI THIỆU (Full-Bleed Immersive Golden Ratio Flow)
         * ======================================================== */
        <View className="flex-1 bg-white justify-between">
          {/* Top Atmospheric Aura Gradient (Seamlessly blends status bar into artwork) */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: topAuraHeight,
              zIndex: 0,
            }}
          >
            <Svg height="100%" width="100%">
              <Defs>
                <LinearGradient id="heroAura" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#bae6fd" stopOpacity="0.55" />
                  <Stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.25" />
                  <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroAura)" />
            </Svg>
          </View>

          {/* Floating Safe Header */}
          <View
            style={{
              position: "absolute",
              top: headerTop,
              left: 0,
              right: 0,
              paddingHorizontal: horizontalPadding,
              zIndex: 30,
            }}
            className="flex-row items-center justify-between"
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                hapticFeedback.light();
                setStep("language");
              }}
              hitSlop={16}
              className="w-10 h-10 items-start justify-center"
            >
              <ChevronLeft size={24} color="#0f172a" strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleFinish}
              hitSlop={16}
              className="h-10 items-end justify-center"
            >
              <Text className="text-[15px] font-medium text-slate-500">
                {t("onboarding.skip") || "Bỏ qua"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Full-width FlatList with Golden Proportions */}
          <View className="flex-1">
            <FlatList
              ref={flatListRef}
              data={introSlides}
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleScroll}
              scrollEventThrottle={16}
              keyExtractor={(item) => String(item.id)}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              renderItem={({ item }) => {
                const IconComponent = item.icon;
                return (
                  <View
                    style={{ width: screenWidth }}
                    className="flex-1 justify-between"
                  >
                    {/* Top Section: Hero Artwork Canvas (Edge-to-edge full bleed) */}
                    <View
                      style={{
                        width: screenWidth,
                        height: heroHeight,
                        overflow: "hidden",
                      }}
                    >
                      <Image
                        source={item.image}
                        style={{
                          position: "absolute",
                          top: imgTop,
                          left: imgLeft,
                          width: imgWidth,
                          height: imgHeight,
                        }}
                        resizeMode="contain"
                      />
                    </View>

                    {/* Middle Section: Content Block with Display Typography */}
                    <View
                      style={{
                        paddingHorizontal: horizontalPadding,
                        paddingTop: isCompact ? 10 : 18,
                      }}
                    >
                      {/* Feature Pill */}
                      <View
                        style={{ backgroundColor: item.tagBg }}
                        className="flex-row items-center self-start gap-1.5 px-3.5 py-1.5 rounded-full mb-3"
                      >
                        <IconComponent
                          size={14}
                          color={item.tagColor}
                          strokeWidth={2.5}
                        />
                        <Text
                          style={{ color: item.tagColor }}
                          className="text-[13px] font-bold tracking-tight"
                        >
                          {t(item.tagKey)}
                        </Text>
                      </View>

                      {/* Giant Two-tone Headline (Two stacked bold lines) */}
                      <View style={{ marginBottom: 10 }}>
                        <Text
                          style={{
                            fontSize: titleSize,
                            lineHeight: titleLineHeight,
                            color: "#0c1a30",
                            fontWeight: "900",
                          }}
                        >
                          {t(item.leadKey)}
                        </Text>
                        <Text
                          style={{
                            fontSize: titleSize,
                            lineHeight: titleLineHeight,
                            color: "#0084ff",
                            fontWeight: "900",
                          }}
                        >
                          {t(item.accentKey)}
                        </Text>
                      </View>

                      {/* Description Copy */}
                      <Text
                        style={{
                          fontSize: descSize,
                          lineHeight: descLineHeight,
                        }}
                        className="font-normal text-slate-500 text-left max-w-[340px]"
                      >
                        {t(item.descKey)}
                      </Text>
                    </View>

                    {/* Elastic spacer to absorb remainder space */}
                    <View className="flex-1 min-h-[16px]" />
                  </View>
                );
              }}
            />
          </View>

          {/* Bottom Anchor Footer: Capsule Indicator & Heavyweight CTA */}
          <View
            style={{
              paddingHorizontal: horizontalPadding,
              paddingBottom: Math.max(insets.bottom, 20),
            }}
            className="pt-2"
          >
            {/* Capsule Indicator */}
            <View className="flex-row justify-center items-center gap-2 mb-4">
              {introSlides.map((s, idx) => {
                const isActive = idx === activeSlide;
                return (
                  <Pressable
                    key={s.id}
                    hitSlop={10}
                    onPress={() => {
                      flatListRef.current?.scrollToIndex({
                        index: idx,
                        animated: true,
                      });
                      setActiveSlide(idx);
                      hapticFeedback.selection();
                    }}
                    style={{
                      height: 8,
                      borderRadius: 4,
                      width: isActive ? 28 : 8,
                      backgroundColor: isActive ? "#0084ff" : "#e2e8f0",
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Slide ${idx + 1}`}
                    accessibilityState={{ selected: isActive }}
                  />
                );
              })}
            </View>

            {/* Heavyweight Gradient Full-width CTA Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleNextSlide}
              style={{
                width: "100%",
                height: 56,
                borderRadius: 16,
                overflow: "hidden",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width="100%" height="100%">
                  <Defs>
                    <LinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="#0091ff" />
                      <Stop offset="100%" stopColor="#0066ff" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#btnGrad)" />
                </Svg>
              </View>
              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-white font-bold text-base">
                  {activeSlide < introSlides.length - 1
                    ? t("onboarding.continue") || "Tiếp tục"
                    : t("onboarding.startPractice") || "Bắt đầu luyện"}
                </Text>
                <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
