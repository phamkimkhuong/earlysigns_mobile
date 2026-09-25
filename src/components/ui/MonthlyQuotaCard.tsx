import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Camera, Crown, Mic, Volume2 } from "lucide-react-native";
import { getMonthlyQuotaSnapshot, type QuotaType } from "@/services/usageLimits";
import type { UserTier } from "@/types/domain";

interface MonthlyQuotaCardProps {
  userKey: string;
  userTier: UserTier | string;
  usageStatus?: any;
  onUpgradePress?: () => void;
  compact?: boolean;
}

export default function MonthlyQuotaCard({
  userKey,
  userTier,
  usageStatus,
  onUpgradePress,
  compact = false,
}: MonthlyQuotaCardProps) {
  const { t } = useTranslation();
  const snapshot = getMonthlyQuotaSnapshot({
    userKey,
    userTier,
    usageStatus,
  });

  if (snapshot.isUnlimited) {
    return (
      <View className="bg-slate-900 rounded-3xl p-4 flex-row items-center justify-between border border-amber-400">
        <View className="flex-row items-center gap-3.5 flex-1 pr-2">
          <View className="w-11 h-11 rounded-2xl bg-amber-500 items-center justify-center">
            <Crown size={22} color="#ffffff" strokeWidth={2.2} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-sm font-extrabold text-white">
                {t("quota.proMember")}
              </Text>
              <View className="bg-amber-400 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-slate-900">
                  {t("quota.unlimited")}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {t("quota.unlimitedDesc")}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const hasWarning =
    snapshot.pronunciation.isLow ||
    snapshot.pronunciation.isExhausted ||
    snapshot.ocr.isLow ||
    snapshot.ocr.isExhausted ||
    snapshot.audio.isLow ||
    snapshot.audio.isExhausted;

  const items = [
    {
      type: "pronunciation" as QuotaType,
      label: t("quota.items.pronunciation"),
      icon: Mic,
      remaining: snapshot.pronunciation.remaining,
      limit: snapshot.pronunciation.limit,
      used: snapshot.pronunciation.used,
      percent: Math.min(
        100,
        Math.round(
          (snapshot.pronunciation.used / (snapshot.pronunciation.limit || 1)) * 100
        )
      ),
      isLow: snapshot.pronunciation.isLow,
      isExhausted: snapshot.pronunciation.isExhausted,
      color: "#4f46e5",
      bgPad: "bg-indigo-50",
    },
    {
      type: "ocr" as QuotaType,
      label: t("quota.items.ocr"),
      icon: Camera,
      remaining: snapshot.ocr.remaining,
      limit: snapshot.ocr.limit,
      used: snapshot.ocr.used,
      percent: Math.min(
        100,
        Math.round((snapshot.ocr.used / (snapshot.ocr.limit || 1)) * 100)
      ),
      isLow: snapshot.ocr.isLow,
      isExhausted: snapshot.ocr.isExhausted,
      color: "#0284c7",
      bgPad: "bg-sky-50",
    },
    {
      type: "audio" as QuotaType,
      label: t("quota.items.audio"),
      icon: Volume2,
      remaining: snapshot.audio.remaining,
      limit: snapshot.audio.limit,
      used: snapshot.audio.used,
      percent: Math.min(
        100,
        Math.round((snapshot.audio.used / (snapshot.audio.limit || 1)) * 100)
      ),
      isLow: snapshot.audio.isLow,
      isExhausted: snapshot.audio.isExhausted,
      color: "#059669",
      bgPad: "bg-emerald-50",
    },
  ];

  return (
    <View className="bg-white rounded-3xl p-5 border border-slate-200 gap-4">
      {/* Header Row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
            {t("quota.monthlyTitle")}
          </Text>
          <Text className="text-base font-bold text-slate-900 mt-0.5">
            {t("quota.freeChecksThisMonth")}
          </Text>
        </View>

        {onUpgradePress ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onUpgradePress}
            className="bg-amber-500 px-3.5 py-1.5 rounded-full flex-row items-center gap-1"
          >
            <Crown size={12} color="#ffffff" strokeWidth={2.5} />
            <Text className="text-xs font-bold text-white">
              {t("quota.upgradePro")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 3 Quota Bars with Squircle Icon Pads */}
      <View className="gap-3.5">
        {items.map((it) => {
          const IconComp = it.icon;
          const barColor = it.isExhausted
            ? "bg-rose-500"
            : it.isLow
            ? "bg-amber-500"
            : "bg-indigo-600";

          return (
            <View key={it.type} className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className={`w-7 h-7 rounded-lg ${it.bgPad} items-center justify-center`}>
                    <IconComp size={15} color={it.color} strokeWidth={2.2} />
                  </View>
                  <Text className="text-xs font-semibold text-slate-800">{it.label}</Text>
                </View>

                <Text className="text-xs font-bold text-slate-700">
                  {it.isExhausted ? (
                    <Text className="text-rose-500">
                      {t("quota.exhausted", { limit: it.limit })}
                    </Text>
                  ) : (
                    <>
                      <Text style={{ color: it.color }}>{it.remaining}</Text>
                      <Text className="text-slate-400 font-normal"> / {it.limit}</Text>
                    </>
                  )}
                </Text>
              </View>

              {/* Progress Track */}
              <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.min(100, it.percent)}%` }}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Warning message if low */}
      {hasWarning && onUpgradePress && !compact ? (
        <View className="p-2.5 bg-amber-50 rounded-xl flex-row items-center justify-between border border-amber-200">
          <Text className="text-xs text-amber-800 font-medium flex-1 pr-2">
            {t("quota.warningLow")}
          </Text>
          <TouchableOpacity onPress={onUpgradePress}>
            <Text className="text-xs font-bold text-amber-700 underline">
              {t("quota.unlockPro")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
