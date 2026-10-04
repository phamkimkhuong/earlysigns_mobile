import React from "react";
import {
  Image,
  Pressable,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Mail,
  RotateCcw,
  X,
} from "lucide-react-native";
import { colors } from "@/core/theme";
import { AppText } from "@/components";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import PrimaryButton from "@/components/ui/PrimaryButton";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";
import FacebookSignInButton from "@/components/ui/FacebookSignInButton";
import AppleSignInButton from "@/components/ui/AppleSignInButton";
import OtpInputView from "@/components/ui/OtpInputView";
import KeyboardAwareContainer from "@/components/ui/KeyboardAwareContainer";
import { useLoginViewModel } from "@/hooks/useLoginViewModel";
import type { RootStackParamList } from "@/types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const nextRoute = route?.params?.next || "Videos";
  const nextParams = route?.params?.nextParams || undefined;

  const vm = useLoginViewModel({
    navigation,
    nextRoute,
    nextParams,
  });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-appBg">
      <KeyboardAwareContainer
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 48,
          gap: 16,
        }}
      >
        {/* Top Header Actions (Back Navigation & Language Switcher) */}
        <View className="flex-row items-center justify-between">
          {navigation?.canGoBack?.() ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("common.back", "Quay lại")}
              activeOpacity={0.8}
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-2xl items-center justify-center bg-white border border-slate-200 shadow-sm"
            >
              <ChevronLeft size={22} color="#37352f" />
            </TouchableOpacity>
          ) : (
            <View className="w-10 h-10" />
          )}

          <LanguageSwitcher />
        </View>

        {/* Hero Branding Section */}
        <View className="items-center gap-2 mt-1">
          <View className="w-16 h-16 rounded-2xl bg-white items-center justify-center border border-slate-200 shadow-sm">
            <Image
              source={require("@assets/logo.png")}
              className="w-12 h-12 rounded-xl"
              resizeMode="contain"
            />
          </View>

          <View className="flex-row items-center px-3 py-1 rounded-full bg-[#f0f9ff] border border-[#bae6fd] mt-1">
            <AppText className="text-xs font-bold text-[#2383e2] uppercase tracking-wider">
              EarlySigns English
            </AppText>
          </View>

          <AppText className="text-[26px] font-extrabold text-[#37352f] text-center leading-tight">
            {t("login.heroTitle", "Luyện phát âm chuẩn quốc tế")}
          </AppText>
          <AppText className="text-[20px] font-extrabold text-[#2383e2] text-center -mt-1">
            {t("login.heroTitleAccent", "Tự tin giao tiếp")}
          </AppText>
        </View>

        {/* Main Authentication Card */}
        <View className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm gap-4">
          {vm.emailStep === "email" ? (
            <>
              <AppText className="text-lg font-extrabold text-[#37352f]">
                {t("login.title", "Đăng nhập")}
              </AppText>

              {/* Social Login Buttons */}
              <View className="gap-2.5">
                {vm.isAppleAvailable ? (
                  <AppleSignInButton
                    loading={vm.appleLoading}
                    onPress={vm.signInApple}
                  />
                ) : null}

                <GoogleSignInButton
                  title={t("login.googleSignIn", "Tiếp tục với Google")}
                  loading={vm.googleLoading}
                  onPress={vm.signInGoogle}
                />

                <FacebookSignInButton
                  title={t("login.facebookSignIn", "Tiếp tục với Facebook")}
                  loading={vm.facebookLoading}
                  onPress={vm.signInFacebook}
                />
              </View>

              {/* Modern Divider */}
              <View className="flex-row items-center my-1 gap-3">
                <View className="flex-1 h-[1px] bg-slate-200" />
                <AppText className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  {t("login.orDivider", "HOẶC VỚI EMAIL")}
                </AppText>
                <View className="flex-1 h-[1px] bg-slate-200" />
              </View>

              {/* Email Input Form */}
              <View className="gap-1.5">
                <AppText className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {t("login.emailLabel", "Email của bạn")}
                </AppText>
                <View className="flex-row items-center border border-slate-200 rounded-xl px-3.5 py-3 bg-appBg">
                  <Mail size={18} color="#64748b" />
                  <TextInput
                    accessibilityLabel={t("login.emailLabel", "Email của bạn")}
                    className="flex-1 ml-2.5 text-[15px] text-[#37352f] p-0 font-medium"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    value={vm.emailInput}
                    onChangeText={vm.setEmailInput}
                    placeholder={t("login.emailPlaceholder", "ten@email.com")}
                    placeholderTextColor="#94a3b8"
                  />
                  {vm.emailInput.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Xóa nội dung email"
                      onPress={vm.clearEmail}
                      hitSlop={8}
                      className="p-1 active:opacity-60"
                    >
                      <X size={16} color="#94a3b8" />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <PrimaryButton
                title={vm.sendingOtp ? t("login.sendingOtp", "Đang gửi mã...") : t("login.sendOtp", "Gửi mã xác thực")}
                disabled={!vm.canSendOtp}
                loading={vm.sendingOtp}
                onPress={() => vm.handleRequestOtp()}
                className="mt-1 min-h-[48px] rounded-xl"
              />
            </>
          ) : (
            /* OTP Verification Step */
            <>
              <View className="flex-row items-center justify-between">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("login.backToEmail", "Đổi email khác")}
                  onPress={vm.handleBackToEmail}
                  className="flex-row items-center gap-1 active:opacity-70 py-1"
                >
                  <ChevronLeft size={18} color="#2383e2" />
                  <AppText className="text-sm font-bold text-[#2383e2]">
                    {t("login.backToEmail", "Đổi email khác")}
                  </AppText>
                </Pressable>

                <View className="px-3 py-1 rounded-full bg-slate-100 max-w-[180px]">
                  <AppText
                    className="text-xs text-slate-600 font-semibold"
                    numberOfLines={1}
                  >
                    {vm.emailInput}
                  </AppText>
                </View>
              </View>

              <View className="gap-1">
                <AppText className="text-xl font-extrabold text-[#37352f]">
                  {t("login.otpScreenTitle", "Nhập mã xác thực")}
                </AppText>
                <AppText className="text-sm text-slate-500 font-medium leading-relaxed">
                  {t("login.enterOtpPrompt", "Mã 6 chữ số đã được gửi tới email của bạn.")}
                </AppText>
              </View>

              {/* 6-box Digit PIN Component */}
              <View className="my-1">
                <OtpInputView
                  value={vm.otpInput}
                  onChange={vm.setOtpInput}
                  hasError={Boolean(vm.authError)}
                  disabled={vm.verifyingOtp}
                />
              </View>

              <PrimaryButton
                title={vm.verifyingOtp ? t("login.verifyingOtp", "Đang kiểm tra...") : t("login.verifyOtp", "Xác nhận & Đăng nhập")}
                disabled={!vm.canVerifyOtp}
                loading={vm.verifyingOtp}
                onPress={vm.handleVerifyOtp}
                className="min-h-[48px] rounded-xl"
              />

              {/* Countdown / Resend Section */}
              <View className="items-center justify-center min-h-[36px]">
                {vm.countdown > 0 ? (
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={14} color="#94a3b8" />
                    <AppText className="text-xs text-slate-400 font-medium">
                      {t("login.countdownSeconds", { seconds: vm.countdown, defaultValue: `Gửi lại sau ${vm.countdown}s` })}
                    </AppText>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={vm.sendingOtp ? t("login.resendingOtp", "Đang gửi lại mã...") : t("login.resendOtp", "Gửi lại mã OTP")}
                    onPress={() => vm.handleRequestOtp({ isResend: true })}
                    disabled={vm.sendingOtp || vm.verifyingOtp}
                    className="flex-row items-center gap-1.5 py-1 px-3 rounded-full active:opacity-70"
                  >
                    <RotateCcw size={14} color="#2383e2" />
                    <AppText className="text-sm font-bold text-[#2383e2]">
                      {vm.sendingOtp ? t("login.resendingOtp", "Đang gửi lại...") : t("login.resendOtp", "Gửi lại mã OTP")}
                    </AppText>
                  </Pressable>
                )}
              </View>

              {vm.otpResentMessage ? (
                <View className="flex-row items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-xl">
                  <CheckCircle2 size={15} color="#059669" />
                  <AppText className="text-xs font-bold text-emerald-700">
                    {vm.otpResentMessage}
                  </AppText>
                </View>
              ) : null}
            </>
          )}

          {/* Authentication Error Banner */}
          {vm.authError ? (
            <View className="flex-row items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3">
              <AlertCircle size={16} color="#e11d48" />
              <AppText className="text-[13px] text-rose-700 font-medium flex-1 leading-5">
                {vm.authError}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Legal Disclaimer Footer */}
        <View className="items-center px-4">
          <AppText className="text-xs text-slate-400 text-center leading-relaxed">
            {t("login.legalPrefix", "Bằng việc đăng nhập, bạn đồng ý với")}{" "}
            <AppText
              className="text-slate-700 font-semibold underline"
              onPress={() => navigation.navigate("Terms")}
            >
              {t("login.termsOfService", "Điều khoản dịch vụ")}
            </AppText>{" "}
            {t("login.and", "và")}{" "}
            <AppText
              className="text-slate-700 font-semibold underline"
              onPress={() => navigation.navigate("Privacy")}
            >
              {t("login.privacyPolicy", "Chính sách bảo mật")}
            </AppText>
            .
          </AppText>
        </View>
      </KeyboardAwareContainer>
    </SafeAreaView>
  );
}
