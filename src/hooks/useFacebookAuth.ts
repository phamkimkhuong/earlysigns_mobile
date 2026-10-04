import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { loginWithFacebook, FacebookLoginResult } from "@/services/facebookAuth";

export interface UseFacebookAuthOptions {
  onSuccess: (result: Extract<FacebookLoginResult, { success: true }>) => Promise<void> | void;
  onError?: (error: string) => void;
}

export function useFacebookAuth({ onSuccess, onError }: UseFacebookAuthOptions) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const signIn = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const res = await loginWithFacebook();
      if (res.success) {
        await Promise.resolve(onSuccess(res));
      } else if (!res.cancelled) {
        onError?.(res.error || t("login.facebookSignInFailed"));
      }
    } catch (e: any) {
      onError?.(e?.message || t("login.facebookSignInFailed"));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return {
    signIn,
    loading,
  };
}
