import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types/navigation";
import { useAuth } from "@/services/Auth";
import { useProgressSoundsQuery } from "@/hooks/queries/useProgressQueries";
import { ALL_44_IPA_SOUNDS, type IpaCategory } from "@/utils/ipaData";
import type { Dialect } from "@/types/domain";

type CategoryFilter = "all" | IpaCategory;

type Props = NativeStackScreenProps<RootStackParamList, "PhonemeCatalog">;

export default function PhonemeCatalogScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { authToken, userDialect } = useAuth();
  const dialect: Dialect = (route.params?.dialect as Dialect) || userDialect || "uk";

  const { width, fontScale } = useWindowDimensions();
  const columns = width < 360 || fontScale > 1.3 ? 2 : 3;

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");

  // Read progress sounds directly from cache (staleTime 15m, gcTime 60m)
  const { data: soundRecords } = useProgressSoundsQuery(dialect, Boolean(authToken));

  // Build lightweight accuracy map from cached progress
  const soundsAccuracyMap = useMemo(() => {
    const map = new Map<string, { accuracyPct: number }>();
    (soundRecords || []).forEach((r: any) => {
      const soundKey = r?.sound || r?.phoneme || r?.ipa;
      if (soundKey) {
        const clean = String(soundKey).replace(/^\/+|\/+$/g, "").trim().toLowerCase();
        const rawAcc = r.accuracy ?? r.accuracy_score ?? r.score;
        if (rawAcc != null && Number.isFinite(Number(rawAcc))) {
          const num = Number(rawAcc);
          const accuracyPct = num > 1 ? Math.round(num) : Math.round(num * 100);
          map.set(clean, { accuracyPct });
        }
      }
    });
    return map;
  }, [soundRecords]);

  // Compute mastered and practiced counts
  const catalogStats = useMemo(() => {
    let practiced = 0;
    let mastered = 0;
    ALL_44_IPA_SOUNDS.forEach((s) => {
      const clean = s.sound.replace(/^\/+|\/+$/g, "").trim().toLowerCase();
      const info = soundsAccuracyMap.get(clean);
      if (info && info.accuracyPct != null) {
        practiced++;
        if (info.accuracyPct >= 70) mastered++;
      }
    });
    return { practiced, mastered };
  }, [soundsAccuracyMap]);

  // Filter 44 sounds by active category
  const filteredCatalog = useMemo(
    () =>
      ALL_44_IPA_SOUNDS.filter(
        (item) => selectedCategory === "all" || item.category === selectedCategory
      ),
    [selectedCategory]
  );

  // Render individual sound card in grid
  const renderSoundItem = useCallback(
    ({ item }: { item: typeof ALL_44_IPA_SOUNDS[0] }) => {
      const clean = item.sound.replace(/^\/+|\/+$/g, "").trim().toLowerCase();
      const soundInfo = soundsAccuracyMap.get(clean);
      const hasScore = soundInfo != null && soundInfo.accuracyPct != null;
      const accuracyPct = soundInfo?.accuracyPct ?? 0;

      return (
        <View style={{ width: `${100 / columns}%` }} className="p-1.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("phonemesHome.practiceSound", { sound: item.sound })}
            onPress={() => navigation.navigate("PhonemePractice", { phoneme: item.sound, dialect })}
            className="bg-white items-center justify-center min-h-[104px] px-2 py-3 rounded-[18px] active:opacity-80 gap-1"
            style={{
              shadowColor: "#0c2340",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <Text
              className="text-[22px] font-extrabold text-[#0c2340] text-center"
              style={{ includeFontPadding: false }}
              numberOfLines={1}
            >
              /{item.sound}/
            </Text>
            <Text
              numberOfLines={1}
              className="text-xs text-[#64748b] font-medium text-center"
            >
              {item.example.split(" /", 1)[0]}
            </Text>
            {hasScore ? (
              <View
                className="px-2.5 py-0.5 rounded-full mt-0.5 shrink-0 border"
                style={{
                  backgroundColor:
                    accuracyPct >= 70
                      ? "#ecfdf5"
                      : accuracyPct >= 50
                      ? "#fffbeb"
                      : "#fef2f2",
                  borderColor:
                    accuracyPct >= 70
                      ? "#a7f3d0"
                      : accuracyPct >= 50
                      ? "#fde68a"
                      : "#fecaca",
                }}
              >
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-center"
                  style={{
                    color:
                      accuracyPct >= 70
                        ? "#047857"
                        : accuracyPct >= 50
                        ? "#b45309"
                        : "#dc2626",
                  }}
                >
                  {`${accuracyPct}%`}
                </Text>
              </View>
            ) : (
              <View className="px-2.5 py-0.5 rounded-full mt-0.5 shrink-0 bg-[#f8fafc] border border-[#e2e8f0]">
                <Text
                  numberOfLines={1}
                  className="text-xs font-medium text-[#94a3b8] text-center"
                >
                  {t("phonemesHome.notPracticed", "Chưa học")}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      );
    },
    [columns, dialect, navigation, soundsAccuracyMap, t]
  );

  // List header with stats progress bar and category chips
  const renderHeader = useMemo(
    () => (
      <View className="pb-3 gap-3.5">
        {/* Summary Card with Mastered Progress */}
        <View
          className="bg-white rounded-[20px] p-4 border border-[#e2eaf2] gap-3"
          style={{
            shadowColor: "#0c2340",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 1,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1 mr-2">
              <View
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: catalogStats.mastered > 0 ? "#10b981" : "#0284c7" }}
              />
              <Text className="text-sm font-bold text-[#0c2340]" numberOfLines={1}>
                {t("phonemesHome.catalogProgress", {
                  practiced: catalogStats.practiced,
                  current: catalogStats.practiced,
                  total: 44,
                })}
              </Text>
            </View>
            {catalogStats.mastered > 0 ? (
              <View
                className="px-2.5 py-0.5 rounded-full shrink-0 border"
                style={{ backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }}
              >
                <Text className="text-xs font-bold text-[#047857]" numberOfLines={1}>
                  {t("phonemesHome.catalogMastered", { count: catalogStats.mastered })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Progress bar track */}
          <View className="w-full h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.max(catalogStats.practiced > 0 ? 5 : 0, Math.min(100, Math.round((catalogStats.practiced / 44) * 100)))}%`,
                backgroundColor: catalogStats.mastered > 0 ? "#10b981" : "#0284c7",
              }}
            />
          </View>
        </View>

        {/* Category Filter Pills */}
        <View className="flex-row flex-wrap gap-2">
          {(["all", "monophthong", "diphthong", "consonant"] as const).map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <Pressable
                key={category}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedCategory(category)}
                className="px-4 py-2 min-h-[38px] rounded-[19px] border active:opacity-85 items-center justify-center"
                style={{
                  backgroundColor: isSelected ? "#0c2340" : "#ffffff",
                  borderColor: isSelected ? "#0c2340" : "#e2eaf2",
                }}
              >
                <Text
                  className="text-[13px] font-bold"
                  style={{ color: isSelected ? "#ffffff" : "#53677a" }}
                >
                  {t(`phonemesHome.categories.${category}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [catalogStats, selectedCategory, t]
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#0a2644]">
      {/* 1. LUXURY NAVY HEADER */}
      <View className="bg-[#0a2644] pt-2 pb-5 px-5">
        <View className="flex-row items-center justify-between mb-2.5">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("common.back", "Quay lại")}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-2xl items-center justify-center border"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderColor: "rgba(255, 255, 255, 0.16)",
            }}
          >
            <ChevronLeft size={22} color="#ffffff" />
          </TouchableOpacity>

          <Text className="text-base font-extrabold text-white">
            {t("phonemesHome.catalogTitle", "Kho 44 âm IPA")}
          </Text>

          <View
            className="px-2 py-0.5 rounded-xl border"
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.16)",
              borderColor: "rgba(56, 189, 248, 0.35)",
            }}
          >
            <Text className="text-[11px] font-bold text-[#7dd3fc]">
              {dialect.toUpperCase()} {dialect.toLowerCase() === "uk" ? "🇬🇧" : "🇺🇸"}
            </Text>
          </View>
        </View>

        <Text
          className="text-[13px] font-medium leading-[18px]"
          style={{ color: "rgba(255, 255, 255, 0.75)" }}
        >
          {t(
            "phonemesHome.catalogSubtitle",
            "Toàn bộ hệ thống phiên âm chuẩn quốc tế IPA với bảng phân loại chi tiết."
          )}
        </Text>
      </View>

      {/* 2. VIRTUALIZED FLATLIST GRID CANVAS */}
      <View className="flex-1 bg-[#f8fafc] -mt-3 rounded-t-[28px] overflow-hidden pt-4">
        <FlatList
          data={filteredCatalog}
          key={`catalog-grid-${columns}`}
          numColumns={columns}
          keyExtractor={(item) => item.sound}
          initialNumToRender={9}
          maxToRenderPerBatch={9}
          windowSize={5}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ListHeaderComponent={renderHeader}
          renderItem={renderSoundItem}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
