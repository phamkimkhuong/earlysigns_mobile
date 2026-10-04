import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { AppText } from "@/components";
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
            <AppText
              className="text-[22px] font-extrabold text-[#0c2340] text-center"
              style={{ includeFontPadding: false }}
              numberOfLines={1}
            >
              {`/${item.sound}/`}
            </AppText>
            <AppText
              numberOfLines={1}
              className="text-xs text-[#64748b] font-medium text-center"
            >
              {item.example.split(" /", 1)[0]}
            </AppText>
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
                <AppText
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
                </AppText>
              </View>
            ) : (
              <View className="px-2.5 py-0.5 rounded-full mt-0.5 shrink-0 bg-appBg border border-[#e2e8f0]">
                <AppText
                  numberOfLines={1}
                  className="text-xs font-medium text-[#94a3b8] text-center"
                >
                  {t("phonemesHome.notPracticed", "Chưa học")}
                </AppText>
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
                <AppText
                  className="text-[13px] font-bold"
                  style={{ color: isSelected ? "#ffffff" : "#53677a" }}
                >
                  {t(`phonemesHome.categories.${category}`)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    ),
    [selectedCategory, t]
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
      {/* 1. TOP NAV BAR */}
      <View className="bg-appBg flex-row items-center justify-between px-4 py-3 border-b border-slate-200">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Quay lại")}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 items-center justify-center active:opacity-70"
        >
          <ChevronLeft size={22} color="#0c2340" strokeWidth={2.5} />
        </TouchableOpacity>

        <AppText className="text-base flex-1 text-center font-bold text-[#0c2340]">
          {t("phonemesHome.catalogTitle", "Kho 44 âm IPA")}
        </AppText>

        <View className="w-10 h-10" />
      </View>

      {/* 2. VIRTUALIZED FLATLIST GRID CANVAS */}
      <View className="flex-1 bg-appBg overflow-hidden pt-3">
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
