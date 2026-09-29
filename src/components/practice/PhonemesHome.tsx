import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { BookOpen, CheckCircle2, ChevronRight, Compass } from "lucide-react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { TFunction } from "i18next";

const EXPLORE_SOUNDS = ["θ", "ɪ", "æ"];
const blue = "#0369a1";

type Props = {
  t: TFunction;
  dialect: string;
  screeningCompleted: boolean;
  weakestPhonemes: { sound: string }[];
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
  onProfile: () => void;
  onRetry: () => void;
};

function Action({ title, onPress, secondary = false, loading, disabled, testID }: {
  title: string; onPress: () => void; secondary?: boolean; loading?: boolean; disabled?: boolean; testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      disabled={disabled}
      onPress={onPress}
      className={`flex-row justify-center items-center ${secondary ? "bg-white border border-[#cbdde9]" : "bg-[#0369a1]"}`}
      style={({ pressed }) => ({
        minHeight: 52, paddingHorizontal: 14, paddingVertical: 13,
        borderRadius: 14, gap: 8, marginTop: 6,
        opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
        ...(secondary ? {} : {
          shadowColor: "#0369a1",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 3,
        }),
      })}
    >
      {loading ? <ActivityIndicator color={secondary ? blue : "#ffffff"} /> : null}
      <Text
        className={`text-base font-extrabold text-center shrink ${secondary ? "text-[#0369a1]" : "text-white"}`}
        style={{ lineHeight: 23 }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function Hero({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-3xl overflow-hidden" style={{ padding: 22, gap: 10 }}>
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
              <Stop offset="0%" stopColor="#e6f4fe" />
              <Stop offset="100%" stopColor="#eefaf5" />
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
  const sounds = weakestPhonemes.length ? weakestPhonemes.slice(0, 5).map(item => item.sound) : EXPLORE_SOUNDS;
  const hasWeakSounds = weakestPhonemes.length > 0;
  const lessonButton = (secondary: boolean) => (
    <Action
      testID="phonemes-start-lesson"
      title={t(lessonLoading ? "phonemesHome.preparing" : "phonemesHome.startLesson")}
      onPress={props.onLesson}
      secondary={secondary}
      loading={lessonLoading}
      disabled={busy}
    />
  );
  const links = [
    {
      id: "phonemes-journey",
      Icon: Compass,
      title: t("phonemesHome.journeyTitle"),
      description: props.journey?.current_module && props.journey?.current_lesson_in_module
        ? t("phonemesHome.journeyPosition", { module: props.journey.current_module, lesson: props.journey.current_lesson_in_module })
        : t("phonemesHome.journeyDescription"),
      onPress: props.onJourney,
      iconBg: "#e5f1fa",
    },
    {
      id: "phonemes-catalog",
      Icon: BookOpen,
      title: t("phonemesHome.catalogTitle"),
      description: t("phonemesHome.catalogDescription"),
      onPress: props.onCatalog,
      iconBg: "#e5f1fa",
    },
    ...(screeningCompleted
      ? [{
        id: "phonemes-profile",
        Icon: CheckCircle2,
        title: t("phonemesHome.profileTitle"),
        description: t("phonemesHome.profileDescription"),
        onPress: props.onProfile,
        iconBg: "#ecfdf5",
      }]
      : []),
  ];

  return (
    <ScrollView
      className="flex-1 bg-[#f5f8fb]"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36, gap: 22 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-[#53677a] font-semibold text-right" style={{ fontSize: 13 }}>
        {props.dialect === "us" ? "US · General American" : "UK · RP"}
      </Text>

      {/* ── Hero Card ── */}
      {!screeningCompleted ? (
        <View
          testID="phonemes-screening-card"
          style={{
            borderRadius: 24,
            shadowColor: "#0c2340",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <Hero>
            <Text className="text-[#0369a1] text-xs font-bold uppercase" style={{ letterSpacing: 0.7 }}>
              {t("phonemesHome.screeningEyebrow")}
            </Text>
            <Text
              accessibilityRole="header"
              className="text-[#0c2340] font-extrabold"
              style={{ fontSize: 27, lineHeight: 34, letterSpacing: -0.5 }}
            >
              {t("phonemesHome.screeningTitle")}
            </Text>
            <Text className="text-[#53677a] text-sm" style={{ lineHeight: 22 }}>
              {t("phonemesHome.screeningDescription")}
            </Text>
            <View
              className="flex-row mt-1"
              style={{ gap: 5 }}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {[0, 1, 2, 3, 4].map(item => (
                <View key={item} className="flex-1 bg-[#a5d7ef]" style={{ height: 5, borderRadius: 3 }} />
              ))}
            </View>
            <Text className="text-[#53677a] text-sm" style={{ lineHeight: 22 }}>
              {t("phonemesHome.screeningCoverage")}
            </Text>
            <Action
              testID="phonemes-start-screening"
              title={t(screeningLoading ? "phonemesHome.preparing" : "phonemesHome.startScreening")}
              onPress={props.onScreening}
              loading={screeningLoading}
              disabled={busy}
            />
            {props.screeningError ? (
              <Text accessibilityRole="alert" className="text-[#b42318] text-sm" style={{ lineHeight: 22 }}>
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
            shadowColor: "#0c2340",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <Hero>
            <Text className="text-[#0369a1] text-xs font-bold uppercase" style={{ letterSpacing: 0.7 }}>
              {t("phonemesHome.lessonTitle")}
            </Text>
            <Text
              accessibilityRole="header"
              className="text-[#0c2340] font-extrabold"
              style={{ fontSize: 27, lineHeight: 34, letterSpacing: -0.5 }}
            >
              {t("phonemesHome.lessonHeadline")}
            </Text>
            <Text className="text-[#53677a] text-sm" style={{ lineHeight: 22 }}>
              {t("phonemesHome.lessonDescription")}
            </Text>
            {lessonButton(false)}
          </Hero>
        </View>
      )}

      {/* ── Practice Section ── */}
      {!screeningCompleted ? (
        <View className="gap-3">
          <Text
            accessibilityRole="header"
            className="text-[#0c2340] text-lg font-bold"
            style={{ lineHeight: 25 }}
          >
            {t("phonemesHome.practiceTitle")}
          </Text>
          <View
            className="bg-white border border-[#e2eaf2]"
            style={{
              padding: 18, gap: 10, borderRadius: 20,
              shadowColor: "#0c2340",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 1,
            }}
          >
            <Text className="text-[#0c2340] text-base font-bold" style={{ lineHeight: 23 }}>
              {t("phonemesHome.lessonTitle")}
            </Text>
            <Text className="text-[#53677a] text-sm" style={{ lineHeight: 22 }}>
              {t("phonemesHome.lessonDescription")}
            </Text>
            {lessonButton(true)}
          </View>
        </View>
      ) : null}
      {props.lessonError ? (
        <Text accessibilityRole="alert" className="text-[#b42318] text-sm" style={{ lineHeight: 22 }}>
          {props.lessonError}
        </Text>
      ) : null}

      {/* ── Sounds Section ── */}
      <View className="gap-3">
        <View className="flex-row items-center gap-3 flex-wrap">
          <Text
            accessibilityRole="header"
            className="flex-1 text-[#0c2340] text-lg font-bold"
            style={{ lineHeight: 25 }}
          >
            {t(hasWeakSounds ? "phonemesHome.weakTitle" : "phonemesHome.exploreTitle")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={props.onCatalog}
            className="justify-center self-start"
            style={{ minHeight: 44 }}
          >
            <Text className="text-[#0369a1] text-sm font-bold">
              {t("phonemesHome.allSounds")} →
            </Text>
          </Pressable>
        </View>
        {props.summaryLoading ? (
          <ActivityIndicator color={blue} accessibilityLabel={t("phonemesHome.loadingProgress")} />
        ) : null}
        {props.summaryError ? (
          <View>
            <Text className="text-[#53677a] text-sm" style={{ lineHeight: 22 }}>
              {t("phonemesHome.summaryError")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={props.onRetry}
              className="justify-center self-start"
              style={{ minHeight: 44 }}
            >
              <Text className="text-[#0369a1] text-sm font-bold">
                {t("phonemesHome.retry")}
              </Text>
            </Pressable>
          </View>
        ) : null}
        <View className="flex-row flex-wrap gap-2.5" testID={hasWeakSounds ? "phonemes-weak-sounds" : "phonemes-explore-sounds"}>
          {sounds.map(sound => (
            <Pressable
              key={sound}
              accessibilityRole="button"
              accessibilityLabel={t("phonemesHome.practiceSound", { sound })}
              accessibilityState={{ disabled: busy, busy: phonemeLoading === sound }}
              disabled={busy}
              onPress={() => props.onPhoneme(sound)}
              className="bg-[#e5f1fa] items-center justify-center border border-[#c5ddf0]"
              style={({ pressed }) => ({
                minWidth: 72, minHeight: 60,
                paddingHorizontal: 18, paddingVertical: 12,
                borderRadius: 14,
                shadowColor: "#0369a1",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 1,
                opacity: busy ? 0.6 : pressed ? 0.8 : 1,
              })}
            >
              {phonemeLoading === sound ? (
                <ActivityIndicator color={blue} />
              ) : (
                <Text className="text-[#0c2340] text-2xl font-bold">/{sound}/</Text>
              )}
            </Pressable>
          ))}
        </View>
        <Text className="text-[#53677a] text-sm" style={{ lineHeight: 22 }}>
          {t(hasWeakSounds ? "phonemesHome.weakDescription" : "phonemesHome.exploreDescription")}
        </Text>
      </View>

      {/* ── Navigation Links ── */}
      <View>
        {links.map(({ id, Icon, title, description, onPress, iconBg }) => (
          <Pressable
            key={id}
            testID={id}
            accessibilityRole="button"
            onPress={onPress}
            className="flex-row items-center border-t border-[#e2eaf2]"
            style={({ pressed }) => ({ gap: 14, paddingVertical: 19, opacity: pressed ? 0.7 : 1 })}
          >
            <View
              className="items-center justify-center"
              style={{
                width: 42, height: 42, borderRadius: 13,
                backgroundColor: iconBg,
              }}
            >
              <Icon size={20} color={id === "phonemes-profile" ? "#147d64" : blue} />
            </View>
            <View className="flex-1">
              <Text
                className={`text-base font-bold ${id === "phonemes-profile" ? "text-[#147d64]" : "text-[#0c2340]"}`}
                style={{ lineHeight: 23 }}
              >
                {title}
              </Text>
              <Text className="text-[#53677a]" style={{ fontSize: 13, lineHeight: 20, marginTop: 3 }}>
                {description}
              </Text>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
