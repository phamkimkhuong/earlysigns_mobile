import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { colors } from "@/core/theme";
import { hapticFeedback } from "@/utils/haptics";
import type { RootStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface IntroSlide {
  id: number;
  icon: typeof Video;
  titleKey: string;
  descKey: string;
  badgeKey: string;
  color: string;
  bgTint: string;
  borderTint: string;
}

export default function OnboardingScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { completeOnboarding, updateUserLanguage } = useAuth();

  // Step state: "language" (Wireframe A02) -> "intro" (Wireframe A03)
  const [step, setStep] = useState<"language" | "intro">("language");
  const [selectedLanguage, setSelectedLanguage] = useState<"vi" | "en">(
    i18n.language?.startsWith("en") ? "en" : "vi"
  );
  const [activeSlide, setActiveSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const introSlides: IntroSlide[] = [
    {
      id: 0,
      icon: Video,
      titleKey: "onboarding.slide1Title",
      descKey: "onboarding.slide1Desc",
      badgeKey: "01",
      color: "#10b981",
      bgTint: "bg-emerald-500/15",
      borderTint: "border-emerald-500/30",
    },
    {
      id: 1,
      icon: FileText,
      titleKey: "onboarding.slide2Title",
      descKey: "onboarding.slide2Desc",
      badgeKey: "02",
      color: "#3b82f6",
      bgTint: "bg-blue-500/15",
      borderTint: "border-blue-500/30",
    },
    {
      id: 2,
      icon: BarChart3,
      titleKey: "onboarding.slide3Title",
      descKey: "onboarding.slide3Desc",
      badgeKey: "03",
      color: "#8b5cf6",
      bgTint: "bg-violet-500/15",
      borderTint: "border-violet-500/30",
    },
  ];

  const handleSelectLanguage = (lang: "vi" | "en") => {
    setSelectedLanguage(lang);
    hapticFeedback.selection();
    void updateUserLanguage(lang);
  };

  const handleContinueFromLanguage = () => {
    hapticFeedback.light();
    void updateUserLanguage(selectedLanguage);
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

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeSlide && index >= 0 && index < introSlides.length) {
      setActiveSlide(index);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-appBg">
      {step === "language" ? (
        /* ========================================================
         * A02 - CHỌN NGÔN NGỮ (Language Selection Screen)
         * ======================================================== */
        <View className="flex-1 justify-between px-6 py-6">
          {/* Header Brand & Titles */}
          <View className="items-center mt-6">
            <View className="w-16 h-16 rounded-2xl bg-appElevated items-center justify-center border border-appBorder shadow-sm mb-4">
              <Image
                source={require("@assets/logo.png")}
                className="w-11 h-11 rounded-xl"
                resizeMode="contain"
              />
            </View>

            <Text className="text-2xl font-black text-appText text-center tracking-tight mb-2">
              {t("onboarding.languageSelectionTitle") || "Chọn ngôn ngữ"}
            </Text>

            <Text className="text-sm text-appTextSecondary text-center px-4 leading-relaxed">
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
              className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                selectedLanguage === "vi"
                  ? "bg-accent/10 border-accent shadow-sm"
                  : "bg-appElevated border-appBorder"
              }`}
            >
              <View className="flex-row items-center gap-3.5 flex-1">
                <View className="w-12 h-12 rounded-xl bg-appBg border border-appBorder items-center justify-center">
                  <Text className="text-2xl">🇻🇳</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-appText">Tiếng Việt</Text>
                  <Text className="text-xs text-appTextSecondary mt-0.5">
                    Giao diện tiếng Việt
                  </Text>
                </View>
              </View>

              {selectedLanguage === "vi" ? (
                <View className="w-7 h-7 rounded-full bg-accent items-center justify-center">
                  <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.5} />
                </View>
              ) : (
                <ChevronRight size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>

            {/* Option 2: English */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage("en")}
              className={`p-4 rounded-2xl border flex-row items-center justify-between ${
                selectedLanguage === "en"
                  ? "bg-accent/10 border-accent shadow-sm"
                  : "bg-appElevated border-appBorder"
              }`}
            >
              <View className="flex-row items-center gap-3.5 flex-1">
                <View className="w-12 h-12 rounded-xl bg-appBg border border-appBorder items-center justify-center">
                  <Text className="text-2xl">🇬🇧</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-appText">English</Text>
                  <Text className="text-xs text-appTextSecondary mt-0.5">
                    UK English Interface
                  </Text>
                </View>
              </View>

              {selectedLanguage === "en" ? (
                <View className="w-7 h-7 rounded-full bg-accent items-center justify-center">
                  <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.5} />
                </View>
              ) : (
                <ChevronRight size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom Continue CTA */}
          <View className="mb-4">
            <PrimaryButton
              title={t("onboarding.continue") || "Tiếp tục"}
              onPress={handleContinueFromLanguage}
            />
          </View>
        </View>
      ) : (
        /* ========================================================
         * A03 - GIỚI THIỆU (1/3, 2/3, 3/3 Onboarding Flow)
         * ======================================================== */
        <View className="flex-1 justify-between py-4">
          {/* Top Bar Navigation */}
          <View className="flex-row items-center justify-between px-6 pt-2 h-10">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                hapticFeedback.light();
                setStep("language");
              }}
              className="flex-row items-center gap-1 py-1 pr-2"
            >
              <ChevronLeft size={18} color={colors.textSecondary} />
              <Text className="text-xs font-semibold text-appTextSecondary">
                {selectedLanguage === "vi" ? "Ngôn ngữ" : "Language"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleFinish}
              className="py-1 pl-2"
            >
              <Text className="text-xs font-semibold text-appTextMuted">
                {t("onboarding.skip") || "Bỏ qua"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Swipeable Slides FlatList */}
          <View className="flex-1 justify-center my-4">
            <FlatList
              ref={flatListRef}
              data={introSlides}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const IconComponent = item.icon;
                return (
                  <View
                    style={{ width: SCREEN_WIDTH }}
                    className="items-center justify-center px-8"
                  >
                    {/* Feature Illustration Box */}
                    <View
                      className={`w-28 h-28 rounded-3xl items-center justify-center border shadow-lg shadow-black/10 mb-8 ${item.bgTint} ${item.borderTint}`}
                    >
                      <IconComponent size={52} color={item.color} strokeWidth={2} />
                    </View>

                    {/* Slide Title & Description */}
                    <Text className="text-2xl font-black text-appText text-center tracking-tight mb-3">
                      {t(item.titleKey)}
                    </Text>
                    <Text className="text-sm text-appTextSecondary text-center leading-relaxed max-w-[320px]">
                      {t(item.descKey)}
                    </Text>
                  </View>
                );
              }}
            />
          </View>

          {/* Bottom Area: Pagination Dots & Controls */}
          <View className="px-6 pb-6 gap-6">
            {/* Pagination Dots Indicator (● ○ ○) */}
            <View className="flex-row justify-center items-center gap-2">
              {introSlides.map((s, idx) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                    setActiveSlide(idx);
                    hapticFeedback.selection();
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === activeSlide ? "w-7 bg-accent" : "w-2 bg-appBorderStrong"
                  }`}
                />
              ))}
            </View>

            {/* Bottom Actions based on Slide Index */}
            {activeSlide < introSlides.length - 1 ? (
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleFinish}
                  className="px-4 py-3"
                >
                  <Text className="text-sm font-semibold text-appTextMuted">
                    {t("onboarding.skip") || "Bỏ qua"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleNextSlide}
                  className="bg-accent px-6 py-3 rounded-xl flex-row items-center gap-1.5 active:opacity-90 shadow-sm"
                >
                  <Text className="text-sm font-bold text-white">
                    {t("onboarding.next") || "Tiếp theo"}
                  </Text>
                  <ChevronRight size={16} color="#ffffff" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="w-full">
                <PrimaryButton
                  title={t("onboarding.getStarted") || "Bắt đầu"}
                  onPress={handleFinish}
                />
              </View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
