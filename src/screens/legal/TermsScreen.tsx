import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react-native";
import { AppText } from "@/components/ui/AppText";

export default function TermsScreen({ navigation }: { navigation?: any }) {
  const { t } = useTranslation();

  const sections = [
    { title: t("legalContent.terms.sec1Title"), body: t("legalContent.terms.sec1Body") },
    { title: t("legalContent.terms.sec2Title"), body: t("legalContent.terms.sec2Body") },
    { title: t("legalContent.terms.sec3Title"), body: t("legalContent.terms.sec3Body") },
    { title: t("legalContent.terms.sec4Title"), body: t("legalContent.terms.sec4Body") },
    { title: t("legalContent.terms.sec5Title"), body: t("legalContent.terms.sec5Body") },
    { title: t("legalContent.terms.sec6Title"), body: t("legalContent.terms.sec6Body") },
    { title: t("legalContent.terms.sec7Title"), body: t("legalContent.terms.sec7Body") },
    { title: t("legalContent.terms.sec8Title"), body: t("legalContent.terms.sec8Body") },
  ];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-white">
      {/* 1. TOP APP BAR with Title */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Quay lại")}
          activeOpacity={0.7}
          onPress={() => {
            if (navigation?.canGoBack?.()) {
              navigation.goBack();
            } else {
              navigation?.navigate?.("Main");
            }
          }}
          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
          className="w-10 h-10 rounded-2xl items-center justify-center border shadow-xs"
        >
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>

        <AppText className="text-base font-extrabold text-[#0f172a]">
          {t("legal.termsTitle", "Điều khoản sử dụng")}
        </AppText>

        <View className="w-10 h-10" />
      </View>

      {/* 2. CONTINUOUS DOCUMENT (Văn bản từ trên xuống, các mục liền kề) */}
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <AppText className="text-[13px] text-slate-400 font-medium mb-5">
          {t("legal.lastUpdated", "Cập nhật lần cuối: 24/09/2026 • Phiên bản 1.0")}
        </AppText>

        {/* Các mục liền kề từ trên xuống */}
        <View className="gap-6">
          {sections.map((sec, idx) => (
            <View key={idx}>
              <AppText className="text-base font-extrabold text-slate-900 mb-2">
                {sec.title}
              </AppText>
              <AppText className="text-[15px] text-slate-700 leading-6">
                {sec.body}
              </AppText>
              {idx < sections.length - 1 && (
                <View className="h-px bg-slate-100 mt-5" />
              )}
            </View>
          ))}
        </View>

        {/* Sign-off Footer */}
        <View className="mt-10 pt-6 border-t border-slate-200 gap-1 items-center">
          <AppText className="text-xs font-bold text-slate-500 text-center uppercase tracking-wider">
            {t("legal.legalTeam", "EarlySigns Legal Team")}
          </AppText>
          <AppText className="text-xs text-slate-400 text-center">
            {t("legal.companyName", "CÔNG TY TNHH EARLYSIGNS VIỆT NAM")}
          </AppText>
          <AppText className="text-xs text-slate-400 text-center">
            {t("legal.contactPrompt", "Mọi thắc mắc vui lòng gửi về support@earlysigns.net")}
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
