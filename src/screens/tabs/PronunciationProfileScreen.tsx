import React, { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { useAuth } from "@/services/Auth";
import { useProgressSoundsQuery } from "@/hooks/queries/useProgressQueries";
import { ALL_44_IPA_SOUNDS } from "@/utils/ipaData";
import { accuracyBandColor } from "@/utils/checkResultScoreColor";

type SoundFilter = "all" | "weak" | "mastered" | "vowels" | "consonants";

export default function PronunciationProfileScreen({ navigation }: { navigation: any }) {
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
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-base font-extrabold text-[#0f172a]">
          Hồ sơ phát âm 44 âm IPA
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
                Giọng mẫu Anh – Anh (UK)
              </Text>
            </View>
            <Text className="text-2xs font-bold text-slate-300">
              Độ bao phủ: {stats.tested}/44 âm
            </Text>
          </View>

          <View className="gap-1">
            <Text className="text-xl font-black text-white">
              Bảng đánh giá năng lực phát âm
            </Text>
            <Text className="text-xs text-slate-300 leading-relaxed">
              Chi tiết độ chuẩn xác và số lượt luyện của bạn cho từng âm tiết trong hệ thống ngữ âm quốc tế.
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
                Đã đánh giá
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
                Thành thạo
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
                Cần cải thiện
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
              { id: "all", label: `Tất cả (${stats.total})` },
              { id: "weak", label: `Cần cải thiện (${stats.weak})` },
              { id: "mastered", label: `Đã thành thạo (${stats.mastered})` },
              { id: "vowels", label: "Nguyên âm (20)" },
              { id: "consonants", label: "Phụ âm (24)" },
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
            const badgeBg =
              item.category === "monophthong"
                ? "#ecfdf5"
                : item.category === "diphthong"
                  ? "#fffbeb"
                  : "#eff6ff";
            const badgeColor =
              item.category === "monophthong"
                ? "#059669"
                : item.category === "diphthong"
                  ? "#d97706"
                  : "#1d4ed8";

            return (
              <TouchableOpacity
                key={item.sound}
                onPress={() => navigation.navigate("Phonemes")}
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#e2e8f0",
                }}
                className="rounded-2xl p-4 border flex-row items-center justify-between active:opacity-85 shadow-sm"
              >
                <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                  <View
                    style={{ backgroundColor: badgeBg, borderColor: badgeColor, borderWidth: 1 }}
                    className="w-13 h-13 rounded-2xl items-center justify-center"
                  >
                    <Text style={{ color: badgeColor }} className="text-xl font-black">
                      /{item.sound}/
                    </Text>
                  </View>

                  <View className="flex-1 gap-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[15px] font-extrabold text-[#0c2340]">
                        {item.categoryLabelVi}
                      </Text>
                      {item.isMastered ? (
                        <View style={{ backgroundColor: "#ecfdf5" }} className="px-2 py-0.5 rounded-full border border-emerald-200">
                          <Text className="text-xs font-bold text-emerald-700">Đạt chuẩn</Text>
                        </View>
                      ) : item.isWeak ? (
                        <View style={{ backgroundColor: "#fef2f2" }} className="px-2 py-0.5 rounded-full border border-rose-200">
                          <Text className="text-xs font-bold text-rose-600">Cần luyện</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text numberOfLines={1} className="text-[13px] text-slate-500 font-medium">
                      Ví dụ: <Text className="text-slate-800 font-bold">{item.example}</Text>
                    </Text>
                    <Text numberOfLines={1} className="text-xs text-slate-400">
                      {item.vietnameseTip}
                    </Text>
                  </View>
                </View>

                {/* Right: Accuracy score & Practice CTA */}
                <View className="items-end gap-1">
                  {item.hasData ? (
                    <Text
                      style={{ color: accuracyBandColor(Number(item.accuracyPct) / 100) }}
                      className="text-base font-black"
                    >
                      {item.accuracyPct}%
                    </Text>
                  ) : (
                    <Text className="text-sm font-bold text-slate-400">
                      Chưa luyện
                    </Text>
                  )}
                  <View className="flex-row items-center gap-0.5">
                    <Text style={{ color: "#0284c7" }} className="text-xs font-bold">
                      Luyện
                    </Text>
                    <ChevronRight size={13} color="#0284c7" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
