import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { authApi } from "@/api";
import { useAuth } from "@/services/Auth";
import { useAuthStore } from "@/store/useAuthStore";
import { normalizeLoginEmail } from "@/utils/loginEmail";
import { useGoogleAuth } from "./useGoogleAuth";
import { useAppleAuth } from "./useAppleAuth";
import { useFacebookAuth } from "./useFacebookAuth";
import { showToast } from "@/utils/toast";
import { hapticFeedback } from "@/utils/haptics";
import { navigateAfterLogin } from "@/navigation/nav";
import { getFriendlyErrorMessage } from "@/core/errorManager";
import type { FacebookCredential } from "@/types/facebookAuth";

export interface UseLoginViewModelProps {
  navigation: any;
  nextRoute?: string;
  nextParams?: Record<string, any>;
}

export function useLoginViewModel({
  navigation,
  nextRoute = "Videos",
  nextParams,
}: UseLoginViewModelProps) {
  const { t, i18n } = useTranslation();
  const { deviceId, handleLoginSuccess } = useAuth();

  const [emailStep, setEmailStep] = useState<"email" | "otp">("email");
  const [emailInput, setEmailInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [otpResentMessage, setOtpResentMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (seconds = 60) => {
      clearTimer();
      setCountdown(seconds);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearTimer]
  );

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const isEmailValid = useMemo(() => {
    const trimmed = emailInput.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }, [emailInput]);

  const finishLogin = useCallback(
    async (payload: { token: string; email?: string; userId?: string }) => {
      await handleLoginSuccess(payload);
      useAuthStore.getState().setIsGuest(false);
      navigateAfterLogin(navigation, nextRoute, nextParams);
    },
    [handleLoginSuccess, navigation, nextRoute, nextParams]
  );

  const handleGoogleSuccess = useCallback(
    async ({ idToken, accessToken }: { idToken?: string; accessToken?: string }) => {
      setAuthError("");
      try {
        const token = idToken || accessToken;
        if (!token) throw new Error(t("login.googleMissingToken"));

        const data = await authApi.loginGoogle({
          token,
          idToken,
          accessToken,
          deviceId,
        });

        await finishLogin({
          token: data.token || data.access_token,
          email: data.email,
          userId: data.user_id,
        });
        showToast.success("login.loginSuccess");
      } catch (err: any) {
        if (__DEV__) {
          console.error("❌ [useLoginViewModel] Google backend auth failed:", err);
        }
        const friendlyMsg = getFriendlyErrorMessage(err, t("login.googleSignInFailed"));
        setAuthError(friendlyMsg);
        showToast.error(friendlyMsg);
      }
    },
    [deviceId, finishLogin, t]
  );

  const { signIn: signInGoogle, loading: googleLoading } = useGoogleAuth({
    onSuccess: handleGoogleSuccess,
    onError: (err) => {
      if (__DEV__) {
        console.error("❌ [useLoginViewModel] Google sign-in failed:", err);
      }
      const friendlyMsg = getFriendlyErrorMessage(err, t("login.googleSignInFailed"));
      setAuthError(friendlyMsg);
      showToast.error(friendlyMsg);
    },
  });

  const handleFacebookSuccess = useCallback(
    async (result: FacebookCredential) => {
      setAuthError("");
      try {
        const data = await authApi.loginFacebook({
          ...result,
          deviceId,
        });

        await finishLogin({
          token: data.token || data.access_token,
          email: data.email,
          userId: data.user_id,
        });

        if (data?.is_new_user) {
          showToast.success(t("login.welcomeNewUser") || "Chào mừng bạn!");
        } else {
          showToast.success(t("login.welcomeBack") || "Đăng nhập thành công!");
        }
      } catch (err: any) {
        if (__DEV__) {
          console.error("❌ [useLoginViewModel] Facebook sign-in error:", err);
        }
        const friendlyMsg = getFriendlyErrorMessage(err, t("login.facebookSignInFailed"));
        setAuthError(friendlyMsg);
        showToast.error(friendlyMsg);
      }
    },
    [deviceId, finishLogin, t]
  );

  const { signIn: signInFacebook, loading: facebookLoading } = useFacebookAuth({
    onSuccess: handleFacebookSuccess,
    onError: (err) => {
      if (__DEV__) {
        console.error("❌ [useLoginViewModel] Facebook auth failed:", err);
      }
      const friendlyMsg = getFriendlyErrorMessage(err, t("login.facebookSignInFailed"));
      setAuthError(friendlyMsg);
      showToast.error(friendlyMsg);
    },
  });

  const handleAppleSuccess = useCallback(
    async (credential: any) => {
      setAuthError("");
      try {
        const token = credential.identityToken;
        if (!token) throw new Error(t("login.appleMissingToken"));

        const fullName = credential.fullName
          ? [credential.fullName.familyName, credential.fullName.givenName].filter(Boolean).join(" ")
          : undefined;

        const data = await authApi.loginApple({
          identity_token: credential.identityToken,
          authorization_code: credential.authorizationCode,
          user: credential.user,
          email: credential.email,
          full_name: fullName,
          device_id: deviceId,
        });

        await finishLogin({
          token: data.token || data.access_token,
          email: data.email || credential.email,
          userId: data.user_id || credential.user,
        });
        showToast.success("login.loginSuccess");
      } catch (err: any) {
        if (__DEV__) {
          console.error("❌ [useLoginViewModel] Apple backend auth failed:", err);
        }
        const friendlyMsg = getFriendlyErrorMessage(err, t("login.appleSignInFailed"));
        setAuthError(friendlyMsg);
        showToast.error(friendlyMsg);
      }
    },
    [deviceId, finishLogin, t]
  );

  const { signIn: signInApple, isAvailable: isAppleAvailable, loading: appleLoading } = useAppleAuth({
    onSuccess: handleAppleSuccess,
    onError: (err) => {
      if (__DEV__) {
        console.error("❌ [useLoginViewModel] Apple auth failed:", err);
      }
      const friendlyMsg = getFriendlyErrorMessage(err, t("login.appleSignInFailed"));
      setAuthError(friendlyMsg);
      showToast.error(friendlyMsg);
    },
  });

  const handleRequestOtp = useCallback(
    async ({ isResend = false } = {}) => {
      if (!isEmailValid) {
        setAuthError(t("login.invalidEmail"));
        return;
      }
      setAuthError("");
      setOtpResentMessage("");
      setSendingOtp(true);
      hapticFeedback.light();
      const email = normalizeLoginEmail(emailInput);
      try {
        await authApi.requestOtp(email, String(i18n.resolvedLanguage || i18n.language || "vi"));
        startCountdown(60);
        if (isResend) {
          setOtpResentMessage(t("login.otpResent"));
          showToast.success("login.otpResent");
        } else {
          setOtpInput("");
          setEmailStep("otp");
        }
      } catch (e: any) {
        if (__DEV__) {
          console.error("❌ [useLoginViewModel] Request OTP failed:", e);
        }
        const msg = getFriendlyErrorMessage(e, t("login.otpSendFailed") || "Lỗi gửi mã OTP");
        setAuthError(msg);
        showToast.error(msg);
      } finally {
        setSendingOtp(false);
      }
    },
    [emailInput, i18n, isEmailValid, startCountdown, t]
  );

  const handleVerifyOtp = useCallback(async () => {
    if (otpInput.length !== 6) return;
    setAuthError("");
    setOtpResentMessage("");
    setVerifyingOtp(true);
    hapticFeedback.light();
    const email = normalizeLoginEmail(emailInput);
    try {
      const data = await authApi.verifyOtp(email, otpInput, deviceId);
      await finishLogin({
        token: data.token || "",
        email: data.email || email,
        userId: data.user_id || "",
      });
      showToast.success("login.loginSuccess");
    } catch (e: any) {
      if (__DEV__) {
        console.error("❌ [useLoginViewModel] Verify OTP failed:", e);
      }
      const msg = getFriendlyErrorMessage(e, t("login.otpCodeInvalid") || "Mã xác thực không hợp lệ hoặc đã hết hạn.");
      setAuthError(msg);
      showToast.error(msg);
    } finally {
      setVerifyingOtp(false);
    }
  }, [deviceId, emailInput, finishLogin, otpInput, t]);

  const handleBackToEmail = useCallback(() => {
    hapticFeedback.selection();
    setEmailStep("email");
    setAuthError("");
    setOtpResentMessage("");
  }, []);

  const clearEmail = useCallback(() => {
    setEmailInput("");
    setAuthError("");
  }, []);

  const canSendOtp = !sendingOtp && isEmailValid;
  const canVerifyOtp = !verifyingOtp && otpInput.length === 6;

  return {
    emailStep,
    emailInput,
    setEmailInput,
    otpInput,
    setOtpInput,
    sendingOtp,
    verifyingOtp,
    authError,
    otpResentMessage,
    countdown,
    isEmailValid,
    canSendOtp,
    canVerifyOtp,
    isAppleAvailable,
    appleLoading,
    googleLoading,
    facebookLoading,
    signInApple,
    signInGoogle,
    signInFacebook,
    handleRequestOtp,
    handleVerifyOtp,
    handleBackToEmail,
    clearEmail,
  };
}

export default useLoginViewModel;
