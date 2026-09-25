import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ShieldCheck } from "lucide-react-native";

export default function PrivacyScreen({ navigation }: { navigation?: any }) {
  const { t } = useTranslation();

  const sections = [
    { title: t("legalContent.privacy.sec1Title"), body: t("legalContent.privacy.sec1Body") },
    { title: t("legalContent.privacy.sec2Title"), body: t("legalContent.privacy.sec2Body") },
    { title: t("legalContent.privacy.sec3Title"), body: t("legalContent.privacy.sec3Body") },
    { title: t("legalContent.privacy.sec4Title"), body: t("legalContent.privacy.sec4Body") },
    { title: t("legalContent.privacy.sec5Title"), body: t("legalContent.privacy.sec5Body") },
    { title: t("legalContent.privacy.sec6Title"), body: t("legalContent.privacy.sec6Body") },
    { title: t("legalContent.privacy.sec7Title"), body: t("legalContent.privacy.sec7Body") },
  ];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#1e2538]">
      <ScrollView
        className="flex-1 bg-appBg"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top elastic overscroll filler */}
        <View
          style={{
            position: "absolute",
            top: -1000,
            left: 0,
            right: 0,
            height: 1000,
            backgroundColor: "#1e2538",
          }}
        />

        {/* 1. LUXURY NAVY HERO HEADER */}
        <View className="bg-[#1e2538] pt-3 pb-8 px-5">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (navigation?.canGoBack?.()) {
                  navigation.goBack();
                } else {
                  navigation?.navigate?.("Main");
                }
              }}
              className="w-10 h-10 rounded-2xl bg-slate-800 items-center justify-center border border-slate-700"
            >
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>

            <Text className="text-base font-extrabold text-white">
              {t("legal.privacyTitle")}
            </Text>

            <View className="w-10 h-10" />
          </View>

          <View className="flex-row items-center gap-3.5">
            <View className="w-12 h-12 rounded-2xl bg-emerald-600 items-center justify-center">
              <ShieldCheck size={24} color="#ffffff" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-white tracking-tight">
                {t("legal.privacyTitle")}
              </Text>
              <Text className="text-xs text-slate-300 mt-0.5">
                {t("legal.lastUpdated")}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-20 gap-3.5">
          {sections.map((sec, idx) => (
            <View key={idx} className="bg-white rounded-3xl p-5 border border-slate-200 gap-2">
              <Text className="text-sm font-extrabold text-slate-900">{sec.title}</Text>
              <Text className="text-xs text-slate-600 leading-relaxed">{sec.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
