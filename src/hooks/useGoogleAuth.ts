import { useState } from "react";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
  isSuccessResponse,
} from "@react-native-google-signin/google-signin";
import { GOOGLE_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from "@/core/config";
import { showToast } from "@/utils/toast";

const isNativeMobile = Platform.OS === "android" || Platform.OS === "ios";

let isGoogleSigninConfigured = false;
function ensureGoogleSigninConfigured() {
  if (!isNativeMobile || isGoogleSigninConfigured) return;
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_CLIENT_ID || undefined,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      offlineAccess: true,
    });
    isGoogleSigninConfigured = true;
  } catch (err) {
    console.warn("Failed to configure GoogleSignin:", err);
  }
}

export interface UseGoogleAuthOptions {
  onSuccess: (tokens: { idToken?: string; accessToken?: string }) => Promise<void> | void;
  onError?: (error: unknown) => void;
}

export function useGoogleAuth({ onSuccess, onError }: UseGoogleAuthOptions) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!isNativeMobile) {
      if (__DEV__) {
        console.warn("⚠️ [GoogleSignIn (DEV)] Google sign-in is only available on native mobile platforms.");
      }
      onError?.(t("login.googleSignInFailed"));
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      if (__DEV__) {
        console.error("❌ [GoogleSignIn Error (DEV)] GOOGLE_CLIENT_ID is not configured in environment.");
      }
      showToast.error(
        t("login.missingConfig"),
        t("login.googleMissingClientId")
      );
      return;
    }

    setLoading(true);
    try {
      ensureGoogleSigninConfigured();
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      if (isSuccessResponse(res)) {
        const idToken = res.data.idToken;
        if (idToken) {
          await Promise.resolve(onSuccess({ idToken }));
        } else {
          throw new Error(t("login.googleMissingToken"));
        }
      } else if ((res as any)?.data?.idToken) {
        await Promise.resolve(onSuccess({ idToken: (res as any).data.idToken }));
      }
    } catch (err: any) {
      if (isErrorWithCode(err)) {
        if (
          err.code === statusCodes.SIGN_IN_CANCELLED ||
          err.code === statusCodes.IN_PROGRESS
        ) {
          return;
        }
      }
      if (__DEV__) {
        console.error("❌ [GoogleSignIn Error (DEV)]", {
          code: err?.code,
          message: err?.message,
          error: err,
        });
      }
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    loading,
    isReady: Boolean(GOOGLE_CLIENT_ID && isNativeMobile),
  };
}
