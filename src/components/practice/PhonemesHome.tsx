import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { Compass } from "lucide-react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { TFunction } from "i18next";
import { getIpaSoundMeta } from "@/utils/ipaData";
import { PhonemesChipsSkeleton } from "@/components/ui/Skeleton";

const EXPLORE_SOUNDS = ["θ", "ɪ", "æ"];
const primaryBlue = "#0284c7";

type Props = {
  t: TFunction;
  dialect: string;
  screeningCompleted: boolean;
  weakestPhonemes: { sound: string; accuracy?: number }[];
  dailyMissionPhonemes?: string[];
  summaryLoading?: boolean;
  summaryError?: boolean;
  journey?: any;
  lessonLoading?: boolean;
  screeningLoading?: boolean;
  phonemeLoading?: string | null;
  lessonError?: string;
  screeningError?: string;
  onScreening: () => void;
  onLesson: () => void;
  onPhoneme: (sound: string) => void;
  onJourney: () => void;
  onCatalog: () => void;
  onRetry: () => void;
};

function Action({
  title,
  onPress,
  secondary = false,
  loading,
  disabled,
  testID,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  loading?: boolean;
  disabled?: boolean;
  testID: string;
}) {
  const containerStyle: ViewStyle = {
    minHeight: secondary ? 44 : 50,
    paddingHorizontal: 18,
    paddingVertical: secondary ? 10 : 12,
    borderRadius: secondary ? 13 : 15,
    backgroundColor: secondary ? "#f0f7fd" : "#0284c7",
    borderWidth: secondary ? 1.5 : 0,
    borderColor: secondary ? "#bae6fd" : "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: secondary ? 6 : 8,
    opacity: disabled ? 0.6 : 1,
    ...(secondary
      ? {}
      : {
          shadowColor: "#0284c7",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.22,
          shadowRadius: 8,
          elevation: 3,
        }),
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      disabled={disabled}
      onPress={onPress}
      className="active:opacity-85"
      style={containerStyle}
    >
      {loading ? <ActivityIndicator color={secondary ? primaryBlue : "#ffffff"} /> : null}
      <Text
        className={secondary ? "text-sm font-bold text-center text-[#0284c7]" : "text-base font-extrabold text-center text-white"}
        style={{ lineHeight: secondary ? 20 : 23 }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function Hero({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="overflow-hidden"
      style={{
        borderRadius: 24,
        padding: 22,
        gap: 12,
        borderWidth: 1,
        borderColor: "#dbeafe",
      }}
    >
      <View
        pointerEvents="none"
        className="absolute top-0 left-0 right-0 bottom-0"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="phonemesHero" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#e0f2fe" />
              <Stop offset="100%" stopColor="#f0fdfa" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#phonemesHero)" />
        </Svg>
      </View>
      {children}
    </View>
  );
}

export default function PhonemesHome(props: Props) {
  const { t, screeningCompleted, weakestPhonemes, lessonLoading, screeningLoading, phonemeLoading } = props;
  const busy = Boolean(lessonLoading || screeningLoading || phonemeLoading);

  // Normalize weak sounds and ensure empty or invalid strings fall back to standard core phonemes
  const validWeakSounds = (weakestPhonemes || [])
    .map(item => String(typeof item === "string" ? item : (item?.sound || "")).replace(/^\/+|\/+$/g, "").trim())
    .filter(s => s.length > 0 && s !== "/");
  const hasWeakSounds = validWeakSounds.length > 0;

  // When user has fewer than 3 weak sounds (e.g. only 1 weak sound), combine with core explore sounds
  // so the grid always presents 3 balanced sound badges (matching HomeScreen behavior)
  const combinedSounds: string[] = [];
  for (const s of [...validWeakSounds, ...EXPLORE_SOUNDS]) {
    if (!combinedSounds.includes(s)) {
      combinedSounds.push(s);
    }
    if (combinedSounds.length >= 3) break;
  }
  const sounds = validWeakSounds.length >= 3 ? validWeakSounds.slice(0, 5) : combinedSounds;

  // Map accuracy percentages for weak sounds
  const soundAccuracyMap = new Map<string, number>();
  (weakestPhonemes || []).forEach(item => {
    const s = String(typeof item === "string" ? item : (item?.sound || "")).replace(/^\/+|\/+$/g, "").trim();
    if (s && typeof item === "object" && item?.accuracy != null && Number.isFinite(Number(item.accuracy))) {
      const num = Number(item.accuracy);
      soundAccuracyMap.set(s, num > 1 ? Math.round(num) : Math.round(num * 100));
    }
  });

  // Target sounds specifically for today's lesson (from dailyMissionPhonemes or top weak sounds)
  const targetSounds = (props.dailyMissionPhonemes && props.dailyMissionPhonemes.length > 0)
    ? props.dailyMissionPhonemes
    : validWeakSounds.slice(0, 3);
  const hasTargetSounds = targetSounds.length > 0;

  const renderTargetSoundChips = (isHero: boolean) => {
    if (!hasTargetSounds) return null;
    return (
      <View className="flex-row flex-wrap items-center gap-2 pt-0.5 pb-1">
        {targetSounds.map((sound) => (
          <TouchableOpacity
            key={sound}
            activeOpacity={0.75}
            onPress={() => props.onPhoneme(sound)}
            className="flex-row items-center px-3.5 py-1.5 rounded-xl border active:opacity-75"
            style={{
              backgroundColor: isHero ? "#ffffff" : "#f0f7fd",
              borderColor: "#bae6fd",
            }}
          >
            <Text className="text-[#0284c7] text-sm font-extrabold" numberOfLines={1}>
              {`/${sound}/`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const lessonButton = (secondary: boolean) => (
    <Action
      testID="phonemes-start-lesson"
      title={t(lessonLoading ? "phonemesHome.preparing" : "phonemesHome.startLesson", t("phonemesHome.startLesson", "Bắt đầu bài luyện"))}
      onPress={props.onLesson}
      secondary={secondary}
      loading={lessonLoading}
      disabled={busy}
    />
  );

  return (
    <ScrollView
      className="flex-1 bg-[#f8fafc]"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 1. Hero Card ── */}
      {!screeningCompleted ? (
        <View
          testID="phonemes-screening-card"
          style={{
            borderRadius: 24,
            shadowColor: "#0284c7",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 14,
            elevation: 3,
          }}
        >
          <Hero>
            {/* Pill Eyebrow Badge */}
            <View
              className="self-start px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "#e0effe", borderWidth: 1, borderColor: "#bae6fd" }}
            >
              <Text className="text-[#0284c7] text-xs font-bold uppercase tracking-wider">
                {t("phonemesHome.screeningEyebrow")}
              </Text>
            </View>

            {/* Main Headline */}
            <Text
              accessibilityRole="header"
              className="text-[#0c2340] font-extrabold"
              style={{ fontSize: 26, lineHeight: 33, letterSpacing: -0.5 }}
            >
              {t("phonemesHome.screeningTitle")}
            </Text>

            {/* Description */}
            <Text className="text-[#475569] text-sm" style={{ lineHeight: 21 }}>
              {t("phonemesHome.screeningDescription")}
            </Text>

            {/* 5 Sentence Indicator Bars */}
            <View
              className="flex-row items-center gap-1.5 my-0.5"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {[0, 1, 2, 3, 4].map(item => (
                <View
                  key={item}
                  className="flex-1 bg-[#38bdf8]"
                  style={{ height: 5, borderRadius: 3, opacity: 0.75 }}
                />
              ))}
            </View>

            {/* Coverage Note */}
            <Text className="text-[#64748b] text-xs font-medium" style={{ lineHeight: 18 }}>
              {t("phonemesHome.screeningCoverage")}
            </Text>

            {/* Primary Action Button */}
            <Action
              testID="phonemes-start-screening"
              title={t(screeningLoading ? "phonemesHome.preparing" : "phonemesHome.startScreening")}
              onPress={props.onScreening}
              loading={screeningLoading}
              disabled={busy}
            />

            {props.screeningError ? (
              <Text accessibilityRole="alert" className="text-[#b42318] text-sm" style={{ lineHeight: 21 }}>
                {props.screeningError}
              </Text>
            ) : null}
          </Hero>
        </View>
      ) : (
        <View
          testID="phonemes-lesson-hero"
          style={{
            borderRadius: 24,
            shadowColor: "#0284c7",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 14,
            elevation: 3,
          }}
        >
          <Hero>
            <View className="flex-row items-center justify-between">
              <View
                className="self-start px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "#e0effe", borderWidth: 1, borderColor: "#bae6fd" }}
              >
                <Text className="text-[#0284c7] text-xs font-bold uppercase tracking-wider">
                  {t("phonemesHome.dailyMissionEyebrow", "Nhiệm vụ hôm nay")}
                </Text>
              </View>
              <Pressable
                testID="phonemes-journey"
                accessibilityRole="button"
                accessibilityLabel={t("phonemesHome.journeyTitle")}
                onPress={props.onJourney}
                className="flex-row items-center gap-1.5 px-3 py-1 rounded-full border active:opacity-75"
                style={{ backgroundColor: "#e0effe", borderColor: "#bae6fd" }}
              >
                <Compass size={14} color="#0284c7" />
                <Text className="text-[#0284c7] text-xs font-bold uppercase tracking-wider">
                  {t("phonemesHome.journeyLink", "Hành trình")} →
                </Text>
              </Pressable>
            </View>
            <Text
              accessibilityRole="header"
              className="text-[#0c2340] font-extrabold"
              style={{ fontSize: 24, lineHeight: 31, letterSpacing: -0.5 }}
            >
              {hasTargetSounds
                ? t("phonemesHome.personalizedHeadline", "Mục tiêu phát âm hôm nay")
                : t("phonemesHome.lessonHeadline")}
            </Text>
            <Text className="text-[#475569] text-sm" style={{ lineHeight: 21 }}>
              {hasTargetSounds
                ? t("phonemesHome.personalizedDescription", "Hoàn thành bài luyện với các âm trọng tâm để duy trì chuỗi ngày học:")
                : t("phonemesHome.lessonDescription")}
            </Text>
            {renderTargetSoundChips(true)}
            {lessonButton(false)}
          </Hero>
        </View>
      )}

      {/* ── 2. Practice Section ("Bài luyện hôm nay") ── */}
      {!screeningCompleted ? (
        <View className="gap-2.5">
          <View className="flex-row items-center justify-between">
            <Text
              accessibilityRole="header"
              className="text-[#0c2340] text-lg font-bold"
              style={{ lineHeight: 25 }}
            >
              {t("phonemesHome.practiceTitle")}
            </Text>
            <Pressable
              testID="phonemes-journey"
              accessibilityRole="button"
              accessibilityLabel={t("phonemesHome.journeyTitle")}
              onPress={props.onJourney}
              className="justify-center py-1 active:opacity-75"
              style={{ minHeight: 36 }}
            >
              <Text className="text-[#0284c7] text-sm font-bold">
                {t("phonemesHome.journeyLink", "Hành trình")} →
              </Text>
            </Pressable>
          </View>
          <View
            className="bg-white"
            style={{
              padding: 18,
              gap: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#e2eaf2",
              shadowColor: "#0c2340",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 1,
            }}
          >
            <Text className="text-[#0c2340] text-base font-bold" style={{ lineHeight: 23 }}>
              {t("phonemesHome.dailyMissionTitle", "Nhiệm vụ luyện tập hôm nay")}
            </Text>
            <Text className="text-[#64748b] text-sm" style={{ lineHeight: 21 }}>
              {hasTargetSounds
                ? t("phonemesHome.personalizedDescriptionShort", "Bài luyện tập nhắm vào các âm trọng tâm hôm nay:")
                : t("phonemesHome.lessonDescription")}
            </Text>
            {renderTargetSoundChips(false)}
            {lessonButton(true)}
          </View>
        </View>
      ) : null}

      {props.lessonError ? (
        <Text accessibilityRole="alert" className="text-[#b42318] text-sm" style={{ lineHeight: 21 }}>
          {props.lessonError}
        </Text>
      ) : null}

      {/* ── 3. Sounds Section ("Âm cần cải thiện" / "Khám phá các âm") ── */}
      <View className="gap-2.5">
        {/* Header Row: Title & Link */}
        <View className="flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="text-[#0c2340] text-lg font-bold"
            style={{ lineHeight: 25 }}
          >
            {t(hasWeakSounds ? "phonemesHome.weakTitle" : "phonemesHome.exploreTitle")}
          </Text>
          <Pressable
            testID="phonemes-catalog"
            accessibilityRole="button"
            accessibilityLabel={t("phonemesHome.allSounds")}
            onPress={props.onCatalog}
            className="justify-center py-1 active:opacity-75"
            style={{ minHeight: 36 }}
          >
            <Text className="text-[#0284c7] text-sm font-bold">
              {t("phonemesHome.allSounds")} →
            </Text>
          </Pressable>
        </View>

        {/* Instructional Subtitle */}
        <Text className="text-[#64748b] text-sm" style={{ lineHeight: 21 }}>
          {t(hasWeakSounds ? "phonemesHome.weakDescription" : "phonemesHome.exploreDescription")}
        </Text>

        {props.summaryLoading ? (
          <PhonemesChipsSkeleton count={6} />
        ) : null}

        {props.summaryError ? (
          <View className="gap-1">
            <Text className="text-[#64748b] text-sm" style={{ lineHeight: 21 }}>
              {t("phonemesHome.summaryError")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={props.onRetry}
              className="justify-center self-start active:opacity-75"
              style={{ minHeight: 36 }}
            >
              <Text className="text-[#0284c7] text-sm font-bold">
                {t("phonemesHome.retry")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Interactive Sound Chips Grid */}
        {!props.summaryLoading && !props.summaryError ? (
          <View
            className="flex-row flex-wrap gap-3 pt-1"
            testID={hasWeakSounds ? "phonemes-weak-sounds" : "phonemes-explore-sounds"}
          >
          {sounds.map(sound => {
            const cleanSound = String(sound || "").replace(/^\/+|\/+$/g, "").trim();
            const meta = getIpaSoundMeta(cleanSound);
            const exampleWord = meta.example ? meta.example.split(" /", 1)[0].trim() : "";
            const accPct = soundAccuracyMap.get(cleanSound);
            const hasScore = accPct != null;

            return (
              <Pressable
                key={sound}
                accessibilityRole="button"
                accessibilityLabel={t("phonemesHome.practiceSound", { sound: cleanSound })}
                onPress={() => props.onPhoneme(cleanSound)}
                className="active:opacity-80"
                style={{
                  minWidth: 92,
                  minHeight: 80,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 18,
                  backgroundColor: "#ffffff",
                  borderWidth: 1.5,
                  borderColor: hasScore ? (accPct < 50 ? "#fecaca" : "#fed7aa") : "#e2eaf2",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  shadowColor: "#0c2340",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 1,
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {phonemeLoading === sound ? (
                  <ActivityIndicator color={primaryBlue} />
                ) : (
                  <>
                    <Text
                      numberOfLines={1}
                      className="text-[#0c2340] text-lg font-extrabold text-center"
                      style={{ includeFontPadding: false, textAlign: "center" }}
                    >
                      {`/${cleanSound}/`}
                    </Text>
                    {exampleWord ? (
                      <Text
                        numberOfLines={1}
                        className="text-[#64748b] text-xs text-center font-medium"
                      >
                        {exampleWord}
                      </Text>
                    ) : null}
                    {hasScore ? (
                      <View
                        className="px-2 py-0.5 rounded-full mt-0.5"
                        style={{
                          backgroundColor: accPct < 50 ? "#fee2e2" : "#ffedd5",
                          borderWidth: 1,
                          borderColor: accPct < 50 ? "#fca5a5" : "#fdba74",
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          className="text-xs font-bold text-center"
                          style={{ color: accPct < 50 ? "#dc2626" : "#c2410c" }}
                        >
                          {`${accPct}%`}
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
      </View>
    </ScrollView>
  );
}
