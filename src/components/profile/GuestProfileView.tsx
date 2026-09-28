import React, { useState } from "react";
import {
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useTranslation } from "react-i18next";
import {
  AudioLines,
  Check,
  ChevronRight,
  Compass,
  FileText,
  Gift,
  Globe,
  Headphones,
  Info,
  ShieldCheck,
  User,
  X,
} from "lucide-react-native";
import { setStoredLanguage } from "@/core/i18n";
import { useAuth } from "@/services/Auth";

interface GuestProfileViewProps {
  navigation: any;
}

export default function GuestProfileView({ navigation }: GuestProfileViewProps) {
  const { t, i18n } = useTranslation();
  const { updateUserLanguage } = useAuth();

  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const currentLang = String(i18n.resolvedLanguage || i18n.language || "vi").startsWith("vi")
    ? "vi"
    : "en";

  const handleNavigate = (screen: string, params?: any) => {
    try {
      if (navigation?.navigate) {
        navigation.navigate(screen, params);
        return;
      }
      const parent = navigation?.getParent?.();
      if (parent?.navigate) {
        parent.navigate(screen, params);
      }
    } catch (err) {
      console.warn("handleNavigate error:", err);
    }
  };

  const handleSelectLanguage = async (lng: "vi" | "en") => {
    if (lng !== currentLang) {
      setStoredLanguage(lng);
      await i18n.changeLanguage(lng);
      try {
        await updateUserLanguage(lng);
      } catch {
        /* keep local */
      }
    }
    setLanguageModalVisible(false);
  };

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 48,
          gap: 16,
        }}
      >
        {/* 1. GUEST IDENTITY CARD */}
        <View
          style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
          className="rounded-3xl p-4 border flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-3.5 flex-1 pr-2">
            {/* Brand Navy Avatar Circle */}
            <View
              style={{ backgroundColor: "#092440" }}
              className="w-12 h-12 rounded-full items-center justify-center"
            >
              <User size={22} color="#ffffff" strokeWidth={2.4} />
            </View>

            <View className="gap-0.5">
              <Text className="text-base font-extrabold text-[#0f172a]">
                {t("profile.guestTitle") || "Khách"}
              </Text>
              <Text className="text-xs font-medium text-slate-400">
                {t("profile.notLoggedIn") || "Chưa đăng nhập"}
              </Text>
            </View>
          </View>

          {/* GUEST Pill Badge */}
          <View
            style={{ backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }}
            className="px-3 py-1 rounded-full border"
          >
            <Text
              style={{ color: "#0284c7" }}
              className="text-[11px] font-black uppercase tracking-wider"
            >
              {t("profile.guestBadge") || "GUEST"}
            </Text>
          </View>
        </View>

        {/* 2. HERO AUTH VALUE PROPOSITION CARD (Vibrant Ocean Navy Gradient) */}
        <View
          style={{
            borderRadius: 24,
            overflow: "hidden",
            position: "relative",
            shadowColor: "#092440",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.22,
            shadowRadius: 14,
            elevation: 6,
          }}
          className="p-5 border border-[#1e4e79]"
        >
          {/* Background Gradient */}
          <View pointerEvents="none" className="absolute inset-0">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="hero-auth-grad" x1="0%" y1="0%" x2="100%" y2="85%">
                  <Stop offset="0%" stopColor="#092440" />
                  <Stop offset="45%" stopColor="#0f3e68" />
                  <Stop offset="100%" stopColor="#1a6296" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#hero-auth-grad)" />
            </Svg>
          </View>

          {/* Ambient Soft Cyan Glow */}
          <View
            style={{
              position: "absolute",
              top: -35,
              right: -35,
              width: 190,
              height: 190,
              borderRadius: 95,
              backgroundColor: "#38bdf8",
              opacity: 0.18,
            }}
          />

          <View className="flex-row items-center justify-between">
            {/* Left Copy & Brand Tag */}
            <View className="flex-1 pr-2">
              <View
                style={{ backgroundColor: "rgba(255, 255, 255, 0.16)", borderColor: "rgba(255, 255, 255, 0.25)" }}
                className="self-start px-2.5 py-0.5 rounded-full mb-3 border"
              >
                <Text style={{ color: "#7dd3fc" }} className="text-[11px] font-bold">
                  EarlySigns
                </Text>
              </View>

              <Text className="text-xl font-black text-white leading-tight">
                {t("profile.guestHeroTitle") || "Lưu hành trình luyện\nphát âm của bạn"}
              </Text>

              <Text className="text-xs text-sky-100 leading-relaxed mt-2 font-medium">
                {t("profile.guestHeroDesc") || "Đăng nhập để theo dõi tiến độ, lưu hồ sơ phát âm và nhận bài luyện cá nhân hóa."}
              </Text>
            </View>

            {/* Right 3D Illustration Asset (Enlarged & Balanced) */}
            <View className="items-center justify-center -mr-2.5">
              <Image
                source={require("@assets/profile_icon.png")}
                style={{ width: 132, height: 132 }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Dual Action Buttons */}
          <View className="flex-row items-center gap-3 mt-4">
            {/* 1. Đăng nhập (Primary Crisp White Button) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleNavigate("Login", { next: "Profile" })}
              style={{ backgroundColor: "#ffffff" }}
              className="flex-1 py-3 rounded-full items-center justify-center shadow-xs"
            >
              <Text style={{ color: "#092440" }} className="text-sm font-extrabold">
                {t("profile.loginBtn") || t("auth.login") || "Đăng nhập"}
              </Text>
            </TouchableOpacity>

            {/* 2. Tạo tài khoản (Secondary Glass Button) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleNavigate("Login", { next: "Profile" })}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.14)",
                borderColor: "rgba(255, 255, 255, 0.35)",
              }}
              className="flex-1 py-3 rounded-full items-center justify-center border"
            >
              <Text className="text-sm font-bold text-white">
                {t("profile.registerBtn") || t("auth.register") || "Tạo tài khoản"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. SECTION 1: KHÁM PHÁ NHANH */}
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2 px-1">
            <Compass size={18} color="#0284c7" />
            <Text className="text-sm font-bold text-[#0f172a]">
              {t("profile.quickExplore") || "Khám phá nhanh"}
            </Text>
          </View>

          <View
            style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
            className="rounded-2xl border overflow-hidden"
          >
            {/* Row: Chương trình giới thiệu */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => handleNavigate("Referral")}
              className="flex-row items-center justify-between p-3.5 border-b border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View
                  style={{ backgroundColor: "#eef2ff" }}
                  className="w-9 h-9 rounded-xl items-center justify-center"
                >
                  <Gift size={18} color="#4f46e5" />
                </View>
                <Text className="text-sm font-semibold text-[#0f172a]">
                  {t("profile.referralTitle") || "Chương trình giới thiệu"}
                </Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
            {/* Row: Ngôn ngữ */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setLanguageModalVisible(true)}
              className="flex-row items-center justify-between p-3.5 border-b border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View
                  style={{ backgroundColor: "#eff6ff" }}
                  className="w-9 h-9 rounded-xl items-center justify-center"
                >
                  <Globe size={18} color="#0284c7" />
                </View>
                <Text className="text-sm font-semibold text-[#0f172a]">
                  {t("language.label") || "Ngôn ngữ"}
                </Text>
              </View>

              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs font-medium text-slate-500">
                  {currentLang === "vi" ? t("language.vi") || "Tiếng Việt" : t("language.en") || "English"}
                </Text>
                <ChevronRight size={16} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {/* Row: Giọng mẫu (Static text chuẩn spec) */}
            <View className="flex-row items-center justify-between p-3.5">
              <View className="flex-row items-center gap-3">
                <View
                  style={{ backgroundColor: "#ecfdf5" }}
                  className="w-9 h-9 rounded-xl items-center justify-center"
                >
                  <AudioLines size={18} color="#10b981" />
                </View>
                <Text className="text-sm font-semibold text-[#0f172a]">
                  {t("profile.standardVoice") || "Giọng mẫu"}
                </Text>
              </View>

              <Text className="text-xs font-semibold text-slate-500">
                {t("profile.standardVoiceUK") || "Anh – Anh (UK)"}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. SECTION 2: HỖ TRỢ & THÔNG TIN */}
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2 px-1">
            <Info size={18} color="#0284c7" />
            <Text className="text-sm font-bold text-[#0f172a]">
              {t("profile.supportAndInfo") || "Hỗ trợ & thông tin"}
            </Text>
          </View>

          <View
            style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
            className="rounded-2xl border overflow-hidden"
          >
            {/* Row: Liên hệ hỗ trợ */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                Linking.openURL("mailto:support@earlysigns.app?subject=Support%20Request")
              }
              className="flex-row items-center justify-between p-3.5 border-b border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View
                  style={{ backgroundColor: "#eff6ff" }}
                  className="w-9 h-9 rounded-xl items-center justify-center"
                >
                  <Headphones size={18} color="#0284c7" />
                </View>
                <Text className="text-sm font-semibold text-[#0f172a]">
                  {t("profile.contactSupport") || "Liên hệ hỗ trợ"}
                </Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* Row: Về EarlySigns */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => handleNavigate("About")}
              className="flex-row items-center justify-between p-3.5 border-b border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View
                  style={{ backgroundColor: "#ecfdf5" }}
                  className="w-9 h-9 rounded-xl items-center justify-center"
                >
                  <Info size={18} color="#10b981" />
                </View>
                <Text className="text-sm font-semibold text-[#0f172a]">
                  {t("profile.aboutApp") || "Về EarlySigns"}
                </Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* Row: Điều khoản sử dụng */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => handleNavigate("Terms")}
              className="flex-row items-center justify-between p-3.5 border-b border-slate-100"
            >
              <View className="flex-row items-center gap-3">
                <View
                  style={{ backgroundColor: "#eff6ff" }}
                  className="w-9 h-9 rounded-xl items-center justify-center"
                >
                  <FileText size={18} color="#0284c7" />
                </View>
                <Text className="text-sm font-semibold text-[#0f172a]">
                  {t("profile.termsOfUse") || "Điều khoản sử dụng"}
                </Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* Row: Chính sách bảo mật */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => handleNavigate("Privacy")}
              className="flex-row items-center justify-between p-3.5"
            >
              <View className="flex-row items-center gap-3">
                <View
                  style={{ backgroundColor: "#ecfdf5" }}
                  className="w-9 h-9 rounded-xl items-center justify-center"
                >
                  <ShieldCheck size={18} color="#10b981" />
                </View>
                <Text className="text-sm font-semibold text-[#0f172a]">
                  {t("profile.privacyPolicy") || "Chính sách bảo mật"}
                </Text>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* MODAL 1: CHỌN NGÔN NGỮ */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setLanguageModalVisible(false)}
          style={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
          className="flex-1 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: "#ffffff" }}
            className="rounded-t-3xl p-5 pb-8 gap-4"
          >
            <View className="flex-row items-center justify-between pb-2 border-b border-slate-100">
              <Text className="text-base font-extrabold text-[#0f172a]">
                {t("profile.chooseLanguage") || "Chọn ngôn ngữ hiển thị"}
              </Text>
              <TouchableOpacity
                onPress={() => setLanguageModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Tiếng Việt */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage("vi")}
              style={{
                backgroundColor: currentLang === "vi" ? "#eff6ff" : "#f8fafc",
                borderColor: currentLang === "vi" ? "#0284c7" : "#e2e8f0",
              }}
              className="flex-row items-center justify-between p-4 rounded-2xl border"
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-xl">🇻🇳</Text>
                <Text
                  style={{ color: currentLang === "vi" ? "#0284c7" : "#0f172a" }}
                  className="text-sm font-bold"
                >
                  {t("language.vi") || "Tiếng Việt"}
                </Text>
              </View>
              {currentLang === "vi" ? <Check size={18} color="#0284c7" strokeWidth={2.5} /> : null}
            </TouchableOpacity>

            {/* Option 2: English */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectLanguage("en")}
              style={{
                backgroundColor: currentLang === "en" ? "#eff6ff" : "#f8fafc",
                borderColor: currentLang === "en" ? "#0284c7" : "#e2e8f0",
              }}
              className="flex-row items-center justify-between p-4 rounded-2xl border"
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-xl">🇬🇧</Text>
                <Text
                  style={{ color: currentLang === "en" ? "#0284c7" : "#0f172a" }}
                  className="text-sm font-bold"
                >
                  {t("language.en") || "English"}
                </Text>
              </View>
              {currentLang === "en" ? <Check size={18} color="#0284c7" strokeWidth={2.5} /> : null}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
