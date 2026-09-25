import React from "react";
import {
  Image,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Compass,
  Mail,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react-native";
import { colors } from "@/core/theme";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import PrimaryButton from "@/components/ui/PrimaryButton";
import GoogleSignInButton from "@/components/ui/GoogleSignInButton";
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
    <KeyboardAwareContainer
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: Platform.OS === "ios" ? 12 : 24,
        paddingBottom: 48,
        gap: 16,
      }}
    >
        {/* Top Header Actions */}
        <View className="flex-row items-center justify-between">
          <View />
          <Pressable
            onPress={vm.handleContinueAsGuest}
            className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-appElevated border border-appBorder active:opacity-70"
          >
            <Compass size={14} color={colors.textSecondary} />
            <Text className="text-xs font-semibold text-appTextSecondary">
              {t("login.continueAsGuest")}
            </Text>
          </Pressable>
        </View>

        {/* Hero Section */}
        <View className="items-center gap-2 mt-1">
          <View className="w-16 h-16 rounded-2xl bg-appElevated items-center justify-center border border-appBorder shadow-sm">
            <Image
              source={require("@assets/logo.png")}
              className="w-12 h-12 rounded-xl"
              resizeMode="contain"
            />
          </View>

          <View className="flex-row items-center gap-1 px-2.5 py-0.5 rounded-full bg-accentMuted border border-accent/20 mt-1">
            <Sparkles size={11} color={colors.accent} />
            <Text className="text-[11px] font-bold text-accent uppercase tracking-wider">
              EarlySigns AI Coach
            </Text>
          </View>

          <Text className="text-[26px] font-extrabold text-appText text-center leading-tight">
            {t("login.heroTitle")}
          </Text>
          <Text className="text-[20px] font-bold text-accent text-center -mt-1">
            {t("login.heroTitleAccent")}
          </Text>
          <Text className="text-sm text-appTextSecondary text-center max-w-[300px]">
            {t("login.subtitlePart1")}{" "}
            <Text className="font-bold text-appText">{t("login.ipaBadge")}</Text>{" "}
            {t("login.subtitlePart2")}
          </Text>
        </View>

        {/* Main Authentication Card */}
        <View className="bg-appElevated rounded-3xl p-5 border border-appBorder shadow-sm gap-4">
          {vm.emailStep === "email" ? (
            <>
              <Text className="text-lg font-bold text-appText">{t("login.title")}</Text>

              {/* Social Login Buttons */}
              <View className="gap-2.5">
                {vm.isAppleAvailable ? (
                  <AppleSignInButton
                    loading={vm.appleLoading}
                    onPress={vm.signInApple}
                  />
                ) : null}

                <GoogleSignInButton
                  title={t("login.googleSignIn")}
                  loading={vm.googleLoading}
                  onPress={vm.signInGoogle}
                />
              </View>

              {/* Modern Divider */}
              <View className="flex-row items-center my-1 gap-2.5">
                <View className="flex-1 h-[1px] bg-appBorder" />
                <Text className="text-xs text-appTextMuted font-medium uppercase tracking-wider">
                  {t("login.orDivider")}
                </Text>
                <View className="flex-1 h-[1px] bg-appBorder" />
              </View>

              {/* Email Form */}
              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-appTextSecondary">
                  {t("login.emailLabel")}
                </Text>
                <View className="flex-row items-center border border-appBorderStrong rounded-xl px-3.5 py-2.5 bg-appBg">
                  <Mail size={18} color="#94a3b8" />
                  <TextInput
                    className="flex-1 ml-2.5 text-base text-appText p-0"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    value={vm.emailInput}
                    onChangeText={vm.setEmailInput}
                    placeholder={t("login.emailPlaceholder")}
                    placeholderTextColor="#94a3b8"
                  />
                  {vm.emailInput.length > 0 ? (
                    <Pressable
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
                title={vm.sendingOtp ? t("login.sendingOtp") : t("login.sendOtp")}
                disabled={!vm.canSendOtp}
                loading={vm.sendingOtp}
                onPress={() => vm.handleRequestOtp()}
              />
            </>
          ) : (
            /* OTP Verification Step */
            <>
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={vm.handleBackToEmail}
                  className="flex-row items-center gap-1 active:opacity-70 py-1"
                >
                  <ChevronLeft size={18} color={colors.accent} />
                  <Text className="text-sm font-semibold text-accent">
                    {t("login.backToEmail")}
                  </Text>
                </Pressable>

                <View className="px-2.5 py-1 rounded-full bg-appMuted max-w-[170px]">
                  <Text
                    className="text-xs text-appTextSecondary font-medium"
                    numberOfLines={1}
                  >
                    {vm.emailInput}
                  </Text>
                </View>
              </View>

              <View className="gap-1">
                <Text className="text-xl font-bold text-appText">
                  {t("login.otpScreenTitle")}
                </Text>
                <Text className="text-sm text-appTextSecondary">
                  {t("login.enterOtpPrompt")}
                </Text>
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
                title={vm.verifyingOtp ? t("login.verifyingOtp") : t("login.verifyOtp")}
                disabled={!vm.canVerifyOtp}
                loading={vm.verifyingOtp}
                onPress={vm.handleVerifyOtp}
              />

              {/* Countdown / Resend Section */}
              <View className="items-center justify-center min-h-[36px]">
                {vm.countdown > 0 ? (
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={14} color="#94a3b8" />
                    <Text className="text-xs text-appTextMuted font-medium">
                      {t("login.countdownSeconds", { seconds: vm.countdown })}
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => vm.handleRequestOtp({ isResend: true })}
                    disabled={vm.sendingOtp || vm.verifyingOtp}
                    className="flex-row items-center gap-1.5 py-1 px-3 rounded-full active:opacity-70"
                  >
                    <RotateCcw size={14} color={colors.accent} />
                    <Text className="text-sm font-semibold text-accent">
                      {vm.sendingOtp ? t("login.resendingOtp") : t("login.resendOtp")}
                    </Text>
                  </Pressable>
                )}
              </View>

              {vm.otpResentMessage ? (
                <View className="flex-row items-center justify-center gap-1.5 bg-success/10 py-2 px-3 rounded-xl">
                  <CheckCircle2 size={15} color="#10b981" />
                  <Text className="text-xs font-semibold text-success">
                    {vm.otpResentMessage}
                  </Text>
                </View>
              ) : null}
            </>
          )}

          {/* Authentication Error Banner */}
          {vm.authError ? (
            <View className="flex-row items-center gap-2 bg-dangerMuted border border-danger/30 rounded-xl p-3">
              <AlertCircle size={16} color="#ef4444" />
              <Text className="text-xs text-danger font-medium flex-1">
                {vm.authError}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Legal Disclaimer Footer */}
        <View className="items-center px-4">
          <Text className="text-xs text-appTextMuted text-center leading-relaxed">
            {t("login.legalPrefix")}{" "}
            <Text
              className="text-appText font-medium underline"
              onPress={() => navigation.navigate("Terms")}
            >
              {t("login.termsOfService")}
            </Text>{" "}
            {t("login.and")}{" "}
            <Text
              className="text-appText font-medium underline"
              onPress={() => navigation.navigate("Privacy")}
            >
              {t("login.privacyPolicy")}
            </Text>
            .
          </Text>
        </View>

        {/* Language Switcher */}
        <View className="items-center mt-1">
          <LanguageSwitcher />
        </View>
    </KeyboardAwareContainer>
  );
}
