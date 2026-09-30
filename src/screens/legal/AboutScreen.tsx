import React from "react";
import {
  Image,
  Linking,
  ScrollView,
  Text,
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
  Sparkles,
  ExternalLink,
} from "lucide-react-native";
import type { RootStackParamList } from "@/types/navigation";

const PHONE = "0383064632";
const EMAIL = "support@earlysigns.net";
const ZALO_URL = "https://zalo.me/0383064632";
const WEBSITE_URL = "https://earlysigns.net";

type Props = NativeStackScreenProps<RootStackParamList, "About">;

export default function AboutScreen({ navigation }: Props) {
  const { t } = useTranslation();

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
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("Main");
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={t("common.back", "Quay lại")}
              className="w-10 h-10 rounded-2xl bg-slate-800 items-center justify-center border border-slate-700"
            >
              <ChevronLeft size={22} color="#ffffff" />
            </TouchableOpacity>

            <Text className="text-base font-extrabold text-white">
              {t("about.title", "Về EarlySigns")}
            </Text>

            <View className="w-10 h-10" />
          </View>
        </View>

        {/* 2. LAYERED OVERLAPPING CANVAS SHEET */}
        <View className="flex-1 bg-appBg -mt-5 rounded-t-[32px] px-4 pt-5 pb-16 gap-4">
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
              <Text className="text-xl font-black text-slate-900 tracking-tight">
                EarlySigns Mobile
              </Text>
              <View className="flex-row items-center gap-1.5 mt-1 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                <Sparkles size={12} color="#4f46e5" />
                <Text className="text-xs font-bold text-indigo-700">
                  {t("about.version", "Phiên bản 1.0.0 (Build 25)")}
                </Text>
              </View>
            </View>
            <Text className="text-[15px] text-slate-600 leading-6 text-center mt-1">
              {t(
                "about.description",
                "EarlySigns là nền tảng ứng dụng trí tuệ nhân tạo chuyên sâu trong phân tích ngữ âm tiếng Anh (IPA). Bằng cách kết hợp mô hình nhận diện giọng nói chính xác cao và thuật toán chẩn đoán lỗi đặc thù của người học Việt Nam, chúng tôi giúp bạn phát hiện khiếm khuyết phát âm, xây dựng phản xạ chuẩn bản xứ tự tin và tự nhiên."
              )}
            </Text>
          </View>

          {/* Legal & Policies Grouped Card */}
          <View className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <View className="px-5 pt-4 pb-2">
              <Text className="text-[15px] font-extrabold text-slate-900">
                {t("about.termsAndPrograms", "Điều khoản & Chương trình")}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Terms")}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-slate-50 items-center justify-center border border-slate-100">
                  <FileText size={16} color="#475569" />
                </View>
                <Text className="text-[15px] font-semibold text-slate-800">
                  {t("footer.termsOfUse", "Điều khoản sử dụng")}
                </Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Privacy")}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-slate-50 items-center justify-center border border-slate-100">
                  <ShieldCheck size={16} color="#475569" />
                </View>
                <Text className="text-[15px] font-semibold text-slate-800">
                  {t("footer.privacyPolicy", "Chính sách bảo mật")}
                </Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate("Referral")}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center border border-amber-100">
                  <Gift size={16} color="#d97706" />
                </View>
                <Text className="text-[15px] font-semibold text-slate-800">
                  {t("referral.pageTitle", "Chương trình giới thiệu")}
                </Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Contact & Support Grouped Card */}
          <View className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <View className="px-5 pt-4 pb-2">
              <Text className="text-[15px] font-extrabold text-slate-900">
                {t("about.supportSection", "Liên hệ & Hỗ trợ kỹ thuật")}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Linking.openURL(`mailto:${EMAIL}`)}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-indigo-50 items-center justify-center border border-indigo-100">
                  <Mail size={16} color="#4f46e5" />
                </View>
                <View>
                  <Text className="text-[13px] font-medium text-slate-500">
                    {t("about.supportEmail", "Email hỗ trợ")}
                  </Text>
                  <Text className="text-[15px] font-bold text-slate-800">{EMAIL}</Text>
                </View>
              </View>
              <ExternalLink size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Linking.openURL(`tel:${PHONE}`)}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center border border-emerald-100">
                  <Phone size={16} color="#059669" />
                </View>
                <View>
                  <Text className="text-[13px] font-medium text-slate-500">
                    {t("about.hotline", "Hotline")}
                  </Text>
                  <Text className="text-[15px] font-bold text-slate-800">0383 064 632</Text>
                </View>
              </View>
              <ExternalLink size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Linking.openURL(ZALO_URL)}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center border border-blue-100">
                  <MessageCircle size={16} color="#2563eb" />
                </View>
                <View>
                  <Text className="text-[13px] font-medium text-slate-500">
                    {t("about.zaloConsult", "Zalo tư vấn")}
                  </Text>
                  <Text className="text-[15px] font-bold text-slate-800">Zalo Official Account</Text>
                </View>
              </View>
              <ExternalLink size={15} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Linking.openURL(WEBSITE_URL)}
              className="flex-row items-center justify-between px-5 py-3.5 border-t border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-xl bg-slate-50 items-center justify-center border border-slate-100">
                  <Globe size={16} color="#475569" />
                </View>
                <View>
                  <Text className="text-[13px] font-medium text-slate-500">
                    {t("about.website", "Trang web")}
                  </Text>
                  <Text className="text-[15px] font-bold text-slate-800">earlysigns.net</Text>
                </View>
              </View>
              <ExternalLink size={15} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Legal Entity & Copyright Footer */}
          <View className="items-center px-4 pt-2 gap-1">
            <Text className="text-xs font-bold text-slate-600 text-center leading-relaxed">
              {t("footer.companyLegalName", "CÔNG TY TNHH EARLYSIGNS VIỆT NAM")}
            </Text>
            <Text className="text-xs text-slate-400 text-center leading-relaxed">
              {t(
                "footer.headquartersAddress",
                "Tầng 4, Tòa nhà Anh Minh, số 63 Hoàng Cầu, Phường Ô Chợ Dừa, Thành phố Hà Nội, Việt Nam"
              )}
            </Text>
            <Text className="text-xs text-slate-400 text-center mt-1">
              {t("about.copyright", "© 2026 EarlySigns. Bảo lưu mọi quyền.")}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
