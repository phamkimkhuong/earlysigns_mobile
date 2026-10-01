import React, { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import {
  AudioLines,
  ChevronLeft,
  Mic,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { useProgressSoundsQuery } from "@/hooks/queries/useProgressQueries";
import { ALL_44_IPA_SOUNDS } from "@/utils/ipaData";
import { accuracyBandColor } from "@/utils/checkResultScoreColor";

type SoundFilter = "all" | "weak" | "mastered" | "vowels" | "consonants";

export default function PronunciationProfileScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { authToken, userDialect } = useAuth();
  const dialect = userDialect || "uk";

  const { data: soundRecords = [] } = useProgressSoundsQuery(dialect, Boolean(authToken));
  const [filter, setFilter] = useState<SoundFilter>("all");

  // Map backend sound data with standard 44 IPA dictionary
  const mergedSounds = useMemo(() => {
    const recordMap = new Map<string, { accuracy?: number; checks_count?: number }>();
    (soundRecords || []).forEach((r: any) => {
      if (r?.sound) {
        const clean = String(r.sound).replace(/^\/+|\/+$/g, "").trim().toLowerCase();
        recordMap.set(clean, {
          accuracy: r.accuracy != null ? Number(r.accuracy) : undefined,
          checks_count: Number(r.checks_count ?? r.count ?? 0),
        });
      }
    });

    return ALL_44_IPA_SOUNDS.map((meta) => {
      const rec = recordMap.get(meta.sound.toLowerCase());
      const checks = rec?.checks_count || 0;
      const acc = rec?.accuracy;
      const hasData = checks >= 1 && acc != null;
      const accuracyPct = hasData ? Math.round(acc * 100) : null;
      const isMastered = hasData && accuracyPct != null && accuracyPct >= 80;
      const isWeak = hasData && accuracyPct != null && accuracyPct < 70;

      return {
        ...meta,
        checks,
        accuracyPct,
        hasData,
        isMastered,
        isWeak,
      };
    });
  }, [soundRecords]);

  // Summary statistics
  const stats = useMemo(() => {
    const tested = mergedSounds.filter((s) => s.hasData).length;
    const mastered = mergedSounds.filter((s) => s.isMastered).length;
    const weak = mergedSounds.filter((s) => s.isWeak).length;
    return { tested, mastered, weak, total: ALL_44_IPA_SOUNDS.length };
  }, [mergedSounds]);

  // Filtered sound list
  const filteredList = useMemo(() => {
    return mergedSounds.filter((item) => {
      if (filter === "weak") return item.isWeak;
      if (filter === "mastered") return item.isMastered;
      if (filter === "vowels") return item.category === "monophthong" || item.category === "diphthong";
      if (filter === "consonants") return item.category === "consonant";
      return true;
    });
  }, [mergedSounds, filter]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#f8fafc]">
      {/* Top Header Navigation */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Quay lại")}
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-base font-extrabold text-[#0f172a]">
          {t("pronunciationProfile.title")}
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Summary Card */}
        <View
          style={{
            backgroundColor: "#0a2644",
            borderColor: "#1e3a8a",
            shadowColor: "#0a2644",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 4,
          }}
          className="rounded-3xl p-5 border gap-4"
        >
          <View className="flex-row items-center justify-between">
            <View
              style={{ backgroundColor: "rgba(255, 255, 255, 0.12)" }}
              className="flex-row items-center gap-1.5 px-3 py-1 rounded-full"
            >
              <AudioLines size={13} color="#38bdf8" />
              <Text className="text-2xs font-extrabold text-[#38bdf8] uppercase tracking-wider">
                {dialect === "us" ? t("pronunciationProfile.voiceUs") : t("pronunciationProfile.voiceUk")}
              </Text>
            </View>
            <Text className="text-2xs font-bold text-slate-300">
              {t("pronunciationProfile.coverage", { count: stats.tested })}
            </Text>
          </View>

          <View className="gap-1">
            <Text className="text-xl font-black text-white">
              {t("pronunciationProfile.cardTitle")}
            </Text>
            <Text className="text-xs text-slate-300 leading-relaxed">
              {t("pronunciationProfile.cardDesc")}
            </Text>
          </View>

          {/* 3 Metric Pills */}
          <View className="flex-row items-center gap-2.5 pt-1">
            <View
              style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
              className="flex-1 p-2.5 rounded-2xl items-center"
            >
              <Text className="text-lg font-black text-white">
                {stats.tested}
              </Text>
              <Text className="text-2xs font-semibold text-slate-300 mt-0.5">
                {t("pronunciationProfile.tested")}
              </Text>
            </View>

            <View
              style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
              className="flex-1 p-2.5 rounded-2xl items-center"
            >
              <Text style={{ color: "#34d399" }} className="text-lg font-black">
                {stats.mastered}
              </Text>
              <Text className="text-xs font-semibold text-slate-300 mt-0.5">
                {t("pronunciationProfile.mastered")}
              </Text>
            </View>

            <View
              style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
              className="flex-1 p-2.5 rounded-2xl items-center"
            >
              <Text style={{ color: "#fbbf24" }} className="text-lg font-black">
                {stats.weak}
              </Text>
              <Text className="text-xs font-semibold text-slate-300 mt-0.5">
                {t("pronunciationProfile.weak")}
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          {(
            [
              { id: "all", label: t("pronunciationProfile.filterAll", { count: stats.total }) },
              { id: "weak", label: t("pronunciationProfile.filterWeak", { count: stats.weak }) },
              { id: "mastered", label: t("pronunciationProfile.filterMastered", { count: stats.mastered }) },
              { id: "vowels", label: t("pronunciationProfile.filterVowels", { count: 20 }) },
              { id: "consonants", label: t("pronunciationProfile.filterConsonants", { count: 24 }) },
            ] as const
          ).map((item) => {
            const isSelected = filter === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={{
                  backgroundColor: isSelected ? "#0c2340" : "#ffffff",
                  borderColor: isSelected ? "#0c2340" : "#e2e8f0",
                }}
                className="px-4 py-2 rounded-full border shadow-sm active:opacity-85"
              >
                <Text
                  style={{ color: isSelected ? "#ffffff" : "#475569" }}
                  className="text-sm font-bold"
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sound List */}
        <View className="gap-2.5">
          {filteredList.map((item) => {
            const acc = item.accuracyPct ?? 0;
            const isGood = acc >= 70;
            const isMid = acc >= 50;

            return (
              <TouchableOpacity
                key={item.sound}
                onPress={() => navigation.navigate("Phonemes")}
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                }}
                className="rounded-2xl p-3.5 border flex-row items-center justify-between active:opacity-85 shadow-xs"
              >
                <View className="flex-row items-center gap-3.5 flex-1 min-w-0 mr-3">
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
                      backgroundColor: item.hasData
                        ? (isGood ? "#ecfdf5" : isMid ? "#fffbeb" : "#fee2e2")
                        : "#f1f5f9",
                      borderColor: item.hasData
                        ? (isGood ? "#a7f3d0" : isMid ? "#fde68a" : "#fecaca")
                        : "#e2e8f0",
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      textBreakStrategy="simple"
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: item.hasData
                          ? (isGood ? "#059669" : isMid ? "#d97706" : "#dc2626")
                          : "#64748b",
                        includeFontPadding: false,
                        textAlign: "center",
                      }}
                    >
                      {`/${item.sound}/`}
                    </Text>
                  </View>

                  <View className="flex-1 min-w-0 gap-1.5">
                    <View className="flex-row items-center justify-between">
                      <Text numberOfLines={1} className="text-xs text-slate-500 font-medium flex-1 mr-2">
                        {t("pronunciationProfile.example")}{" "}
                        <Text className="text-slate-800 font-bold">{item.example}</Text>
                      </Text>
                      <Text
                        style={{
                          color: item.hasData ? accuracyBandColor(Number(acc) / 100) : "#94a3b8",
                        }}
                        className="text-xs font-black shrink-0"
                      >
                        {item.hasData ? `${acc}%` : t("pronunciationProfile.notPracticed")}
                      </Text>
                    </View>

                    {/* Thanh tiến trình hàng ngang */}
                    <View className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: item.hasData ? `${Math.max(5, Math.min(100, acc))}%` : "0%",
                          backgroundColor: item.hasData
                            ? (isGood ? "#10b981" : isMid ? "#f59e0b" : "#ef4444")
                            : "transparent",
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Button Luyện */}
                <View
                  style={{ backgroundColor: "#0c2340" }}
                  className="px-3 py-2 rounded-xl flex-row items-center gap-1 shrink-0"
                >
                  <Mic size={12} color="#ffffff" />
                  <Text className="text-xs font-extrabold text-white">
                    {t("pronunciationProfile.practice")}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
