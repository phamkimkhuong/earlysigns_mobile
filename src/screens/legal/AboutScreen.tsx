import React from "react";
import {
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldCheck,
  Gift,
  Mail,
  Phone,
  MessageCircle,
  Globe,
  ExternalLink,
} from "lucide-react-native";
import { AppText } from "@/components";
import type { RootStackParamList } from "@/types/navigation";

const PHONE = "0383064632";
const EMAIL = "support@earlysigns.net";
const ZALO_URL = "https://zalo.me/0383064632";
const WEBSITE_URL = "https://earlysigns.net";

type Props = NativeStackScreenProps<RootStackParamList, "About">;

export default function AboutScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
      {/* 1. TOP APP BAR */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-appBg border-b border-slate-200">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("common.back", "Quay lại")}
          activeOpacity={0.7}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Main");
            }
          }}
          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
          className="w-10 h-10 rounded-2xl items-center justify-center border shadow-xs"
        >
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>

        <AppText className="text-base font-extrabold text-[#0f172a]">
          {t("about.title", "Về EarlySigns")}
        </AppText>

        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1 bg-appBg"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand & Mission Card */}
          <View className="bg-white rounded-3xl p-5 border border-slate-200 items-center text-center gap-3">
            <View className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 p-2 shadow-sm items-center justify-center">
              <Image
                source={require("@assets/logo.png")}
                className="w-16 h-16 rounded-2xl"
                resizeMode="contain"
              />
            </View>
            <View className="items-center">
              <AppText className="text-xl font-black text-slate-900 tracking-tight">
                EarlySigns Mobile
              </AppText>
              <View className="flex-row items-center gap-1.5 mt-1 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                <AppText className="text-xs font-bold text-indigo-700">
                  {t("about.version", "Phiên bản 1.0.0 (Build 25)")}
                </AppText>
              </View>
            </View>
            <AppText className="text-[15px] text-slate-600 leading-6 text-center mt-1">
              {t(
                "about.description",
                "EarlySigns là nền tảng ứng dụng trí tuệ nhân tạo chuyên sâu trong phân tích ngữ âm tiếng Anh (IPA). Bằng cách kết hợp mô hình nhận diện giọng nói chính xác cao và thuật toán chẩn đoán lỗi đặc thù của người học Việt Nam, chúng tôi giúp bạn phát hiện khiếm khuyết phát âm, xây dựng phản xạ chuẩn bản xứ tự tin và tự nhiên."
              )}
            </AppText>
          </View>

          {/* Legal & Policies Grouped Card */}
          <View className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <View className="px-5 pt-4 pb-2">
              <AppText className="text-[15px] font-extrabold text-slate-900">
                {t("about.termsAndPrograms", "Điều khoản & Chương trình")}
              </AppText>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("footer.termsOfUse", "Điều khoản sử dụng")}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Terms")}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-slate-50 items-center justify-center border border-slate-100">
                  <FileText size={16} color="#475569" />
                </View>
                <AppText className="text-[15px] font-semibold text-slate-800">
                  {t("footer.termsOfUse", "Điều khoản sử dụng")}
                </AppText>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("footer.privacyPolicy", "Chính sách bảo mật")}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Privacy")}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-slate-50 items-center justify-center border border-slate-100">
                  <ShieldCheck size={16} color="#475569" />
                </View>
                <AppText className="text-[15px] font-semibold text-slate-800">
                  {t("footer.privacyPolicy", "Chính sách bảo mật")}
                </AppText>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("referral.pageTitle", "Chương trình giới thiệu")}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Referral")}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center border border-amber-100">
                  <Gift size={16} color="#d97706" />
                </View>
                <AppText className="text-[15px] font-semibold text-slate-800">
                  {t("referral.pageTitle", "Chương trình giới thiệu")}
                </AppText>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Contact & Support Grouped Card */}
          <View className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <View className="px-5 pt-4 pb-2">
              <AppText className="text-[15px] font-extrabold text-slate-900">
                {t("about.supportSection", "Liên hệ & Hỗ trợ kỹ thuật")}
              </AppText>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${t("about.supportEmail", "Email hỗ trợ")}: ${EMAIL}`}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(`mailto:${EMAIL}`)}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-indigo-50 items-center justify-center border border-indigo-100">
                  <Mail size={16} color="#4f46e5" />
                </View>
                <View>
                  <AppText className="text-[13px] font-medium text-slate-500">
                    {t("about.supportEmail", "Email hỗ trợ")}
                  </AppText>
                  <AppText className="text-[15px] font-bold text-slate-800">{EMAIL}</AppText>
                </View>
              </View>
              <ExternalLink size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${t("about.hotline", "Hotline")}: 0383 064 632`}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(`tel:${PHONE}`)}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-100">
                  <Phone size={16} color="#059669" />
                </View>
                <View>
                  <AppText className="text-[13px] font-medium text-slate-500">
                    {t("about.hotline", "Hotline")}
                  </AppText>
                  <AppText className="text-[15px] font-bold text-slate-800">0383 064 632</AppText>
                </View>
              </View>
              <ExternalLink size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("about.zaloConsult", "Zalo tư vấn")}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(ZALO_URL)}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center border border-blue-100">
                  <MessageCircle size={16} color="#2563eb" />
                </View>
                <View>
                  <AppText className="text-[13px] font-medium text-slate-500">
                    {t("about.zaloConsult", "Zalo tư vấn")}
                  </AppText>
                  <AppText className="text-[15px] font-bold text-slate-800">Zalo Official Account</AppText>
                </View>
              </View>
              <ExternalLink size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("about.officialWebsite", "Website chính thức")}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(WEBSITE_URL)}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-slate-50 items-center justify-center border border-slate-100">
                  <Globe size={16} color="#475569" />
                </View>
                <View>
                  <AppText className="text-[13px] font-medium text-slate-500">
                    {t("about.website", "Trang web")}
                  </AppText>
                  <AppText className="text-[15px] font-bold text-slate-800">earlysigns.net</AppText>
                </View>
              </View>
              <ExternalLink size={15} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Legal Entity & Copyright Footer */}
          <View className="items-center px-4 pt-2 gap-1">
            <AppText className="text-xs font-bold text-slate-600 text-center leading-relaxed">
              {t("footer.companyLegalName", "CÔNG TY TNHH EARLYSIGNS VIỆT NAM")}
            </AppText>
            <AppText className="text-xs text-slate-400 text-center leading-relaxed">
              {t(
                "footer.headquartersAddress",
                "Tầng 4, Tòa nhà Anh Minh, số 63 Hoàng Cầu, Phường Ô Chợ Dừa, Thành phố Hà Nội, Việt Nam"
              )}
            </AppText>
            <AppText className="text-xs text-slate-400 text-center mt-1">
              {t("about.copyright", "© 2026 EarlySigns. Bảo lưu mọi quyền.")}
            </AppText>
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}
